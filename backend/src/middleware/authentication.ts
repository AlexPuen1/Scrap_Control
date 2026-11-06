import { createHmac, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { Request, RequestHandler } from 'express';

const scrypt = promisify(scryptCallback);
export const COOKIE_NAME = 'scrapcontrol_session';
const SESSION_LIFETIME_SECONDS = 8 * 60 * 60;

export type RolUsuario = 'Administrador' | 'Gerente' | 'Superintendente';

export interface UsuarioAutenticado {
  id: string;
  nombre: string;
  rol: RolUsuario;
}

interface CuentaConfigurada {
  nombreVariable: string;
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

const CUENTAS: CuentaConfigurada[] = [
  { nombreVariable: 'AUTH_MANAGER', rol: 'Gerente' },
  { nombreVariable: 'AUTH_SUPERINTENDENTE', rol: 'Superintendente' },
  { nombreVariable: 'AUTH_ADMIN', rol: 'Administrador' },
];

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

function normalizarIdentidadWindows(identidad: string): string | null {
  const normalizada = identidad.trim().toLocaleLowerCase('en-US');
  if (!normalizada || /[\r\n]/.test(normalizada)) return null;
  if (/^[^\\/@\s]+@[^\\/@\s]+$/.test(normalizada)) return normalizada;
  if (/^[^\\/@\s]+\\[^\\/@\s]+$/.test(normalizada)) return normalizada;
  return null;
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
      || !['Administrador', 'Gerente', 'Superintendente'].includes(String(sesion.rol))
      || typeof sesion.exp !== 'number' || !Number.isSafeInteger(sesion.exp)
      || sesion.exp <= Math.floor(ahora / 1000)) {
      return null;
    }
    return { id: sesion.id, nombre: sesion.nombre, rol: sesion.rol as RolUsuario };
  } catch {
    return null;
  }
}

export async function autenticarCuentaLocal(
  usuario: string,
  contrasena: string,
  entorno: NodeJS.ProcessEnv = process.env,
): Promise<UsuarioAutenticado | null> {
  if (!usuario || !contrasena || Buffer.byteLength(usuario) > 200 || Buffer.byteLength(contrasena) > 1024) {
    return null;
  }
  const normalizado = usuario.trim().toLocaleLowerCase('en-US');
  for (const cuenta of CUENTAS) {
    const prefijo = cuenta.nombreVariable;
    const usuarioConfigurado = entorno[`${prefijo}_USERNAME`];
    const sal = entorno[`${prefijo}_PASSWORD_SALT`];
    const hashConfigurado = entorno[`${prefijo}_PASSWORD_HASH`];
    if (!usuarioConfigurado || !sal || !hashConfigurado
      || usuarioConfigurado.trim().toLocaleLowerCase('en-US') !== normalizado
      || !/^[a-f\d]{32,128}$/i.test(sal)
      || !/^[a-f\d]{64}$/i.test(hashConfigurado)) {
      continue;
    }
    const hashCalculado = await scrypt(contrasena, Buffer.from(sal, 'hex'), 32) as Buffer;
    if (!compararConstante(hashCalculado, Buffer.from(hashConfigurado, 'hex'))) return null;
    return { id: normalizado, nombre: usuarioConfigurado, rol: cuenta.rol };
  }
  return null;
}

export function validarConfiguracionAutenticacion(entorno: NodeJS.ProcessEnv = process.env): void {
  if (!secretoSesionValido(entorno.AUTH_SESSION_SECRET)) {
    throw new Error('AUTH_SESSION_SECRET debe contener al menos 32 bytes.');
  }

  const usuariosConfigurados = new Set<string>();
  for (const cuenta of CUENTAS) {
    const prefijo = cuenta.nombreVariable;
    const usuario = entorno[`${prefijo}_USERNAME`];
    const sal = entorno[`${prefijo}_PASSWORD_SALT`];
    const hash = entorno[`${prefijo}_PASSWORD_HASH`];
    const esOpcional = prefijo === 'AUTH_ADMIN';
    const todosAusentes = !usuario && !sal && !hash;
    if (esOpcional && todosAusentes) continue;
    if (!usuario || !sal || !hash || !/^[a-f\d]{32,128}$/i.test(sal) || !/^[a-f\d]{64}$/i.test(hash)) {
      throw new Error(`La configuración de ${prefijo} está incompleta o es inválida.`);
    }

    const usuarioNormalizado = usuario.trim().toLocaleLowerCase('en-US');
    if (!usuarioNormalizado || usuariosConfigurados.has(usuarioNormalizado)) {
      throw new Error('Las cuentas locales deben tener nombres de usuario únicos y no vacíos.');
    }
    usuariosConfigurados.add(usuarioNormalizado);
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

export function crearMiddlewareWindowsAdmin(
  entorno: NodeJS.ProcessEnv = process.env,
): RequestHandler {
  const secretoSesion = entorno.AUTH_SESSION_SECRET;
  const claveProxy = entorno.WINDOWS_AUTH_PROXY_KEY;
  const administradoresWindows = new Set(
    (entorno.WINDOWS_ADMIN_USERS ?? '')
      .split(',')
      .map(normalizarIdentidadWindows)
      .filter((identidad): identidad is string => identidad !== null),
  );
  const claveProxyConfigurada = Boolean(claveProxy && Buffer.byteLength(claveProxy) >= 32);

  return (req, res, next) => {
    if (!claveProxyConfigurada || !secretoSesionValido(secretoSesion)) {
      res.status(503).json({ exitoso: false, mensaje: 'La autenticación de Windows no está configurada.' });
      return;
    }

    const claveRecibida = req.get('x-auth-proxy-key');
    const claveProxyValida = Boolean(claveProxy && claveRecibida
      && compararConstante(Buffer.from(claveProxy), Buffer.from(claveRecibida)));
    if (!claveProxyValida) {
      res.status(401).json({ exitoso: false, mensaje: 'No se recibió una identidad Windows de confianza.' });
      return;
    }

    const identidad = req.get('x-authenticated-user');
    const identidadNormalizada = identidad ? normalizarIdentidadWindows(identidad) : null;
    if (!identidadNormalizada || !administradoresWindows.has(identidadNormalizada)) {
      res.status(403).json({ exitoso: false, mensaje: 'La cuenta Windows no está autorizada como Administrador.' });
      return;
    }

    req.usuarioAutenticado = {
      id: identidadNormalizada,
      nombre: identidadNormalizada,
      rol: 'Administrador',
    };
    next();
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
