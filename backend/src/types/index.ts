export interface MovimientoDB {
  id: number;
  CertificacionId: number;
  MATNR: string;
  fecha_hora: string | Date;
  credencial: string;
  MovimientoTipoId: number;
  cantidad: number;
  salida: boolean;
  retorno: boolean;
  EmpleadoId: string | null;
  Empleado: string | null;
  procesado?: number | null;
  aprobado: number | null; // 0: Pendiente, 1: Aprobado, 2: Procesado, 4: Rechazado
  RazonId: number | null;
  DescripcionRazon?: string | null;
  centro_costo: string | null;
  almacen: string | null;
  serial: string | null;
  MATNR_FG: string | null;
  nvAprobadoPor: string | null;
  dtAprobado: string | Date | null;
}

export interface MovimientoDetalleDTO extends MovimientoDB {
  MovimientoTipoNombre?: string;
  LineaId?: number | null;
  LineaNombre?: string | null;
}

export interface ResumenScrapLineaDB {
  lineaId: number | null;
  lineaNombre: string | null;
  movimientos: number;
  piezasScrap: number;
}

export interface ResumenScrapLineaReporte {
  periodo: { fechaInicio: string; fechaFin: string } | null;
  datos: ResumenScrapLineaDB[];
}

export interface ComparativaMensualDB {
  grafica: 'tendencia' | 'certificacion' | 'razon' | 'linea';
  periodo: 'actual' | 'anterior';
  categoria: string;
  movimientos: number;
  piezas: number;
}

export interface ComparativaMensualReporte {
  periodos: {
    actual: { fechaInicio: string; fechaFin: string };
    anterior: { fechaInicio: string; fechaFin: string };
  };
  datos: ComparativaMensualDB[];
}

export interface OpcionRazonDB {
  id: number;
  descripcion: string;
}

export type PeriodoPrecioScrap = 'mes' | 'dos-meses' | 'seis-meses' | 'anio' | 'historico';

export interface PrecioScrapDB {
  id: number;
  fecha: string;
  matnr: string | null;
  serial: string | null;
  cantidad: number | string;
  precioUnitarioUSD: number | string | null;
  totalUSD: number | string | null;
}

export interface PrecioScrapResumenDB {
  totalMovimientos: number | string;
  piezasValorizadas: number | string;
  piezasSinPrecio: number | string;
  valorTotalUSD: number | string;
  precioPromedioUSD: number | string | null;
}

export interface ReportePrecioScrap {
  resumen?: {
    totalMovimientos: number;
    piezasValorizadas: number;
    piezasSinPrecio: number;
    valorTotalUSD: number;
    precioPromedioUSD: number | null;
  };
  datos: {
    id: number;
    fecha: string;
    matnr: string;
    serial: string;
    cantidad: number;
    precioUnitarioUSD: number | null;
    totalUSD: number | null;
  }[];
  pagina: number;
  limite: number;
}

export interface FiltrosMovimientosQuery {
  busqueda?: string;
  tipoId?: string;
  aprobado?: string;
  razonId?: string;
  certificacionId?: string;
  lineaId?: string;
  almacen?: string;
  fechaInicio?: string;
  fechaFin?: string;
  limite?: string;
  pagina?: string;
}
