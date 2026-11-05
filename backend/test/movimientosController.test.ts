import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Request, Response } from 'express';
import { getAprobaciones, getMovimientoById, getMovimientos, registrarDictamen } from '../src/controllers/movimientosController.js';
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

test('dictamen repetido con el mismo estado y responsable es idempotente', async () => {
  const obtenerPorIdOriginal = MovimientosRepository.prototype.obtenerPorId;
  const obtenerDictaminado = { aprobado: 1, nvAprobadoPor: 'Oscar Moreno' };
  MovimientosRepository.prototype.obtenerPorId = async () => obtenerDictaminado as Awaited<
    ReturnType<MovimientosRepository['obtenerPorId']>
  >;

  try {
    const resultado = await new MovimientosRepository().registrarDictamen(94068, 1, 'Oscar Moreno');
    assert.equal(resultado.estado, 'actualizado');
    if (resultado.estado === 'actualizado') {
      assert.equal(resultado.movimiento.aprobado, 1);
      assert.equal(resultado.movimiento.nvAprobadoPor, 'Oscar Moreno');
    }
  } finally {
    MovimientosRepository.prototype.obtenerPorId = obtenerPorIdOriginal;
  }
});

test('dictamen reconoce el estado procesado que sigue a una aprobación exitosa', async () => {
  const fetchOriginal = globalThis.fetch;
  let aprobado = 0;
  let nvAprobadoPor: string | null = null;
  let dtAprobado: string | null = null;
  let escrituras = 0;
  globalThis.fetch = async (_input, init) => {
    const { command } = JSON.parse(String(init?.body)) as { command: string };
    if (/^\s*UPDATE\b/i.test(command)) {
      escrituras += 1;
      aprobado = 2;
      nvAprobadoPor = 'Oscar Moreno';
      dtAprobado = '2026-11-05T10:00:00';
      return new Response(JSON.stringify({ success: true, affectedRows: 1 }), { status: 200 });
    }

    return new Response(JSON.stringify({
      success: true,
      rows: [{
        id: 94068,
        MovimientoTipoId: 1,
        aprobado,
        nvAprobadoPor,
        dtAprobado,
      }],
    }), { status: 200 });
  };

  try {
    const resultado = await new MovimientosRepository().registrarDictamen(94068, 1, 'Oscar Moreno');
    assert.equal(resultado.estado, 'actualizado');
    assert.equal(escrituras, 1);
    if (resultado.estado === 'actualizado') {
      assert.equal(resultado.movimiento.aprobado, 2);
      assert.equal(resultado.movimiento.nvAprobadoPor, 'Oscar Moreno');
      assert.equal(resultado.movimiento.dtAprobado, '2026-11-05T10:00:00');
    }
  } finally {
    globalThis.fetch = fetchOriginal;
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

test('GET movimientos valida y reenvía filtros guiados', async () => {
  const listarOriginal = MovimientosRepository.prototype.listar;
  const filtrosRecibidos: Record<string, string | undefined>[] = [];
  MovimientosRepository.prototype.listar = async (filtros) => {
    filtrosRecibidos.push(filtros);
    return [];
  };

  try {
    const { response, estado } = crearResponse();
    await getMovimientos({
      query: {
        fechaInicio: '2026-10-01',
        fechaFin: '2026-11-01',
        busqueda: 'SER-10',
        tipoId: '1',
        aprobado: '0',
        razonId: 'null',
        certificacionId: '200',
        lineaId: '3',
        almacen: 'ALM-01',
      },
    } as unknown as Request, response);

    assert.equal(estado.statusCode, 200);
    assert.deepEqual(filtrosRecibidos, [{
      busqueda: 'SER-10',
      tipoId: '1',
      aprobado: '0',
      razonId: 'null',
      certificacionId: '200',
      lineaId: '3',
      almacen: 'ALM-01',
      fechaInicio: '2026-10-01',
      fechaFin: '2026-11-01',
    }]);
  } finally {
    MovimientosRepository.prototype.listar = listarOriginal;
  }
});

test('GET movimientos rechaza filtros numéricos mal formados antes de consultar', async () => {
  const listarOriginal = MovimientosRepository.prototype.listar;
  let consultas = 0;
  MovimientosRepository.prototype.listar = async () => {
    consultas += 1;
    return [];
  };

  try {
    for (const query of [
      { tipoId: '1abc' },
      { aprobado: '3' },
      { certificacionId: '0' },
      { lineaId: '999999999999999999' },
    ]) {
      const { response, estado } = crearResponse();
      await getMovimientos({ query } as unknown as Request, response);
      assert.equal(estado.statusCode, 400);
    }
    assert.equal(consultas, 0);
  } finally {
    MovimientosRepository.prototype.listar = listarOriginal;
  }
});

test('GET aprobaciones limita por dtAprobado y devuelve nombres agrupados', async () => {
  const obtenerOriginal = MovimientosRepository.prototype.obtenerAprobacionesPorResponsable;
  const rangos: string[][] = [];
  MovimientosRepository.prototype.obtenerAprobacionesPorResponsable = async (inicio, fin) => {
    rangos.push([inicio, fin]);
    return [
      { nombre: 'Responsable A', aprobaciones: 3 },
      { nombre: 'Sin responsable registrado', aprobaciones: 2 },
    ];
  };

  try {
    const { response, estado } = crearResponse();
    await getAprobaciones({
      query: { fechaInicio: '2026-10-01', fechaFin: '2026-11-01' },
    } as unknown as Request, response);

    assert.equal(estado.statusCode, 200);
    assert.deepEqual(estado.body, {
      exitoso: true,
      datos: [
        { nombre: 'Responsable A', aprobaciones: 3 },
        { nombre: 'Sin responsable registrado', aprobaciones: 2 },
      ],
      total: 5,
    });
    assert.deepEqual(rangos, [['2026-10-01', '2026-11-01']]);
  } finally {
    MovimientosRepository.prototype.obtenerAprobacionesPorResponsable = obtenerOriginal;
  }
});

test('GET aprobaciones sin rango consulta todas las filas aprobadas', async () => {
  const obtenerOriginal = MovimientosRepository.prototype.obtenerAprobacionesPorResponsable;
  const rangos: (string | undefined)[][] = [];
  MovimientosRepository.prototype.obtenerAprobacionesPorResponsable = async (inicio, fin) => {
    rangos.push([inicio, fin]);
    return [{ nombre: 'Responsable A', aprobaciones: 7 }];
  };

  try {
    const { response, estado } = crearResponse();
    await getAprobaciones({ query: {} } as unknown as Request, response);
    assert.equal(estado.statusCode, 200);
    assert.deepEqual(estado.body, {
      exitoso: true,
      datos: [{ nombre: 'Responsable A', aprobaciones: 7 }],
      total: 7,
    });
    assert.deepEqual(rangos, [[undefined, undefined]]);
  } finally {
    MovimientosRepository.prototype.obtenerAprobacionesPorResponsable = obtenerOriginal;
  }
});

test('GET aprobaciones rechaza rangos inválidos sin consultar', async () => {
  const obtenerOriginal = MovimientosRepository.prototype.obtenerAprobacionesPorResponsable;
  let consultas = 0;
  MovimientosRepository.prototype.obtenerAprobacionesPorResponsable = async () => {
    consultas += 1;
    return [];
  };

  try {
    for (const query of [
      { fechaInicio: '2026-03-01' },
      { fechaInicio: '2026-02-30', fechaFin: '2026-03-01' },
      { fechaInicio: '2026-03-01', fechaFin: '2026-03-01' },
      { fechaInicio: '2026-04-01', fechaFin: '2026-03-01' },
    ]) {
      const { response, estado } = crearResponse();
      await getAprobaciones({ query } as unknown as Request, response);
      assert.equal(estado.statusCode, 400);
    }
    assert.equal(consultas, 0);
  } finally {
    MovimientosRepository.prototype.obtenerAprobacionesPorResponsable = obtenerOriginal;
  }
});
