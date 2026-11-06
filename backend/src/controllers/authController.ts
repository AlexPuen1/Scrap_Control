import type { Request, Response } from 'express';
import {
  autenticarCuentaLocal,
  crearCookieSesion,
  COOKIE_NAME,
  opcionesCookieSesion,
  type UsuarioAutenticado,
} from '../middleware/authentication.js';

function establecerSesion(res: Response, usuario: NonNullable<Request['usuarioAutenticado']>) {
  const secreto = process.env.AUTH_SESSION_SECRET;
  if (!secreto || Buffer.byteLength(secreto) < 32) {
    res.status(503).json({ exitoso: false, mensaje: 'La autenticación no está configurada en el servidor.' });
    return false;
  }
  res.cookie(COOKIE_NAME, crearCookieSesion(usuario, secreto), opcionesCookieSesion());
  res.json({ exitoso: true, usuario });
  return true;
}

export async function iniciarSesion(req: Request, res: Response): Promise<void> {
  const body = req.body as { usuario?: unknown; contrasena?: unknown } | undefined;
  const usuario = body?.usuario;
  const contrasena = body?.contrasena;
  if (typeof usuario !== 'string' || typeof contrasena !== 'string') {
    res.status(400).json({ exitoso: false, mensaje: 'Proporciona usuario y contraseña.' });
    return;
  }

  let cuenta: UsuarioAutenticado | null;
  try {
    cuenta = await autenticarCuentaLocal(usuario, contrasena);
  } catch (error) {
    console.error('[Auth] Error al verificar credenciales', error);
    res.status(500).json({ exitoso: false, mensaje: 'No se pudo validar la cuenta en este momento.' });
    return;
  }
  if (!cuenta) {
    res.status(401).json({ exitoso: false, mensaje: 'Usuario o contraseña incorrectos.' });
    return;
  }
  establecerSesion(res, cuenta);
}

export function iniciarSesionWindows(req: Request, res: Response): void {
  if (!req.usuarioAutenticado) {
    res.status(401).json({ exitoso: false, mensaje: 'No se pudo validar la identidad de Windows.' });
    return;
  }
  establecerSesion(res, req.usuarioAutenticado);
}

export function cerrarSesion(_req: Request, res: Response): void {
  const { httpOnly, secure, sameSite, path } = opcionesCookieSesion();
  res.clearCookie(COOKIE_NAME, { httpOnly, secure, sameSite, path });
  res.json({ exitoso: true });
}

export function getIdentidadWindows(req: Request, res: Response): void {
  if (!req.usuarioAutenticado) {
    res.status(401).json({ exitoso: false, mensaje: 'Inicia sesión para continuar.' });
    return;
  }
  res.json({ exitoso: true, usuario: req.usuarioAutenticado });
}
