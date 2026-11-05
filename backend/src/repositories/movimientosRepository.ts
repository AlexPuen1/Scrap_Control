import { actualizarDictamenSQL, actualizarRazonSQL, consultarSQL } from '../config/database.connection.js';
import type {
  MovimientoDB,
  MovimientoDetalleDTO,
  FiltrosMovimientosQuery,
  ResumenScrapLineaDB,
  ResumenScrapLineaReporte,
  ComparativaMensualDB,
  ComparativaMensualReporte,
  OpcionRazonDB,
} from '../types/index.js';

const NOMBRES_TIPOS_MOVIMIENTO: Record<number, string> = {
  1: 'Scrap',
  2: 'Retrabajo en Linea',
  3: 'Calidad',
  4: 'Cuarentena',
  5: 'Calidad Reingreso',
  6: 'metal Finish',
  7: 'Traspaleo',
  8: 'Impresion Parcial',
};

function enriquecerMovimiento(movimiento: MovimientoDB): MovimientoDetalleDTO {
  return {
    ...movimiento,
    MovimientoTipoNombre: NOMBRES_TIPOS_MOVIMIENTO[movimiento.MovimientoTipoId],
  };
}

function aplicarFiltros(movimientos: MovimientoDetalleDTO[], filtros: FiltrosMovimientosQuery) {
  return movimientos.filter((movimiento) => {
    if (filtros.tipoId && movimiento.MovimientoTipoId !== Number(filtros.tipoId)) return false;
    if (filtros.aprobado === 'null' && movimiento.aprobado !== null) return false;
    if (filtros.aprobado !== undefined && filtros.aprobado !== '' && filtros.aprobado !== 'null'
      && movimiento.aprobado !== Number(filtros.aprobado)) return false;
    if (filtros.razonId === 'null' && movimiento.RazonId !== null) return false;
    if (filtros.razonId && filtros.razonId !== 'null' && movimiento.RazonId !== Number(filtros.razonId)) return false;
    if (filtros.certificacionId && movimiento.CertificacionId !== Number(filtros.certificacionId)) return false;
    if (filtros.lineaId && movimiento.LineaId !== Number(filtros.lineaId)) return false;
    if (filtros.almacen && movimiento.almacen !== filtros.almacen) return false;

    if (filtros.busqueda) {
      const busqueda = filtros.busqueda.toLocaleLowerCase();
      const valores = [
        movimiento.id,
        movimiento.serial,
        movimiento.MATNR,
        movimiento.MATNR_FG,
        movimiento.credencial,
        movimiento.MovimientoTipoNombre,
        movimiento.RazonId,
        movimiento.almacen,
      ];
      if (!valores.some((valor) => String(valor ?? '').toLocaleLowerCase().includes(busqueda))) return false;
    }
    return true;
  });
}

export class MovimientosRepository {
  async obtenerAprobacionesPorResponsable(
    fechaInicio?: string,
    fechaFin?: string,
  ): Promise<{ nombre: string; aprobaciones: number }[]> {
    const filtroFecha = fechaInicio && fechaFin
      ? `AND dtAprobado >= '${fechaInicio}' AND dtAprobado < '${fechaFin}'`
      : '';
    const filas = await consultarSQL<{ nombre: string; aprobaciones: number | string }>(`
      SELECT
        COALESCE(NULLIF(LTRIM(RTRIM(nvAprobadoPor)), ''), 'Sin responsable registrado') AS nombre,
        COUNT_BIG(*) AS aprobaciones
      FROM dbo.Movimientos
      WHERE aprobado = 1
        ${filtroFecha}
      GROUP BY COALESCE(NULLIF(LTRIM(RTRIM(nvAprobadoPor)), ''), 'Sin responsable registrado')
      ORDER BY aprobaciones DESC, nombre
    `);

    return filas.map((fila) => ({
      nombre: fila.nombre,
      aprobaciones: Number(fila.aprobaciones),
    }));
  }

