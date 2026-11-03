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
