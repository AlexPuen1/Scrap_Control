import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, MotionConfig } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { ToastContainer } from '../components/common/ToastContainer';

export const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative isolate min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
        {/* Fondo decorativo sutil */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.08),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(99,102,241,0.06),transparent_50%)]"
        />
        {/* Barra Lateral Navegación */}
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        {/* Contenedor Principal */}
        <div className="relative flex-1 flex flex-col min-w-0">
          {/* Cabecera Superior */}
          <TopHeader onOpenMobileMenu={() => setMobileOpen(true)} />

          <div
            role="status"
            className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200"
          >
            Modo demostración: los roles solo cambian la interfaz. El backend no autentica ni autoriza; no expongas este servicio.
          </div>

          {/* Área de Contenido Dinámico con transición entre páginas */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <Outlet />
            </motion.div>
          </main>
        </div>

        {/* Contenedor Flotante de Toasts */}
        <ToastContainer />
      </div>
    </MotionConfig>
  );
};
