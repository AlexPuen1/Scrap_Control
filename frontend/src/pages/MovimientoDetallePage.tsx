import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import { useScrap } from '../context/ScrapContext';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Card } from '../components/common/Card';
import { simularImpresionPDF } from '../utils/formatters';
import { ScrapService } from '../services/scrapService';
import type { OpcionRazon } from '../types';

export const MovimientoDetallePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { movimientos, movimientosCargando, actualizarRazonMovimiento } = useScrap();
  const movimientoEnLista = movimientos.find((m) => m.id === id || m.serial === id);
  const [movimientoConsultado, setMovimientoConsultado] = useState<{
    id: string;
    movimiento: Awaited<ReturnType<typeof ScrapService.obtenerMovimiento>>;
  } | null>(null);
  const [errorDetalle, setErrorDetalle] = useState<{ id: string; mensaje: string } | null>(null);
  const [catalogoRazones, setCatalogoRazones] = useState<{
    movimientoTipoId: number;
    opciones: OpcionRazon[];
    error: string | null;
  } | null>(null);
  const [borradorRazon, setBorradorRazon] = useState<{ movimientoId: string; valor: string } | null>(null);
  const [guardandoRazon, setGuardandoRazon] = useState(false);
  const [errorGuardarRazon, setErrorGuardarRazon] = useState<string | null>(null);

  const movimientoConsultadoActual = movimientoConsultado && movimientoConsultado.id === id
    ? movimientoConsultado.movimiento
    : undefined;
  const movimiento = movimientoEnLista ?? movimientoConsultadoActual;
  const movimientoTipoId = movimiento?.movimientoTipoId;
  const movimientoId = movimiento?.id;

  useEffect(() => {
    if (!id || movimientoEnLista || movimientosCargando) return;
    let vigente = true;
    if (!/^[1-9]\d*$/.test(id)) return;
    ScrapService.obtenerMovimiento(id)
      .then((resultado) => {
        if (vigente) setMovimientoConsultado({ id, movimiento: resultado });
      })
      .catch((error: unknown) => {
        if (vigente) {
          setErrorDetalle({
            id,
            mensaje: error instanceof Error ? error.message : 'No se pudo cargar el movimiento.',
          });
        }
      });
    return () => {
      vigente = false;
    };
  }, [id, movimientoEnLista, movimientosCargando]);

  useEffect(() => {
    if (movimientoTipoId === undefined) return;
    let vigente = true;
    ScrapService.obtenerRazones(movimientoTipoId)
      .then((opciones) => {
        if (vigente) {
          setCatalogoRazones({ movimientoTipoId, opciones, error: null });
        }
      })
      .catch((errorCarga: unknown) => {
        if (vigente) {
          setCatalogoRazones({
            movimientoTipoId,
            opciones: [],
            error: errorCarga instanceof Error ? errorCarga.message : 'No se pudieron cargar las razones.',
          });
        }
      });
    return () => {
      vigente = false;
    };
  }, [movimientoTipoId]);

  const catalogoActual = catalogoRazones?.movimientoTipoId === movimientoTipoId ? catalogoRazones : null;
  const razonesDisponibles = catalogoActual?.opciones ?? [];
  const errorRazon = catalogoActual?.error ?? null;
  const cargandoRazones = movimientoTipoId !== undefined
    && catalogoActual === null;
  const borradorActual = borradorRazon && borradorRazon.movimientoId === movimientoId
    ? borradorRazon.valor
    : null;
  const razonActualNoDisponible = Boolean(
    movimiento?.razonId !== null
    && movimiento?.razonId !== undefined
    && !cargandoRazones
    && !razonesDisponibles.some((razon) => razon.id === movimiento.razonId),
  );
  const razonSeleccionada = borradorActual
    ?? (razonActualNoDisponible
      ? '__actual__'
      : movimiento?.razonId === null || movimiento?.razonId === undefined ? '' : String(movimiento.razonId));
  const razonModificada = Boolean(
    movimiento
    && razonSeleccionada !== '__actual__'
    && (razonSeleccionada === ''
      ? movimiento.razonId !== null
      : Number(razonSeleccionada) !== movimiento.razonId),
  );
  const detalleNoNumerico = Boolean(id && !/^[1-9]\d*$/.test(id));
  const errorDetalleActual = errorDetalle && errorDetalle.id === id ? errorDetalle.mensaje : null;
  const mensajeErrorDetalle = errorDetalleActual
    ? errorDetalleActual
    : detalleNoNumerico
      ? 'No se encontró el movimiento en el periodo cargado. Para consultar por folio, usa el ID numérico.'
      : null;
  const cargandoDetalle = !movimiento && !movimientosCargando && !detalleNoNumerico && !mensajeErrorDetalle;
  const guardarRazon = async () => {
    if (!movimiento || razonSeleccionada === '__actual__') return;
    setGuardandoRazon(true);
    setErrorGuardarRazon(null);
    try {
      await actualizarRazonMovimiento(
        movimiento.id,
        razonSeleccionada === '' ? null : Number(razonSeleccionada),
      );
      setBorradorRazon({ movimientoId: movimiento.id, valor: razonSeleccionada });
    } catch (error) {
      setErrorGuardarRazon(error instanceof Error ? error.message : 'No se pudo actualizar la razón.');
    } finally {
      setGuardandoRazon(false);
    }
  };

  if (!movimiento) {
    return (
      <div className="p-12 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
          {cargandoDetalle || movimientosCargando ? 'Cargando movimiento…' : 'No se pudo mostrar el movimiento'}
        </h2>
        <p className="text-sm text-slate-500">
          {mensajeErrorDetalle || (movimientosCargando
            ? 'Consultando los registros disponibles.'
            : `No se encontró el folio #${id} en dbo.Movimientos.`)}
        </p>
        <Button variant="primary" onClick={() => navigate('/movimientos')}>
          Volver a Movimientos
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Botón Volver y Barra de Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/movimientos')}
            className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-xs"
            title="Volver al listado"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
                Movimiento #{movimiento.id}
              </h1>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Serial: {movimiento.serial}
              </span>
              <Badge estatus={movimiento.estatus} size="md" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Registro sincronizado con tabla <code className="font-mono text-blue-600 dark:text-blue-400">dbo.Movimientos</code> (SSMS) • Trazabilidad 360°
            </p>
          </div>
        </div>

        {/* Acciones del Detalle */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Printer className="w-4 h-4" />}
            onClick={() => simularImpresionPDF(`Marbete_${movimiento.serial || movimiento.id}`)}
          >
            Imprimir Marbete
          </Button>

        </div>
      </div>

      {/* Banner de Estado de Dictamen */}
      <div
        className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          movimiento.aprobado === 1
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
            : movimiento.aprobado === 2
            ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
            : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 shrink-0" />
          <div>
            <h4 className="font-semibold text-xs sm:text-sm">
              Dictamen: {movimiento.aprobado === null ? 'No integrado' : movimiento.aprobado === 1 ? 'Aprobado (aprobado = 1)' : movimiento.aprobado === 2 ? 'Rechazado (aprobado = 2)' : 'Pendiente (aprobado = 0)'}
            </h4>
            <p className="text-xs opacity-90">
              {movimiento.aprobado === 1 &&
                `Dictaminado por ${movimiento.nvAprobadoPor || 'Responsable no especificado'} el ${movimiento.dtAprobado || movimiento.fechaHora}.`}
              {movimiento.aprobado === 2 &&
                `Rechazado por ${movimiento.nvAprobadoPor || 'Responsable no especificado'}.`}
              {movimiento.aprobado === null &&
                'La integración del campo de aprobación está pendiente.'}
              {movimiento.aprobado === 0 &&
                'Pendiente de dictamen. Esta aplicación no ejecuta firma digital ni registra movimientos en SAP.'}
            </p>
          </div>
        </div>

        {movimiento.comentariosAprobacion && (
          <div className="text-xs italic bg-white/70 dark:bg-black/30 p-2 rounded-lg max-w-sm">
            "{movimiento.comentariosAprobacion}"
          </div>
        )}
      </div>

      {/* Grid de Contenido */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Ficha Técnica + Estructura de Base de Datos */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Ficha técnica con campos del movimiento */}
          <Card
            title="Ficha técnica del movimiento"
            subtitle="Identificación del componente y datos asociados de dbo.Movimientos"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-mono">id (PK, int)</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{movimiento.id}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-mono">Serial (varchar 50)</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{movimiento.serial || 'Sin serial'}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-mono">Credencial (varchar 50)</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{movimiento.credencial || 'Sin credencial'}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-mono">CertificacionId (FK)</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                  {movimiento.certificacionId}
                </span>
                <span className="text-[10px] text-slate-400 block truncate">{movimiento.linea}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-mono">MATNR (varchar 50)</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{movimiento.matnr}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-mono">MATNR_FG (varchar 50)</span>
                <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                  {movimiento.matnrFg || 'N/A'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-mono">fecha_hora (datetime)</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium">{movimiento.fechaHora}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-mono">MovimientoTipoId (FK)</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {movimiento.movimientoTipoId} ({movimiento.movimientoTipo})
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-mono">cantidad (int)</span>
                <span className="font-mono font-bold text-base text-slate-900 dark:text-white">
                  {movimiento.cantidad} {movimiento.unidad}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Razón del movimiento</span>
                <div className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                  <Tag className="w-3 h-3" />
                  <span>{movimiento.descripcionRazon || 'Sin descripción disponible'}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-mono">almacen (varchar 50)</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{movimiento.almacen}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-mono">Línea de producción</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{movimiento.linea || 'Sin línea asignada'}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-mono">centro_costo (varchar 50)</span>
                <span className="font-mono text-slate-500 dark:text-slate-400">Ignorado según instrucciones</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-mono">Empleado (varchar 250)</span>
                <span className="text-slate-500 dark:text-slate-400 font-medium truncate block">Pendiente de integración</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-mono">aprobado (int)</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {movimiento.aprobado === null ? 'Pendiente de integración' : `${movimiento.aprobado} (${movimiento.estatus})`}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-mono">nvAprobadoPor (nvarchar)</span>
                <span className="text-slate-800 dark:text-slate-200 truncate block">
                  {movimiento.nvAprobadoPor || 'Pendiente'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-mono">dtAprobado (datetime)</span>
                <span className="text-slate-800 dark:text-slate-200">
                  {movimiento.dtAprobado || 'Pendiente'}
                </span>
              </div>
            </div>
            <div className="mt-5 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
              <label htmlFor="razon-movimiento" className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                Corregir razón del movimiento
              </label>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Elige una descripción del catálogo disponible para este tipo de movimiento.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <select
                  id="razon-movimiento"
                  value={razonSeleccionada}
                  onChange={(event) => {
                    if (!movimiento) return;
                    setBorradorRazon({ movimientoId: movimiento.id, valor: event.target.value });
                    setErrorGuardarRazon(null);
                  }}
                  disabled={cargandoRazones || guardandoRazon}
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">Sin razón</option>
                  {razonActualNoDisponible && (
                    <option value="__actual__" disabled>Razón actual sin descripción disponible</option>
                  )}
                  {razonesDisponibles.map((razon) => (
                    <option key={razon.id} value={String(razon.id)}>{razon.descripcion}</option>
                  ))}
                </select>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!razonModificada || cargandoRazones || guardandoRazon || Boolean(errorRazon)}
                  onClick={() => void guardarRazon()}
                >
                  {guardandoRazon ? 'Guardando…' : 'Guardar razón'}
                </Button>
              </div>
              {(errorRazon || errorGuardarRazon) && (
                <p role="alert" className="mt-2 text-xs text-rose-600 dark:text-rose-400">
                  {errorRazon || errorGuardarRazon}
                </p>
              )}
              {razonActualNoDisponible && !errorRazon && (
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                  La razón actual no tiene descripción en el catálogo; selecciona una opción válida o «Sin razón».
                </p>
              )}
            </div>
          </Card>

          {/* Historial y Auditoría Cronológica */}
          <Card title="Trazabilidad y Línea de Vida (IATF 16949)">
            <div className="space-y-4">
              {movimiento.historial?.map((hito, idx) => (
                <div key={hito.id || idx} className="flex gap-3 text-xs">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full mt-1 ${
                        hito.estado === 'completado'
                          ? 'bg-emerald-500'
                          : hito.estado === 'rechazado'
                          ? 'bg-rose-500'
                          : 'bg-amber-500'
                      }`}
                    />
                    {idx < (movimiento.historial?.length || 0) - 1 && (
                      <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-800 my-1" />
                    )}
                  </div>

                  <div className="flex-1 pb-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {hito.titulo}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {hito.fechaHora}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                      {hito.descripcion}
                    </p>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Responsable: <span className="font-medium text-slate-700 dark:text-slate-300">{hito.usuario}</span> ({hito.rol})
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Columna Derecha: Marbete Viajero Físico Simulado */}
        <div className="space-y-6">
          <Card title="Vista previa de marbete (simulada)">
            <div className="p-4 bg-amber-50/50 dark:bg-slate-800/80 rounded-xl border border-dashed border-amber-300 dark:border-slate-700 font-mono text-xs space-y-4 shadow-inner">
              {/* Encabezado del Marbete */}
              <div className="text-center border-b border-dashed border-slate-300 dark:border-slate-700 pb-3">
                <span className="text-[10px] tracking-widest uppercase font-bold text-slate-500 block">
                  MAGNA EXTERIORS & STAMPING
                </span>
                <span className="text-sm font-black text-slate-900 dark:text-white block mt-0.5">
                  MATERIAL NO CONFORME / SCRAP
                </span>
                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold block">
                  SERIAL: {movimiento.serial}
                </span>
              </div>

              {/* Contenido Principal */}
              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">ID BD:</span>
                  <span className="font-bold">#{movimiento.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">MATNR (Parte):</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{movimiento.matnr}</span>
                </div>
                {movimiento.matnrFg && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">MATNR_FG:</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">{movimiento.matnrFg}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Estación Cert.:</span>
                  <span className="font-bold">ID {movimiento.certificacionId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Línea:</span>
                  <span className="font-bold">{movimiento.linea || 'Sin línea asignada'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tipo:</span>
                  <span className="font-bold">{movimiento.movimientoTipoId} - {movimiento.movimientoTipo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Razón (Falla):</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {movimiento.razonId === null ? 'Sin razón' : movimiento.descripcionRazon || 'Razón sin descripción disponible'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cantidad:</span>
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    {movimiento.cantidad} {movimiento.unidad}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Almacén Dest.:</span>
                  <span className="font-bold">{movimiento.almacen}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Credencial:</span>
                  <span>{movimiento.credencial}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fecha/Hora:</span>
                  <span>{movimiento.fechaHora}</span>
                </div>
              </div>

              {/* Patrón visual de ejemplo; no es un código de barras escaneable. */}
              <div className="border-t border-dashed border-slate-300 dark:border-slate-700 pt-3 text-center space-y-1">
                <div className="h-10 bg-slate-900 dark:bg-white flex items-center justify-center rounded-xs px-2">
                  <div className="flex items-center gap-0.5 h-7 w-full justify-center overflow-hidden">
                    {Array.from({ length: 42 }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-full ${i % 3 === 0 ? 'w-1' : i % 2 === 0 ? 'w-0.5' : 'w-1.5'} ${
                          i % 4 === 0 ? 'bg-transparent' : 'bg-white dark:bg-slate-900'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-[10px] tracking-wider text-slate-500 block">
                  *{movimiento.serial}*
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

    </div>
  );
};
