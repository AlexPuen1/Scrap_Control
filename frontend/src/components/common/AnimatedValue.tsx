import React, { useEffect, useRef, useState } from 'react';
import { animate, useReducedMotion } from 'framer-motion';

interface AnimatedValueProps {
  value: string | number;
  duration?: number;
}

const formateador = new Intl.NumberFormat('es-MX');

/**
 * Muestra un valor y anima con un conteo progresivo la parte numérica inicial
 * (p. ej. "1,250 Pzas" -> cuenta hasta 1,250 y conserva " Pzas").
 * Si el valor no empieza con un entero, se muestra tal cual.
 */
export const AnimatedValue: React.FC<AnimatedValueProps> = ({ value, duration = 0.9 }) => {
  const reducirMovimiento = useReducedMotion();
  const texto = String(value);
  const match = texto.match(/^(\d{1,3}(?:[,\s]\d{3})*|\d+)(?!\.\d)(.*)$/s);
  const objetivo = match ? Number(match[1].replace(/[,\s]/g, '')) : null;
  const sufijo = match ? match[2] : '';
  const previo = useRef(0);
  const [actual, setActual] = useState<number>(objetivo ?? 0);

  useEffect(() => {
    if (objetivo === null) return;
    if (reducirMovimiento) {
      previo.current = objetivo;
      setActual(objetivo);
      return;
    }
    const controles = animate(previo.current, objetivo, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        previo.current = v;
        setActual(Math.round(v));
      },
      onComplete: () => setActual(objetivo),
    });
    return () => controles.stop();
  }, [objetivo, duration, reducirMovimiento]);

  if (objetivo === null) return <>{texto}</>;
  return (
    <>
      {formateador.format(actual)}
      {sufijo}
    </>
  );
};
