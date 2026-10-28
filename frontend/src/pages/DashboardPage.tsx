import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertOctagon,
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  PlusCircle,
  Download,
  Flame,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { useScrap } from '../context/ScrapContext';
import { StatCard } from '../components/common/StatCard';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { formatearNumero, descargarCSV } from '../utils/formatters';
import { ScrapService } from '../services/scrapService';
import type { Movimiento } from '../types';

function formatearFechaLocal(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function obtenerInicioMesAnterior(hoy: Date = new Date()): string {
  const ultimoDiaMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0).getDate();
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, Math.min(hoy.getDate(), ultimoDiaMesAnterior));
  return formatearFechaLocal(inicio);
}

function sumarUnDia(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return formatearFechaLocal(new Date(anio, mes - 1, dia + 1));
}

function obtenerRangoUltimoMes(movimientos: Movimiento[]) {
  const fechaMasReciente = movimientos.reduce(
    (fechaMaxima, movimiento) => movimiento.fecha > fechaMaxima ? movimiento.fecha : fechaMaxima,
    '',
  ) || formatearFechaLocal(new Date());
  const [anio, mes, dia] = fechaMasReciente.split('-').map(Number);
  const fechaBase = new Date(anio, mes - 1, dia);
  return {
    fechaInicio: obtenerInicioMesAnterior(fechaBase),
    fechaFin: fechaMasReciente,
  };
}

