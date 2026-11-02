import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Sun,
  Moon,
  Clock,
  Building2,
  Menu,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  User,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useScrap } from '../context/ScrapContext';
import { INFO_PLANTA, TURNOS_PLANTA } from '../constants';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface TopHeaderProps {
  onOpenMobileMenu: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ onOpenMobileMenu }) => {
  const { theme, toggleTheme } = useTheme();
  const { notificaciones, turnoActivo, marcarNotificacionLeida, marcarTodasNotificacionesLeidas } = useScrap();
  const navigate = useNavigate();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [horaActual, setHoraActual] = useState(() => new Date());

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const noLeidas = notificaciones.filter((n) => !n.leido).length;

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const intervalo = window.setInterval(() => setHoraActual(new Date()), 1000);
    return () => window.clearInterval(intervalo);
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between transition-colors">
      {/* Lado Izquierdo: Menú Móvil + Planta */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 -ml-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Indicador de Planta Activa (Estilo Fiori MES) */}
        <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs">
          <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <div className="flex flex-col">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {INFO_PLANTA.nombre}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              SAP Org: {INFO_PLANTA.codigoSapPlanta} • Base de datos SOE
            </span>
          </div>
        </div>
      </div>

      {/* Lado Derecho: Turno Activo + Notificaciones + Tema + Usuario */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Turno calculado automáticamente según el reloj local */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200"
          aria-live="polite"
          title="El turno se determina automáticamente con la hora local de este equipo."
        >
          <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <div className="flex flex-col">
            <span className="font-semibold">{turnoActivo}</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              {TURNOS_PLANTA.find((turno) => turno.id === turnoActivo)?.horario} · {horaActual.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
            </span>
          </div>
        </div>

        {/* Notificaciones */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Notificaciones de Planta"
          >
            <Bell className="w-5 h-5" />
            {noLeidas > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pop-in">
                {noLeidas}
              </span>
            )}
          </button>

          <AnimatePresence>
          {notifOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              style={{ transformOrigin: 'top right' }}
              className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-2 z-50 overflow-hidden"
            >
              <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Alertas y Notificaciones
                  </span>
                  {noLeidas > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 text-[10px] font-bold">
                      {noLeidas} nuevas
                    </span>
                  )}
                </div>
                {noLeidas > 0 && (
                  <button
                    onClick={marcarTodasNotificacionesLeidas}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Marcar leídas
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
                {notificaciones.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No hay notificaciones registradas.
                  </div>
                ) : (
                  notificaciones.map((n) => {
                    const icon = {
                      critico: <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />,
                      aprobacion: <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />,
                      alerta: <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />,
                      sistema: <Info className="w-4 h-4 text-blue-500 shrink-0" />,
                    }[n.tipo];

                    return (
                      <div
                        key={n.id}
                        onClick={() => {
                          marcarNotificacionLeida(n.id);
                          if (n.movimientoId) {
                            navigate(`/movimientos/${n.movimientoId}`);
                            setNotifOpen(false);
                          }
                        }}
                        className={`p-3.5 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${
                          !n.leido ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                        }`}
                      >
                        {icon}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {n.titulo}
                            </span>
                            <span className="text-[10px] text-slate-400 shrink-0">{n.tiempo}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">
                            {n.mensaje}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
          </AnimatePresence>
        </div>

        {/* Toggle Modo Oscuro / Claro */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-400 hover:rotate-90 transition-transform duration-300" />
          ) : (
            <Moon className="w-5 h-5 text-slate-700 hover:-rotate-12 transition-transform duration-300" />
          )}
        </button>

        {/* Perfil de Usuario Corporativo */}
        <div className="relative pl-1 border-l border-slate-200 dark:border-slate-800" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-900 dark:from-blue-600 dark:to-indigo-600 text-white flex items-center justify-center font-semibold text-xs shadow-xs border border-white/20">
              ?
            </div>
            <div className="hidden xl:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                Usuario no identificado
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                Perfil no configurado
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden xl:block" />
          </button>

          <AnimatePresence>
          {profileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              style={{ transformOrigin: 'top right' }}
              className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-3 z-50 text-xs"
            >
              <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl mb-2">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  ?
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white">Sesión no autenticada</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">No hay identidad de usuario configurada</p>
                </div>
              </div>

              <div className="space-y-1">
                <button
                  onClick={() => {
                    navigate('/configuracion');
                    setProfileOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <User className="w-4 h-4 text-slate-400" /> Preferencias de Usuario
                </button>
              </div>
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
