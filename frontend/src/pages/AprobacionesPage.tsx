import React, { useState } from 'react';
import {
  Check,
  Database,
  FileCheck2,
  Filter,
  Search,
  Tag,
  X,
} from 'lucide-react';
import { useScrap } from '../context/ScrapContext';
import { useDemoSession } from '../context/demoSession';
import type { Movimiento } from '../types';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';

type Decision = 1 | 4;
type Revision = { movimiento: Movimiento; decision: Decision };

const valorDato = (valor: string | number | boolean | null | undefined) => {
  if (valor === null || valor === undefined || valor === '') return 'No disponible';
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  return String(valor);
};

const CampoDato: React.FC<{ etiqueta: string; valor: string | number | boolean | null | undefined; mono?: boolean }> = ({
  etiqueta,
  valor,
  mono = false,
}) => (
  <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/70">
    <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{etiqueta}</span>
    <span className={`mt-1 block break-words text-xs font-semibold text-slate-800 dark:text-slate-100 ${mono ? 'font-mono' : ''}`}>
      {valorDato(valor)}
    </span>
  </div>
);

export const AprobacionesPage: React.FC = () => {
  const { movimientos, aprobarMovimiento, dictaminarMovimientos, rechazarMovimiento } = useScrap();
  const { usuario } = useDemoSession();
  const [filtroCertificacion, setFiltroCertificacion] = useState('');
  const [busquedaSerial, setBusquedaSerial] = useState('');
  const [busquedaFechaHora, setBusquedaFechaHora] = useState('');
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [modalDictamenMultiple, setModalDictamenMultiple] = useState(false);
  const [confirmacionFinalMultiple, setConfirmacionFinalMultiple] = useState(false);
  const [decisionMultiple, setDecisionMultiple] = useState<Decision>(1);
  const [nombreResponsableMultiple, setNombreResponsableMultiple] = useState('');
  const [comentarioRechazoMultiple, setComentarioRechazoMultiple] = useState('');
  const [errorAprobacionMultiple, setErrorAprobacionMultiple] = useState<string | null>(null);
  const [idsFallidos, setIdsFallidos] = useState<string[]>([]);
  const [aprobacionMultipleEnviando, setAprobacionMultipleEnviando] = useState(false);
  const [revision, setRevision] = useState<Revision | null>(null);
  const [nombreResponsable, setNombreResponsable] = useState('');
  const [comentarioRechazo, setComentarioRechazo] = useState('');
  const [dictamenEnviando, setDictamenEnviando] = useState(false);
  const [errorDictamen, setErrorDictamen] = useState<string | null>(null);

  const pendientes = movimientos.filter((movimiento) => {
    const esPendiente = movimiento.aprobado === 0 || movimiento.estatus === 'Pendiente';
    const coincideCertificacion = filtroCertificacion === ''
      || String(movimiento.certificacionId) === filtroCertificacion;
    const serial = movimiento.serial.toLocaleLowerCase();
    const coincideSerial = busquedaSerial.trim() === ''
      || serial.includes(busquedaSerial.trim().toLocaleLowerCase());
    const fechaHora = (movimiento.fechaHora || `${movimiento.fecha} ${movimiento.hora}`)
      .replace('T', ' ')
      .toLocaleLowerCase();
    const coincideFechaHora = busquedaFechaHora.trim() === ''
      || fechaHora.includes(busquedaFechaHora.trim().replace('T', ' ').toLocaleLowerCase());
    return esPendiente && coincideCertificacion && coincideSerial && coincideFechaHora;
  });
  const idsPendientesVisibles = pendientes.map((movimiento) => movimiento.id);
  const seleccionadosVisibles = seleccionados.filter((id) => idsPendientesVisibles.includes(id));
  const todosVisiblesSeleccionados = idsPendientesVisibles.length > 0
    && idsPendientesVisibles.every((id) => seleccionados.includes(id));
  const rechazoMultipleIncluyeScrap = seleccionadosVisibles.some((id) =>
    movimientos.some((movimiento) => movimiento.id === id && movimiento.movimientoTipoId === 1),
  );
  const requiereComentarioRechazo = revision?.decision === 4 && revision.movimiento.movimientoTipoId === 1;

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

  const abrirRevision = (movimiento: Movimiento, decision: Decision) => {
    setRevision({ movimiento, decision });
    setNombreResponsable(usuario?.nombre ?? '');
    setComentarioRechazo('');
    setErrorDictamen(null);
  };

  const cerrarRevision = () => {
    if (dictamenEnviando) return;
    setRevision(null);
    setErrorDictamen(null);
  };

  const confirmarDictamen = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!revision) return;

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
      if (revision.decision === 1) {
        await aprobarMovimiento(revision.movimiento.id, responsable);
      } else {
        await rechazarMovimiento(revision.movimiento.id, responsable, comentarioRechazo);
      }
      setRevision(null);
    } catch (error) {
      setErrorDictamen(error instanceof Error ? error.message : 'No se pudo guardar el dictamen.');
    } finally {
      setDictamenEnviando(false);
    }
  };

  const movimientoRevision = revision?.movimiento;
  const datosBase = movimientoRevision?.datosDB;
  const razonRevision = movimientoRevision?.razonId === null
    ? 'Sin razón'
    : movimientoRevision?.razonId === undefined
      ? 'No disponible'
      : movimientoRevision.descripcionRazon || movimientoRevision.motivoEspecifico || 'Descripción no disponible';

  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Bandeja de Aprobaciones de Scrap
          </h1>
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:border-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
            <Database className="h-3 w-3" />
            {pendientes.length} pendientes
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
          Revisa la ficha completa del componente antes de emitir un dictamen.
        </p>
      </div>

      <div className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-3 text-xs text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
        Los dictámenes se guardan en SOE y no se pueden deshacer desde esta aplicación. El login y los roles son de demostración, no verifican identidad ni permisos; el nombre que captures se guardará en <code>nvAprobadoPor</code>. Confirma que tienes autorización antes de continuar.
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 text-xs">
          <Filter className="h-4 w-4 text-slate-400" />
          <label htmlFor="filtro-certificacion" className="font-semibold text-slate-700 dark:text-slate-300">
            Certificación:
          </label>
          <select
            id="filtro-certificacion"
            value={filtroCertificacion}
            onChange={(event) => setFiltroCertificacion(event.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="">Todas</option>
            {[...new Set(movimientos.map((movimiento) => movimiento.certificacionId))].map((id) => (
              <option key={id} value={String(id)}>Certificación {id}</option>
            ))}
          </select>
        </div>
        <div className="flex min-w-[200px] flex-1 items-center gap-2 text-xs sm:max-w-xs">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <label htmlFor="busqueda-serial-aprobaciones" className="sr-only">Buscar por serial</label>
          <input
            id="busqueda-serial-aprobaciones"
            type="search"
            value={busquedaSerial}
            onChange={(event) => setBusquedaSerial(event.target.value)}
            placeholder="Buscar por serial"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          />
        </div>
        <div className="flex min-w-[240px] flex-1 items-center gap-2 text-xs sm:max-w-md">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <label htmlFor="busqueda-fecha-hora" className="sr-only">Buscar por fecha y hora de emisión</label>
          <input
            id="busqueda-fecha-hora"
            type="search"
            value={busquedaFechaHora}
            onChange={(event) => setBusquedaFechaHora(event.target.value)}
            placeholder="Buscar fecha y hora (AAAA-MM-DD HH:mm)"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          />
        </div>
        <span className="ml-auto text-xs font-mono text-slate-500 dark:text-slate-400">
          dbo.Movimientos
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={todosVisiblesSeleccionados}
              disabled={pendientes.length === 0 || aprobacionMultipleEnviando}
              onChange={(event) => alternarSeleccionTodos(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Seleccionar todas las pendientes visibles ({pendientes.length})
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
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="w-10 px-3 py-3">
                  <span className="sr-only">Seleccionar movimiento</span>
                </th>
                <th className="px-4 py-3">Folio / emisión</th>
                <th className="px-4 py-3">Serial</th>
                <th className="px-4 py-3">Componente</th>
                <th className="px-4 py-3">Línea</th>
                <th className="px-4 py-3">Razón</th>
                <th className="px-4 py-3 text-right">Cantidad</th>
                <th className="px-4 py-3 text-center">Dictamen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {pendientes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <FileCheck2 className="h-10 w-10 text-emerald-500/70" />
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {busquedaFechaHora || filtroCertificacion || busquedaSerial
                          ? 'No hay solicitudes que coincidan con los filtros.'
                          : '¡Todo al día! No hay solicitudes pendientes.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : pendientes.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Seleccionar movimiento ${item.id}`}
                      checked={seleccionados.includes(item.id)}
                      disabled={aprobacionMultipleEnviando}
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
                  <td className="px-4 py-3 font-mono font-semibold text-slate-700 dark:text-slate-300">
                    {item.serial || 'No disponible'}
                  </td>
                  <td className="max-w-[260px] px-4 py-3">
                    <div className="truncate font-mono font-bold text-slate-800 dark:text-slate-200" title={item.matnr}>{item.matnr}</div>
                    <div className="truncate text-[11px] text-slate-500 dark:text-slate-400" title={item.descripcion}>{item.descripcion || item.serial}</div>
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
                  <td className="max-w-[220px] px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                      <span className="truncate text-slate-700 dark:text-slate-300" title={razonRevision}>
                        {item.razonId === null ? 'Sin razón' : item.descripcionRazon || item.motivoEspecifico || 'Descripción no disponible'}
                      </span>
                    </div>
                    <div className="mt-0.5 pl-5 text-[10px] text-slate-500 dark:text-slate-400">{item.movimientoTipoId} · {item.movimientoTipo}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-800 dark:text-slate-100">
                    {item.cantidad} {item.unidad}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      <Button
                        variant={seleccionados.includes(item.id) ? 'secondary' : 'success'}
                        size="sm"
                        className="min-w-[96px]"
                        icon={<Check className="h-3.5 w-3.5" />}
                        disabled={seleccionados.includes(item.id) || aprobacionMultipleEnviando}
                        onClick={() => abrirRevision(item, 1)}
                      >
                        Aprobar
                      </Button>
                      <Button
                        variant={seleccionados.includes(item.id) ? 'secondary' : 'danger'}
                        size="sm"
                        className="min-w-[96px]"
                        icon={<X className="h-3.5 w-3.5" />}
                        disabled={seleccionados.includes(item.id) || aprobacionMultipleEnviando}
                        onClick={() => abrirRevision(item, 4)}
                      >
                        Denegar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
        isOpen={!!revision}
        onClose={cerrarRevision}
        title={revision?.decision === 1 ? 'Revisión para aprobar' : 'Revisión para denegar'}
        subtitle={`Ficha completa del componente · Folio #${movimientoRevision?.id ?? ''}`}
        maxWidth="4xl"
      >
        {revision && movimientoRevision && (
          <form onSubmit={confirmarDictamen} className="space-y-5">
            <section>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Identificación del componente</h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                <CampoDato etiqueta="Folio" valor={movimientoRevision.id} mono />
                <CampoDato etiqueta="Serial" valor={movimientoRevision.serial} mono />
                <CampoDato etiqueta="MATNR" valor={movimientoRevision.matnr} mono />
                <CampoDato etiqueta="MATNR producto terminado" valor={movimientoRevision.matnrFg} mono />
                <CampoDato etiqueta="Descripción" valor={movimientoRevision.descripcion} />
                <CampoDato etiqueta="Fecha y hora de emisión" valor={movimientoRevision.fechaHora || `${movimientoRevision.fecha} ${movimientoRevision.hora}`} mono />
                <CampoDato etiqueta="Certificación" valor={`${movimientoRevision.certificacionId}${movimientoRevision.certificacionNombre ? ` · ${movimientoRevision.certificacionNombre}` : ''}`} />
                <CampoDato etiqueta="Línea" valor={movimientoRevision.linea} />
              </div>
            </section>

            <section>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Movimiento y material</h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                <CampoDato etiqueta="Tipo de movimiento" valor={`${movimientoRevision.movimientoTipoId} · ${movimientoRevision.movimientoTipo}`} />
                <CampoDato etiqueta="Razón" valor={razonRevision} />
                <CampoDato etiqueta="Motivo específico" valor={movimientoRevision.motivoEspecifico} />
                <CampoDato etiqueta="Cantidad" valor={`${movimientoRevision.cantidad} ${movimientoRevision.unidad}`} />
                <CampoDato etiqueta="Costo unitario" valor={movimientoRevision.costoUnitario} />
                <CampoDato etiqueta="Costo total" valor={movimientoRevision.costoTotal} />
                <CampoDato etiqueta="Almacén" valor={movimientoRevision.almacen} mono />
                <CampoDato etiqueta="Almacén de salida" valor={movimientoRevision.almacenSalida} mono />
                <CampoDato etiqueta="Almacén de retorno" valor={movimientoRevision.almacenRetorno} mono />
                <CampoDato etiqueta="Centro de costo" valor={movimientoRevision.centroCosto} mono />
                <CampoDato etiqueta="Orden de producción" valor={movimientoRevision.ordenProduccion} mono />
                <CampoDato etiqueta="Lote" valor={movimientoRevision.lote} mono />
              </div>
            </section>

            <section>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Reporte y estado del registro</h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                <CampoDato etiqueta="Empleado" valor={movimientoRevision.empleado} />
                <CampoDato etiqueta="ID de empleado" valor={movimientoRevision.empleadoId} mono />
                <CampoDato etiqueta="Credencial" valor={movimientoRevision.credencial} mono />
                <CampoDato etiqueta="Turno" valor={movimientoRevision.turno} />
                <CampoDato etiqueta="Salida" valor={movimientoRevision.salida} />
                <CampoDato etiqueta="Retorno" valor={movimientoRevision.retorno} />
                <CampoDato etiqueta="Procesado" valor={movimientoRevision.procesado} />
                <CampoDato etiqueta="Estado actual" valor={`${movimientoRevision.aprobado ?? 'N/D'} · ${movimientoRevision.estatus}`} />
                <CampoDato etiqueta="Aprobado por" valor={movimientoRevision.nvAprobadoPor} />
                <CampoDato etiqueta="Fecha de aprobación" valor={movimientoRevision.dtAprobado} mono />
                <CampoDato etiqueta="Observaciones" valor={movimientoRevision.observaciones} />
                <CampoDato etiqueta="Comentarios de aprobación" valor={movimientoRevision.comentariosAprobacion} />
              </div>
            </section>

            {movimientoRevision.historial.length > 0 && (
              <section>
                <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Historial</h2>
                <div className="space-y-2">
                  {movimientoRevision.historial.map((hito) => (
                    <div key={hito.id} className="rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-700">
                      <div className="flex flex-wrap justify-between gap-1">
                        <span className="font-semibold text-slate-800 dark:text-slate-100">{hito.titulo} · {hito.estado}</span>
                        <span className="font-mono text-slate-500">{hito.fechaHora}</span>
                      </div>
                      <p className="mt-1 text-slate-600 dark:text-slate-300">{hito.descripcion}</p>
                      <p className="mt-1 text-slate-500">Responsable: {hito.usuario} · {hito.rol}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {datosBase && (
              <details className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
                <summary className="cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Ver valores originales de dbo.Movimientos
                </summary>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {Object.entries(datosBase).map(([columna, valor]) => (
                    <CampoDato key={columna} etiqueta={columna} valor={valor} mono />
                  ))}
                </div>
              </details>
            )}

            <section className={`rounded-xl border p-4 ${revision.decision === 1
              ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/30'
              : 'border-rose-200 bg-rose-50/70 dark:border-rose-900 dark:bg-rose-950/30'}`}
            >
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {revision.decision === 1 ? 'Confirmar aprobación' : 'Confirmar denegación'}
              </h2>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                Al confirmar, se actualizará el dictamen y SQL Server registrará la fecha y hora.
              </p>
              <label htmlFor="nombre-responsable" className="mb-1 mt-3 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Nombre que quedará registrado como responsable (no verificado)
              </label>
              <input
                id="nombre-responsable"
                name="nombre-responsable"
                type="text"
                autoComplete="name"
                maxLength={200}
                required
                value={nombreResponsable}
                onChange={(event) => setNombreResponsable(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder="Nombre y apellido"
              />
              {requiereComentarioRechazo && (
                <>
                  <label htmlFor="comentario-rechazo" className="mb-1 mt-3 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Comentario de rechazo
                  </label>
                  <textarea
                    id="comentario-rechazo"
                    name="comentario-rechazo"
                    required
                    maxLength={500}
                    rows={3}
                    value={comentarioRechazo}
                    onChange={(event) => setComentarioRechazo(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    placeholder="Describe brevemente el motivo del rechazo"
                  />
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Solo se muestra en Movimientos durante esta sesión; no se guarda en la base de datos.
                  </p>
                </>
              )}
            </section>

            {errorDictamen && (
              <div role="alert" className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                {errorDictamen}
              </div>
            )}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <Button type="button" variant="ghost" onClick={cerrarRevision} disabled={dictamenEnviando}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant={revision.decision === 1 ? 'success' : 'danger'}
                loading={dictamenEnviando}
                disabled={!nombreResponsable.trim() || (requiereComentarioRechazo && !comentarioRechazo.trim())}
              >
                {revision.decision === 1 ? 'Confirmar aprobación' : 'Confirmar denegación'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
