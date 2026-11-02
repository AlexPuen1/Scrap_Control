import React from 'react';
import type { EstatusMovimiento, SeveridadMotivo } from '../../types';
import { COLORES_ESTATUS } from '../../constants';

interface BadgeProps {
  estatus?: EstatusMovimiento;
  severidad?: SeveridadMotivo;
  texto?: string;
  size?: 'sm' | 'md';
  variant?: 'solid' | 'outline' | 'subtle';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  estatus,
  severidad,
  texto,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  if (estatus) {
    const config = COLORES_ESTATUS[estatus] || {
      badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    };
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-medium rounded-full transition-colors ${sizeClasses} ${config.badge} ${className}`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            estatus === 'Aprobado'
              ? 'bg-emerald-500'
              : estatus === 'Procesado'
              ? 'bg-blue-500'
              : estatus === 'Pendiente'
              ? 'bg-amber-500'
              : estatus === 'Rechazado'
              ? 'bg-rose-500'
              : estatus === 'En Cuarentena'
              ? 'bg-purple-500'
              : 'bg-blue-500'
          }`}
        />
        {estatus}
      </span>
    );
  }

  if (severidad) {
    let severidadClasses = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    if (severidad === 'Crítica') {
      severidadClasses = 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800';
    } else if (severidad === 'Alta') {
      severidadClasses = 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800';
    } else if (severidad === 'Media') {
      severidadClasses = 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800';
    } else if (severidad === 'Baja') {
      severidadClasses = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800';
    }

    return (
      <span className={`inline-flex items-center font-medium rounded-md ${sizeClasses} ${severidadClasses} ${className}`}>
        {severidad}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 ${sizeClasses} ${className}`}
    >
      {texto}
    </span>
  );
};
