import { createContext, useContext } from 'react';
import type { UsuarioAutenticado } from '../types';

export interface AuthContextValue {
  usuario: UsuarioAutenticado | null;
  cargando: boolean;
  error: string | null;
  reintentar: () => void;
  iniciarSesion: (usuario: string, contrasena: string) => Promise<void>;
  iniciarSesionWindows: () => Promise<void>;
  cerrarSesion: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider.');
  return context;
}
