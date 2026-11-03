import type { ComparativaMensual, Movimiento, MovimientoDB, OpcionRazon, ReporteScrapLinea } from '../types';
import { MOVIMIENTO_TIPOS_SSMS } from '../constants';

function adaptarMovimiento(row: MovimientoDB): Movimiento {
  const fechaHora = row.fecha_hora.replace(' ', 'T').slice(0, 19);
  const fecha = fechaHora.slice(0, 10);
  const hora = fechaHora.slice(11, 16);
  const tipo = MOVIMIENTO_TIPOS_SSMS.find((item) => item.id === row.MovimientoTipoId);
  const aprobado = row.aprobado === null ? null : Number(row.aprobado);
  const estadoValido = aprobado === null || Number.isSafeInteger(aprobado);
  const estatus = !estadoValido
    ? 'Otro estado'
    : aprobado === 1
    ? 'Aprobado'
    : aprobado === 2
      ? 'Procesado'
    : aprobado === 4
      ? 'Rechazado'
      : aprobado === 0
        ? 'Pendiente'
        : 'Sin dictamen';

  return {
    datosDB: { ...row, aprobado: estadoValido ? aprobado : null },
    id: String(row.id),
    certificacionId: row.CertificacionId,
    matnr: row.MATNR,
    matnrFg: row.MATNR_FG || undefined,
    fechaHora,
    fecha,
    hora,
    credencial: row.credencial,
    movimientoTipoId: row.MovimientoTipoId,
    movimientoTipo: tipo?.nombre || 'Tipo desconocido',
    cantidad: row.cantidad,
    salida: row.salida,
    retorno: row.retorno,
    aprobado: estadoValido ? aprobado : null,
    procesado: row.procesado ?? undefined,
    razonId: row.RazonId,
    descripcionRazon: row.DescripcionRazon || '',
    motivoEspecifico: row.DescripcionRazon || '',
    almacen: row.almacen || '',
    serial: row.serial || '',
    nvAprobadoPor: row.nvAprobadoPor || undefined,
    dtAprobado: row.dtAprobado || undefined,
    empleado: row.Empleado || '',
    descripcion: '',
    linea: row.LineaNombre || (row.LineaId === null || row.LineaId === undefined
      ? 'Sin línea asignada'
      : `Línea ${row.LineaId}`),
    estatus,
    unidad: 'PZA',
    costoUnitario: 0,
    costoTotal: 0,
    historial: [],
  };
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export interface FiltrosBusquedaMovimientos {
  busqueda?: string;
  tipoId?: string;
  aprobado?: string;
  razonId?: string;
  certificacionId?: string;
  lineaId?: string;
  almacen?: string;
}

async function solicitarMovimientos(
  fechaInicio?: string,
  fechaFin?: string,
  filtros: FiltrosBusquedaMovimientos = {},
): Promise<Movimiento[]> {
  const parametros = new URLSearchParams();
  if (fechaInicio && fechaFin) {
    parametros.set('fechaInicio', fechaInicio);
    parametros.set('fechaFin', fechaFin);
  }
  Object.entries(filtros).forEach(([clave, valor]) => {
    if (valor) parametros.set(clave, valor);
  });
  const query = parametros.size > 0 ? `?${parametros.toString()}` : '';
  const response = await fetch(`${API_BASE}/movimientos${query}`);
  const body = await response.json() as { exitoso: boolean; datos?: MovimientoDB[]; mensaje?: string };
  if (!response.ok || !body.exitoso || !body.datos) {
    throw new Error(body.mensaje || `No se pudieron cargar los movimientos (HTTP ${response.status}).`);
  }
  return body.datos.map(adaptarMovimiento);
}

async function solicitarAprobaciones(
  fechaInicio?: string,
  fechaFin?: string,
): Promise<{ datos: { nombre: string; aprobaciones: number }[]; total: number }> {
  const parametros = new URLSearchParams();
  if (fechaInicio && fechaFin) {
    parametros.set('fechaInicio', fechaInicio);
    parametros.set('fechaFin', fechaFin);
  }
  const query = parametros.size > 0 ? `?${parametros.toString()}` : '';
  const response = await fetch(`${API_BASE}/movimientos/aprobaciones${query}`);
  const body = await response.json() as {
    exitoso: boolean;
    datos?: { nombre: string; aprobaciones: number }[];
    total?: number;
    mensaje?: string;
  };
  if (!response.ok || !body.exitoso || !body.datos || body.total === undefined) {
    throw new Error(body.mensaje || `No se pudieron cargar las aprobaciones (HTTP ${response.status}).`);
  }
  return { datos: body.datos, total: body.total };
}

async function solicitarMovimiento(id: string): Promise<Movimiento> {
  const response = await fetch(`${API_BASE}/movimientos/${encodeURIComponent(id)}`);
  const body = await response.json() as { exitoso: boolean; datos?: MovimientoDB; mensaje?: string };
  if (!response.ok || !body.exitoso || !body.datos) {
    throw new Error(body.mensaje || `No se pudo cargar el movimiento (HTTP ${response.status}).`);
  }
  return adaptarMovimiento(body.datos);
}

async function enviarDictamen(id: string, aprobado: 1 | 4, aprobadoPor: string): Promise<void> {
  const response = await fetch(`${API_BASE}/movimientos/${encodeURIComponent(id)}/dictamen`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ aprobado, aprobadoPor }),
  });
  const body = await response.json() as { exitoso: boolean; mensaje?: string };
  if (!response.ok || !body.exitoso) {
    throw new Error(body.mensaje || `No se pudo registrar el dictamen (HTTP ${response.status}).`);
  }
}

