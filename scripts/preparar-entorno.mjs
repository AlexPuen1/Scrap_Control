import { randomBytes, scryptSync } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface, emitKeypressEvents } from 'node:readline';
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

function preguntarSecreto(texto) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    throw new Error('La configuración inicial requiere una terminal interactiva.');
  }

  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdout.write(texto);

  return new Promise((resolve, reject) => {
    let valor = '';
    const alPresionarTecla = (caracter, tecla) => {
      if (tecla?.ctrl && tecla.name === 'c') {
        finalizar();
        reject(new Error('Configuración cancelada.'));
      } else if (tecla?.name === 'return' || tecla?.name === 'enter') {
        finalizar();
        process.stdout.write('\n');
        resolve(valor);
      } else if (tecla?.name === 'backspace') {
        if (valor.length > 0) {
          valor = valor.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else if (caracter && !tecla?.ctrl && caracter >= ' ') {
        valor += caracter;
        process.stdout.write('*');
      }
    };

    function finalizar() {
      process.stdin.off('keypress', alPresionarTecla);
      process.stdin.setRawMode(false);
    }

    process.stdin.on('keypress', alPresionarTecla);
  });
}

function reemplazarVariable(contenido, nombre, valor) {
  const patron = new RegExp(`^${nombre}=.*$`, 'm');
  if (!patron.test(contenido)) {
    throw new Error(`No se encontró ${nombre} en BaseDeDatos/.env.example.`);
  }
  return contenido.replace(patron, `${nombre}=${JSON.stringify(valor)}`);
}

async function configurarCuenta(contenido, rol, prefijo, usuarioPredeterminado = '') {
  let usuario = '';
  while (!usuario || /[\r\n]/.test(usuario)) {
    usuario = await preguntar(`Usuario ${rol}${usuarioPredeterminado ? ` [${usuarioPredeterminado}]` : ''}: `);
    usuario ||= usuarioPredeterminado;
    if (!usuario || /[\r\n]/.test(usuario)) {
      console.error('Ingresa un usuario válido.');
    }
  }

  let contrasena = '';
  while (!contrasena || Buffer.byteLength(contrasena) > 1024) {
    contrasena = await preguntarSecreto(`Contraseña ${rol}: `);
    if (!contrasena || Buffer.byteLength(contrasena) > 1024) {
      console.error('La contraseña debe tener entre 1 y 1024 bytes.');
    }
  }

  const sal = randomBytes(16).toString('hex');
  const hash = scryptSync(contrasena, Buffer.from(sal, 'hex'), 32).toString('hex');
  contrasena = '';

  for (const [sufijo, valor] of [
    ['USERNAME', usuario],
    ['PASSWORD_SALT', sal],
    ['PASSWORD_HASH', hash],
  ]) {
    contenido = reemplazarVariable(contenido, `${prefijo}_${sufijo}`, valor);
  }
  return { contenido, usuario };
}

async function main() {
  if (existsSync(archivoEntorno)) {
    console.log('Configuración encontrada en BaseDeDatos/.env; se conserva sin cambios.');
    return;
  }

  let contenido = readFileSync(archivoEjemplo, 'utf8');
  console.log('Primera ejecución: configura las cuentas locales. Las contraseñas no se guardan en texto claro.');
  const usuarios = new Set();
  for (const [rol, prefijo, predeterminado] of [
    ['Gerente', 'AUTH_MANAGER', 'gerente123@'],
    ['Superintendente', 'AUTH_SUPERINTENDENTE', 'super123@intendente'],
    ['Administrador', 'AUTH_ADMIN', ''],
  ]) {
    const cuenta = await configurarCuenta(contenido, rol, prefijo, predeterminado);
    const usuarioNormalizado = cuenta.usuario.trim().toLocaleLowerCase('en-US');
    if (usuarios.has(usuarioNormalizado)) {
      throw new Error('Cada cuenta debe tener un nombre de usuario distinto.');
    }
    usuarios.add(usuarioNormalizado);
    contenido = cuenta.contenido;
  }

  contenido = reemplazarVariable(contenido, 'AUTH_SESSION_SECRET', randomBytes(32).toString('hex'));
  writeFileSync(archivoEntorno, contenido, { encoding: 'utf8', flag: 'wx' });
  console.log('Configuración creada en BaseDeDatos/.env.');
}

main().catch((error) => {
  console.error(`No se pudo preparar la configuración: ${error.message}`);
  process.exitCode = 1;
});
