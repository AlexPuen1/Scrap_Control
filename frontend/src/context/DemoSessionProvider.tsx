import React, { useState } from 'react';
import {
  DEMO_SESSION_STORAGE_KEY,
  DemoSessionContext,
  USUARIOS_DEMO,
  type UsuarioDemo,
} from './demoSession';

function obtenerUsuarioGuardado(): UsuarioDemo | null {
  const idGuardado = sessionStorage.getItem(DEMO_SESSION_STORAGE_KEY);
  return USUARIOS_DEMO.find((usuario) => usuario.id === idGuardado) ?? null;
}

export const DemoSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<UsuarioDemo | null>(obtenerUsuarioGuardado);

  const iniciarSesion = (idUsuario: string) => {
    const usuarioDemo = USUARIOS_DEMO.find((opcion) => opcion.id === idUsuario);
    if (!usuarioDemo) return;
    sessionStorage.setItem(DEMO_SESSION_STORAGE_KEY, usuarioDemo.id);
    setUsuario(usuarioDemo);
  };

  const cerrarSesion = () => {
    sessionStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
    setUsuario(null);
  };

  return (
    <DemoSessionContext.Provider value={{ usuario, iniciarSesion, cerrarSesion }}>
      {children}
    </DemoSessionContext.Provider>
  );
};