async function solicitarScrapPorLinea(): Promise<ReporteScrapLinea> {
  const response = await fetch(`${API_BASE}/movimientos/fallas-por-linea`);
  const body = await response.json() as {
    exitoso: boolean;
    datos?: ReporteScrapLinea['datos'];
    periodo?: ReporteScrapLinea['periodo'];
    mensaje?: string;
  };
  if (!response.ok || !body.exitoso || !body.datos || body.periodo === undefined) {
    throw new Error(body.mensaje || `No se pudo cargar Scrap por línea (HTTP ${response.status}).`);
  }
  return { datos: body.datos, periodo: body.periodo };
}

async function solicitarComparativaMensual(mes: string): Promise<ComparativaMensual> {
  const parametros = new URLSearchParams({ mes });
  const response = await fetch(`${API_BASE}/movimientos/comparativa-mensual?${parametros.toString()}`);
  const body = await response.json() as {
    exitoso: boolean;
    periodos?: ComparativaMensual['periodos'];
    datos?: ComparativaMensual['datos'];
    mensaje?: string;
  };
  if (!response.ok || !body.exitoso || !body.periodos || !body.datos) {
    throw new Error(body.mensaje || `No se pudo comparar el mes seleccionado (HTTP ${response.status}).`);
  }
  return { periodos: body.periodos, datos: body.datos };
}

async function solicitarRazones(movimientoTipoId: number): Promise<OpcionRazon[]> {
  const parametros = new URLSearchParams({ movimientoTipoId: String(movimientoTipoId) });
  const response = await fetch(`${API_BASE}/movimientos/razones?${parametros.toString()}`);
  const body = await response.json() as { exitoso: boolean; datos?: OpcionRazon[]; mensaje?: string };
  if (!response.ok || !body.exitoso || !body.datos) {
    throw new Error(body.mensaje || `No se pudieron cargar las opciones de razón (HTTP ${response.status}).`);
  }
  return body.datos;
}

async function enviarActualizacionRazon(id: string, razonId: number | null): Promise<Movimiento> {
  const response = await fetch(`${API_BASE}/movimientos/${encodeURIComponent(id)}/razon`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ razonId }),
  });
  const body = await response.json() as { exitoso: boolean; datos?: MovimientoDB; mensaje?: string };
  if (!response.ok || !body.exitoso || !body.datos) {
    throw new Error(body.mensaje || `No se pudo actualizar la razón (HTTP ${response.status}).`);
  }
  return adaptarMovimiento(body.datos);
}

/** El frontend consume el backend; la llamada a la API corporativa queda solo en servidor. */
export const ScrapService = {
  obtenerMovimientos: (fechaInicio?: string, fechaFin?: string, filtros?: FiltrosBusquedaMovimientos) =>
    solicitarMovimientos(fechaInicio, fechaFin, filtros),
  obtenerAprobaciones: (fechaInicio?: string, fechaFin?: string) => solicitarAprobaciones(fechaInicio, fechaFin),
  obtenerMovimiento: (id: string) => solicitarMovimiento(id),

  obtenerScrapPorLinea: () => solicitarScrapPorLinea(),
  obtenerComparativaMensual: (mes: string) => solicitarComparativaMensual(mes),
  obtenerRazones: (movimientoTipoId: number) => solicitarRazones(movimientoTipoId),
  actualizarRazon: (id: string, razonId: number | null) => enviarActualizacionRazon(id, razonId),

  aprobarMovimiento: (id: string, aprobadoPor: string) => enviarDictamen(id, 1, aprobadoPor),

  rechazarMovimiento: (id: string, aprobadoPor: string) => enviarDictamen(id, 4, aprobadoPor),
};