  async obtenerRazones(movimientoTipoId: number): Promise<OpcionRazonDB[]> {
    if (!Number.isSafeInteger(movimientoTipoId) || movimientoTipoId < 1) {
      throw new Error('El tipo de movimiento no es válido.');
    }

    return consultarSQL<OpcionRazonDB>(`
      SELECT RAZONid AS id, MAX(LTRIM(RTRIM(desc_Razon))) AS descripcion
      FROM dbo.vw_Scrap_PowerBI
      WHERE MovimientoTipoId = ${movimientoTipoId}
        AND RAZONid IS NOT NULL
        AND NULLIF(LTRIM(RTRIM(desc_Razon)), '') IS NOT NULL
      GROUP BY RAZONid
      ORDER BY descripcion
    `);
  }

  async obtenerScrapPorLinea(): Promise<ResumenScrapLineaReporte> {
    const [periodo] = await consultarSQL<{ fechaInicio: string | null; fechaFin: string | null }>(`
      SELECT
        CONVERT(char(10), CONVERT(date, DATEADD(MONTH, -1, MAX(fecha_hora))), 23) AS fechaInicio,
        CONVERT(char(10), CONVERT(date, MAX(fecha_hora)), 23) AS fechaFin
      FROM dbo.Movimientos
    `);
    if (!periodo?.fechaInicio || !periodo.fechaFin) {
      return { periodo: null, datos: [] };
    }

    const resultado = await consultarSQL<ResumenScrapLineaDB>(`
      SELECT
        certificacion.LineaId AS lineaId,
        MAX(linea.Descripcion) AS lineaNombre,
        COUNT_BIG(*) AS movimientos,
        SUM(CONVERT(BIGINT, movimiento.cantidad)) AS piezasScrap
      FROM dbo.Movimientos AS movimiento
      LEFT JOIN dbo.Certificacion AS certificacion
        ON certificacion.id = movimiento.CertificacionId
      LEFT JOIN [172.19.216.32].[RapEnsambleEMM].[dbo].[PRENSAS_Cat_NombresLinea] AS linea
        ON linea.IdPrensa = certificacion.LineaId
      WHERE movimiento.fecha_hora >= '${periodo.fechaInicio}'
        AND movimiento.fecha_hora < DATEADD(DAY, 1, CONVERT(date, '${periodo.fechaFin}', 23))
        AND movimiento.MovimientoTipoId = 1
      GROUP BY certificacion.LineaId
      ORDER BY piezasScrap DESC
    `);

    return {
      periodo: { fechaInicio: periodo.fechaInicio, fechaFin: periodo.fechaFin },
      datos: resultado.map((fila) => ({
        lineaId: fila.lineaId,
        lineaNombre: fila.lineaNombre,
        movimientos: Number(fila.movimientos),
        piezasScrap: Number(fila.piezasScrap),
      })),
    };
  }

