import type { CategoriaMotivo, EstatusMovimiento, Turno, MovimientoTipoCatalogo } from '../types';

export const INFO_PLANTA = {
  nombre: 'Planta Saltillo - Carrocerías & Estampado',
  organizacion: 'Magna Exteriors & Stamping Division',
  codigoSapPlanta: '1020',
  sistema: 'SAP S/4HANA & MES Industry 4.0',
  baseDeDatos: 'API corporativa Magna - SOE',
};

export const TURNOS_PLANTA: { id: Turno; etiqueta: string; horario: string }[] = [
  { id: 'Turno 1', etiqueta: 'Primer turno', horario: '06:00 - 14:00' },
  { id: 'Turno 2', etiqueta: 'Segundo turno', horario: '14:00 - 22:00' },
  { id: 'Turno 3', etiqueta: 'Tercer turno', horario: '22:00 - 06:00' },
];

export function obtenerTurnoActual(fecha: Date): Turno {
  const minutosDelDia = fecha.getHours() * 60 + fecha.getMinutes();
  if (minutosDelDia >= 6 * 60 && minutosDelDia < 14 * 60) return 'Turno 1';
  if (minutosDelDia >= 14 * 60 && minutosDelDia < 22 * 60) return 'Turno 2';
  return 'Turno 3';
}

/** Mapa local de nombres para los IDs observados en MovimientoTipoId. */
export const MOVIMIENTO_TIPOS_SSMS: MovimientoTipoCatalogo[] = [
  { id: 1, nombre: 'Scrap', descripcion: 'Descarte total de material sin recuperación', activo: true },
  { id: 2, nombre: 'Retrabajo en Linea', descripcion: 'Recuperación inmediata en celda de producción', activo: true },
  { id: 3, nombre: 'Calidad', descripcion: 'Muestreo para análisis de laboratorio o CMM', activo: true },
  { id: 4, nombre: 'Cuarentena', descripcion: 'Retención de lote preventivo por calidad', activo: true },
  { id: 5, nombre: 'Calidad Reingreso', descripcion: 'Reincorporación de material liberado por calidad', activo: true },
  { id: 6, nombre: 'metal Finish', descripcion: 'Acondicionamiento cosmético o pulido de chapa', activo: true },
  { id: 7, nombre: 'Traspaleo', descripcion: 'Reacomodo logístico de contenedores/racks', activo: true },
  { id: 8, nombre: 'Impresion Parcial', descripcion: 'Falla de marbete o impresión incompleta', activo: true },
];

export const CATEGORIAS_MOTIVOS: CategoriaMotivo[] = [
  'Scrap',
  'Retrabajo en Linea',
  'Calidad',
  'Cuarentena',
  'Calidad Reingreso',
  'metal Finish',
  'Traspaleo',
  'Impresion Parcial',
];

export const LINEAS_PRODUCCION = [
  { id: 'L-01', codigo: 'L-01', nombre: 'L-01 Estampado Pesado Prensa Transfer', area: 'Prensas', supervisor: 'Ing. Rodrigo Salinas', metaScrapMaximo: 1.2 },
  { id: 'L-02', codigo: 'L-02', nombre: 'L-02 Ensamble Carrocerías Delanteras', area: 'Carrocerías', supervisor: 'Ing. Laura Valdés', metaScrapMaximo: 0.8 },
  { id: 'L-03', codigo: 'L-03', nombre: 'L-03 Soldadura Robótica Celdas A/B', area: 'Soldadura', supervisor: 'Ing. Héctor Ramos', metaScrapMaximo: 0.9 },
  { id: 'L-04', codigo: 'L-04', nombre: 'L-04 Pre-Tratamiento y E-Coat Pintura', area: 'Pintura', supervisor: 'Ing. Mariana Soto', metaScrapMaximo: 1.5 },
  { id: 'L-05', codigo: 'L-05', nombre: 'L-05 Metal Finish & Inspección Láser', area: 'Acabados', supervisor: 'Ing. Daniel Morales', metaScrapMaximo: 0.6 },
  { id: 'L-06', codigo: 'L-06', nombre: 'L-06 Puertas y Portones Traseros', area: 'Ensamble', supervisor: 'Ing. Sofía Aguirre', metaScrapMaximo: 1.1 },
  { id: 'L-07', codigo: 'L-07', nombre: 'L-07 Inyección Termoplástica Fascias', area: 'Plásticos', supervisor: 'Ing. Javier Peña', metaScrapMaximo: 1.4 },
];

export const ALMACENES = [
  { codigo: 'ALM-01', nombre: 'Almacén General Materia Prima' },
  { codigo: 'ALM-02', nombre: 'WIP Línea de Producción' },
  { codigo: 'ALM-05', nombre: 'Área de Cuarentena Calidad' },
  { codigo: 'ALM-12', nombre: 'Bahía de Retrabajo Técnico' },
  { codigo: 'ALM-99', nombre: 'Patio de Scrap y Disposición Final' },
];

export const COLORES_ESTATUS: Record<EstatusMovimiento, { bg: string; text: string; border: string; badge: string }> = {
  Pendiente: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-300 dark:border-amber-700/50',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/60',
  },
  Aprobado: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-300 dark:border-emerald-700/50',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/60',
  },
  Rechazado: {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-400',
    border: 'border-rose-300 dark:border-rose-700/50',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 border border-rose-300/60 dark:border-rose-700/60',
  },
  'Sin dictamen': {
    bg: 'bg-slate-50 dark:bg-slate-950/40',
    text: 'text-slate-700 dark:text-slate-400',
    border: 'border-slate-300 dark:border-slate-700/50',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300 border border-slate-300/60 dark:border-slate-700/60',
  },
  'En Cuarentena': {
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-400',
    border: 'border-purple-300 dark:border-purple-700/50',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border border-purple-300/60 dark:border-purple-700/60',
  },
  Retrabajo: {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-300 dark:border-blue-700/50',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-300/60 dark:border-blue-700/60',
  },
};
