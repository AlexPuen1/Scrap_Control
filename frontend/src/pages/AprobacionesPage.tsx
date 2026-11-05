import React, { useMemo, useState } from 'react';
import {
  Boxes,
  Check,
  CheckCircle2,
  Clock,
  Database,
  FileCheck2,
  Tag,
  X,
  XCircle,
} from 'lucide-react';
import { useScrap } from '../context/ScrapContext';
import { useDemoSession } from '../context/demoSession';
import type { Movimiento } from '../types';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Pagination } from '../components/common/Pagination';
import { StatCard } from '../components/common/StatCard';
import { MovementFilters, type FiltrosMovimientoUI } from '../components/common/MovementFilters';

type Decision = 1 | 4;
type DictamenPendiente = { movimiento: Movimiento; decision: Decision };

export const AprobacionesPage: React.FC = () => {
  const { movimientos, aprobarMovimiento, dictaminarMovimientos, rechazarMovimiento } = useScrap();
  const { usuario } = useDemoSession();
  const [filtros, setFiltros] = useState<FiltrosMovimientoUI>({
    busqueda: '',
    estado: '0',
    tipo: '',
    razon: '',
    certificacion: '',
    linea: '',
    almacen: '',
    fechaInicio: '',
    fechaFin: '',
  });
  const rangoInicial = useMemo(() => {
    const fechas = movimientos.map((movimiento) => movimiento.fecha).filter(Boolean).sort();
    return { fechaInicio: fechas[0] ?? '', fechaFin: fechas.at(-1) ?? '' };
  }, [movimientos]);
  const filtrosActivos = useMemo(
    () => !filtros.fechaInicio && !filtros.fechaFin ? { ...filtros, ...rangoInicial } : filtros,
    [filtros, rangoInicial],
  );
  const [paginaActual, setPaginaActual] = useState(1);
  const [elementosPorPagina, setElementosPorPagina] = useState(10);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [modalDictamenMultiple, setModalDictamenMultiple] = useState(false);
  const [confirmacionFinalMultiple, setConfirmacionFinalMultiple] = useState(false);
  const [decisionMultiple, setDecisionMultiple] = useState<Decision>(1);
  const [nombreResponsableMultiple, setNombreResponsableMultiple] = useState('');
  const [comentarioRechazoMultiple, setComentarioRechazoMultiple] = useState('');
  const [errorAprobacionMultiple, setErrorAprobacionMultiple] = useState<string | null>(null);
  const [idsFallidos, setIdsFallidos] = useState<string[]>([]);
  const [aprobacionMultipleEnviando, setAprobacionMultipleEnviando] = useState(false);
  const [dictamenPendiente, setDictamenPendiente] = useState<DictamenPendiente | null>(null);
  const [nombreResponsable, setNombreResponsable] = useState('');
  const [comentarioRechazo, setComentarioRechazo] = useState('');
  const [dictamenEnviando, setDictamenEnviando] = useState(false);
  const [errorDictamen, setErrorDictamen] = useState<string | null>(null);

  const pendientes = movimientos.filter((movimiento) => {
    const esMovimientoScrap = movimiento.movimientoTipoId === 1;
    const coincideEstado = filtrosActivos.estado === ''
      || (filtrosActivos.estado === 'null' ? movimiento.aprobado === null : movimiento.aprobado === Number(filtrosActivos.estado));
    const coincideTexto = !filtrosActivos.busqueda || [
      movimiento.id,
      movimiento.serial,
      movimiento.matnr,
      movimiento.matnrFg,
      movimiento.credencial,
    ].some((valor) => String(valor ?? '').toLocaleLowerCase().includes(filtrosActivos.busqueda.trim().toLocaleLowerCase()));
    const coincideCertificacion = !filtrosActivos.certificacion || String(movimiento.certificacionId) === filtrosActivos.certificacion;
    const coincideTipo = !filtrosActivos.tipo || String(movimiento.movimientoTipoId) === filtrosActivos.tipo;
    const coincideRazon = !filtrosActivos.razon
      || (filtrosActivos.razon === 'null' ? movimiento.razonId === null : String(movimiento.razonId) === filtrosActivos.razon);
    const coincideLinea = !filtrosActivos.linea || String(movimiento.datosDB?.LineaId ?? '') === filtrosActivos.linea;
    const coincideAlmacen = !filtrosActivos.almacen || movimiento.almacen === filtrosActivos.almacen;
    const coincideFecha = (!filtrosActivos.fechaInicio || movimiento.fecha >= filtrosActivos.fechaInicio)
      && (!filtrosActivos.fechaFin || movimiento.fecha <= filtrosActivos.fechaFin);
    return esMovimientoScrap && coincideEstado && coincideTexto && coincideCertificacion && coincideTipo
      && coincideRazon && coincideLinea && coincideAlmacen && coincideFecha;
  });
  const idsPendientesFiltrados = pendientes
    .filter((movimiento) => movimiento.aprobado === 0)
    .map((movimiento) => movimiento.id);
  const totalPaginas = Math.ceil(pendientes.length / elementosPorPagina);
  const paginaSegura = Math.min(paginaActual, Math.max(totalPaginas, 1));
  const pendientesPaginados = pendientes.slice(
    (paginaSegura - 1) * elementosPorPagina,
    paginaSegura * elementosPorPagina,
  );
  const pendientesVisiblesPaginados = pendientesPaginados.filter((movimiento) => movimiento.aprobado === 0);
  const idsPendientesVisibles = pendientesVisiblesPaginados.map((movimiento) => movimiento.id);
  const seleccionadosVisibles = seleccionados.filter((id) => idsPendientesFiltrados.includes(id));
  const todosVisiblesSeleccionados = idsPendientesVisibles.length > 0
    && idsPendientesVisibles.every((id) => seleccionados.includes(id));
  const rechazoMultipleIncluyeScrap = seleccionadosVisibles.some((id) =>
    movimientos.some((movimiento) => movimiento.id === id && movimiento.movimientoTipoId === 1),
  );
  const requiereComentarioRechazo = dictamenPendiente?.decision === 4 && dictamenPendiente.movimiento.movimientoTipoId === 1;
  const fechaDesde = filtrosActivos.fechaInicio;
  const fechaHasta = filtrosActivos.fechaFin;
  const movimientosDelPeriodo = movimientos.filter((movimiento) =>
    (!fechaDesde || movimiento.fecha >= fechaDesde) && (!fechaHasta || movimiento.fecha <= fechaHasta),
  );
  const totalPiezas = movimientosDelPeriodo
    .filter((movimiento) => movimiento.movimientoTipoId === 1)
    .reduce((total, movimiento) => total + movimiento.cantidad, 0);
  const conteoPendientes = movimientosDelPeriodo.filter(
    (movimiento) => movimiento.movimientoTipoId === 1 && movimiento.aprobado === 0,
  ).length;
  const conteoAprobados = movimientosDelPeriodo.filter((movimiento) => movimiento.aprobado === 1).length;
  const conteoRechazados = movimientosDelPeriodo.filter((movimiento) => movimiento.aprobado === 4).length;

  const alternarSeleccionTodos = (seleccionar: boolean) => {
    setSeleccionados((actuales) => {
      const noVisibles = actuales.filter((id) => !idsPendientesVisibles.includes(id));
      return seleccionar ? [...noVisibles, ...idsPendientesVisibles] : noVisibles;
    });
  };

  const alternarSeleccionMovimiento = (id: string, seleccionar: boolean) => {
    setSeleccionados((actuales) => seleccionar
      ? [...new Set([...actuales, id])]
      : actuales.filter((seleccionado) => seleccionado !== id));
  };

  const actualizarFiltros = (nuevosFiltros: FiltrosMovimientoUI) => {
    setFiltros(nuevosFiltros);
    setPaginaActual(1);
  };

  const prepararAprobacionMultiple = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const responsable = nombreResponsableMultiple.trim();
    if (!responsable) {
      setErrorAprobacionMultiple('Captura el nombre del responsable para continuar.');
      return;
    }
    if (decisionMultiple === 4 && rechazoMultipleIncluyeScrap && !comentarioRechazoMultiple.trim()) {
      setErrorAprobacionMultiple('Captura un comentario para rechazar Scrap.');
      return;
    }

    setConfirmacionFinalMultiple(true);
  };

  const confirmarAprobacionMultiple = async () => {
    setAprobacionMultipleEnviando(true);
    setErrorAprobacionMultiple(null);
    setIdsFallidos([]);
    try {
      const resultado = await dictaminarMovimientos(
        seleccionadosVisibles,
        decisionMultiple,
        nombreResponsableMultiple.trim(),
        comentarioRechazoMultiple,
      );
      setIdsFallidos(resultado.fallidos.map(({ id }) => id));
      setSeleccionados(resultado.fallidos.map(({ id }) => id));
      if (resultado.fallidos.length === 0) setModalDictamenMultiple(false);
      else setErrorAprobacionMultiple(`${resultado.dictaminados.length} ${decisionMultiple === 1 ? 'aprobado(s)' : 'rechazado(s)'}; ${resultado.fallidos.length} no se pudieron procesar. Los fallidos siguen seleccionados.`);
      setConfirmacionFinalMultiple(false);
    } catch (error) {
      setErrorAprobacionMultiple(error instanceof Error ? error.message : 'No se pudo completar la aprobación múltiple.');
      setConfirmacionFinalMultiple(false);
    } finally {
      setAprobacionMultipleEnviando(false);
    }
  };

  const abrirConfirmacionDictamen = (movimiento: Movimiento, decision: Decision) => {
    setDictamenPendiente({ movimiento, decision });
    setNombreResponsable(usuario?.nombre ?? '');
    setComentarioRechazo('');
    setErrorDictamen(null);
  };

  const cerrarConfirmacionDictamen = () => {
    if (dictamenEnviando) return;
    setDictamenPendiente(null);
    setErrorDictamen(null);
  };

  const confirmarDictamen = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!dictamenPendiente) return;

    const responsable = nombreResponsable.trim();
    if (!responsable) {
      setErrorDictamen('Captura el nombre del responsable para continuar.');
      return;
    }
    if (requiereComentarioRechazo && !comentarioRechazo.trim()) {
      setErrorDictamen('Captura un comentario para rechazar Scrap.');
      return;
    }

    setDictamenEnviando(true);
    setErrorDictamen(null);
    try {
      if (dictamenPendiente.decision === 1) {
        await aprobarMovimiento(dictamenPendiente.movimiento.id, responsable);
      } else {
        await rechazarMovimiento(dictamenPendiente.movimiento.id, responsable, comentarioRechazo);
      }
      setDictamenPendiente(null);
    } catch (error) {
      setErrorDictamen(error instanceof Error ? error.message : 'No se pudo guardar el dictamen.');
    } finally {
      setDictamenEnviando(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Bandeja de Aprobaciones de Scrap
          </h1>
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:border-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
            <Database className="h-3 w-3" />
            {conteoPendientes} pendientes
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
          Revisa la ficha completa del componente antes de emitir un dictamen.
        </p>
      </div>

      <div className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-3 text-xs text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
        Los dictámenes se guardan en SOE y no se pueden deshacer desde esta aplicación. El login y los roles son de demostración, no verifican identidad ni permisos; el nombre que captures se guardará en <code>nvAprobadoPor</code>. Confirma que tienes autorización antes de continuar.
      </div>

      <section aria-label="Resumen de movimientos" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          titulo="Total de piezas Scrap"
          valor={`${totalPiezas.toLocaleString('es-MX')} piezas`}
          subvalor={`${fechaDesde || 'Todo el periodo'} a ${fechaHasta || 'hoy'} · Ver todos los estados`}
          icono={<Boxes className="h-6 w-6" />}
          colorAccent="rose"
          active={filtrosActivos.estado === ''}
          onClick={() => actualizarFiltros({ ...filtros, estado: '' })}
        />
        <StatCard
          titulo="Pendientes"
          valor={`${conteoPendientes} movimientos`}
          subvalor="Toca para revisar lo que falta"
          icono={<Clock className="h-6 w-6" />}
          colorAccent="amber"
          active={filtrosActivos.estado === '0'}
          onClick={() => actualizarFiltros({ ...filtros, estado: '0' })}
        />
        <StatCard
          titulo="Aprobados"
          valor={`${conteoAprobados} movimientos`}
          subvalor="Toca para ver los aprobados"
          icono={<CheckCircle2 className="h-6 w-6" />}
          colorAccent="emerald"
          active={filtrosActivos.estado === '1'}
          onClick={() => actualizarFiltros({ ...filtros, estado: '1' })}
        />
        <StatCard
          titulo="Rechazados"
          valor={`${conteoRechazados} movimientos`}
          subvalor="Toca para ver los rechazados"
          icono={<XCircle className="h-6 w-6" />}
          colorAccent="blue"
          active={filtrosActivos.estado === '4'}
          onClick={() => actualizarFiltros({ ...filtros, estado: '4' })}
        />
      </section>

      <MovementFilters
        movimientos={movimientos}
        filtros={filtrosActivos}
        onChange={actualizarFiltros}
        onClear={() => {
          const fechas = movimientos.map((movimiento) => movimiento.fecha).filter(Boolean).sort();
          setFiltros({
            busqueda: '',
            estado: '0',
            tipo: '',
            razon: '',
            certificacion: '',
            linea: '',
            almacen: '',
            fechaInicio: fechas[0] ?? '',
            fechaFin: fechas.at(-1) ?? '',
          });
          setPaginaActual(1);
        }}
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={todosVisiblesSeleccionados}
              disabled={pendientesVisiblesPaginados.length === 0 || aprobacionMultipleEnviando}
              onChange={(event) => alternarSeleccionTodos(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Seleccionar pendientes en esta página ({pendientesVisiblesPaginados.length})
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="success"
              size="sm"
              icon={<Check className="h-3.5 w-3.5" />}
              disabled={seleccionadosVisibles.length === 0 || aprobacionMultipleEnviando}
              onClick={() => {
                setDecisionMultiple(1);
                setNombreResponsableMultiple(usuario?.nombre ?? '');
                setErrorAprobacionMultiple(null);
                setIdsFallidos([]);
                setModalDictamenMultiple(true);
              }}
            >
              Aprobar seleccionadas ({seleccionadosVisibles.length})
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={<X className="h-3.5 w-3.5" />}
              disabled={seleccionadosVisibles.length === 0 || aprobacionMultipleEnviando}
              onClick={() => {
                setDecisionMultiple(4);
                setNombreResponsableMultiple(usuario?.nombre ?? '');
                setComentarioRechazoMultiple('');
                setErrorAprobacionMultiple(null);
                setIdsFallidos([]);
                setModalDictamenMultiple(true);
              }}
            >
              Rechazar seleccionadas ({seleccionadosVisibles.length})
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1450px] table-auto text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="w-10 px-3 py-3">
                  <span className="sr-only">Seleccionar movimiento</span>
                </th>
                <th className="min-w-[150px] px-4 py-3">Folio / emisión</th>
                <th className="min-w-[150px] px-4 py-3">Serial</th>
                <th className="min-w-[260px] px-4 py-3">Componente</th>
                <th className="min-w-[180px] px-4 py-3">Supervisor</th>
                <th className="min-w-[160px] px-4 py-3">Línea</th>
                <th className="min-w-[240px] px-4 py-3">Razón</th>
                <th className="min-w-[110px] px-4 py-3 text-right">Cantidad</th>
                <th className="min-w-[230px] px-4 py-3 text-center">Dictamen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {pendientes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <FileCheck2 className="h-10 w-10 text-emerald-500/70" />
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {filtrosActivos.estado === '0'
                          ? '¡Todo al día! No hay movimientos pendientes con estos filtros.'
                          : 'No encontramos movimientos con estos filtros.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : pendientesPaginados.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Seleccionar movimiento ${item.id}`}
                      checked={seleccionados.includes(item.id)}
                      disabled={item.aprobado !== 0 || aprobacionMultipleEnviando}
                      onChange={(event) => alternarSeleccionMovimiento(item.id, event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-mono font-bold text-blue-600 dark:text-blue-400">#{item.id}</div>
                    <div className="mt-0.5 whitespace-nowrap font-mono text-[10px] text-slate-500 dark:text-slate-400">
                      {(item.fechaHora || `${item.fecha} ${item.hora}`).replace('T', ' ')}
                    </div>
                  </td>
                  <td className="break-all px-4 py-3 font-mono font-semibold text-slate-700 dark:text-slate-300">
                    {item.serial || 'No disponible'}
                  </td>
                  <td className="break-words px-4 py-3">
                    <div className="break-all font-mono font-bold text-slate-800 dark:text-slate-200" title={item.matnr}>{item.matnr}</div>
                    <div className="break-words text-[11px] text-slate-500 dark:text-slate-400" title={item.descripcion}>{item.descripcion || item.serial}</div>
                  </td>
                  <td className="break-words px-4 py-3 text-slate-700 dark:text-slate-300">
                    {item.empleado || 'Sin supervisor registrado'}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                    <div title={item.linea || 'Sin línea asignada'}>
                      <span className="block font-semibold text-slate-800 dark:text-slate-200">
                        {item.datosDB?.LineaNombre || item.linea || 'Sin línea asignada'}
                      </span>
                      {item.datosDB?.LineaId != null && (
                        <span className="mt-0.5 block text-[10px] text-slate-500 dark:text-slate-400">
                          Línea {item.datosDB.LineaId}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="break-words px-4 py-3">
                    <div className="flex items-start gap-1.5">
                      <Tag className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                      <span
                        className="break-words text-slate-700 dark:text-slate-300"
                        title={item.razonId === null ? 'Sin razón' : item.descripcionRazon || item.motivoEspecifico || 'Descripción no disponible'}
                      >
                        {item.razonId === null ? 'Sin razón' : item.descripcionRazon || item.motivoEspecifico || 'Descripción no disponible'}
                      </span>
                    </div>
                    <div className="mt-0.5 pl-5 text-[10px] text-slate-500 dark:text-slate-400">{item.movimientoTipoId} · {item.movimientoTipo}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-800 dark:text-slate-100">
                    {item.cantidad} {item.unidad}
                  </td>
                  <td className="px-4 py-3">
                    {item.aprobado === 0 ? (
                      <div className="flex justify-center gap-2">
                        <Button
                          variant={seleccionados.includes(item.id) ? 'secondary' : 'success'}
                          size="sm"
                          className="min-w-[96px]"
                          icon={<Check className="h-3.5 w-3.5" />}
                          disabled={seleccionados.includes(item.id) || aprobacionMultipleEnviando}
                          onClick={() => abrirConfirmacionDictamen(item, 1)}
                        >
                          Aprobar
                        </Button>
                        <Button
                          variant={seleccionados.includes(item.id) ? 'secondary' : 'danger'}
                          size="sm"
                          className="min-w-[96px]"
                          icon={<X className="h-3.5 w-3.5" />}
                          disabled={seleccionados.includes(item.id) || aprobacionMultipleEnviando}
                          onClick={() => abrirConfirmacionDictamen(item, 4)}
                        >
                          Denegar
                        </Button>
                      </div>
                    ) : (
                      <span className="block text-center text-xs text-slate-500">Solo lectura</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pendientes.length > elementosPorPagina && (
          <Pagination
            paginaActual={paginaSegura}
            totalPaginas={totalPaginas}
            totalElementos={pendientes.length}
            elementosPorPagina={elementosPorPagina}
            onCambiarPagina={setPaginaActual}
            onCambiarElementosPorPagina={(cantidad) => {
              setElementosPorPagina(cantidad);
              setPaginaActual(1);
            }}
          />
        )}
      </div>

      <Modal
        isOpen={modalDictamenMultiple}
        onClose={() => {
          if (!aprobacionMultipleEnviando) setModalDictamenMultiple(false);
        }}
        title={decisionMultiple === 1 ? 'Confirmar aprobación múltiple' : 'Confirmar rechazo múltiple'}
        subtitle={`${seleccionadosVisibles.length} movimiento(s) seleccionado(s)`}
        maxWidth="md"
      >
        <form onSubmit={prepararAprobacionMultiple} className="space-y-4">
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            {decisionMultiple === 1
              ? 'Se aprobarán los movimientos seleccionados.'
              : 'Se rechazarán los movimientos seleccionados.'} El cambio se guardará en la base de datos y no se puede deshacer desde la aplicación.
            {' '}La cuenta y el rol de demostración no verifican tu identidad ni autorización.
          </p>
          <label htmlFor="responsable-aprobacion-multiple" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Nombre que quedará registrado como responsable (no verificado)
            <input
              id="responsable-aprobacion-multiple"
              type="text"
              required
              maxLength={200}
              value={nombreResponsableMultiple}
              onChange={(event) => setNombreResponsableMultiple(event.target.value)}
              disabled={aprobacionMultipleEnviando}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>
          {decisionMultiple === 4 && rechazoMultipleIncluyeScrap && (
            <label htmlFor="comentario-rechazo-multiple" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Comentario para el rechazo de Scrap
              <textarea
                id="comentario-rechazo-multiple"
                required
                maxLength={500}
                rows={3}
                value={comentarioRechazoMultiple}
                onChange={(event) => setComentarioRechazoMultiple(event.target.value)}
                disabled={aprobacionMultipleEnviando}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <span className="mt-1 block font-normal text-slate-500 dark:text-slate-400">
                Se aplicará a los movimientos Scrap seleccionados; solo estará visible durante esta sesión y no se guarda en SQL.
              </span>
            </label>
          )}
          {idsFallidos.length > 0 && (
            <p className="text-xs text-rose-700 dark:text-rose-300">
              Folios con error: {idsFallidos.join(', ')}.
            </p>
          )}
          {errorAprobacionMultiple && (
            <p role="alert" className="text-xs text-rose-700 dark:text-rose-300">{errorAprobacionMultiple}</p>
          )}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              disabled={aprobacionMultipleEnviando}
              onClick={() => setModalDictamenMultiple(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant={decisionMultiple === 1 ? 'success' : 'danger'}
              disabled={aprobacionMultipleEnviando || seleccionadosVisibles.length === 0}
            >
              {aprobacionMultipleEnviando
                ? (decisionMultiple === 1 ? 'Aprobando…' : 'Rechazando…')
                : `Confirmar ${decisionMultiple === 1 ? 'aprobación' : 'rechazo'} de ${seleccionadosVisibles.length}`}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={confirmacionFinalMultiple}
        onClose={() => {
          if (!aprobacionMultipleEnviando) setConfirmacionFinalMultiple(false);
        }}
        title={decisionMultiple === 1 ? 'Confirmación final de aprobación' : 'Confirmación final de rechazo'}
        subtitle={`${seleccionadosVisibles.length} movimiento(s) seleccionado(s)`}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className={`rounded-lg border px-3 py-3 text-sm font-semibold ${
            decisionMultiple === 1
              ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
              : 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200'
          }`}>
            {`¿Estás seguro de ${decisionMultiple === 1 ? 'aprobar' : 'rechazar'} los ${seleccionadosVisibles.length} movimientos seleccionados?`}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Esta acción actualizará los dictámenes en la base de datos y no se puede deshacer desde la aplicación.
            {' '}La cuenta demo y el nombre registrado no verifican identidad ni autorización.
          </p>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              disabled={aprobacionMultipleEnviando}
              onClick={() => setConfirmacionFinalMultiple(false)}
            >
              Regresar
            </Button>
            <Button
              type="button"
              variant={decisionMultiple === 1 ? 'success' : 'danger'}
              loading={aprobacionMultipleEnviando}
              disabled={seleccionadosVisibles.length === 0}
              onClick={confirmarAprobacionMultiple}
            >
              {`Sí, ${decisionMultiple === 1 ? 'aprobar' : 'rechazar'} ${seleccionadosVisibles.length}`}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!dictamenPendiente}
        onClose={cerrarConfirmacionDictamen}
        title={dictamenPendiente?.decision === 1 ? 'Confirmar aprobación' : 'Confirmar denegación'}
        subtitle={`Movimiento #${dictamenPendiente?.movimiento.id ?? ''}`}
        maxWidth="md"
      >
        {dictamenPendiente && (
          <form onSubmit={confirmarDictamen} className="space-y-4">
            <p className={`rounded-lg border px-3 py-3 text-sm font-semibold ${
              dictamenPendiente.decision === 1
                ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                : 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200'
            }`}>
              {`¿Estás seguro de ${dictamenPendiente.decision === 1 ? 'aprobar' : 'denegar'} el movimiento #${dictamenPendiente.movimiento.id}?`}
              {' '}Esta acción se guarda en SOE y no se puede deshacer desde la aplicación.
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {dictamenPendiente.movimiento.movimientoTipo} · {dictamenPendiente.movimiento.matnr} · {dictamenPendiente.movimiento.cantidad} piezas
            </p>
            <label htmlFor="nombre-responsable" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Nombre que quedará registrado como responsable (no verificado)
              <input
                id="nombre-responsable"
                name="nombre-responsable"
                type="text"
                autoComplete="name"
                maxLength={200}
                required
                value={nombreResponsable}
                onChange={(event) => setNombreResponsable(event.target.value)}
                disabled={dictamenEnviando}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder="Nombre y apellido"
              />
            </label>
            {requiereComentarioRechazo && (
              <label htmlFor="comentario-rechazo" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Comentario de rechazo
                <textarea
                  id="comentario-rechazo"
                  name="comentario-rechazo"
                  required
                  maxLength={500}
                  rows={3}
                  value={comentarioRechazo}
                  onChange={(event) => setComentarioRechazo(event.target.value)}
                  disabled={dictamenEnviando}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder="Describe brevemente el motivo del rechazo"
                />
                <span className="mt-1 block text-[11px] font-normal text-slate-500 dark:text-slate-400">
                  Solo se muestra en Movimientos durante esta sesión; no se guarda en la base de datos.
                </span>
              </label>
            )}
            {errorDictamen && (
              <div role="alert" className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                {errorDictamen}
              </div>
            )}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={cerrarConfirmacionDictamen} disabled={dictamenEnviando}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant={dictamenPendiente.decision === 1 ? 'success' : 'danger'}
                loading={dictamenEnviando}
                disabled={!nombreResponsable.trim() || (requiereComentarioRechazo && !comentarioRechazo.trim())}
              >
                {dictamenPendiente.decision === 1 ? 'Sí, aprobar' : 'Sí, denegar'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