  async obtenerComparativaMensual(
    inicioAnterior: string,
    inicioActual: string,
    finActual: string,
  ): Promise<ComparativaMensualReporte> {
    const consulta = (grafica: string, agrupacion: string, filtroScrap = '', joinAdicional = '') => `
      SELECT
        '${grafica}' AS grafica,
        CASE WHEN movimiento.fecha_hora >= '${inicioActual}' THEN 'actual' ELSE 'anterior' END AS periodo,
        ${agrupacion} AS categoria,
        COUNT_BIG(*) AS movimientos,
        SUM(CONVERT(BIGINT, movimiento.cantidad)) AS piezas
      FROM dbo.Movimientos AS movimiento
      LEFT JOIN dbo.Certificacion AS certificacion
        ON certificacion.id = movimiento.CertificacionId
      ${joinAdicional}
      WHERE movimiento.fecha_hora >= '${inicioAnterior}'
        AND movimiento.fecha_hora < '${finActual}'
        ${filtroScrap}
      GROUP BY
        CASE WHEN movimiento.fecha_hora >= '${inicioActual}' THEN 'actual' ELSE 'anterior' END,
        ${agrupacion}
    `;

    const filas = await consultarSQL<ComparativaMensualDB>(`
      SELECT grafica, periodo, categoria, movimientos, piezas
      FROM (
        ${consulta('tendencia', "CONVERT(char(10), CONVERT(date, movimiento.fecha_hora), 23)", 'AND movimiento.MovimientoTipoId = 1')}
        UNION ALL
        ${consulta('certificacion', 'CONVERT(varchar(32), movimiento.CertificacionId)')}
        UNION ALL
        ${consulta(
          'razon',
          `CASE
            WHEN movimiento.RazonId IS NULL THEN 'Sin razon'
            ELSE CONCAT(
              'ID ', CONVERT(varchar(32), movimiento.RazonId),
              COALESCE(CONCAT(' - ', catalogoRazon.descripcion), '')
            )
          END`,
          'AND movimiento.MovimientoTipoId = 1',
          `LEFT JOIN (
            SELECT MovimientoTipoId, RAZONid, MAX(NULLIF(LTRIM(RTRIM(desc_Razon)), '')) AS descripcion
            FROM dbo.vw_Scrap_PowerBI
            WHERE desc_Razon IS NOT NULL
            GROUP BY MovimientoTipoId, RAZONid
          ) AS catalogoRazon
            ON catalogoRazon.MovimientoTipoId = movimiento.MovimientoTipoId
            AND catalogoRazon.RAZONid = movimiento.RazonId`,
        )}
        UNION ALL
        ${consulta('linea', "COALESCE(CONVERT(varchar(32), certificacion.LineaId), 'Sin linea asignada')", 'AND movimiento.MovimientoTipoId = 1')}
      ) AS comparativa
      ORDER BY grafica, periodo, piezas DESC
    `);

    const restarUnDia = (fecha: string) => {
      const [anio, mes, dia] = fecha.split('-').map(Number);
      return new Date(Date.UTC(anio, mes - 1, dia - 1)).toISOString().slice(0, 10);
    };

    return {
      periodos: {
        actual: { fechaInicio: inicioActual, fechaFin: restarUnDia(finActual) },
        anterior: { fechaInicio: inicioAnterior, fechaFin: restarUnDia(inicioActual) },
      },
      datos: filas.map((fila) => ({
        ...fila,
        movimientos: Number(fila.movimientos),
        piezas: Number(fila.piezas),
      })),
    };
  }

