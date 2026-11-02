import type { Request, Response } from 'express';
import { MovimientosRepository } from '../repositories/movimientosRepository.js';

const repo = new MovimientosRepository();

function responderErrorInterno(res: Response, contexto: string, mensaje: string, error: unknown) {
  const tipoError = error instanceof Error ? error.name : 'UnknownError';
  console.error(`[API] ${contexto} (${tipoError})`);
  res.status(500).json({ exitoso: false, mensaje });
}

export async function getMovimientos(req: Request, res: Response) {
  const fechaInicio = typeof req.query.fechaInicio === 'string' ? req.query.fechaInicio : undefined;
  const fechaFin = typeof req.query.fechaFin === 'string' ? req.query.fechaFin : undefined;
  const formatoFechaValido = (fecha: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
    const parsed = new Date(`${fecha}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === fecha;
  };

  if ((fechaInicio && !fechaFin) || (!fechaInicio && fechaFin)
    || (fechaInicio && fechaFin
      && (!formatoFechaValido(fechaInicio) || !formatoFechaValido(fechaFin) || fechaInicio >= fechaFin))) {
    res.status(400).json({
      exitoso: false,
      mensaje: 'El rango de fechas requiere fechaInicio y fechaFin válidas, en formato YYYY-MM-DD, con fechaFin posterior.',
    });
    return;
  }

  try {
    const filtros = {
      tipoId: req.query.tipoId as string | undefined,
      aprobado: req.query.aprobado as string | undefined,
      razonId: req.query.razonId as string | undefined,
      busqueda: req.query.busqueda as string | undefined,
      fechaInicio,
      fechaFin,
    };
    const lista = await repo.listar(filtros);
    res.json({ exitoso: true, datos: lista, conteo: lista.length });
  } catch (error) {
    responderErrorInterno(res, 'Error al obtener movimientos', 'Error interno al obtener movimientos.', error);
  }
}

export async function getMovimientoById(req: Request, res: Response) {
  if (!/^[1-9]\d*$/.test(req.params.id)) {
    res.status(400).json({ exitoso: false, mensaje: 'ID de movimiento inválido.' });
    return;
  }
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id)) {
    res.status(400).json({ exitoso: false, mensaje: 'ID de movimiento inválido.' });
    return;
  }

  try {
    const movimiento = await repo.obtenerPorId(id);
    if (!movimiento) {
      res.status(404).json({ exitoso: false, mensaje: 'Movimiento no encontrado.' });
      return;
    }
    res.json({ exitoso: true, datos: movimiento });
  } catch (error) {
    responderErrorInterno(res, 'Error al obtener movimiento', 'Error interno al obtener movimiento.', error);
  }
}

export async function getRazones(req: Request, res: Response) {
  const movimientoTipoId = Number(req.query.movimientoTipoId);
  if (!Number.isSafeInteger(movimientoTipoId) || movimientoTipoId < 1) {
    res.status(400).json({ exitoso: false, mensaje: 'Tipo de movimiento inválido.' });
    return;
  }

  try {
    const datos = await repo.obtenerRazones(movimientoTipoId);
    res.json({ exitoso: true, datos });
  } catch (error) {
    responderErrorInterno(res, 'Error al obtener razones', 'Error interno al obtener razones.', error);
  }
}

export async function actualizarRazon(req: Request, res: Response) {
  if (!/^[1-9]\d*$/.test(req.params.id)) {
    res.status(400).json({ exitoso: false, mensaje: 'ID de movimiento inválido.' });
    return;
  }
  const id = Number(req.params.id);
  const razonId = req.body?.razonId;
  if (!Number.isSafeInteger(id) || !(razonId === null || (Number.isSafeInteger(razonId) && razonId > 0))) {
    res.status(400).json({ exitoso: false, mensaje: 'Selecciona una razón válida o indica que no tiene razón.' });
    return;
  }

  try {
    const resultado = await repo.actualizarRazon(id, razonId);
    if (resultado.estado === 'no-encontrado') {
      res.status(404).json({ exitoso: false, mensaje: 'Movimiento no encontrado.' });
      return;
    }
    if (resultado.estado === 'razon-invalida') {
      res.status(400).json({ exitoso: false, mensaje: 'La razón seleccionada no está disponible para este tipo de movimiento.' });
      return;
    }
    res.json({ exitoso: true, datos: resultado.movimiento });
  } catch (error) {
    responderErrorInterno(res, 'Error al actualizar la razón', 'Error interno al actualizar la razón.', error);
  }
}

export async function registrarDictamen(req: Request, res: Response) {
  if (!/^[1-9]\d*$/.test(req.params.id)) {
    res.status(400).json({ exitoso: false, mensaje: 'ID de movimiento inválido.' });
    return;
  }
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id)) {
    res.status(400).json({ exitoso: false, mensaje: 'ID de movimiento inválido.' });
    return;
  }

  const aprobado = req.body?.aprobado;
  const aprobadoPor = typeof req.body?.aprobadoPor === 'string' ? req.body.aprobadoPor.trim() : '';
  if ((aprobado !== 1 && aprobado !== 4) || aprobadoPor.length === 0 || aprobadoPor.length > 200) {
    res.status(400).json({
      exitoso: false,
      mensaje: 'Indica si apruebas o rechazas y captura el nombre del responsable (máximo 200 caracteres).',
    });
    return;
  }

  try {
    const resultado = await repo.registrarDictamen(id, aprobado, aprobadoPor);
    if (resultado.estado === 'no-encontrado') {
      res.status(404).json({ exitoso: false, mensaje: 'Movimiento no encontrado.' });
      return;
    }
    if (resultado.estado === 'ya-dictaminado') {
      res.status(409).json({ exitoso: false, mensaje: 'El movimiento ya fue dictaminado y no se modificó.' });
      return;
    }
    res.json({ exitoso: true, datos: resultado.movimiento });
  } catch (error) {
    responderErrorInterno(res, 'Error al registrar el dictamen', 'Error interno al registrar el dictamen.', error);
  }
}

export async function getScrapPorLinea(_req: Request, res: Response) {
  try {
    const reporte = await repo.obtenerScrapPorLinea();
    res.json({ exitoso: true, ...reporte });
  } catch (error) {
    responderErrorInterno(res, 'Error al obtener Scrap por línea', 'Error interno al obtener Scrap por línea.', error);
  }
}

export async function getComparativaMensual(req: Request, res: Response) {
  const mes = typeof req.query.mes === 'string' ? req.query.mes : '';
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) {
    res.status(400).json({ exitoso: false, mensaje: 'Indica un mes válido en formato YYYY-MM.' });
    return;
  }

  const [anio, mesNumero] = mes.split('-').map(Number);
  if (anio < 1753 || anio > 9998) {
    res.status(400).json({ exitoso: false, mensaje: 'El año debe estar entre 1753 y 9998.' });
    return;
  }

  const inicioActual = `${mes}-01`;
  const inicioAnterior = new Date(Date.UTC(anio, mesNumero - 2, 1)).toISOString().slice(0, 10);
  const finActual = new Date(Date.UTC(anio, mesNumero, 1)).toISOString().slice(0, 10);

  try {
    const reporte = await repo.obtenerComparativaMensual(inicioAnterior, inicioActual, finActual);
    res.json({ exitoso: true, ...reporte });
  } catch (error) {
    responderErrorInterno(res, 'Error al comparar los meses', 'Error interno al comparar los meses.', error);
  }
}
