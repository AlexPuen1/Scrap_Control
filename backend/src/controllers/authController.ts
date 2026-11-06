import type { Request, Response } from 'express';
import { crearCookieSesion, COOKIE_NAME, opcionesCookieSesion } from '../middleware/authentication.js';
import { crearUsuarioAutenticado, validarCredencialesAd } from '../services/adMailValidation.js';

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

  let identidad: Awaited<ReturnType<typeof validarCredencialesAd>>;
  try {
    identidad = await validarCredencialesAd(usuario, contrasena);
  } catch (error) {
    console.error('[Auth] Error del servicio corporativo de autenticación', error);
    res.status(502).json({ exitoso: false, mensaje: 'No se pudo validar la cuenta en este momento.' });
    return;
  }
  if (!identidad) {
    res.status(401).json({ exitoso: false, mensaje: 'Usuario o contraseña incorrectos.' });
    return;
  }
  establecerSesion(res, crearUsuarioAutenticado(identidad));
}

export function cerrarSesion(_req: Request, res: Response): void {
  const { httpOnly, secure, sameSite, path } = opcionesCookieSesion();
  res.clearCookie(COOKIE_NAME, { httpOnly, secure, sameSite, path });
  res.json({ exitoso: true });
}

export function getUsuarioAutenticado(req: Request, res: Response): void {
  if (!req.usuarioAutenticado) {
    res.status(401).json({ exitoso: false, mensaje: 'Inicia sesión para continuar.' });
    return;
  }
  res.json({ exitoso: true, usuario: req.usuarioAutenticado });
}
