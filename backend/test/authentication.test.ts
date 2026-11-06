import assert from 'node:assert/strict';
import { scryptSync } from 'node:crypto';
import { createServer } from 'node:http';
import { test } from 'node:test';
import express from 'express';
import {
  autenticarCuentaLocal,
  crearCookieSesion,
  crearMiddlewareAutenticacion,
  crearMiddlewareWindowsAdmin,
  exigirRoles,
  validarConfiguracionAutenticacion,
} from '../src/middleware/authentication.js';
import { cerrarSesion, iniciarSesion } from '../src/controllers/authController.js';

const SESSION_SECRET = 'secreto-de-sesion-de-prueba-mayor-a-32-bytes';
const PROXY_KEY = 'clave-de-proxy-de-prueba-mayor-a-32-bytes';

async function conServidor(
  ejecutar: (baseUrl: string) => Promise<void>,
  middleware: express.RequestHandler,
) {
  const app = express();
  app.use('/api', middleware);
  app.get('/api/auth/me', (request, response) => {
    response.json({ exitoso: true, usuario: request.usuarioAutenticado });
  });
  const server = createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    await ejecutar(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

test('Windows Authentication asigna Administrador solo a la identidad permitida', async () => {
  await conServidor(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        'X-Auth-Proxy-Key': PROXY_KEY,
        'X-Authenticated-User': 'ALEJANDRO.PUENTE1@MAGNA.COM',
      },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      exitoso: true,
      usuario: {
        id: 'alejandro.puente1@magna.com',
        nombre: 'alejandro.puente1@magna.com',
        rol: 'Administrador',
      },
    });
  }, crearMiddlewareWindowsAdmin({
    AUTH_SESSION_SECRET: SESSION_SECRET,
    WINDOWS_AUTH_PROXY_KEY: PROXY_KEY,
    WINDOWS_ADMIN_USERS: 'alejandro.puente1@magna.com',
  }));
});

