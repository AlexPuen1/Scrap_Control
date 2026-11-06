import type {
  ComparativaMensual,
  Movimiento,
  MovimientoDB,
  OpcionRazon,
  PeriodoPrecioScrap,
  ReportePrecioScrap,
  ReporteScrapLinea,
  UsuarioAutenticado,
} from '../types';
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
const solicitudesGetEnCurso = new Map<string, Promise<Response>>();

async function solicitarGet(url: string): Promise<Response> {
  let solicitud = solicitudesGetEnCurso.get(url);
  if (!solicitud) {
    solicitud = fetch(url, { credentials: 'include' });
    solicitudesGetEnCurso.set(url, solicitud);
  }

  try {
    // Each consumer needs its own body stream, while concurrent identical GETs share the network request.
    return (await solicitud).clone();
  } finally {
    if (solicitudesGetEnCurso.get(url) === solicitud) {
      solicitudesGetEnCurso.delete(url);
    }
  }
}

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
  const response = await solicitarGet(`${API_BASE}/movimientos${query}`);
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
  const response = await solicitarGet(`${API_BASE}/movimientos/aprobaciones${query}`);
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
  const response = await solicitarGet(`${API_BASE}/movimientos/${encodeURIComponent(id)}`);
  const body = await response.json() as { exitoso: boolean; datos?: MovimientoDB; mensaje?: string };
  if (!response.ok || !body.exitoso || !body.datos) {
    throw new Error(body.mensaje || `No se pudo cargar el movimiento (HTTP ${response.status}).`);
  }
  return adaptarMovimiento(body.datos);
}

async function solicitarUsuarioAutenticado(): Promise<UsuarioAutenticado> {
  const response = await solicitarGet(`${API_BASE}/auth/me`);
  const body = await response.json() as {
    exitoso: boolean;
    usuario?: UsuarioAutenticado;
    mensaje?: string;
  };
  if (!response.ok || !body.exitoso || !body.usuario) {
    throw new Error(body.mensaje || `No se pudo verificar la cuenta de Windows (HTTP ${response.status}).`);
  }
  return body.usuario;
}

async function enviarCredenciales(usuario: string, contrasena: string): Promise<UsuarioAutenticado> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario, contrasena }),
  });
  const body = await response.json() as { exitoso: boolean; usuario?: UsuarioAutenticado; mensaje?: string };
  if (!response.ok || !body.exitoso || !body.usuario) {
    throw new Error(body.mensaje || `No se pudo iniciar sesión (HTTP ${response.status}).`);
  }
  return body.usuario;
}

async function iniciarSesionWindows(): Promise<UsuarioAutenticado> {
  const response = await fetch(`${API_BASE}/auth/windows`, { credentials: 'include' });
  const body = await response.json() as { exitoso: boolean; usuario?: UsuarioAutenticado; mensaje?: string };
  if (!response.ok || !body.exitoso || !body.usuario) {
    throw new Error(body.mensaje || `No se pudo iniciar sesión con Windows (HTTP ${response.status}).`);
  }
  return body.usuario;
}

async function cerrarSesion(): Promise<void> {
  const response = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) throw new Error(`No se pudo cerrar sesión (HTTP ${response.status}).`);
}

async function enviarDictamen(id: string, aprobado: 1 | 4): Promise<Movimiento> {
  const response = await fetch(`${API_BASE}/movimientos/${encodeURIComponent(id)}/dictamen`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ aprobado }),
  });
  const body = await response.json() as { exitoso: boolean; datos?: MovimientoDB; mensaje?: string };
  if (!response.ok || !body.exitoso || !body.datos) {
    throw new Error(body.mensaje || `No se pudo registrar el dictamen (HTTP ${response.status}).`);
  }
  return adaptarMovimiento(body.datos);
}

async function solicitarScrapPorLinea(): Promise<ReporteScrapLinea> {
  const response = await solicitarGet(`${API_BASE}/movimientos/fallas-por-linea`);
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

async function solicitarPreciosScrap(
  periodo: PeriodoPrecioScrap,
  pagina: number,
  limite: number,
  incluirResumen: boolean,
): Promise<ReportePrecioScrap> {
  const parametros = new URLSearchParams({
    periodo,
    pagina: String(pagina),
    limite: String(limite),
    incluirResumen: String(incluirResumen),
  });
  const response = await solicitarGet(`${API_BASE}/movimientos/precios?${parametros.toString()}`);
  const body = await response.json() as {
    exitoso: boolean;
    resumen?: ReportePrecioScrap['resumen'];
    datos?: ReportePrecioScrap['datos'];
    pagina?: number;
    limite?: number;
    mensaje?: string;
  };
  if (!response.ok || !body.exitoso || (incluirResumen && !body.resumen) || !body.datos
    || body.pagina === undefined || body.limite === undefined) {
    throw new Error(body.mensaje || `No se pudieron cargar los precios (HTTP ${response.status}).`);
  }
  return {
    resumen: body.resumen,
    datos: body.datos,
    pagina: body.pagina,
    limite: body.limite,
  };
}

async function solicitarComparativaMensual(mes: string): Promise<ComparativaMensual> {
  const parametros = new URLSearchParams({ mes });
  const response = await solicitarGet(`${API_BASE}/movimientos/comparativa-mensual?${parametros.toString()}`);
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
  const response = await solicitarGet(`${API_BASE}/movimientos/razones?${parametros.toString()}`);
  const body = await response.json() as { exitoso: boolean; datos?: OpcionRazon[]; mensaje?: string };
  if (!response.ok || !body.exitoso || !body.datos) {
    throw new Error(body.mensaje || `No se pudieron cargar las opciones de razón (HTTP ${response.status}).`);
  }
  return body.datos;
}

async function enviarActualizacionRazon(id: string, razonId: number | null): Promise<Movimiento> {
  const response = await fetch(`${API_BASE}/movimientos/${encodeURIComponent(id)}/razon`, {
    method: 'PATCH',
    credentials: 'include',
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
  obtenerUsuarioAutenticado: () => solicitarUsuarioAutenticado(),
  iniciarSesion: (usuario: string, contrasena: string) => enviarCredenciales(usuario, contrasena),
  iniciarSesionWindows: () => iniciarSesionWindows(),
  cerrarSesion: () => cerrarSesion(),
  obtenerMovimientos: (fechaInicio?: string, fechaFin?: string, filtros?: FiltrosBusquedaMovimientos) =>
    solicitarMovimientos(fechaInicio, fechaFin, filtros),
  obtenerAprobaciones: (fechaInicio?: string, fechaFin?: string) => solicitarAprobaciones(fechaInicio, fechaFin),
  obtenerMovimiento: (id: string) => solicitarMovimiento(id),

  obtenerScrapPorLinea: () => solicitarScrapPorLinea(),
  obtenerPreciosScrap: (periodo: PeriodoPrecioScrap, pagina: number, limite: number, incluirResumen = true) =>
    solicitarPreciosScrap(periodo, pagina, limite, incluirResumen),
  obtenerComparativaMensual: (mes: string) => solicitarComparativaMensual(mes),
  obtenerRazones: (movimientoTipoId: number) => solicitarRazones(movimientoTipoId),
  actualizarRazon: (id: string, razonId: number | null) => enviarActualizacionRazon(id, razonId),

  aprobarMovimiento: (id: string) => enviarDictamen(id, 1),

  rechazarMovimiento: (id: string) => enviarDictamen(id, 4),
};
