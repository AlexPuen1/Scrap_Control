import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  ClipboardList,
  CheckCircle,
  FileBarChart,
  ChevronLeft,
  ChevronRight,
  Factory,
  Search,
  DollarSign,
} from 'lucide-react';
import { useScrap } from '../context/ScrapContext';
import { useAuth } from '../context/authContext';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  const { resumenKPIs } = useScrap();
  const { usuario } = useAuth();

  const navItems = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5 shrink-0" />,
    },
    {
      to: '/movimientos',
      label: 'Movimientos',
      icon: <ClipboardList className="w-5 h-5 shrink-0" />,
    },
    {
      to: '/filtros',
      label: 'Filtros paso a paso',
      icon: <Search className="w-5 h-5 shrink-0" />,
    },
    {
      to: '/aprobaciones',
      label: 'Aprobaciones',
      icon: <CheckCircle className="w-5 h-5 shrink-0" />,
      badge: resumenKPIs.pendientesAprobar > 0 ? resumenKPIs.pendientesAprobar : undefined,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      to: '/precio',
      label: 'Precio',
      icon: <DollarSign className="w-5 h-5 shrink-0" />,
    },
    {
      to: '/fallas-por-linea',
      label: 'Fallas por línea',
      icon: <Factory className="w-5 h-5 shrink-0" />,
    },
    {
      to: '/comparativa-mensual',
      label: 'Comparación mensual',
      icon: <FileBarChart className="w-5 h-5 shrink-0" />,
    },
  ];
  const navItemsVisibles = usuario?.rol === 'Administrador'
    ? navItems
    : navItems.filter((item) => ['/movimientos', '/aprobaciones', '/precio'].includes(item.to));

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onCloseMobile}
            className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden backdrop-blur-xs"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen transition-[width,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shadow-xl ${
          mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <Factory className="w-5 h-5" />
            </div>
            {(!collapsed || mobileOpen) && (
              <div className="flex flex-col truncate">
                <span className="font-bold text-white tracking-wider text-sm">
                  SCRAP<span className="text-blue-400">Control</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
                  Automotive Plant
                </span>
              </div>
            )}
          </div>

          {/* Collapse Button (Desktop) */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
          {navItemsVisibles.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-colors duration-200 relative group ${
                  isActive
                    ? 'text-white'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
                }`
              }
              title={collapsed ? item.label : undefined}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="sidebar-active-pill"
                      className="absolute inset-0 rounded-xl bg-blue-600 shadow-md shadow-blue-600/30"
                      transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-3 w-full">
                    {item.icon}

                    {(!collapsed || mobileOpen) && (
                      <span className="truncate flex-1">{item.label}</span>
                    )}

                    {/* Badge for pending approvals */}
                    {item.badge !== undefined && (
                      <span
                        className={`inline-flex items-center justify-center font-bold font-mono text-[11px] rounded-full px-2 py-0.5 shadow-xs ${
                          item.badgeColor || 'bg-blue-500 text-white'
                        } ${collapsed && !mobileOpen ? 'absolute -top-1 -right-1 px-1.5' : ''}`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Application information */}
        <div className="p-3 border-t border-slate-800 shrink-0">
          {(!collapsed || mobileOpen) ? (
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
              <div className="flex items-center gap-2 text-slate-200 font-semibold mb-1">
                <Factory className="w-3.5 h-3.5 text-blue-400" />
                <span>SCRAPControl</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Consultas mediante API corporativa
              </p>
            </div>
          ) : (
            <div className="flex justify-center" title="SCRAPControl · consultas mediante API corporativa">
              <Factory className="w-5 h-5 text-blue-400" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
