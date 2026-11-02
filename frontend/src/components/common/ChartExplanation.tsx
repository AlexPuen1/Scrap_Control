import React from 'react';
import { Info } from 'lucide-react';

export const ChartExplanation: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    role="note"
    className="mt-3 flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2.5 text-xs leading-relaxed text-blue-900 dark:bg-blue-950/30 dark:text-blue-200"
  >
    <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
    <p><span className="font-semibold">¿Cómo leer esta gráfica?</span> {children}</p>
  </div>
);
