import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Request, Response } from 'express';
import { getMovimientoById } from '../src/controllers/movimientosController.js';
import { MovimientosRepository } from '../src/repositories/movimientosRepository.js';

function crearResponse() {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    status(statusCode: number) {
      this.statusCode = statusCode;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  return { response: response as unknown as Response, estado: response };
}

test('GET movimiento rechaza IDs parciales, no positivos y fuera del rango seguro', async () => {
  const obtenerPorIdOriginal = MovimientosRepository.prototype.obtenerPorId;
  const idsConsultados: number[] = [];
  MovimientosRepository.prototype.obtenerPorId = async (id) => {
    idsConsultados.push(id);
    return null;
  };

  try {
    for (const id of ['12abc', '1.5', '0', '9007199254740992']) {
      const { response, estado } = crearResponse();
      await getMovimientoById({ params: { id } } as Request, response);
      assert.equal(estado.statusCode, 400, `ID ${id} debe ser inválido`);
    }

    const { response, estado } = crearResponse();
    await getMovimientoById({ params: { id: '12' } } as Request, response);
    assert.equal(estado.statusCode, 404);
    assert.deepEqual(idsConsultados, [12]);
  } finally {
    MovimientosRepository.prototype.obtenerPorId = obtenerPorIdOriginal;
  }
});