export const DashboardPage: React.FC = () => {
  const { movimientos, movimientosCargando, errorMovimientos, recargarMovimientos, turnoActivo } = useScrap();
  const navigate = useNavigate();
  const [fechaHoy, setFechaHoy] = useState(() => formatearFechaLocal(new Date()));
  const [fechaInicio, setFechaInicio] = useState(obtenerInicioMesAnterior);
  const [fechaFin, setFechaFin] = useState(fechaHoy);
  const [periodoAplicado, setPeriodoAplicado] = useState({ fechaInicio, fechaFin: fechaHoy });
  const [movimientosBuscados, setMovimientosBuscados] = useState<Movimiento[] | null>(null);
  const [cargandoBusqueda, setCargandoBusqueda] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
  const idBusqueda = useRef(0);
  const rangoInicializado = useRef(false);
  const movimientosDelPeriodo = movimientosBuscados ?? movimientos;
  const cargandoDashboard = movimientosCargando || cargandoBusqueda;
  const errorDashboard = errorBusqueda || (!movimientosBuscados ? errorMovimientos : null);
  const etiquetaPeriodo = `${periodoAplicado.fechaInicio} – ${periodoAplicado.fechaFin}`;

  useEffect(() => {
    if (movimientosCargando || rangoInicializado.current) return;
    rangoInicializado.current = true;
    const rango = obtenerRangoUltimoMes(movimientos);
    setFechaInicio(rango.fechaInicio);
    setFechaFin(rango.fechaFin);
    setPeriodoAplicado(rango);
  }, [movimientos, movimientosCargando]);

  const buscarPorFechas = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!fechaInicio || !fechaFin || fechaInicio > fechaFin) {
      setErrorBusqueda('Selecciona un rango válido: la fecha inicial debe ser anterior o igual a la fecha final.');
      return;
    }

    const idActual = ++idBusqueda.current;
    setCargandoBusqueda(true);
    setErrorBusqueda(null);
    try {
      const datos = await ScrapService.obtenerMovimientos(fechaInicio, sumarUnDia(fechaFin));
      if (idActual === idBusqueda.current) {
        setMovimientosBuscados(datos);
        setPeriodoAplicado({ fechaInicio, fechaFin });
      }
    } catch (error) {
      if (idActual === idBusqueda.current) {
        setErrorBusqueda(error instanceof Error ? error.message : 'No se pudieron cargar movimientos para ese periodo.');
      }
    } finally {
      if (idActual === idBusqueda.current) setCargandoBusqueda(false);
    }
  };

  const restablecerUltimoMes = () => {
    const hoy = new Date();
    const hoyFormateado = formatearFechaLocal(hoy);
    const rango = obtenerRangoUltimoMes(movimientos);
    idBusqueda.current += 1;
    setFechaHoy(hoyFormateado);
    setFechaInicio(rango.fechaInicio);
    setFechaFin(rango.fechaFin);
    setPeriodoAplicado(rango);
    setMovimientosBuscados(null);
    setCargandoBusqueda(false);
    setErrorBusqueda(null);
  };

  // Datos para gráficas
  const datosTendenciaHora = Object.values(
    movimientosDelPeriodo.reduce<Record<string, { hora: string; scrapPzas: number }>>((acumulado, movimiento) => {
      if (movimiento.movimientoTipoId === 1) {
        const hora = `${movimiento.fecha} ${movimiento.hora}`;
        acumulado[hora] = acumulado[hora] || { hora, scrapPzas: 0 };
        acumulado[hora].scrapPzas += movimiento.cantidad;
      }
      return acumulado;
    }, {})
  ).sort((a, b) => a.hora.localeCompare(b.hora));

  const incidenciaPorLinea = Object.values(
    movimientosDelPeriodo.reduce<Record<string, { certificacion: string; piezas: number }>>((acumulado, movimiento) => {
      const certificacion = String(movimiento.certificacionId);
      acumulado[certificacion] = acumulado[certificacion] || { certificacion, piezas: 0 };
      acumulado[certificacion].piezas += movimiento.cantidad;
      return acumulado;
    }, {})
  ).sort((a, b) => b.piezas - a.piezas);

  // Top motivos de Scrap
  const motivosMap: Record<string, number> = {};
  movimientosDelPeriodo.filter((movimiento) => movimiento.movimientoTipoId === 1).forEach((m) => {
    const razon = m.razonId === null
      ? 'Sin razón'
      : m.descripcionRazon?.trim() || 'Razón sin descripción disponible';
    motivosMap[razon] = (motivosMap[razon] || 0) + m.cantidad;
  });

  const topMotivosData = Object.entries(motivosMap)
    .map(([nombre, cantidad]) => ({
      name: nombre.length > 25 ? nombre.slice(0, 25) + '...' : nombre,
      nombreCompleto: nombre,
      value: cantidad,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const COLORES_MOTIVOS = ['#e11d48', '#2563eb', '#be123c', '#1d4ed8', '#fb7185'];
  const scrapPiezasPeriodo = useMemo(
    () => movimientosDelPeriodo
      .filter((movimiento) => movimiento.movimientoTipoId === 1)
      .reduce((total, movimiento) => total + movimiento.cantidad, 0),
    [movimientosDelPeriodo],
  );
  const pendientesPeriodo = movimientosDelPeriodo.filter((movimiento) => movimiento.aprobado === 0).length;
  const aprobadosPeriodo = movimientosDelPeriodo.filter((movimiento) => movimiento.aprobado === 1).length;
  const rechazadosPeriodo = movimientosDelPeriodo.filter((movimiento) => movimiento.aprobado === 2).length;

  return (
    <div className="space-y-6">
      {/* Barra de Título Superior y Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Monitoreo y Control de Scrap
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
              <Flame className="w-3.5 h-3.5 text-amber-500 animate-bounce" /> {turnoActivo}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Consola central de trazabilidad, contención de defectos y control de inventario no conforme.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="w-4 h-4" />}
            onClick={() => descargarCSV(movimientosDelPeriodo, `scrap-planta-${fechaInicio}-${fechaFin}.csv`)}
          >
            Exportar CSV
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<PlusCircle className="w-4 h-4" />}
            disabled
            title="El alta de movimientos aún no está integrada con SQL Server."
          >
            Registrar Incidencia
          </Button>
        </div>
      </div>

      <form
        onSubmit={buscarPorFechas}
        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-end"
      >
        <div className="sm:mr-auto">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <CalendarDays className="h-4 w-4 text-blue-500" />
            Filtrar por fecha
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Inicialmente se carga el mes más reciente con datos en la base.
          </p>
        </div>
        <label className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-300">
          Desde
          <input
            type="date"
            required
            value={fechaInicio}
            max={fechaFin || undefined}
            onChange={(event) => setFechaInicio(event.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-300">
          Hasta
          <input
            type="date"
            required
            value={fechaFin}
            min={fechaInicio || undefined}
            max={fechaHoy}
            onChange={(event) => setFechaFin(event.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>
        <Button type="submit" variant="primary" size="sm" disabled={cargandoBusqueda || fechaInicio > fechaFin}>
          {cargandoBusqueda ? 'Buscando…' : 'Buscar'}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={restablecerUltimoMes}>
          Último mes
        </Button>
      </form>

      {errorDashboard && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
          <span>No fue posible cargar datos de dbo.Movimientos: {errorDashboard}</span>
          <button
            onClick={() => {
              if (errorBusqueda) void buscarPorFechas();
              else recargarMovimientos();
            }}
            className="font-semibold underline"
          >
            Reintentar
          </button>
        </div>
      )}
      {cargandoDashboard && <p className="text-xs text-slate-500">Consultando dbo.Movimientos para {etiquetaPeriodo}…</p>}

      {/* Tarjetas Principales de KPIs (Power BI & MES Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          titulo={`Piezas Scrap (${etiquetaPeriodo})`}
          valor={`${formatearNumero(scrapPiezasPeriodo)} Pzas`}
          subvalor="El costo no se calcula: no existe en los campos integrados."
          icono={<AlertOctagon className="w-6 h-6" />}
          colorAccent="rose"
        />

        <StatCard
          titulo="Pendiente de Aprobar"
          valor={`${pendientesPeriodo} Folios`}
          subvalor="Conteo de pendientes dentro del periodo"
          icono={<Clock className="w-6 h-6" />}
          variacion={{
            valor: 'En el periodo',
            esPositiva: pendientesPeriodo === 0,
            etiqueta: 'Dictamen disponible',
          }}
          colorAccent="amber"
          onClick={() => navigate('/aprobaciones')}
        />

        <StatCard
          titulo="Movimientos aprobados"
          valor={`${aprobadosPeriodo} Folios`}
          subvalor="Dictámenes aprobados dentro del periodo"
          icono={<CheckCircle2 className="w-6 h-6" />}
          variacion={{
            valor: 'En el periodo',
            esPositiva: true,
            etiqueta: 'Estado confirmado',
          }}
          colorAccent="emerald"
        />

        <StatCard
          titulo="Movimientos rechazados"
          valor={`${rechazadosPeriodo} Folios`}
          subvalor="Dictámenes rechazados dentro del periodo"
          icono={<XCircle className="w-6 h-6" />}
          variacion={{
            valor: 'En el periodo',
            esPositiva: true,
            etiqueta: 'Estado confirmado',
          }}
          colorAccent="blue"
        />
      </div>

      {/* Tendencia de Scrap a lo ancho del dashboard */}
      <div className="grid grid-cols-1 gap-6">
        {/* Gráfica de Tendencia por Hora */}
        <Card
          title="Piezas Scrap por fecha y hora"
          subtitle={`Periodo de datos: ${etiquetaPeriodo}. Agrupación basada en fecha_hora y cantidad de dbo.Movimientos.`}
          action={
            <span className="text-xs font-mono font-medium text-slate-500">Datos SQL</span>
          }
        >
          <div className="h-96 w-full px-2 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={datosTendenciaHora} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScrap" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" strokeOpacity={0.4} />
                <XAxis dataKey="hora" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value: any) => [
                    <span key="value" className="text-white">{value} Pzas</span>,
                    <span key="name" className="text-white">Piezas Scrap</span>,
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
                <Area
                  type="monotone"
                  dataKey="scrapPzas"
                  name="Piezas Scrap"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorScrap)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Sección Inferior: certificaciones y razones con más Scrap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Líneas con más incidencias */}
        <Card
          title="Piezas por certificación"
          subtitle={`Periodo de datos: ${etiquetaPeriodo}. Agrupación por CertificacionId de dbo.Movimientos.`}
          className="lg:col-span-2"
        >
          <div className="h-64 w-full px-2 pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incidenciaPorLinea} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" strokeOpacity={0.4} />
                <XAxis dataKey="certificacion" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: '#ffffff' }}
                  itemStyle={{ color: '#ffffff' }}
                  formatter={(value: any) => [
                    <span key="value" className="text-white">{value} Pzas</span>,
                    <span key="name" className="text-white">Total Piezas</span>,
                  ]}
                />
                <Bar dataKey="piezas" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                  {incidenciaPorLinea.map((entry, index) => (
                    <Cell
                      key={`bar-${index}`}
                      fill={entry.piezas > 20 ? '#e11d48' : entry.piezas > 10 ? '#2563eb' : '#60a5fa'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Principales razones asociadas al Scrap */}
        <Card
          title="TOP RAZONES SCRAP"
          subtitle={`Periodo de datos: ${etiquetaPeriodo}. Agrupación por descripción de razón.`}
          className="lg:col-span-1"
        >
          <div className="h-72 w-full px-2 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topMotivosData}
                layout="vertical"
                margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#cbd5e1" strokeOpacity={0.4} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value: any, name: any, item: any) => [
                    <span key="value" className="text-white">{value} Pzas</span>,
                    <span key="reason" className="text-white">{item.payload.nombreCompleto || name}</span>,
                  ]}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '11px',
                  }}
                  labelStyle={{ color: '#ffffff' }}
                  itemStyle={{ color: '#ffffff' }}
                />
                <Bar dataKey="value" name="Piezas" radius={[0, 6, 6, 0]}>
                  {topMotivosData.map((dato, index) => (
                    <Cell
                      key={`motivo-${index}`}
                      fill={COLORES_MOTIVOS[index % COLORES_MOTIVOS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>


    </div>
  );
};
