import React, { useEffect, useRef, useState } from 'react';
import { Boxes, CircleDollarSign, PackageCheck, PackageX, RefreshCw } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Pagination } from '../components/common/Pagination';
import { StatCard } from '../components/common/StatCard';
import { ScrapService } from '../services/scrapService';
import type { PeriodoPrecioScrap, ReportePrecioScrap } from '../types';
import { formatearMoneda } from '../utils/formatters';

const PERIODOS: { valor: PeriodoPrecioScrap; etiqueta: string }[] = [
  { valor: 'mes', etiqueta: 'Mes actual' },
  { valor: 'dos-meses', etiqueta: 'Últimos 2 meses' },
  { valor: 'seis-meses', etiqueta: 'Últimos 6 meses' },
  { valor: 'anio', etiqueta: 'Año a la fecha' },
  { valor: 'historico', etiqueta: 'Histórico completo' },
];

const formatoMonedaTarjeta = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

function formatearFecha(fecha: Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(fecha);
}

function obtenerRangoPeriodo(periodo: PeriodoPrecioScrap): string {
  const hoy = new Date();
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  if (periodo === 'dos-meses') inicio.setMonth(inicio.getMonth() - 1);
  if (periodo === 'seis-meses') inicio.setMonth(inicio.getMonth() - 5);
  if (periodo === 'anio') inicio.setMonth(0);

  if (periodo === 'historico') {
    return `Todo el histórico hasta ${formatearFecha(hoy)}`;
  }

  return `${formatearFecha(inicio)} – ${formatearFecha(hoy)}`;
}

