import { createContext, useContext } from 'react';

export type RolUsuario = 'Administrador' | 'Gerente' | 'Superintendente';

export interface UsuarioDemo {
  id: string;
  nombre: string;
  rol: RolUsuario;
}

export const USUARIOS_DEMO: UsuarioDemo[] = [
  { id: 'admin-demo-1', nombre: 'Admin Demo 1', rol: 'Administrador' },
  { id: 'admin-demo-2', nombre: 'Admin Demo 2', rol: 'Administrador' },
  { id: 'gerente-demo-1', nombre: 'Gerente Demo 1', rol: 'Gerente' },
  { id: 'gerente-demo-2', nombre: 'Gerente Demo 2', rol: 'Gerente' },
  { id: 'superintendente-demo-1', nombre: 'Superintendente Demo 1', rol: 'Superintendente' },
  { id: 'superintendente-demo-2', nombre: 'Superintendente Demo 2', rol: 'Superintendente' },
];

export interface DemoSessionContextValue {
  usuario: UsuarioDemo | null;
  iniciarSesion: (idUsuario: string) => void;
  cerrarSesion: () => void;
}

export const DemoSessionContext = createContext<DemoSessionContextValue | undefined>(undefined);
export const DEMO_SESSION_STORAGE_KEY = 'scrapcontrol-demo-session';

export function useDemoSession(): DemoSessionContextValue {
  const context = useContext(DemoSessionContext);
  if (!context) throw new Error('useDemoSession debe usarse dentro de DemoSessionProvider.');
  return context;
}
