import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  crearUsuarioAutenticado,
  validarCredencialesAd,
} from '../src/services/adMailValidation.js';

const API_URL = 'https://estms01ia.magna.global/node-red/ad_mailVal';

test('valida con ad_mailVal y usa el correo cuando fullname está vacío', async () => {
  let url = '';
  let body: Record<string, unknown> | undefined;
  const identidad = await validarCredencialesAd('operador@example.com', 'test-password', async (input, init) => {
    url = String(input);
    body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(JSON.stringify({
      response: 'OK',
      username: 'operator',
      mail: 'operador@example.com',
      fullname: '',
    }), { status: 200 });
  });

  assert.equal(url, API_URL);
  assert.deepEqual(body, { nvMail: 'operador@example.com', nvPass: 'test-password' });
  assert.deepEqual(identidad, {
    username: 'operator',
    mail: 'operador@example.com',
    fullname: '',
  });
  assert.deepEqual(crearUsuarioAutenticado(identidad!, ''), {
    id: 'operator',
    nombre: 'operador@example.com',
    rol: 'Gerente',
  });
});

test('usa fullname cuando la API lo devuelve y asigna Administrador solo al correo configurado', async () => {
  const identidad = await validarCredencialesAd('admin@example.com', 'test-password', async () =>
    new Response(JSON.stringify({
      response: 'OK',
      username: 'admin',
      mail: 'admin@example.com',
      fullname: 'Admin Example',
    }), { status: 200 }));

  assert.ok(identidad);
  assert.deepEqual(crearUsuarioAutenticado(identidad, 'ADMIN@example.com'), {
    id: 'admin',
    nombre: 'Admin Example',
    rol: 'Administrador',
  });
});

test('deniega respuestas de credenciales inválidas y errores HTTP de autenticación', async () => {
  const credencialesInvalidas = await validarCredencialesAd('operador@example.com', 'bad', async () =>
    new Response(JSON.stringify({ response: 'DENIED' }), { status: 200 }));
  const sinPermiso = await validarCredencialesAd('operador@example.com', 'bad', async () =>
    new Response('Unauthorized', { status: 401 }));

  assert.equal(credencialesInvalidas, null);
  assert.equal(sinPermiso, null);
});

test('no acepta respuesta incompleta y reporta errores de servicio', async () => {
  await assert.rejects(
    validarCredencialesAd('operador@example.com', 'test-password', async () =>
      new Response(JSON.stringify({ response: 'OK', username: 'operator' }), { status: 200 })),
    /no contiene una identidad válida/,
  );
  await assert.rejects(
    validarCredencialesAd('operador@example.com', 'test-password', async () =>
      new Response('unavailable', { status: 503 })),
    /HTTP 503/,
  );
});
