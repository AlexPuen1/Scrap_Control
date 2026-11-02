import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Factory, Search } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '../components/common/Card';
import { ChartExplanation } from '../components/common/ChartExplanation';
import { ScrapService } from '../services/scrapService';
import type { ReporteScrapLinea, ResumenScrapLinea } from '../types';
import { formatearNumero } from '../utils/formatters';

export const FallasPorLineaPage: React.FC = () => {
  const [resumenPorLinea, setResumenPorLinea] = useState<ResumenScrapLinea[]>([]);
  const [periodo, setPeriodo] = useState<ReporteScrapLinea['periodo']>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let vigente = true;

    ScrapService.obtenerScrapPorLinea()
      .then((datos) => {
        if (vigente) {
          setResumenPorLinea(datos.datos);
          setPeriodo(datos.periodo);
        }
      })
      .catch((errorCarga: unknown) => {
        if (vigente) {
          setResumenPorLinea([]);
          setPeriodo(null);
          setError(errorCarga instanceof Error ? errorCarga.message : 'No se pudo cargar Scrap por línea.');
        }
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, [recarga]);

  const lineasFiltradas = useMemo(() => {
    const consulta = busqueda.trim().toLocaleLowerCase();
    if (!consulta) return resumenPorLinea;
    return resumenPorLinea.filter((fila) => {
      const etiqueta = fila.lineaNombre?.toLocaleLowerCase()
        || (fila.lineaId === null ? 'sin linea asignada' : `linea ${fila.lineaId}`);
      return etiqueta.includes(consulta)
        || String(fila.lineaId ?? '').includes(consulta)
        || String(fila.piezasScrap).includes(consulta);
    });
  }, [resumenPorLinea, busqueda]);

  const totalPiezasScrap = resumenPorLinea.reduce((total, fila) => total + fila.piezasScrap, 0);
  const lineaMasAfectada = resumenPorLinea[0];
  const nombreLinea = (lineaId: number | null) => {
    if (lineaId === null) return 'Sin línea asignada';
    const nombre = resumenPorLinea.find((fila) => fila.lineaId === lineaId)?.lineaNombre;
    return nombre ? `${nombre} (Línea ${lineaId})` : `Línea ${lineaId}`;
  };

  return (
    <div className="space-y-6">
      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
          <span>No fue posible cargar las fallas por línea desde SQL Server: {error}</span>
          <button
            onClick={() => {
              setCargando(true);
              setError(null);
              setRecarga((valor) => valor + 1);
            }}
            className="font-semibold underline"
          >
            Reintentar
          </button>
        </div>
      )}
      {cargando && <p className="text-xs text-slate-500">Consultando Scrap por línea en SQL Server…</p>}

      <header>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-rose-100 p-2.5 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
            <Factory className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              Fallas por línea
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
              Piezas defectuosas tipo Scrap agrupadas por la línea asociada a cada certificación.
            </p>
          </div>
        </div>
      </header>

      <div className="flex gap-3 rounded-lg border border-blue-300 bg-blue-50 px-4 py-3 text-xs text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <p>
          La relación se obtiene de SQL Server: `Movimientos.CertificacionId` → `Certificacion.id` →
          {' '}`Certificacion.LineaId` relacionado con `RapEnsambleEMM.dbo.Linea.linea`. El reporte incluye el mes más reciente disponible
          {periodo ? ` (${periodo.fechaInicio} – ${periodo.fechaFin})` : '.'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card title="Piezas Scrap" subtitle={periodo ? `Periodo: ${periodo.fechaInicio} – ${periodo.fechaFin}` : 'Sin periodo disponible'}>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
            {formatearNumero(totalPiezasScrap)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Cantidad de piezas con MovimientoTipoId = 1</p>
        </Card>
        <Card title="Líneas con Scrap" subtitle="Con al menos un movimiento">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatearNumero(resumenPorLinea.length)}
          </p>
        </Card>
        <Card title="Mayor cantidad de Scrap" subtitle={lineaMasAfectada ? nombreLinea(lineaMasAfectada.lineaId) : 'Sin datos'}>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {lineaMasAfectada ? `${formatearNumero(lineaMasAfectada.piezasScrap)} pzas` : '—'}
          </p>
        </Card>
      </div>

      <Card
        title="Piezas defectuosas por línea"
        subtitle={`Periodo: ${periodo ? `${periodo.fechaInicio} – ${periodo.fechaFin}` : 'sin datos'}. Suma de cantidad para movimientos Scrap, relacionada mediante Certificacion.LineaId.`}
      >
        {resumenPorLinea.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            {cargando ? (
              <div className="space-y-3" aria-hidden="true">
                {Array.from({ length: 5 }, (_, fila) => (
                  <div key={fila} className="skeleton h-8 w-full" />
                ))}
              </div>
            ) : 'No hay movimientos Scrap para mostrar.'}
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-2">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <label htmlFor="buscar-linea" className="sr-only">Buscar línea</label>
              <input
                id="buscar-linea"
                type="search"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar por nombre o ID de línea"
                className="w-full max-w-md rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>

            {lineasFiltradas.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">No hay líneas que coincidan con la búsqueda.</p>
            ) : (
              <>
                <div className="w-full" style={{ height: Math.max(360, lineasFiltradas.length * 30) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={lineasFiltradas}
                      layout="vertical"
                      margin={{ top: 4, right: 20, left: 12, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#cbd5e1" strokeOpacity={0.4} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="lineaId"
                        tickFormatter={(value: number | null) => nombreLinea(value)}
                        width={240}
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        labelFormatter={(value) => nombreLinea(value === '' ? null : Number(value))}
                        formatter={(value: any) => [
                          <span key="value" className="text-white">{value} piezas</span>,
                          <span key="name" className="text-white">Scrap</span>,
                        ]}
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '8px',
                          color: '#f8fafc',
                          fontSize: '12px',
                        }}
                        labelStyle={{ color: '#ffffff' }}
                        itemStyle={{ color: '#ffffff' }}
                      />
                      <Bar dataKey="piezasScrap" name="Piezas Scrap" radius={[0, 6, 6, 0]}>
                        {lineasFiltradas.map((fila, index) => (
                          <Cell
                            key={fila.lineaId ?? 'sin-linea'}
                            fill={index === 0 ? '#e11d48' : '#2563eb'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <ChartExplanation>
                  Cada barra muestra la suma de piezas Scrap registradas para una línea en el periodo indicado; las líneas se ordenan de mayor a menor cantidad. El nombre y número identifican la línea relacionada con la certificación. «Sin línea asignada» reúne registros sin esa relación. La gráfica cuenta registros de la base y no determina por qué ocurrió el Scrap.
                </ChartExplanation>

                <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Línea</th>
                        <th className="px-4 py-3 text-right">Movimientos Scrap</th>
                        <th className="px-4 py-3 text-right">Piezas defectuosas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 dark:divide-slate-800 dark:text-slate-300">
                      {lineasFiltradas.map((fila) => (
                        <tr key={fila.lineaId ?? 'sin-linea'}>
                          <td className="px-4 py-3">
                            <span className="block font-semibold text-slate-800 dark:text-slate-200">
                              {fila.lineaNombre || (fila.lineaId === null ? 'Sin línea asignada' : 'Nombre no disponible')}
                            </span>
                            {fila.lineaId !== null && (
                              <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                                Línea {fila.lineaId}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono">{formatearNumero(fila.movimientos)}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold">
                            {formatearNumero(fila.piezasScrap)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </Card>
    </div>
  );
};
