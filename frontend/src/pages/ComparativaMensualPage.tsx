import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, RefreshCw, TrendingUp } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { ChartExplanation } from '../components/common/ChartExplanation';
import { useScrap } from '../context/ScrapContext';
import { ScrapService } from '../services/scrapService';
import type { ComparativaMensual, ComparativaMensualDato } from '../types';
import { formatearNumero } from '../utils/formatters';

type GraficaKey = ComparativaMensualDato['grafica'];
type PeriodoKey = ComparativaMensualDato['periodo'];
type PuntoComparacion = { categoria: string; actual: number; anterior: number };

const GRAFICAS: { key: GraficaKey; titulo: string; descripcion: string; explicacion: string }[] = [
  {
    key: 'tendencia',
    titulo: 'Tendencia diaria de Scrap',
    descripcion: 'Piezas tipo Scrap por día; se compara el día del mes, no fechas consecutivas.',
    explicacion: 'Cada grupo de barras representa un día del mes y muestra las piezas Scrap registradas. Se comparan días con el mismo número (por ejemplo, día 5 contra día 5); los meses pueden tener distinta cantidad de días.',
  },
  {
    key: 'certificacion',
    titulo: 'Piezas por certificación',
    descripcion: 'Cantidad de piezas agrupadas por CertificacionId.',
    explicacion: 'Cada grupo corresponde al número de certificación y suma piezas de todos los tipos de movimiento. Las barras grises son del mes anterior y las azules del seleccionado.',
  },
  {
    key: 'razon',
    titulo: 'Piezas por razón',
    descripcion: 'Piezas tipo Scrap agrupadas por RazonId; “Sin razón” se conserva como categoría.',
    explicacion: 'Cada grupo muestra cuántas piezas Scrap se asociaron a una razón. Compara las barras grises (mes anterior) y azules (mes seleccionado); «Sin razón» identifica registros sin razón asignada.',
  },
  {
    key: 'linea',
    titulo: 'Fallas por línea',
    descripcion: 'Cantidad de piezas Scrap agrupada por nombre y número de línea.',
    explicacion: 'Cada grupo representa el identificador de línea y suma piezas de movimientos tipo Scrap. Las barras grises corresponden al mes anterior y las azules al seleccionado; los datos no explican por sí mismos la causa de la diferencia.',
  },
];

function mesActualLocal(): string {
  const ahora = new Date();
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
}

function mesDeFecha(fecha: string): string {
  return fecha.slice(0, 7);
}

function etiquetaCategoria(grafica: GraficaKey, categoria: string): string {
  if (grafica === 'tendencia') return `Día ${categoria.slice(-2)}`;
  if (grafica === 'razon' && categoria === 'Sin razon') return 'Sin razón';
  if (grafica === 'linea' && categoria === 'Sin linea asignada') return 'Sin línea asignada';
  if (grafica === 'linea') return `Línea ${categoria}`;
  return categoria;
}

function obtenerPuntos(datos: ComparativaMensualDato[], grafica: GraficaKey): PuntoComparacion[] {
  const porCategoria = new Map<string, PuntoComparacion>();
  datos.filter((fila) => fila.grafica === grafica).forEach((fila) => {
    const categoria = grafica === 'tendencia' ? fila.categoria.slice(-2) : fila.categoria;
    const punto = porCategoria.get(categoria) ?? { categoria, actual: 0, anterior: 0 };
    punto[fila.periodo] += fila.piezas;
    porCategoria.set(categoria, punto);
  });

  return [...porCategoria.values()].sort((a, b) => {
    if (grafica === 'tendencia') return Number(a.categoria) - Number(b.categoria);
    return Math.max(b.actual, b.anterior) - Math.max(a.actual, a.anterior);
  });
}

function obtenerPico(puntos: PuntoComparacion[], periodo: PeriodoKey): PuntoComparacion | null {
  if (puntos.length === 0) return null;
  const pico = puntos.reduce((mayor, punto) => punto[periodo] > mayor[periodo] ? punto : mayor);
  return pico[periodo] > 0 ? pico : null;
}

function formatoVariacion(actual: number, anterior: number): string {
  if (anterior === 0) {
    return actual === 0 ? 'Sin variación calculable' : 'Sin base previa para calcular porcentaje';
  }
  const cambio = ((actual - anterior) / anterior) * 100;
  const signo = cambio > 0 ? '+' : '';
  return `${signo}${cambio.toLocaleString('es-MX', { maximumFractionDigits: 1 })}%`;
}

