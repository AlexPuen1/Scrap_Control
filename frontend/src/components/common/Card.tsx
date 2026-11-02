import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  action,
  className = '',
  bodyClassName = '',
  noPadding = false,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs hover:shadow-lg hover:shadow-slate-900/5 dark:hover:shadow-black/30 transition-shadow duration-300 overflow-hidden ${className}`}
    >
      {(title || subtitle || action) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            {typeof title === 'string' ? (
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                <span aria-hidden="true" className="h-4 w-1 rounded-full bg-gradient-to-b from-blue-500 to-indigo-500" />
                {title}
              </h3>
            ) : (
              title
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className={noPadding ? bodyClassName : `p-5 ${bodyClassName}`}>{children}</div>
    </motion.div>
  );
};
