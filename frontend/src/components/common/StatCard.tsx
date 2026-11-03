import React from 'react';
import { motion } from 'framer-motion';
import { AnimatedValue } from './AnimatedValue';

interface StatCardProps {
  titulo: string;
  valor: string | number;
  subvalor?: string;
  icono: React.ReactNode;
  variacion?: {
    valor: string;
    esPositiva: boolean;
    etiqueta?: string;
  };
  colorAccent?: 'blue' | 'amber' | 'emerald' | 'rose' | 'purple';
  onClick?: () => void;
  active?: boolean;
  /** Retraso de entrada (segundos) para escalonar varias tarjetas. */
  delay?: number;
}

const ACCENTS = {
  blue: {
    bar: 'from-blue-500 to-indigo-500',
    icon: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400',
    glow: 'group-hover:shadow-blue-500/10',
  },
  amber: {
    bar: 'from-amber-400 to-orange-500',
    icon: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400',
    glow: 'group-hover:shadow-amber-500/10',
  },
  emerald: {
    bar: 'from-emerald-400 to-teal-500',
    icon: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
    glow: 'group-hover:shadow-emerald-500/10',
  },
  rose: {
    bar: 'from-rose-500 to-pink-500',
    icon: 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400',
    glow: 'group-hover:shadow-rose-500/10',
  },
  purple: {
    bar: 'from-purple-500 to-fuchsia-500',
    icon: 'bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400',
    glow: 'group-hover:shadow-purple-500/10',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  titulo,
  valor,
  subvalor,
  icono,
  variacion,
  colorAccent = 'blue',
  onClick,
  active = false,
  delay = 0,
}) => {
  const accent = ACCENTS[colorAccent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      whileTap={onClick ? { scale: 0.985 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 26, delay }}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-pressed={onClick ? active : undefined}
      className={`group relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-shadow duration-300 hover:shadow-xl ${accent.glow} ${
        onClick ? 'cursor-pointer' : ''
      } ${
        active ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-950' : ''
      }`}
    >
      {/* Barra de acento superior */}
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent.bar} opacity-80 group-hover:opacity-100 transition-opacity`}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
            {titulo}
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
              <AnimatedValue value={valor} />
            </span>
          </div>
          {subvalor && (
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400 leading-snug">
              {subvalor}
            </p>
          )}
        </div>

        <div
          className={`p-3 rounded-xl ${accent.icon} shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6`}
        >
          {icono}
        </div>
      </div>

      {variacion && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center text-xs">
          <span
            className={`inline-flex items-center font-semibold ${
              variacion.esPositiva
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {variacion.esPositiva ? '↑' : '↓'} {variacion.valor}
          </span>
          {variacion.etiqueta && (
            <span className="ml-1.5 text-slate-400 dark:text-slate-500">{variacion.etiqueta}</span>
          )}
        </div>
      )}
    </motion.div>
  );
};
