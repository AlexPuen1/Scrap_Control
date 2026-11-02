import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { useScrap } from '../../context/ScrapContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removerToast } = useScrap();

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const config = {
            success: {
              icon: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
              border: 'border-l-4 border-l-emerald-500',
            },
            error: {
              icon: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
              border: 'border-l-4 border-l-rose-500',
            },
            warning: {
              icon: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
              border: 'border-l-4 border-l-amber-500',
            },
            info: {
              icon: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
              border: 'border-l-4 border-l-blue-500',
            },
          }[toast.tipo];

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl ${config.border}`}
            >
              {config.icon}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {toast.titulo}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {toast.mensaje}
                </p>
              </div>
              <button
                onClick={() => removerToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
