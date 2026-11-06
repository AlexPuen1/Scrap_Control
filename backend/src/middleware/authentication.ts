import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request, RequestHandler } from 'express';

export const COOKIE_NAME = 'scrapcontrol_session';
const SESSION_LIFETIME_SECONDS = 8 * 60 * 60;

export type RolUsuario = 'Administrador' | 'Gerente';

export interface UsuarioAutenticado {
  id: string;
  nombre: string;
  rol: RolUsuario;
}

interface SesionFirmada extends UsuarioAutenticado {
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      usuarioAutenticado?: UsuarioAutenticado;
    }
  }
}

function leerCookie(req: Request, nombre: string): string | null {
  const cookies = req.headers.cookie?.split(';') ?? [];
  for (const cookie of cookies) {
    const separador = cookie.indexOf('=');
    if (separador < 0 || cookie.slice(0, separador).trim() !== nombre) continue;
    return cookie.slice(separador + 1).trim();
  }
  return null;
}

function secretoSesionValido(secreto: string | undefined): secreto is string {
  return Boolean(secreto && Buffer.byteLength(secreto) >= 32);
}

function compararConstante(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

export function crearCookieSesion(usuario: UsuarioAutenticado, secreto: string, ahora = Date.now()): string {
  if (!secretoSesionValido(secreto)) throw new Error('AUTH_SESSION_SECRET debe contener al menos 32 bytes.');
  const sesion: SesionFirmada = {
    ...usuario,
    exp: Math.floor(ahora / 1000) + SESSION_LIFETIME_SECONDS,
  };
  const payload = Buffer.from(JSON.stringify(sesion)).toString('base64url');
  const firma = createHmac('sha256', secreto).update(payload).digest('base64url');
  return `${payload}.${firma}`;
}

function leerSesionFirmada(token: string, secreto: string | undefined, ahora = Date.now()): UsuarioAutenticado | null {
  if (!secretoSesionValido(secreto)) return null;
  const [payload, firma, extra] = token.split('.');
  if (!payload || !firma || extra !== undefined) return null;

  const firmaEsperada = createHmac('sha256', secreto).update(payload).digest();
  let firmaRecibida: Buffer;
  try {
    firmaRecibida = Buffer.from(firma, 'base64url');
  } catch {
    return null;
  }
  if (!compararConstante(firmaEsperada, firmaRecibida)) return null;

  try {
    const sesion = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<SesionFirmada>;
    if (typeof sesion.id !== 'string' || typeof sesion.nombre !== 'string'
      || !['Administrador', 'Gerente'].includes(String(sesion.rol))
      || typeof sesion.exp !== 'number' || !Number.isSafeInteger(sesion.exp)
      || sesion.exp <= Math.floor(ahora / 1000)) {
      return null;
    }
    return { id: sesion.id, nombre: sesion.nombre, rol: sesion.rol as RolUsuario };
  } catch {
    return null;
  }
}

export function validarConfiguracionAutenticacion(entorno: NodeJS.ProcessEnv = process.env): void {
  if (!secretoSesionValido(entorno.AUTH_SESSION_SECRET)) {
    throw new Error('AUTH_SESSION_SECRET debe contener al menos 32 bytes.');
  }
  if (entorno.AUTH_ADMIN_EMAIL && !/^[^@\s]+@[^@\s]+$/.test(entorno.AUTH_ADMIN_EMAIL.trim())) {
    throw new Error('AUTH_ADMIN_EMAIL debe contener un correo válido.');
  }
}

export function crearMiddlewareAutenticacion(
  entorno: NodeJS.ProcessEnv = process.env,
): RequestHandler {
  const secretoSesion = entorno.AUTH_SESSION_SECRET;
  return (req, res, next) => {
    const token = leerCookie(req, COOKIE_NAME);
    const usuarioCookie = token ? leerSesionFirmada(token, secretoSesion) : null;
    if (usuarioCookie) {
      req.usuarioAutenticado = usuarioCookie;
      next();
      return;
    }

    res.status(401).json({ exitoso: false, mensaje: 'Inicia sesión para continuar.' });
  };
}

export function exigirRoles(...roles: RolUsuario[]): RequestHandler {
  return (req, res, next) => {
    if (!req.usuarioAutenticado) {
      res.status(401).json({ exitoso: false, mensaje: 'Inicia sesión para continuar.' });
      return;
    }
    if (!roles.includes(req.usuarioAutenticado.rol)) {
      res.status(403).json({ exitoso: false, mensaje: 'Tu cuenta no tiene permiso para esta operación.' });
      return;
    }
    next();
  };
}

export function opcionesCookieSesion(entorno: NodeJS.ProcessEnv = process.env) {
  return {
    httpOnly: true,
    secure: entorno.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/api',
    maxAge: SESSION_LIFETIME_SECONDS * 1000,
  };
}
