import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const archivoEntorno = path.join(raiz, 'BaseDeDatos', '.env');
const archivoEjemplo = path.join(raiz, 'BaseDeDatos', '.env.example');

function preguntar(texto) {
  const interfaz = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    interfaz.question(texto, (respuesta) => {
      interfaz.close();
      resolve(respuesta.trim());
    });
  });
}

function leerVariable(contenido, nombre) {
  const patron = new RegExp(`^${nombre}=.*$`, 'm');
  const coincidencia = contenido.match(patron);
  return coincidencia?.[0].slice(nombre.length + 1).trim().replace(/^(['"])(.*)\1$/, '$2') ?? '';
}

function establecerVariable(contenido, nombre, valor) {
  const patron = new RegExp(`^${nombre}=.*$`, 'm');
  if (patron.test(contenido)) {
    return contenido.replace(patron, `${nombre}=${valor}`);
  }
  return `${contenido.trimEnd()}\n${nombre}=${valor}\n`;
}

async function main() {
  const existeConfiguracion = existsSync(archivoEntorno);
  let contenido = existeConfiguracion
    ? readFileSync(archivoEntorno, 'utf8')
    : readFileSync(archivoEjemplo, 'utf8');

  contenido = contenido
    .replace(/^AUTH_(?!(?:ADMIN_EMAIL|SESSION_SECRET)=)[A-Z0-9_]+=.*\r?\n?/gm, '')
    .replace(/^WINDOWS_[A-Z0-9_]+=.*\r?\n?/gm, '');

  let secretoSesion = leerVariable(contenido, 'AUTH_SESSION_SECRET');
  if (Buffer.byteLength(secretoSesion) < 32) {
    secretoSesion = randomBytes(32).toString('hex');
    contenido = establecerVariable(contenido, 'AUTH_SESSION_SECRET', secretoSesion);
  }

  let correoAdministrador = process.env.AUTH_ADMIN_EMAIL || leerVariable(contenido, 'AUTH_ADMIN_EMAIL');
  while (!/^[^@\s]+@[^@\s]+$/.test(correoAdministrador)) {
    correoAdministrador = await preguntar('Correo de la cuenta Administrador: ');
    if (!/^[^@\s]+@[^@\s]+$/.test(correoAdministrador)) {
      console.error('Ingresa un correo válido.');
    }
  }
  contenido = establecerVariable(contenido, 'AUTH_ADMIN_EMAIL', correoAdministrador.trim());
  writeFileSync(archivoEntorno, contenido, { encoding: 'utf8' });
  console.log(`${existeConfiguracion ? 'Configuración actualizada' : 'Configuración creada'} en BaseDeDatos/.env; las contraseñas se validan en la API y no se guardan localmente.`);
}

main().catch((error) => {
  console.error(`No se pudo preparar la configuración: ${error.message}`);
  process.exitCode = 1;
});
