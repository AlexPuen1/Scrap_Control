import type { UsuarioAutenticado } from '../middleware/authentication.js';

const API_AD_MAIL_URL = 'https://estms01ia.magna.global/node-red/ad_mailVal';
const TIMEOUT_MS = 10_000;

interface RespuestaAdMail {
  response?: unknown;
  username?: unknown;
  mail?: unknown;
  fullname?: unknown;
}

export interface IdentidadDirectorio {
  username: string;
  mail: string;
  fullname: string;
}

export async function validarCredencialesAd(
  mail: string,
  contrasena: string,
  fetcher: typeof fetch = fetch,
): Promise<IdentidadDirectorio | null> {
  const correo = mail.trim();
  if (!correo || /[\r\n]/.test(correo) || Buffer.byteLength(correo) > 200
    || !contrasena || Buffer.byteLength(contrasena) > 1024) {
    return null;
  }

  let response: Response;
  try {
    response = await fetcher(API_AD_MAIL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nvMail: correo, nvPass: contrasena }),
      redirect: 'error',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    throw new Error('No fue posible contactar el servicio corporativo de autenticación.', { cause: error });
  }

  if (!response.ok) {
    if ([400, 401, 403].includes(response.status)) return null;
    throw new Error(`El servicio corporativo de autenticación respondió HTTP ${response.status}.`);
  }

  let cuerpo: unknown;
  try {
    cuerpo = await response.json();
  } catch (error) {
    throw new Error('El servicio corporativo de autenticación devolvió una respuesta inválida.', { cause: error });
  }

  if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) {
    throw new Error('El servicio corporativo de autenticación devolvió una respuesta inválida.');
  }
  const resultado = cuerpo as RespuestaAdMail;
  if (resultado.response !== 'OK') return null;
  if (typeof resultado.username !== 'string' || !resultado.username.trim()
    || typeof resultado.mail !== 'string' || !/^[^@\s]+@[^@\s]+$/.test(resultado.mail.trim())) {
    throw new Error('La respuesta de autenticación no contiene una identidad válida.');
  }

  return {
    username: resultado.username.trim(),
    mail: resultado.mail.trim(),
    fullname: typeof resultado.fullname === 'string' ? resultado.fullname.trim() : '',
  };
}

export function crearUsuarioAutenticado(
  identidad: IdentidadDirectorio,
  correoAdministrador = process.env.AUTH_ADMIN_EMAIL ?? '',
): UsuarioAutenticado {
  const mail = identidad.mail.trim();
  const administrador = correoAdministrador.trim().toLocaleLowerCase('en-US');
  return {
    id: identidad.username,
    nombre: identidad.fullname || mail,
    rol: mail.toLocaleLowerCase('en-US') === administrador ? 'Administrador' : 'Gerente',
  };
}
