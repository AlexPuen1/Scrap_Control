import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';
import express from 'express';
import {
  crearCookieSesion,
  crearMiddlewareAutenticacion,
  exigirRoles,
  validarConfiguracionAutenticacion,
} from '../src/middleware/authentication.js';
import { cerrarSesion, iniciarSesion } from '../src/controllers/authController.js';

const SESSION_SECRET = 'secreto-de-sesion-de-prueba-mayor-a-32-bytes';

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

test('la configuración requiere un secreto de sesión y valida el correo administrador opcional', () => {
  assert.doesNotThrow(() => validarConfiguracionAutenticacion({ AUTH_SESSION_SECRET: SESSION_SECRET }));
  assert.doesNotThrow(() => validarConfiguracionAutenticacion({
    AUTH_SESSION_SECRET: SESSION_SECRET,
    AUTH_ADMIN_EMAIL: 'admin@example.com',
  }));
  assert.throws(() => validarConfiguracionAutenticacion({ AUTH_SESSION_SECRET: 'corto' }));
  assert.throws(() => validarConfiguracionAutenticacion({
    AUTH_SESSION_SECRET: SESSION_SECRET,
    AUTH_ADMIN_EMAIL: 'correo-inválido',
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
    AUTH_ADMIN_EMAIL: process.env.AUTH_ADMIN_EMAIL,
  };
  const fetchOriginal = globalThis.fetch.bind(globalThis);
  let solicitudApi: { nvMail: string; nvPass: string } | undefined;
  process.env.AUTH_SESSION_SECRET = SESSION_SECRET;
  process.env.AUTH_ADMIN_EMAIL = 'admin@example.com';
  globalThis.fetch = (async (_input, init) => {
    solicitudApi = JSON.parse(String(init?.body)) as { nvMail: string; nvPass: string };
    return new Response(JSON.stringify({
      response: 'OK',
      username: 'testuser',
      mail: 'manager@example.com',
      fullname: '',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;

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
    const login = await fetchOriginal(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: 'manager@example.com', contrasena: 'test-password' }),
    });
    assert.equal(login.status, 200);
    assert.deepEqual(solicitudApi, { nvMail: 'manager@example.com', nvPass: 'test-password' });
    assert.deepEqual((await login.json()).usuario, {
      id: 'testuser',
      nombre: 'manager@example.com',
      rol: 'Gerente',
    });
    const cookie = login.headers.get('set-cookie');
    assert.ok(cookie?.includes('HttpOnly'));
    assert.ok(cookie?.includes('SameSite=Strict'));
    const token = cookie?.match(/scrapcontrol_session=([^;]+)/)?.[1];
    assert.ok(token);
    const payload = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString('utf8'));
    assert.equal(JSON.stringify(payload).includes('test-password'), false);

    const logout = await fetchOriginal(`${baseUrl}/api/auth/logout`, { method: 'POST' });
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
    globalThis.fetch = fetchOriginal;
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
