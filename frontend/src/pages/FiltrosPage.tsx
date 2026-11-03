import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MovementFilters, type FiltrosMovimientoUI } from '../components/common/MovementFilters';
import { Pagination } from '../components/common/Pagination';
import { useScrap } from '../context/ScrapContext';
import { ScrapService } from '../services/scrapService';
import type { Movimiento } from '../types';

function diaSiguiente(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia + 1)).toISOString().slice(0, 10);
}

function filtrosIniciales(): FiltrosMovimientoUI {
  return {
    busqueda: '',
    estado: '',
    tipo: '',
    razon: '',
    certificacion: '',
    linea: '',
    almacen: '',
    fechaInicio: '',
    fechaFin: '',
  };
}

export const FiltrosPage: React.FC = () => {
  const { movimientos, movimientosCargando } = useScrap();
  const [filtros, setFiltros] = useState(filtrosIniciales);
  const [resultados, setResultados] = useState<Movimiento[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(25);

  const rangoInicial = useMemo(() => {
    if (movimientos.length === 0) return { fechaInicio: '', fechaFin: '' };
    const fechas = movimientos.map((movimiento) => movimiento.fecha).filter(Boolean).sort();
    const fechaReciente = fechas.at(-1);
    if (!fechaReciente) return { fechaInicio: '', fechaFin: '' };
    const [anio, mes] = fechaReciente.split('-').map(Number);
    return {
      fechaInicio: `${anio}-${String(mes).padStart(2, '0')}-01`,
      fechaFin: new Date(Date.UTC(anio, mes, 0)).toISOString().slice(0, 10),
    };
  }, [movimientos]);
  const filtrosActivos = useMemo(
    () => !filtros.fechaInicio && !filtros.fechaFin ? { ...filtros, ...rangoInicial } : filtros,
    [filtros, rangoInicial],
  );

  const resultadosPagina = useMemo(
    () => (resultados ?? []).slice((pagina - 1) * porPagina, pagina * porPagina),
    [resultados, pagina, porPagina],
  );

  const buscar = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!filtrosActivos.fechaInicio || !filtrosActivos.fechaFin || filtrosActivos.fechaInicio > filtrosActivos.fechaFin) {
      setError('Elige un rango de fechas válido para buscar.');
      return;
    }

    setCargando(true);
    setError(null);
    setResultados(null);
    try {
      const datos = await ScrapService.obtenerMovimientos(
        filtrosActivos.fechaInicio,
        diaSiguiente(filtrosActivos.fechaFin),
        {
          busqueda: filtrosActivos.busqueda.trim() || undefined,
          tipoId: filtrosActivos.tipo || undefined,
          aprobado: filtrosActivos.estado || undefined,
          razonId: filtrosActivos.razon || undefined,
          certificacionId: filtrosActivos.certificacion || undefined,
          lineaId: filtrosActivos.linea || undefined,
          almacen: filtrosActivos.almacen || undefined,
        },
      );
      setResultados(datos);
      setPagina(1);
    } catch (errorCarga) {
      setError(errorCarga instanceof Error ? errorCarga.message : 'No se pudieron cargar los movimientos.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Filtros paso a paso</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Elige primero el mes y luego agrega solo los datos que conozcas. Al tocar “Buscar”, consultaremos únicamente ese rango y esos filtros.
        </p>
      </header>

      <form onSubmit={buscar} className="space-y-4">
        <MovementFilters
          movimientos={movimientos}
          filtros={filtrosActivos}
          onChange={(nuevosFiltros) => {
            setFiltros(nuevosFiltros);
            setResultados(null);
            setError(null);
          }}
          onClear={() => {
            const iniciales = { ...filtrosIniciales(), ...rangoInicial };
            setFiltros(iniciales);
            setResultados(null);
            setError(null);
          }}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={cargando || movimientosCargando || !filtrosActivos.fechaInicio || !filtrosActivos.fechaFin}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Search className="h-4 w-4" />
            {cargando ? 'Buscando…' : 'Buscar movimientos'}
          </button>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            La fecha final también se incluye en la búsqueda.
          </span>
        </div>
      </form>

      {error && <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">{error}</p>}
      {cargando && <p role="status" className="text-sm text-slate-500">Buscando en SQL Server…</p>}
      {resultados && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <h2 className="font-bold text-slate-900 dark:text-white">
              {resultados.length} {resultados.length === 1 ? 'resultado' : 'resultados'}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {filtrosActivos.fechaInicio} a {filtrosActivos.fechaFin}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Folio / serial</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Material</th>
                  <th className="px-4 py-3">Razón</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Piezas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {resultadosPagina.map((movimiento) => (
                  <tr key={movimiento.id}>
                    <td className="px-4 py-3 font-mono">
                      <Link className="font-semibold text-blue-700 hover:underline dark:text-blue-300" to={`/movimientos/${movimiento.id}`}>
                        #{movimiento.id}
                      </Link>
                      <span className="mt-1 block text-xs text-slate-500">{movimiento.serial || 'Sin serial'}</span>
                    </td>
                    <td className="px-4 py-3">{movimiento.fecha}</td>
                    <td className="px-4 py-3 font-mono">{movimiento.matnr}</td>
                    <td className="px-4 py-3">{movimiento.descripcionRazon || 'Sin razón disponible'}</td>
                    <td className="px-4 py-3">{movimiento.estatus}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold">{movimiento.cantidad}</td>
                  </tr>
                ))}
                {resultados.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No encontramos movimientos con esa combinación. Prueba quitando un filtro.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {resultados.length > porPagina && (
            <Pagination
              paginaActual={pagina}
              totalPaginas={Math.ceil(resultados.length / porPagina)}
              totalElementos={resultados.length}
              elementosPorPagina={porPagina}
              onCambiarPagina={setPagina}
              onCambiarElementosPorPagina={(cantidad) => {
                setPorPagina(cantidad);
                setPagina(1);
              }}
            />
          )}
        </section>
      )}
    </div>
  );
};
