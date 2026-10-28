import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
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
  dictaminarMovimientos: (ids: string[], decision: 1 | 2, aprobadoPor: string) => Promise<{ dictaminados: string[]; fallidos: { id: string; mensaje: string }[] }>;
  rechazarMovimiento: (id: string, aprobadoPor: string) => Promise<void>;
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
    setMovimientosCargando(true);
    setErrorMovimientos(null);
    ScrapService.obtenerMovimientos()
      .then((datos) => {
        if (vigente) setMovimientos(datos);
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

  const recargarMovimientos = () => setRecargaMovimientos((actual) => actual + 1);

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
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts((prev) => [...prev, { id, tipo, titulo, mensaje }]);
    setTimeout(() => {
      removerToast(id);
    }, 4500);
  };

  const removerToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const aprobarMovimiento = async (id: string, aprobadoPor: string) => {
    await ScrapService.aprobarMovimiento(id, aprobadoPor);
    agregarToast('success', 'Movimiento aprobado', `El dictamen del movimiento ${id} se guardó en dbo.Movimientos.`);
    recargarMovimientos();
  };

  const dictaminarMovimientos = async (ids: string[], decision: 1 | 2, aprobadoPor: string) => {
    const dictaminados: string[] = [];
    const fallidos: { id: string; mensaje: string }[] = [];

    for (const id of ids) {
      try {
        if (decision === 1) await ScrapService.aprobarMovimiento(id, aprobadoPor);
        else await ScrapService.rechazarMovimiento(id, aprobadoPor);
        dictaminados.push(id);
      } catch (error) {
        fallidos.push({
          id,
          mensaje: error instanceof Error ? error.message : 'Error desconocido al aprobar.',
        });
      }
    }

    const etiquetaDecision = decision === 1 ? 'aprobado(s)' : 'rechazado(s)';
    if (dictaminados.length > 0) {
      agregarToast(
        'success',
        decision === 1 ? 'Aprobación múltiple' : 'Rechazo múltiple',
        `${dictaminados.length} movimiento(s) ${etiquetaDecision} y guardado(s) en dbo.Movimientos.`,
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

  const rechazarMovimiento = async (id: string, aprobadoPor: string) => {
    await ScrapService.rechazarMovimiento(id, aprobadoPor);
    agregarToast('success', 'Movimiento rechazado', `El dictamen del movimiento ${id} se guardó en dbo.Movimientos.`);
    recargarMovimientos();
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
    const pendientesAprobar = movimientos.filter((m) => m.aprobado === 0 || m.estatus === 'Pendiente').length;
    const aprobadosHoy = movimientos.filter((m) => m.aprobado === 1 || m.estatus === 'Aprobado').length;
    const rechazadosHoy = movimientos.filter((m) => m.aprobado === 2 || m.estatus === 'Rechazado').length;

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