  async listar(filtros: FiltrosMovimientosQuery = {}): Promise<MovimientoDetalleDTO[]> {
    let filtroFecha: string;
    if (filtros.fechaInicio && filtros.fechaFin) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(filtros.fechaInicio) || !/^\d{4}-\d{2}-\d{2}$/.test(filtros.fechaFin)) {
        throw new Error('El rango de fechas no tiene un formato válido.');
      }
      filtroFecha = `[fecha_hora] >= '${filtros.fechaInicio}' AND [fecha_hora] < '${filtros.fechaFin}'`;
    } else {
      filtroFecha = `
        movimiento.fecha_hora >= CONVERT(date, DATEADD(MONTH, -1, ultimo.fechaMaxima))
        AND movimiento.fecha_hora < DATEADD(DAY, 1, CONVERT(date, ultimo.fechaMaxima))
      `;
    }

    const resultado = await consultarSQL<MovimientoDetalleDTO>(
      `SELECT movimiento.*, certificacion.LineaId AS LineaId, linea.Descripcion AS LineaNombre,
              (SELECT TOP 1 NULLIF(LTRIM(RTRIM(catalogo.desc_Razon)), '')
               FROM dbo.vw_Scrap_PowerBI AS catalogo
               WHERE catalogo.MovimientoTipoId = movimiento.MovimientoTipoId
                 AND catalogo.RAZONid = movimiento.RazonId
                 AND catalogo.desc_Razon IS NOT NULL) AS DescripcionRazon
       FROM dbo.Movimientos AS movimiento
       LEFT JOIN dbo.Certificacion AS certificacion
         ON certificacion.id = movimiento.CertificacionId
       LEFT JOIN [172.19.216.32].[RapEnsambleEMM].[dbo].[PRENSAS_Cat_NombresLinea] AS linea
         ON linea.IdPrensa = certificacion.LineaId
       ${filtros.fechaInicio && filtros.fechaFin ? '' : `
       CROSS JOIN (
         SELECT MAX(fecha_hora) AS fechaMaxima
         FROM dbo.Movimientos
       ) AS ultimo`}
       WHERE ${filtroFecha}
       ORDER BY movimiento.[id] DESC`
    );
    return aplicarFiltros(resultado.map(enriquecerMovimiento), filtros);
  }

  async obtenerPorId(id: number): Promise<MovimientoDetalleDTO | null> {
    if (!Number.isSafeInteger(id)) {
      throw new Error('El identificador del movimiento no es válido.');
    }
    const resultado = await consultarSQL<MovimientoDetalleDTO>(`
      SELECT movimiento.*, certificacion.LineaId AS LineaId, linea.Descripcion AS LineaNombre,
             (SELECT TOP 1 NULLIF(LTRIM(RTRIM(catalogo.desc_Razon)), '')
              FROM dbo.vw_Scrap_PowerBI AS catalogo
              WHERE catalogo.MovimientoTipoId = movimiento.MovimientoTipoId
                AND catalogo.RAZONid = movimiento.RazonId
                AND catalogo.desc_Razon IS NOT NULL) AS DescripcionRazon
      FROM dbo.Movimientos AS movimiento
      LEFT JOIN dbo.Certificacion AS certificacion
        ON certificacion.id = movimiento.CertificacionId
      LEFT JOIN [172.19.216.32].[RapEnsambleEMM].[dbo].[PRENSAS_Cat_NombresLinea] AS linea
        ON linea.IdPrensa = certificacion.LineaId
      WHERE movimiento.[id] = ${id}
    `);
    const movimiento = resultado[0];
    return movimiento ? enriquecerMovimiento(movimiento) : null;
  }

  async actualizarRazon(
    id: number,
    razonId: number | null,
  ): Promise<{ estado: 'actualizado'; movimiento: MovimientoDetalleDTO } | { estado: 'no-encontrado' } | { estado: 'razon-invalida' }> {
    const movimientoActual = await this.obtenerPorId(id);
    if (!movimientoActual) return { estado: 'no-encontrado' };

    if (razonId !== null) {
      const opciones = await this.obtenerRazones(movimientoActual.MovimientoTipoId);
      if (!opciones.some((opcion) => opcion.id === razonId)) {
        return { estado: 'razon-invalida' };
      }
    }

    await actualizarRazonSQL(id, razonId);
    const movimiento = await this.obtenerPorId(id);
    if (!movimiento) return { estado: 'no-encontrado' };
    if (movimiento.RazonId !== razonId) {
      throw new Error('No se pudo confirmar la actualización de la razón.');
    }
    return { estado: 'actualizado', movimiento };
  }

  async registrarDictamen(
    id: number,
    aprobado: 1 | 4,
    aprobadoPor: string,
  ): Promise<
    | { estado: 'actualizado'; movimiento: MovimientoDetalleDTO }
    | { estado: 'no-encontrado' }
    | { estado: 'ya-dictaminado' }
  > {
    const movimientoActual = await this.obtenerPorId(id);
    if (!movimientoActual) return { estado: 'no-encontrado' };

    const dictamenCoincide = (movimiento: MovimientoDetalleDTO) =>
      movimiento.nvAprobadoPor === aprobadoPor
      && (movimiento.aprobado === aprobado
        || (aprobado === 1 && movimiento.aprobado === 2 && movimiento.dtAprobado != null));
    if (dictamenCoincide(movimientoActual)) return { estado: 'actualizado', movimiento: movimientoActual };
    if (movimientoActual.aprobado !== 0) return { estado: 'ya-dictaminado' };

    let filasAfectadas: number;
    try {
      filasAfectadas = await actualizarDictamenSQL(id, aprobado, aprobadoPor);
    } catch (error) {
      try {
        const confirmado = await this.obtenerPorId(id);
        if (confirmado && dictamenCoincide(confirmado)) return { estado: 'actualizado', movimiento: confirmado };
      } catch {
        // Keep the write error if a follow-up read cannot establish the persisted state.
      }
      throw error;
    }

    const movimiento = await this.obtenerPorId(id);
    if (!movimiento) return { estado: 'no-encontrado' };

    return dictamenCoincide(movimiento)
      ? { estado: 'actualizado', movimiento }
      : { estado: 'ya-dictaminado' };
  }

}