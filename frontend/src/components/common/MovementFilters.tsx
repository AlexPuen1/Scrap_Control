import React from 'react';
import { CalendarDays, RotateCcw, Search } from 'lucide-react';
import type { Movimiento } from '../../types';

export interface FiltrosMovimientoUI {
  busqueda: string;
  estado: string;
  tipo: string;
  razon: string;
  certificacion: string;
  linea: string;
  almacen: string;
  fechaInicio: string;
  fechaFin: string;
}

interface MovementFiltersProps {
  movimientos: Movimiento[];
  filtros: FiltrosMovimientoUI;
  onChange: (filtros: FiltrosMovimientoUI) => void;
  onClear: () => void;
  className?: string;
}

const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

export const MovementFilters: React.FC<MovementFiltersProps> = ({
  movimientos,
  filtros,
  onChange,
  onClear,
  className = '',
}) => {
  const cambiar = (campo: keyof FiltrosMovimientoUI, valor: string) => {
    onChange({ ...filtros, [campo]: valor });
  };
  const valoresUnicos = (valores: (string | number | null | undefined)[]) => [...new Set(
    valores.filter((valor): valor is string | number => valor !== null && valor !== undefined && String(valor).trim() !== ''),
  )].sort((a, b) => String(a).localeCompare(String(b), 'es', { numeric: true }));
  const tipos = valoresUnicos(movimientos.map((movimiento) => movimiento.movimientoTipoId));
  const razones = valoresUnicos(movimientos
    .filter((movimiento) => !filtros.tipo || String(movimiento.movimientoTipoId) === filtros.tipo)
    .map((movimiento) => movimiento.razonId));
  const hayMovimientosSinRazon = movimientos.some((movimiento) =>
    (!filtros.tipo || String(movimiento.movimientoTipoId) === filtros.tipo) && movimiento.razonId === null,
  );
  const certificaciones = valoresUnicos(movimientos.map((movimiento) => movimiento.certificacionId));
  const lineas = valoresUnicos(movimientos.map((movimiento) => movimiento.datosDB?.LineaId));
  const almacenes = valoresUnicos(movimientos.map((movimiento) => movimiento.almacen));
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Encuentra un movimiento</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Escribe o elige solo lo que recuerdes. Los demás filtros pueden quedarse en “Todos”.
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/40"
        >
          <RotateCcw className="h-4 w-4" /> Limpiar filtros
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="sm:col-span-2">
          <span className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">1. Folio, serial o material</span>
          <span className="relative block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              aria-label="Buscar folio, serial o material"
              value={filtros.busqueda}
              onChange={(event) => cambiar('busqueda', event.target.value)}
              placeholder="Ejemplo: 12345, SER-100 o MAT-200"
              className={`${inputClass} pl-9`}
            />
          </span>
        </label>

        <label>
          <span className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">2. Desde</span>
          <span className="relative block">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              aria-label="Fecha desde"
              value={filtros.fechaInicio}
              max={filtros.fechaFin || undefined}
              onChange={(event) => cambiar('fechaInicio', event.target.value)}
              className={`${inputClass} pl-9`}
            />
          </span>
        </label>
        <label>
          <span className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">3. Hasta</span>
          <span className="relative block">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              aria-label="Fecha hasta"
              value={filtros.fechaFin}
              min={filtros.fechaInicio || undefined}
              onChange={(event) => cambiar('fechaFin', event.target.value)}
              className={`${inputClass} pl-9`}
            />
          </span>
        </label>

        <label>
          <span className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">4. Estado</span>
          <select aria-label="Filtrar por estado" value={filtros.estado} onChange={(event) => cambiar('estado', event.target.value)} className={inputClass}>
            <option value="">Todos los estados</option>
            <option value="0">Pendiente</option>
            <option value="1">Aprobado</option>
            <option value="4">Rechazado</option>
            <option value="2">Procesado</option>
            <option value="null">Sin dictamen</option>
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">5. Tipo de movimiento</span>
          <select aria-label="Filtrar por tipo de movimiento" value={filtros.tipo} onChange={(event) => {
            onChange({ ...filtros, tipo: event.target.value, razon: '' });
          }} className={inputClass}>
            <option value="">Todos los tipos</option>
            {tipos.map((tipo) => {
              const movimiento = movimientos.find((item) => String(item.movimientoTipoId) === String(tipo));
              return <option key={tipo} value={String(tipo)}>{movimiento?.movimientoTipo ?? `Tipo ${tipo}`}</option>;
            })}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">6. Razón</span>
          <select aria-label="Filtrar por razón" value={filtros.razon} disabled={!filtros.tipo} onChange={(event) => cambiar('razon', event.target.value)} className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}>
            <option value="">{filtros.tipo ? 'Todas las razones' : 'Primero elige un tipo'}</option>
            {hayMovimientosSinRazon && <option value="null">Sin razón</option>}
            {razones.map((razon) => {
              const movimiento = movimientos.find((item) => String(item.razonId) === String(razon));
              return <option key={razon} value={String(razon)}>{movimiento?.descripcionRazon || `Razón ${razon}`}</option>;
            })}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">7. Certificación</span>
          <select aria-label="Filtrar por certificación" value={filtros.certificacion} onChange={(event) => cambiar('certificacion', event.target.value)} className={inputClass}>
            <option value="">Todas las certificaciones</option>
            {certificaciones.map((id) => <option key={id} value={String(id)}>Certificación {id}</option>)}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">8. Línea</span>
          <select aria-label="Filtrar por línea" value={filtros.linea} onChange={(event) => cambiar('linea', event.target.value)} className={inputClass}>
            <option value="">Todas las líneas</option>
            {lineas.map((id) => {
              const movimiento = movimientos.find((item) => String(item.datosDB?.LineaId) === String(id));
              return <option key={id} value={String(id)}>{movimiento?.datosDB?.LineaNombre || `Línea ${id}`}</option>;
            })}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">9. Almacén</span>
          <select aria-label="Filtrar por almacén" value={filtros.almacen} onChange={(event) => cambiar('almacen', event.target.value)} className={inputClass}>
            <option value="">Todos los almacenes</option>
            {almacenes.map((almacen) => <option key={almacen} value={String(almacen)}>{almacen}</option>)}
          </select>
        </label>
      </div>
    </section>
  );
};