test('Windows Authentication rechaza cuentas ajenas y configuración incompleta', async () => {
  await conServidor(async (baseUrl) => {
    const noAutenticado = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { 'X-Auth-Proxy-Key': PROXY_KEY },
    });
    assert.equal(noAutenticado.status, 403);

    const noAutorizado = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        'X-Auth-Proxy-Key': PROXY_KEY,
        'X-Authenticated-User': 'otra.persona@magna.com',
      },
    });
    assert.equal(noAutorizado.status, 403);

    const claveIncorrecta = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        'X-Auth-Proxy-Key': 'incorrecta',
        'X-Authenticated-User': 'alejandro.puente1@magna.com',
      },
    });
    assert.equal(claveIncorrecta.status, 401);
  }, crearMiddlewareWindowsAdmin({
    AUTH_SESSION_SECRET: SESSION_SECRET,
    WINDOWS_AUTH_PROXY_KEY: PROXY_KEY,
    WINDOWS_ADMIN_USERS: 'alejandro.puente1@magna.com',
  }));

  await conServidor(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/auth/me`);
    assert.equal(response.status, 503);
  }, crearMiddlewareWindowsAdmin({}));
});

test('la autenticación local valida el hash y no concede un rol ante contraseña incorrecta', async () => {
  const salt = '0123456789abcdef0123456789abcdef';
  const hash = scryptSync('clave-correcta', Buffer.from(salt, 'hex'), 32).toString('hex');
  const entorno = {
    AUTH_MANAGER_USERNAME: 'gerente123@',
    AUTH_MANAGER_PASSWORD_SALT: salt,
    AUTH_MANAGER_PASSWORD_HASH: hash,
  };

  assert.deepEqual(await autenticarCuentaLocal('GERENTE123@', 'clave-correcta', entorno), {
    id: 'gerente123@',
    nombre: 'gerente123@',
    rol: 'Gerente',
  });
  assert.equal(await autenticarCuentaLocal('gerente123@', 'incorrecta', entorno), null);
});

test('la configuración exige secretos y hashes completos, y permite Administrador local opcional', () => {
  const entorno = {
    AUTH_SESSION_SECRET: SESSION_SECRET,
    AUTH_MANAGER_USERNAME: 'gerente123@',
    AUTH_MANAGER_PASSWORD_SALT: '0123456789abcdef0123456789abcdef',
    AUTH_MANAGER_PASSWORD_HASH: 'a'.repeat(64),
    AUTH_SUPERINTENDENTE_USERNAME: 'super123@intendente',
    AUTH_SUPERINTENDENTE_PASSWORD_SALT: 'fedcba9876543210fedcba9876543210',
    AUTH_SUPERINTENDENTE_PASSWORD_HASH: 'b'.repeat(64),
  };
  assert.doesNotThrow(() => validarConfiguracionAutenticacion(entorno));
  assert.throws(() => validarConfiguracionAutenticacion({ ...entorno, AUTH_MANAGER_PASSWORD_HASH: '' }));
  assert.throws(() => validarConfiguracionAutenticacion({
    ...entorno,
    AUTH_ADMIN_USERNAME: 'gerente123@',
    AUTH_ADMIN_PASSWORD_SALT: '0123456789abcdef0123456789abcdef',
    AUTH_ADMIN_PASSWORD_HASH: 'c'.repeat(64),
  }));
});

test('la sesión firmada protege rutas autenticadas y rechaza cookies alteradas', async () => {
  const usuario = { id: 'gerente123@', nombre: 'gerente123@', rol: 'Gerente' as const };
  const token = crearCookieSesion(usuario, SESSION_SECRET);
  const expirada = crearCookieSesion(usuario, SESSION_SECRET, 0);
  await conServidor(async (baseUrl) => {
    const correcta = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: `scrapcontrol_session=${token}` },
    });
    assert.equal(correcta.status, 200);

    const alterada = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: `scrapcontrol_session=${token}x` },
    });
    assert.equal(alterada.status, 401);

    const vencida = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: `scrapcontrol_session=${expirada}` },
    });
    assert.equal(vencida.status, 401);
  }, crearMiddlewareAutenticacion({ AUTH_SESSION_SECRET: SESSION_SECRET }));
});

test('el controlador inicia y cierra sesión con cookie HttpOnly', async () => {
  const previous = {
    AUTH_SESSION_SECRET: process.env.AUTH_SESSION_SECRET,
    AUTH_MANAGER_USERNAME: process.env.AUTH_MANAGER_USERNAME,
    AUTH_MANAGER_PASSWORD_SALT: process.env.AUTH_MANAGER_PASSWORD_SALT,
    AUTH_MANAGER_PASSWORD_HASH: process.env.AUTH_MANAGER_PASSWORD_HASH,
  };
  const salt = 'fedcba9876543210fedcba9876543210';
  process.env.AUTH_SESSION_SECRET = SESSION_SECRET;
  process.env.AUTH_MANAGER_USERNAME = 'gerente123@';
  process.env.AUTH_MANAGER_PASSWORD_SALT = salt;
  process.env.AUTH_MANAGER_PASSWORD_HASH = scryptSync('clave-correcta', Buffer.from(salt, 'hex'), 32).toString('hex');

  const app = express();
  app.use(express.json());
  app.post('/api/auth/login', iniciarSesion);
  app.post('/api/auth/logout', cerrarSesion);
  const server = createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const login = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: 'gerente123@', contrasena: 'clave-correcta' }),
    });
    assert.equal(login.status, 200);
    const cookie = login.headers.get('set-cookie');
    assert.ok(cookie?.includes('HttpOnly'));
    assert.ok(cookie?.includes('SameSite=Strict'));

    const logout = await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST' });
    assert.equal(logout.status, 200);
    assert.ok(logout.headers.get('set-cookie')?.includes('scrapcontrol_session=;'));
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('exigirRoles bloquea a Gerente en endpoints de Administrador', async () => {
  const app = express();
  app.use((request, _response, next) => {
    request.usuarioAutenticado = { id: 'gerente123@', nombre: 'gerente123@', rol: 'Gerente' };
    next();
  });
  app.get('/api/admin', exigirRoles('Administrador'), (_request, response) => response.sendStatus(204));
  const server = createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const response = await fetch(`http://127.0.0.1:${address.port}/api/admin`);
    assert.equal(response.status, 403);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});