function periodosPresentacion(reporte: ComparativaMensual): string {
  const { actual, anterior } = reporte.periodos;
  return `${anterior.fechaInicio}–${anterior.fechaFin} vs. ${actual.fechaInicio}–${actual.fechaFin}`;
}

export const ComparativaMensualPage: React.FC = () => {
  const { movimientos, movimientosCargando } = useScrap();
  const mesPredeterminado = useMemo(() => {
    const fechaMaxima = movimientos.reduce(
      (maxima, movimiento) => movimiento.fecha > maxima ? movimiento.fecha : maxima,
      '',
    );
    return fechaMaxima ? mesDeFecha(fechaMaxima) : mesActualLocal();
  }, [movimientos]);
  const [mesElegido, setMesElegido] = useState<string | null>(null);
  const mes = mesElegido ?? mesPredeterminado;
  const [respuesta, setRespuesta] = useState<{
    mes: string;
    intento: number;
    resultado: { reporte: ComparativaMensual } | { error: string };
  } | null>(null);
  const [reintento, setReintento] = useState(0);

  useEffect(() => {
    if (movimientosCargando || !/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return;
    let vigente = true;
    ScrapService.obtenerComparativaMensual(mes)
      .then((datos) => {
        if (vigente) setRespuesta({ mes, intento: reintento, resultado: { reporte: datos } });
      })
      .catch((errorCarga: unknown) => {
        if (vigente) {
          setRespuesta({
            mes,
            intento: reintento,
            resultado: { error: errorCarga instanceof Error ? errorCarga.message : 'No se pudo consultar la comparación mensual.' },
          });
        }
      });
    return () => {
      vigente = false;
    };
  }, [mes, reintento, movimientosCargando]);

  const consultaActual = respuesta?.mes === mes && respuesta.intento === reintento
    ? respuesta.resultado
    : null;
  const cargando = !movimientosCargando && Boolean(mes) && consultaActual === null;
  const reporte = consultaActual && 'reporte' in consultaActual ? consultaActual.reporte : null;
  const error = consultaActual && 'error' in consultaActual ? consultaActual.error : null;

  const analisis = useMemo(() => {
    if (!reporte) return [];
    return GRAFICAS.map((grafica) => {
      const puntos = obtenerPuntos(reporte.datos, grafica.key);
      const picoActual = obtenerPico(puntos, 'actual');
      const picoAnterior = obtenerPico(puntos, 'anterior');
      const totalActual = puntos.reduce((total, punto) => total + punto.actual, 0);
      const totalAnterior = puntos.reduce((total, punto) => total + punto.anterior, 0);
      const datosGrafica = grafica.key === 'tendencia'
        ? puntos
        : puntos.slice(0, 8);

      return {
        ...grafica,
        puntos: datosGrafica,
        picoActual,
        picoAnterior,
        totalActual,
        totalAnterior,
      };
    });
  }, [reporte]);

  const hayDatos = Boolean(reporte?.datos.length);
  const periodoActual = reporte?.periodos.actual;
  const periodoAnterior = reporte?.periodos.anterior;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
          Comparación mensual
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Compara el mes seleccionado con el mes calendario anterior e identifica el pico propio de cada gráfica.
        </p>
      </header>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setReintento((actual) => actual + 1);
        }}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
      >
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
          Mes a analizar
          <span className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-blue-500" />
            <input
              type="month"
              required
              min="1753-02"
              max="9998-12"
              value={mes}
              onChange={(event) => setMesElegido(event.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </span>
        </label>
        <Button type="submit" variant="primary" size="sm" disabled={cargando || !mes}>
          <RefreshCw className={`mr-1.5 h-4 w-4 ${cargando ? 'animate-spin' : ''}`} />
          {cargando ? 'Consultando…' : 'Actualizar comparación'}
        </Button>
      </form>

      {periodoActual && periodoAnterior && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
          Periodos comparados: <strong>{periodoAnterior.fechaInicio} – {periodoAnterior.fechaFin}</strong>
          {' '}y <strong>{periodoActual.fechaInicio} – {periodoActual.fechaFin}</strong>.
          {' '}Las fechas corresponden a meses calendario completos.
        </div>
      )}

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
          <span>No se pudo completar la comparación; no se muestran resultados parciales. {error}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => setReintento((actual) => actual + 1)}>
            Reintentar
          </Button>
        </div>
      )}

      {movimientosCargando && <p role="status" className="text-sm text-slate-500">Determinando el periodo más reciente…</p>}
      {cargando && (
        <div role="status" className="space-y-3">
          <p className="text-sm text-slate-500">Consultando ambos meses en SQL Server…</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="skeleton h-28 w-full" />
            ))}
          </div>
          <div className="skeleton h-64 w-full" />
        </div>
      )}

      {reporte && !cargando && !hayDatos && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-5 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          No hay movimientos en ninguno de los dos periodos. No es posible determinar picos críticos ni calcular variaciones.
        </div>
      )}

      {reporte && !cargando && hayDatos && (
        <>
          <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              “Crítico” aquí significa el valor máximo dentro de la métrica y el mes de cada gráfica; no es un umbral de calidad ni una clasificación automática de riesgo. Tendencia, razones y Fallas por línea consideran movimientos tipo Scrap; certificación considera todos los tipos.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {analisis.map((grafica) => {
              const picoActualEnAnterior = grafica.picoActual
                ? grafica.puntos.find((punto) => punto.categoria === grafica.picoActual?.categoria)?.anterior ?? 0
                : 0;
              return (
                <Card
                  key={grafica.key}
                  title={grafica.titulo}
                  subtitle={grafica.descripcion}
                  className="min-w-0"
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 dark:border-rose-900 dark:bg-rose-950/30">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">
                        Pico del mes seleccionado
                      </p>
                      {grafica.picoActual ? (
                        <>
                          <p className="mt-1 truncate text-sm font-bold text-rose-700 dark:text-rose-300">
                            {etiquetaCategoria(grafica.key, grafica.picoActual.categoria)}
                          </p>
                          <p className="text-lg font-bold text-rose-600 dark:text-rose-400">
                            {formatearNumero(grafica.picoActual.actual)} piezas
                          </p>
                          <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                            Esa misma categoría tuvo {formatearNumero(picoActualEnAnterior)} piezas en el mes anterior.
                          </p>
                        </>
                      ) : (
                        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">Sin piezas registradas en este mes.</p>
                      )}
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                        Total de la gráfica · mes anterior
                      </p>
                      <p className="mt-1 text-lg font-bold text-slate-700 dark:text-white">
                        {formatearNumero(grafica.totalAnterior)} piezas
                      </p>
                      <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                        Mes seleccionado: {formatearNumero(grafica.totalActual)} piezas
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Variación total: {formatoVariacion(grafica.totalActual, grafica.totalAnterior)}
                      </p>
                    </div>
                  </div>

                  {grafica.puntos.length === 0 ? (
                    <p className="mt-4 rounded-lg bg-slate-100 px-3 py-8 text-center text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                      No hay datos para esta gráfica en los periodos elegidos.
                    </p>
                  ) : (
                    <div className="mt-4 h-72 p-3">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={grafica.puntos} margin={{ top: 10, right: 12, left: 0, bottom: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" strokeOpacity={0.4} />
                          <XAxis
                            dataKey="categoria"
                            tickFormatter={(value: string) => etiquetaCategoria(grafica.key, value)}
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            axisLine={false}
                            tickLine={false}
                            interval={grafica.key === 'tendencia' ? 2 : 0}
                            angle={grafica.key === 'tendencia' ? 0 : -20}
                            height={grafica.key === 'tendencia' ? 30 : 48}
                          />
                          <YAxis
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            axisLine={false}
                            tickLine={false}
                            width={42}
                          />
                          <Tooltip
                            labelFormatter={(value) => etiquetaCategoria(grafica.key, String(value))}
                            formatter={(value, name) => {
                              return [
                                <span key="value" className="text-white">{formatearNumero(Number(value))} piezas</span>,
                                <span key="name" className="text-white">{name}</span>,
                              ];
                            }}
                            contentStyle={{
                              backgroundColor: '#0f172a',
                              borderColor: '#334155',
                              borderRadius: '8px',
                              color: '#ffffff',
                              fontSize: '12px',
                            }}
                            labelStyle={{ color: '#ffffff' }}
                            itemStyle={{ color: '#ffffff' }}
                          />
                          <Bar dataKey="anterior" name="Mes anterior" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="actual" name="Mes seleccionado" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <ChartExplanation>{grafica.explicacion}</ChartExplanation>

                  <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
                    Comparación: {periodosPresentacion(reporte)}.
                  </p>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