export const PrecioPage: React.FC = () => {
  const [periodo, setPeriodo] = useState<PeriodoPrecioScrap>('mes');
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState(10);
  const [intento, setIntento] = useState(0);
  const resumenesRef = useRef<Partial<Record<PeriodoPrecioScrap, NonNullable<ReportePrecioScrap['resumen']>>>>({});
  const [resumenes, setResumenes] = useState<Partial<Record<PeriodoPrecioScrap, NonNullable<ReportePrecioScrap['resumen']>>>>({});
  const claveConsulta = `${periodo}|${pagina}|${limite}|${intento}`;
  const [respuesta, setRespuesta] = useState<{
    clave: string;
    reporte?: ReportePrecioScrap;
    error?: string;
  } | null>(null);

  useEffect(() => {
    let vigente = true;
    const incluirResumen = !resumenesRef.current[periodo];
    ScrapService.obtenerPreciosScrap(periodo, pagina, limite, incluirResumen)
      .then((resultado) => {
        if (vigente) {
          if (resultado.resumen) {
            resumenesRef.current[periodo] = resultado.resumen;
            setResumenes((actuales) => ({ ...actuales, [periodo]: resultado.resumen }));
          }
          setRespuesta({ clave: claveConsulta, reporte: resultado });
        }
      })
      .catch((errorConsulta: unknown) => {
        if (vigente) {
          setRespuesta({
            clave: claveConsulta,
            error: errorConsulta instanceof Error
              ? errorConsulta.message
              : 'No se pudieron consultar los precios.',
          });
        }
      });

    return () => {
      vigente = false;
    };
  }, [periodo, pagina, limite, intento, claveConsulta]);

  const cargando = respuesta?.clave !== claveConsulta;
  const reporte = cargando ? null : respuesta?.reporte ?? null;
  const error = cargando ? null : respuesta?.error ?? null;
  const resumen = resumenes[periodo];

  const cambiarPeriodo = (nuevoPeriodo: PeriodoPrecioScrap) => {
    setPeriodo(nuevoPeriodo);
    setPagina(1);
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Precio de Scrap
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            Valorización estimada en USD: piezas Scrap × precio unitario de InventarioDB.
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
          Periodo
          <select
            aria-label="Periodo de precios"
            value={periodo}
            onChange={(event) => cambiarPeriodo(event.target.value as PeriodoPrecioScrap)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            {PERIODOS.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>
            ))}
          </select>
        </label>
      </header>

      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
        El precio se relaciona por MATNR. Si el material tiene varias semanas en el inventario, se usa una sola vez el VAL_UNIT de su semana más reciente; así cada movimiento y sus piezas se cuentan una sola vez. Los materiales sin precio quedan fuera del total USD.
      </div>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
          <span>{error}</span>
          <Button variant="outline" size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => setIntento((actual) => actual + 1)}>
            Reintentar
          </Button>
        </div>
      )}

      {cargando && <p role="status" className="text-sm text-slate-500 dark:text-slate-400">Consultando datos de precios…</p>}
      {!resumen && cargando && <p role="status" className="text-sm text-slate-500 dark:text-slate-400">Calculando resumen del periodo…</p>}

      {resumen && (
        <>
          {resumen.totalMovimientos > 0 && resumen.piezasValorizadas === 0 && (
            <div role="status" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              No hay VAL_UNIT disponible para los MATNR de estos movimientos. Se muestran como “Sin precio”.
            </div>
          )}
          <section aria-label="Resumen de precios" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              titulo="Valor total Scrap"
              valor={formatoMonedaTarjeta.format(resumen.valorTotalUSD)}
              subvalor="Suma de cantidad × VAL_UNIT"
              icono={<CircleDollarSign className="h-6 w-6" />}
              colorAccent="rose"
              stacked
              valorClassName="text-2xl sm:text-3xl whitespace-nowrap"
            />
            <StatCard
              titulo="Piezas valorizadas"
              valor={`${resumen.piezasValorizadas.toLocaleString('es-MX')} piezas`}
              subvalor="Con precio disponible por MATNR"
              icono={<PackageCheck className="h-6 w-6" />}
              colorAccent="emerald"
              stacked
              valorClassName="text-2xl sm:text-3xl"
            />
            <StatCard
              titulo="Piezas sin precio"
              valor={`${resumen.piezasSinPrecio.toLocaleString('es-MX')} piezas`}
              subvalor="Sin coincidencia de MATNR con precio"
              icono={<PackageX className="h-6 w-6" />}
              colorAccent="amber"
              stacked
              valorClassName="text-2xl sm:text-3xl"
            />
            <StatCard
              titulo="Precio promedio"
              valor={resumen.precioPromedioUSD === null
                ? '—'
                : formatoMonedaTarjeta.format(resumen.precioPromedioUSD)}
              subvalor="USD por pieza valorizada · ponderado"
              icono={<Boxes className="h-6 w-6" />}
              colorAccent="blue"
              stacked
              valorClassName="text-2xl sm:text-3xl whitespace-nowrap"
            />
          </section>

          {reporte && <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Detalle de movimientos Scrap</h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Periodo: {obtenerRangoPeriodo(periodo)}</span>
                  {' · '}{resumen.totalMovimientos.toLocaleString('es-MX')} movimientos
                </p>
              </div>
            </div>
            {reporte.datos.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] table-fixed text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 dark:bg-slate-950/60 dark:text-slate-400">
                      <tr>
                        <th className="w-32 px-4 py-3 font-semibold">Fecha</th>
                        <th className="w-48 px-4 py-3 font-semibold">MATNR</th>
                        <th className="w-44 px-4 py-3 font-semibold">Serial</th>
                        <th className="w-24 px-4 py-3 text-right font-semibold">Piezas</th>
                        <th className="w-52 px-4 py-3 text-right font-semibold">Precio unitario USD</th>
                        <th className="w-52 px-4 py-3 text-right font-semibold">Total USD</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 dark:divide-slate-800 dark:text-slate-300">
                      {reporte.datos.map((fila) => (
                        <tr key={fila.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="whitespace-nowrap px-4 py-3">{fila.fecha}</td>
                          <td className="truncate px-4 py-3 font-mono" title={fila.matnr}>{fila.matnr || '—'}</td>
                          <td className="truncate px-4 py-3 font-mono" title={fila.serial}>{fila.serial || '—'}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{fila.cantidad.toLocaleString('es-MX')}</td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {fila.precioUnitarioUSD === null ? 'Sin precio' : formatearMoneda(fila.precioUnitarioUSD)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums">
                            {fila.totalUSD === null ? '—' : formatearMoneda(fila.totalUSD)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  paginaActual={pagina}
                  totalPaginas={Math.ceil(resumen.totalMovimientos / limite)}
                  totalElementos={resumen.totalMovimientos}
                  elementosPorPagina={limite}
                  onCambiarPagina={setPagina}
                  onCambiarElementosPorPagina={(nuevoLimite) => {
                    setLimite(nuevoLimite);
                    setPagina(1);
                  }}
                />
              </>
            ) : (
              <p className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                No hay movimientos Scrap en el periodo seleccionado.
              </p>
            )}
          </div>}
        </>
      )}
    </div>
  );
};
