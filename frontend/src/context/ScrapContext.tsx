import React, { createContext, useContext, useEffect, useRef, useState, useMemo } from 'react';
import type { Motivo, Movimiento, Notificacion, ResumenKPIs, Turno, RazonCatalogo } from '../types';
import { MOTIVOS_INICIALES, NOTIFICACIONES_INICIALES, RAZONES_SSMS } from '../mock/data';
import { ScrapService } from '../services/scrapService';
import { obtenerTurnoActual } from '../constants';

interface ToastMessage {
  id: string;
  tipo: 'success' | 'error' | 'info' | 'warning';
  titulo: string;
  mensaje: string;
}

interface ScrapContextType {
  movimientos: Movimiento[];
  movimientosCargando: boolean;
  errorMovimientos: string | null;
  recargarMovimientos: () => void;
  motivos: Motivo[];
  razonesCatalogo: RazonCatalogo[];
  notificaciones: Notificacion[];
  turnoActivo: Turno;
  resumenKPIs: ResumenKPIs;
  toasts: ToastMessage[];
  agregarToast: (tipo: ToastMessage['tipo'], titulo: string, mensaje: string) => void;
  removerToast: (id: string) => void;
  aprobarMovimiento: (id: string, aprobadoPor: string) => Promise<void>;
  dictaminarMovimientos: (ids: string[], decision: 1 | 4, aprobadoPor: string, comentarioRechazo?: string) => Promise<{ dictaminados: string[]; fallidos: { id: string; mensaje: string }[] }>;
  rechazarMovimiento: (id: string, aprobadoPor: string, comentarioRechazo?: string) => Promise<void>;
  actualizarRazonMovimiento: (id: string, razonId: number | null) => Promise<void>;
  crearMotivo: (nuevo: Omit<Motivo, 'id'>) => Motivo;
  actualizarMotivo: (id: string, actualizacion: Partial<Motivo>) => void;
  eliminarMotivo: (id: string) => void;
  marcarNotificacionLeida: (id: string) => void;
  marcarTodasNotificacionesLeidas: () => void;
  resetearDatosMock: () => void;
}

const ScrapContext = createContext<ScrapContextType | undefined>(undefined);

const STORAGE_KEYS = {
  MOTIVOS: 'scrap_mes_motivos_ssms_v2',
  NOTIFICACIONES: 'scrap_mes_notificaciones_ssms_v2',
};

