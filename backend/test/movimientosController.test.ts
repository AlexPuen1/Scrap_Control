import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Request, Response } from 'express';
import { getMovimientoById, getMovimientos, registrarDictamen } from '../src/controllers/movimientosController.js';
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

test('dictamen usa 4 para rechazo y rechaza el código 2', async () => {
  const registrarDictamenOriginal = MovimientosRepository.prototype.registrarDictamen;
  const decisionesRegistradas: number[] = [];
  MovimientosRepository.prototype.registrarDictamen = async (_id, aprobado) => {
    decisionesRegistradas.push(aprobado);
    return { estado: 'no-encontrado' };
  };

  try {
    const rechazoAnterior = crearResponse();
    await registrarDictamen({
      params: { id: '12' },
      body: { aprobado: 2, aprobadoPor: 'Responsable' },
    } as Request, rechazoAnterior.response);
    assert.equal(rechazoAnterior.estado.statusCode, 400);

    const rechazoNuevo = crearResponse();
    await registrarDictamen({
      params: { id: '12' },
      body: { aprobado: 4, aprobadoPor: 'Responsable' },
    } as Request, rechazoNuevo.response);
    assert.equal(rechazoNuevo.estado.statusCode, 404);
    assert.deepEqual(decisionesRegistradas, [4]);
  } finally {
    MovimientosRepository.prototype.registrarDictamen = registrarDictamenOriginal;
  }
});

test('GET movimientos no revela mensajes internos de la API de datos', async () => {
  const listarOriginal = MovimientosRepository.prototype.listar;
  MovimientosRepository.prototype.listar = async () => {
    throw new Error('Detalle interno de conexión');
  };

  try {
    const { response, estado } = crearResponse();
    await getMovimientos({ query: {} } as Request, response);
    assert.equal(estado.statusCode, 500);
    assert.deepEqual(estado.body, {
      exitoso: false,
      mensaje: 'Error interno al obtener movimientos.',
    });
  } finally {
    MovimientosRepository.prototype.listar = listarOriginal;
  }
});
