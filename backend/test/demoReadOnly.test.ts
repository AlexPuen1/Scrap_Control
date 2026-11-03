import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';
import express from 'express';
import { bloquearEscriturasDemo } from '../src/middleware/demoReadOnly.js';

test('el modo demo permite dictámenes, bloquea cambios de razón y mantiene lectura', async () => {
  const app = express();
  app.use('/api/movimientos', bloquearEscriturasDemo);
  app.get('/api/movimientos', (_request, response) => response.json({ exitoso: true }));
  app.patch('/api/movimientos/:id/dictamen', (_request, response) => response.json({ exitoso: true }));
  app.patch('/api/movimientos/:id/razon', (_request, response) => response.json({ exitoso: true }));

  const server = createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const baseUrl = `http://127.0.0.1:${address.port}/api/movimientos`;

    const dictamen = await fetch(`${baseUrl}/1/dictamen`, { method: 'PATCH' });
    assert.equal(dictamen.status, 200);
    assert.deepEqual(await dictamen.json(), { exitoso: true });

    const cambioRazon = await fetch(`${baseUrl}/1/razon`, { method: 'PATCH' });
    assert.equal(cambioRazon.status, 403);
    assert.equal((await cambioRazon.json()).exitoso, false);

    const escrituraDesconocida = await fetch(`${baseUrl}/1/otra-operacion`, { method: 'PATCH' });
    assert.equal(escrituraDesconocida.status, 403);

    const idInvalido = await fetch(`${baseUrl}/0/dictamen`, { method: 'PATCH' });
    assert.equal(idInvalido.status, 403);

    const lectura = await fetch(baseUrl);
    assert.equal(lectura.status, 200);
    assert.deepEqual(await lectura.json(), { exitoso: true });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});
