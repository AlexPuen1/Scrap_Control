import React, { useEffect, useState } from 'react';
import { ScrapService } from '../services/scrapService';
import type { UsuarioAutenticado } from '../types';
import { AuthContext, type AuthContextValue } from './authContext';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [intento, setIntento] = useState(0);
  const [resultado, setResultado] = useState<{
    intento: number;
    usuario: UsuarioAutenticado | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    let vigente = true;
    ScrapService.obtenerUsuarioAutenticado()
      .then((usuario) => {
        if (vigente) setResultado({ intento, usuario, error: null });
      })
      .catch((errorConsulta: unknown) => {
        if (vigente) {
          setResultado({
            intento,
            usuario: null,
            error: errorConsulta instanceof Error
              ? errorConsulta.message
              : 'No se pudo verificar la cuenta de Windows.',
          });
        }
      });

    return () => {
      vigente = false;
    };
  }, [intento]);

  const cargando = resultado?.intento !== intento;
  const establecerUsuario = (usuario: UsuarioAutenticado | null) => {
    setResultado({ intento, usuario, error: null });
  };
  const value: AuthContextValue = {
    usuario: cargando ? null : resultado?.usuario ?? null,
    cargando,
    error: cargando ? null : resultado?.error ?? null,
    reintentar: () => setIntento((actual) => actual + 1),
    iniciarSesion: async (usuario, contrasena) => {
      establecerUsuario(await ScrapService.iniciarSesion(usuario, contrasena));
    },
    iniciarSesionWindows: async () => {
      establecerUsuario(await ScrapService.iniciarSesionWindows());
    },
    cerrarSesion: async () => {
      await ScrapService.cerrarSesion();
      establecerUsuario(null);
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