export const ScrapProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [movimientosCargando, setMovimientosCargando] = useState(true);
  const [errorMovimientos, setErrorMovimientos] = useState<string | null>(null);
  const [recargaMovimientos, setRecargaMovimientos] = useState(0);
  const comentariosRechazoRef = useRef<Record<string, string>>({});
  const siguienteToastIdRef = useRef(0);

  const [motivos, setMotivos] = useState<Motivo[]>(() => {
    const guardado = localStorage.getItem(STORAGE_KEYS.MOTIVOS);
    if (guardado) {
      try {
        return JSON.parse(guardado);
      } catch (e) {
        console.error('Error al cargar motivos de localStorage', e);
      }
    }
    return MOTIVOS_INICIALES;
  });

  const [razonesCatalogo] = useState<RazonCatalogo[]>(RAZONES_SSMS);

  const [notificaciones, setNotificaciones] = useState<Notificacion[]>(() => {
    const guardado = localStorage.getItem(STORAGE_KEYS.NOTIFICACIONES);
    if (guardado) {
      try {
        return JSON.parse(guardado);
      } catch (e) {
        console.error('Error al cargar notificaciones de localStorage', e);
      }
    }
    return NOTIFICACIONES_INICIALES;
  });

  const [turnoActivo, setTurnoActivoState] = useState(() => obtenerTurnoActual(new Date()));

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    let vigente = true;
    ScrapService.obtenerMovimientos()
      .then((datos) => {
        if (vigente) {
          setMovimientos(datos.map((movimiento) => ({
            ...movimiento,
            comentarioRechazo: comentariosRechazoRef.current[movimiento.id],
          })));
        }
      })
      .catch((error: unknown) => {
        if (vigente) {
          setMovimientos([]);
          setErrorMovimientos(error instanceof Error ? error.message : 'No se pudieron cargar movimientos.');
        }
      })
      .finally(() => {
        if (vigente) setMovimientosCargando(false);
      });
    return () => { vigente = false; };
  }, [recargaMovimientos]);

  const recargarMovimientos = () => {
    setMovimientosCargando(true);
    setErrorMovimientos(null);
    setRecargaMovimientos((actual) => actual + 1);
  };

  useEffect(() => {
    let temporizador: number;
    const programarCambioTurno = () => {
      const ahora = new Date();
      const minutosDelDia = ahora.getHours() * 60 + ahora.getMinutes();
      const siguienteCambio = new Date(ahora);
      if (minutosDelDia < 6 * 60) {
        siguienteCambio.setHours(6, 0, 0, 0);
      } else if (minutosDelDia < 14 * 60) {
        siguienteCambio.setHours(14, 0, 0, 0);
      } else if (minutosDelDia < 22 * 60) {
        siguienteCambio.setHours(22, 0, 0, 0);
      } else {
        siguienteCambio.setDate(siguienteCambio.getDate() + 1);
        siguienteCambio.setHours(6, 0, 0, 0);
      }
      temporizador = window.setTimeout(() => {
        setTurnoActivoState(obtenerTurnoActual(new Date()));
        programarCambioTurno();
      }, siguienteCambio.getTime() - ahora.getTime());
    };
    programarCambioTurno();
    return () => window.clearTimeout(temporizador);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MOTIVOS, JSON.stringify(motivos));
  }, [motivos]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOTIFICACIONES, JSON.stringify(notificaciones));
  }, [notificaciones]);

  const agregarToast = (tipo: ToastMessage['tipo'], titulo: string, mensaje: string) => {
    const id = `toast-${siguienteToastIdRef.current++}`;
    setToasts((prev) => [...prev, { id, tipo, titulo, mensaje }]);
    setTimeout(() => {
      removerToast(id);
    }, 4500);
  };

  const removerToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const guardarDictamen = async (id: string, decision: 1 | 4, aprobadoPor: string) => {
    try {
      return decision === 1
        ? await ScrapService.aprobarMovimiento(id, aprobadoPor)
        : await ScrapService.rechazarMovimiento(id, aprobadoPor);
    } catch (error) {
      try {
        const movimientoConfirmado = await ScrapService.obtenerMovimiento(id);
        const estadoConfirmado = movimientoConfirmado.aprobado === decision
          || (decision === 1 && movimientoConfirmado.aprobado === 2 && Boolean(movimientoConfirmado.dtAprobado));
        if (estadoConfirmado
          && movimientoConfirmado.nvAprobadoPor === aprobadoPor.trim()) {
          return movimientoConfirmado;
        }
      } catch {
        // Preserve the original dictamen error when the state cannot be verified.
      }
      throw error;
    }
  };

  const aplicarDictamenConfirmado = (actualizado: Movimiento) => {
    setMovimientos((actuales) => actuales.map((movimiento) =>
      movimiento.id === actualizado.id
        ? { ...actualizado, comentarioRechazo: comentariosRechazoRef.current[actualizado.id] }
        : movimiento,
    ));
  };

  const aprobarMovimiento = async (id: string, aprobadoPor: string) => {
    const actualizado = await guardarDictamen(id, 1, aprobadoPor);
    aplicarDictamenConfirmado(actualizado);
    agregarToast('success', 'Movimiento aprobado', `El dictamen del movimiento ${id} se guardó en dbo.Movimientos.`);
  };

  const registrarComentarioRechazoLocal = (id: string, comentario: string) => {
    comentariosRechazoRef.current[id] = comentario;
    setMovimientos((actuales) => actuales.map((movimiento) =>
      movimiento.id === id ? { ...movimiento, comentarioRechazo: comentario } : movimiento,
    ));
  };

  const dictaminarMovimientos = async (
    ids: string[],
    decision: 1 | 4,
    aprobadoPor: string,
    comentarioRechazo = '',
  ) => {
    const incluyeScrap = ids.some((id) =>
      movimientos.some((movimiento) => movimiento.id === id && movimiento.movimientoTipoId === 1),
    );
    if (decision === 4 && incluyeScrap && !comentarioRechazo.trim()) {
      throw new Error('El comentario es obligatorio para rechazar Scrap.');
    }

    const dictaminados: string[] = [];
    const fallidos: { id: string; mensaje: string }[] = [];

    for (const id of ids) {
      try {
        const actualizado = await guardarDictamen(id, decision, aprobadoPor);
        if (decision === 4) {
          if (
            movimientos.some((movimiento) => movimiento.id === id && movimiento.movimientoTipoId === 1)
            && comentarioRechazo.trim()
          ) {
            registrarComentarioRechazoLocal(id, comentarioRechazo.trim());
          }
        }
        aplicarDictamenConfirmado(actualizado);
        dictaminados.push(id);
      } catch (error) {
        fallidos.push({
          id,
          mensaje: error instanceof Error ? error.message : 'Error desconocido al registrar el dictamen.',
        });
      }
    }

    if (dictaminados.length > 0) {
      agregarToast(
        'success',
        decision === 1 ? 'Aprobación múltiple' : 'Rechazo múltiple',
        decision === 1
          ? `${dictaminados.length} movimiento(s) aprobado(s) y guardado(s) en dbo.Movimientos.`
          : incluyeScrap && comentarioRechazo.trim()
            ? `${dictaminados.length} movimiento(s) rechazado(s) guardado(s) en dbo.Movimientos. El comentario solo está disponible durante esta sesión.`
            : `${dictaminados.length} movimiento(s) rechazado(s) guardado(s) en dbo.Movimientos.`,
      );
      recargarMovimientos();
    }
    if (fallidos.length > 0) {
      agregarToast(
        'error',
        'Dictamen múltiple incompleto',
        `No se pudieron ${decision === 1 ? 'aprobar' : 'rechazar'} ${fallidos.length} movimiento(s). Revisa el detalle en la bandeja.`,
      );
    }
    return { dictaminados, fallidos };
  };

  const rechazarMovimiento = async (id: string, aprobadoPor: string, comentarioRechazo = '') => {
    const esScrap = movimientos.some((movimiento) => movimiento.id === id && movimiento.movimientoTipoId === 1);
    if (esScrap && !comentarioRechazo.trim()) {
      throw new Error('El comentario es obligatorio para rechazar Scrap.');
    }
    const actualizado = await guardarDictamen(id, 4, aprobadoPor);
    if (esScrap) registrarComentarioRechazoLocal(id, comentarioRechazo.trim());
    aplicarDictamenConfirmado(actualizado);
    agregarToast(
      'success',
      'Movimiento rechazado',
      esScrap
        ? `El dictamen del movimiento ${id} se guardó en dbo.Movimientos. El comentario solo está disponible durante esta sesión.`
        : `El dictamen del movimiento ${id} se guardó en dbo.Movimientos.`,
    );
  };

  const actualizarRazonMovimiento = async (id: string, razonId: number | null) => {
    const movimientoActualizado = await ScrapService.actualizarRazon(id, razonId);
    setMovimientos((actuales) => actuales.map((movimiento) =>
      movimiento.id === id ? movimientoActualizado : movimiento,
    ));
    agregarToast('success', 'Razón actualizada', `La razón del movimiento ${id} se guardó en dbo.Movimientos.`);
  };

  const crearMotivo = (nuevo: Omit<Motivo, 'id'>): Motivo => {
    const nuevoId = `MOT-${nuevo.razonId || Math.floor(5000 + Math.random() * 1000)}`;
    const motivoCreado: Motivo = {
      ...nuevo,
      id: nuevoId,
    };
    setMotivos((prev) => [...prev, motivoCreado]);
    agregarToast('success', 'Razón Creada', `Razón ${motivoCreado.codigo} agregada al catálogo.`);
    return motivoCreado;
  };

  const actualizarMotivo = (id: string, actualizacion: Partial<Motivo>) => {
    setMotivos((prev) => prev.map((m) => (m.id === id ? { ...m, ...actualizacion } : m)));
    agregarToast('info', 'Razón Actualizada', 'Los cambios en el catálogo fueron guardados.');
  };

  const eliminarMotivo = (id: string) => {
    setMotivos((prev) => prev.filter((m) => m.id !== id));
    agregarToast('warning', 'Razón Eliminada', 'El motivo ha sido retirado del catálogo.');
  };

  const marcarNotificacionLeida = (id: string) => {
    setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leido: true } : n)));
  };

  const marcarTodasNotificacionesLeidas = () => {
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leido: true })));
    agregarToast('info', 'Notificaciones', 'Todas marcadas como leídas.');
  };

  const resetearDatosMock = () => {
    localStorage.removeItem(STORAGE_KEYS.MOTIVOS);
    localStorage.removeItem(STORAGE_KEYS.NOTIFICACIONES);
    setMotivos(MOTIVOS_INICIALES);
    setNotificaciones(NOTIFICACIONES_INICIALES);
    agregarToast('info', 'Datos locales reiniciados', 'Los movimientos de SQL Server no fueron modificados.');
  };

  // Cálculo reactivo de KPIs ejecutivos
  const resumenKPIs = useMemo<ResumenKPIs>(() => {
    const scrapMovs = movimientos.filter((m) => m.movimientoTipoId === 1 || m.movimientoTipo === 'Scrap');
    const scrapHoyPzas = scrapMovs.reduce((sum, m) => sum + m.cantidad, 0);
    const scrapHoyCosto = 0;
    const pendientesAprobar = movimientos.filter((m) => m.movimientoTipoId === 1 && m.aprobado === 0).length;
    const aprobadosHoy = movimientos.filter((m) => m.aprobado === 1 || m.estatus === 'Aprobado').length;
    const rechazadosHoy = movimientos.filter((m) => m.aprobado === 4 || m.estatus === 'Rechazado').length;

    return {
      scrapHoyPzas,
      scrapHoyCosto,
      pendientesAprobar,
      aprobadosHoy,
      rechazadosHoy,
      tasaScrapGeneral: 0,
      comparativaAyer: 0,
    };
  }, [movimientos]);

  return (
    <ScrapContext.Provider
      value={{
        movimientos,
        movimientosCargando,
        errorMovimientos,
        recargarMovimientos,
        motivos,
        razonesCatalogo,
        notificaciones,
        turnoActivo,
        resumenKPIs,
        toasts,
        agregarToast,
        removerToast,
        aprobarMovimiento,
        dictaminarMovimientos,
        rechazarMovimiento,
        actualizarRazonMovimiento,
        crearMotivo,
        actualizarMotivo,
        eliminarMotivo,
        marcarNotificacionLeida,
        marcarTodasNotificacionesLeidas,
        resetearDatosMock,
      }}
    >
      {children}
    </ScrapContext.Provider>
  );
};

export const useScrap = () => {
  const context = useContext(ScrapContext);
  if (!context) {
    throw new Error('useScrap debe ser usado dentro de un ScrapProvider');
  }
  return context;
};
