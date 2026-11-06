export type EstatusMovimiento = 'Pendiente' | 'Aprobado' | 'Procesado' | 'Rechazado' | 'Otro estado' | 'Sin dictamen' | 'En Cuarentena' | 'Retrabajo';

export type CategoriaMotivo = 
  | 'Scrap'
  | 'Retrabajo en Linea'
  | 'Calidad'
  | 'Cuarentena'
  | 'Calidad Reingreso'
  | 'metal Finish'
  | 'Traspaleo'
  | 'Impresion Parcial'
  | 'Reingreso Parcial'
  | 'Tipo desconocido';

export type SeveridadMotivo = 'Crítica' | 'Alta' | 'Media' | 'Baja';

export type Turno = 'Turno 1' | 'Turno 2' | 'Turno 3';

/**
 * Representa una Razón de falla o scrap en dbo.EtiquetasCI
 */
export interface RazonCatalogo {
  id?: number;
  idMovimiento?: number | null;
  idRazon: number;
  descripcion: string;
  ccSugerido?: string | null;
  notifica?: string | null;
  puntaCola?: string | null;
  activo?: boolean;
}

/**
 * Representa un Tipo de Movimiento en dbo.MovimientoTipo
 */
export interface MovimientoTipoCatalogo {
  id: number;
  nombre: CategoriaMotivo;
  descripcion?: string | null;
  activo: boolean;
}

export interface Motivo {
  id: string;
  codigo: string;
  razonId: number;
  nombre: string;
  categoria: CategoriaMotivo;
  descripcion: string;
  severidad: SeveridadMotivo;
  activo: boolean;
  costoDefectoPromedio?: number;
}

export interface HitoHistorial {
  id: string;
  titulo: string;
  descripcion: string;
  fechaHora: string;
  usuario: string;
  rol: string;
  estado: 'completado' | 'actual' | 'pendiente' | 'rechazado';
}

export interface UsuarioAutenticado {
  id: string;
  nombre: string;
  rol: 'Administrador' | 'Gerente' | 'Superintendente';
}

export interface MovimientoDB {
  id: number;
  CertificacionId: number;
  LineaId?: number | null;
  MATNR: string;
  fecha_hora: string;
  credencial: string;
  MovimientoTipoId: number;
  cantidad: number;
  salida: boolean;
  retorno: boolean;
  EmpleadoId: string | null;
  Empleado: string | null;
  procesado: number | null;
  aprobado: number | null;
  LineaNombre?: string | null;
  RazonId: number | null;
  DescripcionRazon?: string | null;
  centro_costo: string | null;
  almacen: string | null;
  serial: string | null;
  MATNR_FG: string | null;
  nvAprobadoPor: string | null;
  dtAprobado: string | null;
}

/**
 * Modelo de Movimiento alineado a la tabla dbo.Movimientos de SQL Server Management Studio
 */
export interface Movimiento {
  datosDB?: MovimientoDB;
  // Columnas exactas de dbo.Movimientos
  id: string; // id PK
  certificacionId: number; // CertificacionId (FK)
  certificacionNombre?: string;
  matnr: string; // MATNR (varchar 50)
  fechaHora: string; // fecha_hora (datetime)
  credencial: string; // credencial (varchar 50)
  movimientoTipoId: number; // MovimientoTipoId (FK) (1..8)
  movimientoTipo: CategoriaMotivo;
  cantidad: number; // cantidad (int)
  salida?: boolean; // salida (bit)
  retorno?: boolean; // retorno (bit)
  empleadoId?: string; // EmpleadoId (varchar 50)
  empleado: string; // Empleado (varchar 250)
  procesado?: number; // procesado (int)
  aprobado: number | null; // aprobado (int: 0=Pendiente, 1=Aprobado, 2=Procesado, 4=Rechazado)
  razonId: number | null; // RazonId (int) -> dbo.EtiquetasCI
  descripcionRazon?: string;
  motivoEspecifico: string; // Descripción de la Razón
  centroCosto?: string; // centro_costo (varchar 50)
  almacen: string; // almacen (varchar 50)
  serial: string; // serial (varchar 50) -> Etiqueta impresa
  matnrFg?: string; // MATNR_FG (varchar 50)
  nvAprobadoPor?: string; // nvAprobadoPor (nvarchar 200)
  dtAprobado?: string; // dtAprobado (datetime)

  // Campos complementarios de UI y reglas de negocio
  descripcion: string; // Nombre descriptivo del componente
  fecha: string; // YYYY-MM-DD
  hora: string;  // HH:mm
  linea: string;
  almacenSalida?: string;
  almacenRetorno?: string;
  estatus: EstatusMovimiento;
  turno?: Turno;
  unidad: string;
  costoUnitario: number;
  costoTotal: number;
  ordenProduccion?: string;
  lote?: string;
  observaciones?: string;
  comentariosAprobacion?: string;
  comentarioRechazo?: string;
  historial: HitoHistorial[];
}

export interface ResumenScrapLinea {
  lineaId: number | null;
  lineaNombre: string | null;
  movimientos: number;
  piezasScrap: number;
}

export interface ReporteScrapLinea {
  periodo: { fechaInicio: string; fechaFin: string } | null;
  datos: ResumenScrapLinea[];
}

export type PeriodoPrecioScrap = 'mes' | 'dos-meses' | 'seis-meses' | 'anio' | 'historico';

export interface FilaPrecioScrap {
  id: number;
  fecha: string;
  matnr: string;
  serial: string;
  cantidad: number;
  precioUnitarioUSD: number | null;
  totalUSD: number | null;
}

export interface ReportePrecioScrap {
  resumen?: {
    totalMovimientos: number;
    piezasValorizadas: number;
    piezasSinPrecio: number;
    valorTotalUSD: number;
    precioPromedioUSD: number | null;
  };
  datos: FilaPrecioScrap[];
  pagina: number;
  limite: number;
}

export interface ComparativaMensualDato {
  grafica: 'tendencia' | 'certificacion' | 'razon' | 'linea';
  periodo: 'actual' | 'anterior';
  categoria: string;
  movimientos: number;
  piezas: number;
}

export interface ComparativaMensual {
  periodos: {
    actual: { fechaInicio: string; fechaFin: string };
    anterior: { fechaInicio: string; fechaFin: string };
  };
  datos: ComparativaMensualDato[];
}

export interface OpcionRazon {
  id: number;
  descripcion: string;
}

export interface LineaProduccion {
  id: string;
  codigo: string;
  nombre: string;
  area: string;
  supervisor: string;
  metaScrapMaximo: number;
}

export interface Notificacion {
  id: string;
  tipo: 'alerta' | 'aprobacion' | 'sistema' | 'critico';
  titulo: string;
  mensaje: string;
  tiempo: string;
  leido: boolean;
  movimientoId?: string;
}

export interface FiltrosMovimientos {
  busqueda: string;
  linea: string;
  estatus: string;
  movimientoTipo: string;
  razonId: string;
  turno: string;
  fechaInicio: string;
  fechaFin: string;
}

export interface ResumenKPIs {
  scrapHoyPzas: number;
  scrapHoyCosto: number;
  pendientesAprobar: number;
  aprobadosHoy: number;
  rechazadosHoy: number;
  tasaScrapGeneral: number;
  comparativaAyer: number;
}

export interface BackendDbStatus {
  connected: boolean;
  server: string;
  databaseName: string;
  tableTarget: string;
  mode: string;
  lastError?: string | null;
}
