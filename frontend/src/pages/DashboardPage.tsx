import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertOctagon,
  CalendarDays,
  CheckCircle2,
  PlusCircle,
  Download,
  Flame,
} from 'lucide-react';
import { motion } from 'framer-motion';
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
  LabelList,
} from 'recharts';
import { useScrap } from '../context/ScrapContext';
import { useDemoSession } from '../context/demoSession';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { ChartExplanation } from '../components/common/ChartExplanation';
import { formatearNumero, descargarCSV } from '../utils/formatters';
import { ScrapService } from '../services/scrapService';
import type { Movimiento } from '../types';

const COLORES_MOTIVOS = ['#e11d48', '#2563eb', '#be123c', '#1d4ed8', '#fb7185'];

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
  const { usuario } = useDemoSession();
  const [fechaHoy, setFechaHoy] = useState(() => formatearFechaLocal(new Date()));
  const [fechaInicio, setFechaInicio] = useState(obtenerInicioMesAnterior);
  const [fechaFin, setFechaFin] = useState(fechaHoy);
  const [periodoAplicado, setPeriodoAplicado] = useState({ fechaInicio, fechaFin: fechaHoy });
  const [movimientosBuscados, setMovimientosBuscados] = useState<Movimiento[] | null>(null);
  const [cargandoBusqueda, setCargandoBusqueda] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
  const [modoAprobaciones, setModoAprobaciones] = useState<'todas' | 'mes'>('mes');
  const [resultadoAprobaciones, setResultadoAprobaciones] = useState<{
    clavePeriodo: string;
    datos: { nombre: string; aprobaciones: number }[];
    total: number;
  } | null>(null);
  const [errorAprobaciones, setErrorAprobaciones] = useState<{ clavePeriodo: string; mensaje: string } | null>(null);
  const idBusqueda = useRef(0);
  const idBusquedaAprobaciones = useRef(0);
  const rangoInicializado = useRef(false);
  const movimientosDelPeriodo = movimientosBuscados ?? movimientos;
  const cargandoDashboard = movimientosCargando || cargandoBusqueda;
  const errorDashboard = errorBusqueda || (!movimientosBuscados ? errorMovimientos : null);
  const etiquetaPeriodo = `${periodoAplicado.fechaInicio} – ${periodoAplicado.fechaFin}`;
  const clavePeriodoAprobaciones = modoAprobaciones === 'todas'
    ? 'todas'
    : `${periodoAplicado.fechaInicio}|${periodoAplicado.fechaFin}`;
  const aprobacionesPeriodo = resultadoAprobaciones?.clavePeriodo === clavePeriodoAprobaciones
    ? resultadoAprobaciones
    : null;
  const errorAprobacionesPeriodo = errorAprobaciones?.clavePeriodo === clavePeriodoAprobaciones
    ? errorAprobaciones.mensaje
    : null;

  useEffect(() => {
    if (movimientosCargando || rangoInicializado.current) return;
    rangoInicializado.current = true;
    const rango = obtenerRangoUltimoMes(movimientos);
    setFechaInicio(rango.fechaInicio);
    setFechaFin(rango.fechaFin);
    setPeriodoAplicado(rango);
  }, [movimientos, movimientosCargando]);

  useEffect(() => {
    const idActual = ++idBusquedaAprobaciones.current;
    const solicitud = modoAprobaciones === 'todas'
      ? ScrapService.obtenerAprobaciones()
      : ScrapService.obtenerAprobaciones(
        periodoAplicado.fechaInicio,
        sumarUnDia(periodoAplicado.fechaFin),
      );
    solicitud
      .then((resultado) => {
        if (idActual !== idBusquedaAprobaciones.current) return;
        setResultadoAprobaciones({ clavePeriodo: clavePeriodoAprobaciones, ...resultado });
        setErrorAprobaciones(null);
      })
      .catch((error: unknown) => {
        if (idActual !== idBusquedaAprobaciones.current) return;
        setErrorAprobaciones({
          clavePeriodo: clavePeriodoAprobaciones,
          mensaje: error instanceof Error ? error.message : 'No se pudieron cargar las aprobaciones.',
        });
      });
    return () => {
      idBusquedaAprobaciones.current += 1;
    };
  }, [clavePeriodoAprobaciones, modoAprobaciones, periodoAplicado]);

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

  const datosFallasPorLinea = useMemo(() => {
    const scrap = movimientosDelPeriodo.filter((movimiento) => movimiento.movimientoTipoId === 1);
    const motivosPrincipales = topMotivosData.map((motivo, index) => ({
      clave: `motivo_${index}`,
      nombre: motivo.nombreCompleto,
      color: COLORES_MOTIVOS[index % COLORES_MOTIVOS.length],
    }));
    const motivoPorNombre = new Map(motivosPrincipales.map((motivo) => [motivo.nombre, motivo.clave]));
    const lineas = new Map<string, Record<string, string | number>>();

    for (const movimiento of scrap) {
      const linea = movimiento.linea.trim() || 'Sin línea asignada';
      const motivo = movimiento.razonId === null
        ? 'Sin razón'
        : movimiento.descripcionRazon?.trim() || 'Razón sin descripción disponible';
      const claveMotivo = motivoPorNombre.get(motivo) ?? 'otros';
      const fila = lineas.get(linea) ?? { linea, total: 0 };
      fila.total = Number(fila.total) + movimiento.cantidad;
      fila[claveMotivo] = Number(fila[claveMotivo] || 0) + movimiento.cantidad;
      lineas.set(linea, fila);
    }

    return {
      datos: [...lineas.values()].sort((a, b) => Number(b.total) - Number(a.total)),
      motivos: [
        ...motivosPrincipales,
        { clave: 'otros', nombre: 'Otros motivos', color: '#94a3b8' },
      ],
    };
  }, [movimientosDelPeriodo, topMotivosData]);

  const alturaGraficaFallas = Math.max(320, datosFallasPorLinea.datos.length * 52 + 56);

  const reportesPorEmpleado = useMemo(() => {
    const totales = new Map<string, number>();
    for (const movimiento of movimientosDelPeriodo) {
      if (movimiento.movimientoTipoId !== 1) continue;
      const empleado = movimiento.datosDB?.Empleado?.trim();
      if (!empleado) continue;
      totales.set(empleado, (totales.get(empleado) ?? 0) + movimiento.cantidad);
    }
    return [...totales.entries()]
      .map(([nombre, piezas]) => ({ nombre, piezas }))
      .sort((a, b) => b.piezas - a.piezas)
      .slice(0, 10);
  }, [movimientosDelPeriodo]);

  const aprobacionesPorResponsable = [...(aprobacionesPeriodo?.datos ?? [])]
    .sort((a, b) => b.aprobaciones - a.aprobaciones);
  const alturaGraficaAprobaciones = Math.max(320, aprobacionesPorResponsable.length * 38 + 48);
  const subtitleAprobaciones = aprobacionesPeriodo
    ? `${formatearNumero(aprobacionesPeriodo.total)} movimientos con aprobado = 1 ${modoAprobaciones === 'mes' ? `durante ${etiquetaPeriodo}` : 'en toda la tabla'}, agrupados en ${formatearNumero(aprobacionesPorResponsable.length)} nombres.`
    : `Consultando aprobaciones ${modoAprobaciones === 'mes' ? `durante ${etiquetaPeriodo}` : 'de toda la tabla'}.`;

  const pendientesPeriodo = movimientosDelPeriodo.filter((movimiento) => movimiento.aprobado === 0).length;
  const aprobadosPeriodo = movimientosDelPeriodo.filter((movimiento) => movimiento.aprobado === 1).length;
  const rechazadosPeriodo = movimientosDelPeriodo.filter((movimiento) => movimiento.aprobado === 4).length;
  const dictaminadosPeriodo = aprobadosPeriodo + rechazadosPeriodo;
  const tasaAprobacion = dictaminadosPeriodo > 0 ? Math.round((aprobadosPeriodo / dictaminadosPeriodo) * 100) : null;
  const principalRazon = topMotivosData[0];
  const principalLinea = datosFallasPorLinea.datos[0];
  const resumenEjecutivo = [
    {
      titulo: 'Principal razón de scrap',
      valor: principalRazon ? principalRazon.nombreCompleto : 'Sin datos',
      detalle: principalRazon ? `${formatearNumero(principalRazon.value)} piezas en el periodo` : 'No hay movimientos Scrap',
      color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40',
      icono: <Flame className="h-4 w-4" />,
    },
    {
      titulo: 'Línea con más piezas Scrap',
      valor: principalLinea ? String(principalLinea.linea) : 'Sin datos',
      detalle: principalLinea ? `${formatearNumero(Number(principalLinea.total))} piezas registradas` : 'No hay movimientos Scrap',
      color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40',
      icono: <AlertOctagon className="h-4 w-4" />,
    },
    {
      titulo: 'Tasa de aprobación',
      valor: tasaAprobacion === null ? 'Sin dictámenes' : `${tasaAprobacion}%`,
      detalle: `${dictaminadosPeriodo} dictaminados · ${pendientesPeriodo} pendientes`,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40',
      icono: <CheckCircle2 className="h-4 w-4" />,
    },
  ];

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
              <Flame className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> {turnoActivo}
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
      {cargandoDashboard && (
        <div className="space-y-2" aria-live="polite">
          <p className="text-xs text-slate-500">Consultando dbo.Movimientos para {etiquetaPeriodo}…</p>
          <div className="skeleton h-1.5 w-full" />
        </div>
      )}

      {/* Resumen ejecutivo: lectura rápida para dirección */}
      {!cargandoDashboard && movimientosDelPeriodo.length > 0 && (
        <motion.section
          aria-label="Resumen ejecutivo"
          initial="oculto"
          animate="visible"
          variants={{ oculto: {}, visible: { transition: { staggerChildren: 0.08 } } }}
          className="grid grid-cols-1 gap-3 md:grid-cols-3"
        >
          {resumenEjecutivo.map((item) => (
            <motion.div
              key={item.titulo}
              variants={{ oculto: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 p-3.5 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80"
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.color}`}>
                {item.icono}
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{item.titulo}</p>
                <p className="truncate text-sm font-bold text-slate-900 dark:text-white" title={item.valor}>{item.valor}</p>
                <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{item.detalle}</p>
              </div>
            </motion.div>
          ))}
        </motion.section>
      )}

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
                  animationDuration={900}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <ChartExplanation>
            Cada punto muestra cuántas piezas Scrap se registraron en una fecha y hora. El eje horizontal indica cuándo ocurrió el registro y el vertical cuántas piezas se anotaron. Los datos vienen de los movimientos tipo Scrap del periodo elegido; un valor alto señala más piezas registradas en ese momento, no explica la causa.
          </ChartExplanation>
        </Card>
      </div>

      {/* Sección Inferior: gráficos ampliados para facilitar la comparación */}
      <div className="space-y-6">
        <Card
          title="Piezas SCRAP por línea y motivo"
          subtitle={`Periodo: ${etiquetaPeriodo}. Cada barra es una línea; los colores identifican sus motivos.`}
        >
          <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
            <strong>Cómo leerla:</strong> cada barra representa una línea y su longitud total es la suma de piezas Scrap registradas. El motivo aparece dentro de cada segmento de color; las etiquetas largas se abrevian. Los segmentos pequeños se amplían visualmente para que quepa el texto, así que para cantidades exactas usa el tooltip.
          </div>
          <div className="w-full px-2 pt-1" style={{ height: alturaGraficaFallas }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={datosFallasPorLinea.datos}
                  layout="vertical"
                  margin={{ top: 8, right: 28, left: 12, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" strokeOpacity={0.4} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    label={{ value: 'Piezas Scrap', position: 'insideBottom', offset: 0, fill: '#64748b', fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="linea"
                    width={210}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
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
                    formatter={(value, name) => [`${formatearNumero(Number(value))} Pzas`, name]}
                  />
                  {datosFallasPorLinea.motivos.map((motivo) => (
                    <Bar
                      key={motivo.clave}
                      dataKey={motivo.clave}
                      name={motivo.nombre}
                      stackId="scrap"
                      fill={motivo.color}
                      barSize={28}
                      minPointSize={56}
                      animationDuration={700}
                    >
                      <LabelList
                        dataKey={motivo.clave}
                        position="inside"
                        formatter={(value) => Number(value) > 0
                          ? (motivo.nombre.length > 12 ? `${motivo.nombre.slice(0, 11)}…` : motivo.nombre)
                          : ''}
                        fill="#ffffff"
                        fontSize={9}
                        fontWeight={600}
                      />
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
          </div>
          <div
            aria-label="Referencia de motivos por color"
            className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 border-t border-slate-200 pt-4 dark:border-slate-700 sm:grid-cols-2 lg:grid-cols-3"
          >
            {datosFallasPorLinea.motivos.map((motivo) => (
              <div key={motivo.clave} className="flex min-w-0 items-start gap-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                <span
                  aria-hidden="true"
                  className="mt-0.5 h-3 w-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: motivo.color }}
                />
                <span className="break-words">{motivo.nombre}</span>
              </div>
            ))}
          </div>
          <ChartExplanation>
            Cada color se explica en la referencia debajo de la gráfica. «Sin razón» indica que el movimiento no tiene razón asignada; «Razón sin descripción disponible» indica que no se encontró texto para la razón registrada. Los datos reflejan lo capturado en SOE y no prueban una causa raíz.
          </ChartExplanation>
        </Card>

        {/* Principales razones asociadas al Scrap */}
        <Card
          title="TOP RAZONES SCRAP"
          subtitle={`Periodo: ${etiquetaPeriodo}. Las barras están ordenadas de mayor a menor por piezas Scrap.`}
        >
          <div className="h-80 w-full px-2 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topMotivosData}
                layout="vertical"
                margin={{ top: 4, right: 28, left: 12, bottom: 4 }}
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
                  width={230}
                  tick={{ fontSize: 11, fill: '#64748b' }}
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
                <Bar dataKey="value" name="Piezas" radius={[0, 6, 6, 0]} animationDuration={800} animationEasing="ease-out">
                  {topMotivosData.map((_dato, index) => (
                    <Cell
                      key={`motivo-${index}`}
                      fill={COLORES_MOTIVOS[index % COLORES_MOTIVOS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ChartExplanation>
            Cada barra representa una descripción de razón y su longitud corresponde a la suma de piezas Scrap capturadas con esa razón. Se muestran las cinco principales; «Sin razón» agrupa movimientos sin razón asignada. El texto describe el dato registrado, no confirma una causa raíz.
          </ChartExplanation>
        </Card>
      </div>

      {usuario?.rol === 'Administrador' && (
        <section aria-label="Actividad de reporte y aprobación de Scrap" className="space-y-3">
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            Datos identificables visibles en modo demo. El rol Administrador solo oculta estas gráficas en la interfaz; la API todavía no protege los nombres por rol.
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card
              title="Personas que reportan SCRAP"
              subtitle={`Top 10 por piezas registradas en dbo.Movimientos. Periodo: ${etiquetaPeriodo}.`}
            >
              {reportesPorEmpleado.length > 0 ? (
                <div className="h-80 w-full px-2 pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportesPorEmpleado} layout="vertical" margin={{ top: 4, right: 20, left: 8, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#cbd5e1" strokeOpacity={0.4} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="nombre" width={130} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(value) => [`${formatearNumero(Number(value))} Pzas`, 'Piezas Scrap reportadas']}
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '11px' }}
                        labelStyle={{ color: '#ffffff' }}
                        itemStyle={{ color: '#ffffff' }}
                      />
                      <Bar dataKey="piezas" name="Piezas Scrap" fill="#2563eb" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-12 text-center text-sm text-slate-500">Sin registros Scrap con nombre de empleado para este periodo.</p>
              )}
              <ChartExplanation>
                Agrupa la suma de cantidad de movimientos tipo Scrap por el campo Empleado. Solo incluye registros con nombre capturado; no mide desempeño ni responsabilidad individual.
              </ChartExplanation>
            </Card>

            <Card
              title="Aprobaciones por responsable"
              subtitle={subtitleAprobaciones}
            >
              <div className="mb-3 flex flex-wrap items-center gap-2" role="group" aria-label="Periodo de aprobaciones">
                <span className="mr-1 text-xs font-medium text-slate-600 dark:text-slate-300">Mostrar:</span>
                <button
                  type="button"
                  aria-pressed={modoAprobaciones === 'todas'}
                  onClick={() => setModoAprobaciones('todas')}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${modoAprobaciones === 'todas'
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                >
                  Todas las aprobaciones
                </button>
                <button
                  type="button"
                  aria-pressed={modoAprobaciones === 'mes'}
                  onClick={() => setModoAprobaciones('mes')}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${modoAprobaciones === 'mes'
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                >
                  Mes seleccionado
                </button>
              </div>
              {errorAprobacionesPeriodo ? (
                <p role="alert" className="py-12 text-center text-sm text-rose-600">{errorAprobacionesPeriodo}</p>
              ) : !aprobacionesPeriodo ? (
                <p className="py-12 text-center text-sm text-slate-500">Consultando aprobaciones...</p>
              ) : aprobacionesPorResponsable.length > 0 ? (
                <div className="w-full px-2 pt-2" style={{ height: alturaGraficaAprobaciones }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={aprobacionesPorResponsable} layout="vertical" margin={{ top: 4, right: 20, left: 8, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#cbd5e1" strokeOpacity={0.4} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="nombre" width={130} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(value) => [formatearNumero(Number(value)), 'Aprobaciones de Scrap']}
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '11px' }}
                        labelStyle={{ color: '#ffffff' }}
                        itemStyle={{ color: '#ffffff' }}
                      />
                      <Bar dataKey="aprobaciones" name="Aprobaciones" fill="#059669" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-12 text-center text-sm text-slate-500">No hay movimientos con `aprobado = 1` registrados en la tabla.</p>
              )}
              <ChartExplanation>
                Cuenta filas de dbo.Movimientos con `aprobado = 1` y agrupa por `nvAprobadoPor`. «Todas las aprobaciones» incluye toda la tabla; «Mes seleccionado» limita `dtAprobado` al periodo del Dashboard. Los nombres vacíos aparecen como «Sin responsable registrado». Cada fila cuenta como un movimiento aprobado; la tabla contiene el estado actual, no un historial de dictámenes.
              </ChartExplanation>
            </Card>
          </div>
        </section>
      )}

    </div>
  );
};
