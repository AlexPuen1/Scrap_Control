import React, { useState, useMemo, useEffect } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Filter,
} from 'lucide-react';
import { useScrap } from '../context/ScrapContext';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { formatearNumero, descargarCSV, simularImpresionPDF } from '../utils/formatters';
import { ScrapService } from '../services/scrapService';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export const ReportesPage: React.FC = () => {
  const { movimientos, movimientosCargando, errorMovimientos, recargarMovimientos } = useScrap();

  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [filtroCertificacion, setFiltroCertificacion] = useState('');
  const [filtroRazon, setFiltroRazon] = useState('');
  const [respuestaRango, setRespuestaRango] = useState<{
    clave: string;
    movimientos?: typeof movimientos;
    error?: string;
  } | null>(null);

  const claveRango = `${fechaInicio}|${fechaFin}`;
  const rangoCompleto = Boolean(fechaInicio && fechaFin);
  const rangoValido = rangoCompleto && fechaInicio <= fechaFin;

  useEffect(() => {
    if (!rangoValido) return;
    let vigente = true;
    const [anio, mes, dia] = fechaFin.split('-').map(Number);
    const finExclusivo = new Date(Date.UTC(anio, mes - 1, dia + 1)).toISOString().slice(0, 10);
    ScrapService.obtenerMovimientos(fechaInicio, finExclusivo)
      .then((datos) => {
        if (vigente) setRespuestaRango({ clave: claveRango, movimientos: datos });
      })
      .catch((error: unknown) => {
        if (vigente) {
          setRespuestaRango({
            clave: claveRango,
            error: error instanceof Error ? error.message : 'No se pudo consultar el rango seleccionado.',
          });
        }
      });
    return () => {
      vigente = false;
    };
  }, [fechaInicio, fechaFin, claveRango, rangoValido]);

  const movimientosDelRango = respuestaRango?.clave === claveRango
    ? respuestaRango.movimientos
    : undefined;
  const cargandoRango = rangoValido && respuestaRango?.clave !== claveRango;
  const errorRango = respuestaRango?.clave === claveRango ? respuestaRango.error : null;
  const movimientosReporte = useMemo(() => {
    if (rangoCompleto) return movimientosDelRango ?? [];
    if (!fechaInicio && !fechaFin) return movimientos;
    return [];
  }, [rangoCompleto, movimientosDelRango, fechaInicio, fechaFin, movimientos]);

  // Filtrado de movimientos para el reporte
  const datosReporte = useMemo(() => {
    return movimientosReporte.filter((m) => {
      const dentroDeFecha =
        (!fechaInicio || m.fecha >= fechaInicio) &&
        (!fechaFin || m.fecha <= fechaFin);
      const coincideCertificacion = filtroCertificacion === '' || String(m.certificacionId) === filtroCertificacion;
      const coincideRazon = filtroRazon === '' || String(m.razonId ?? '') === filtroRazon;

      return dentroDeFecha && coincideCertificacion && coincideRazon;
    });
  }, [movimientosReporte, fechaInicio, fechaFin, filtroCertificacion, filtroRazon]);

  // Resumen de Métricas del Reporte
  const totalPiezas = datosReporte.reduce((sum, m) => sum + m.cantidad, 0);
  const piezasScrap = datosReporte
    .filter((m) => m.movimientoTipoId === 1)
    .reduce((sum, m) => sum + m.cantidad, 0);
  const piezasOtrosMovimientos = totalPiezas - piezasScrap;

  // Agrupado por Número de Parte (MATNR)
  const resumenPorParte = useMemo(() => {
    const mapa: Record<string, { matnr: string; matnrFg: string; cantidad: number; incidencias: number }> = {};

    datosReporte.forEach((m) => {
      if (!mapa[m.matnr]) {
        mapa[m.matnr] = {
          matnr: m.matnr,
          matnrFg: m.matnrFg || '',
          cantidad: 0,
          incidencias: 0,
        };
      }
      mapa[m.matnr].cantidad += m.cantidad;
      mapa[m.matnr].incidencias += 1;
    });

    return Object.values(mapa).sort((a, b) => b.cantidad - a.cantidad);
  }, [datosReporte]);

  const piezasPorCertificacion = useMemo(() => {
    const mapa: Record<string, number> = {};
    datosReporte.forEach((m) => {
      const id = String(m.certificacionId);
      mapa[id] = (mapa[id] || 0) + m.cantidad;
    });

    return Object.entries(mapa).map(([certificacion, piezas]) => ({
      certificacion,
      piezas,
    })).sort((a, b) => b.piezas - a.piezas);
  }, [datosReporte]);
  const periodoDatosReporte = useMemo(() => {
    if (datosReporte.length === 0) {
      return fechaInicio || fechaFin
        ? `${fechaInicio || 'inicio sin límite'} – ${fechaFin || 'fin sin límite'} (sin registros)`
        : 'sin registros';
    }

    const fechas = datosReporte.map((movimiento) => movimiento.fecha).sort();
    return `${fechas[0]} – ${fechas[fechas.length - 1]}`;
  }, [datosReporte, fechaInicio, fechaFin]);

  const limpiarFiltros = () => {
    setFechaInicio('');
    setFechaFin('');
    setFiltroCertificacion('');
    setFiltroRazon('');
  };

  return (
    <div className="space-y-6">
      {errorMovimientos && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
          <span>No fue posible cargar el reporte desde SQL Server: {errorMovimientos}</span>
          <button onClick={recargarMovimientos} className="font-semibold underline">Reintentar</button>
        </div>
      )}
      {movimientosCargando && <p className="text-xs text-slate-500">Consultando dbo.Movimientos…</p>}

      {/* Cabecera y Exportación */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Módulo de Reportes & Análisis de Desperdicio
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Reporte de las columnas integradas de dbo.Movimientos. Los costos, líneas y turnos no están disponibles en esta tabla.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
            onClick={() => descargarCSV(datosReporte, `reporte-gerencial-scrap-${fechaFin}.csv`)}
          >
            Exportar CSV
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<Printer className="w-4 h-4" />}
            onClick={() => simularImpresionPDF('Reporte_Oficial_Scrap_Magna')}
          >
            Imprimir / Guardar PDF
          </Button>
        </div>
      </div>

      {/* Panel de Filtros Avanzados */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Filtros sobre registros de SQL Server</span>
          </div>
          <button onClick={limpiarFiltros} className="text-blue-600 hover:underline dark:text-blue-400">
            Limpiar filtros
          </button>
        </div>

        {cargandoRango && <p className="text-xs text-slate-500">Consultando el rango completo en el servidor…</p>}
        {errorRango && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{errorRango}</p>}
        {Boolean(fechaInicio) !== Boolean(fechaFin) && (
          <p role="alert" className="text-xs text-amber-700 dark:text-amber-300">
            Selecciona ambas fechas para consultar un rango; no se mostrarán resultados parciales.
          </p>
        )}
        {fechaInicio && fechaFin && fechaInicio > fechaFin && (
          <p role="alert" className="text-xs text-amber-700 dark:text-amber-300">
            La fecha inicial debe ser anterior o igual a la fecha final.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Fecha Inicio */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Fecha Desde
            </label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Fecha Fin */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Fecha Hasta
            </label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Certificación */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Certificación
            </label>
            <select
              value={filtroCertificacion}
              onChange={(e) => setFiltroCertificacion(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todas</option>
              {[...new Set(movimientosReporte.map((movimiento) => movimiento.certificacionId))].map((id) => (
                <option key={id} value={String(id)}>Certificación {id}</option>
              ))}
            </select>
          </div>

          {/* RazonId */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              RazonId
            </label>
            <select
              value={filtroRazon}
              onChange={(e) => setFiltroRazon(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todas</option>
              {[...new Set(movimientosReporte.map((movimiento) => movimiento.razonId).filter((id): id is number => id !== null))].map((id) => (
                <option key={id} value={String(id)}>{id}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPIs Consolidados del Periodo Seleccionado */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold block">
            Cantidad total registrada
          </span>
          <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 block">
            {formatearNumero(totalPiezas)} Pzas
          </span>
          <span className="text-xs text-slate-400 mt-0.5 block">
            {datosReporte.length} movimientos registrados
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold block">
            Certificaciones distintas
          </span>
          <span className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1 block">
            {[...new Set(datosReporte.map((movimiento) => movimiento.certificacionId))].length}
          </span>
          <span className="text-xs text-slate-400 mt-0.5 block">
            Identificadas en los registros filtrados
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold block">
            Cantidad tipo 1 (Scrap)
          </span>
          <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 block">
            {formatearNumero(piezasScrap)} Pzas
          </span>
          <span className="text-xs text-slate-400 mt-0.5 block">
            Tipo de movimiento con ID 1
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold block">
            Piezas en otros tipos de movimiento
          </span>
          <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
            {formatearNumero(piezasOtrosMovimientos)} Pzas
          </span>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 block font-medium">
            No implica que sean piezas recuperadas.
          </span>
        </div>
      </div>

      {/* Piezas por certificación */}
      <Card
        title="Cantidad por certificación"
        subtitle={`Periodo de datos representado: ${periodoDatosReporte}. Agrupación por CertificacionId en dbo.Movimientos.`}
      >
        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={piezasPorCertificacion} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" strokeOpacity={0.4} />
              <XAxis dataKey="certificacion" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(val: any) => [
                  <span key="value" className="text-white">{val} piezas</span>,
                  <span key="name" className="text-white">Cantidad</span>,
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
              <Bar dataKey="piezas" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Tabla Avanzada: Desglose por Número de Parte (MATNR) */}
      <Card
        title="Desglose Consolidado por Número de Parte (MATNR)"
        subtitle="Cantidad e incidencias agrupadas por MATNR; MATNR_FG se muestra si está disponible."
      >
        <div className="overflow-x-auto -mx-5 -mb-5">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold text-[11px] border-y border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3">Número de Parte (MATNR)</th>
                <th className="px-5 py-3">MATNR_FG</th>
                <th className="px-5 py-3 text-right">Boletas</th>
                <th className="px-5 py-3 text-right">Piezas No Conformes</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-normal">
              {resumenPorParte.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                    {movimientosCargando ? 'Cargando registros…' : 'No hay movimientos para los filtros seleccionados.'}
                  </td>
                </tr>
              )}
              {resumenPorParte.map((parte) => {
                return (
                  <tr key={parte.matnr} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {parte.matnr}
                    </td>
                    <td className="px-5 py-3 text-slate-800 dark:text-slate-200 font-medium">
                      {parte.matnrFg || '—'}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-slate-600 dark:text-slate-300">
                      {parte.incidencias}
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      {formatearNumero(parte.cantidad)} pz
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
