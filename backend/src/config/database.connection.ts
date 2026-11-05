import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const databaseDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../BaseDeDatos');
dotenv.config({ path: path.join(databaseDirectory, '.env') });

const apiBaseUrl = (process.env.DB_API_BASE_URL || 'https://est02des.magna.global/est_api').replace(/\/+$/, '');
const servidor = process.env.DB_SERVER || 'EST02DB';
const baseDeDatos = process.env.DB_DATABASE || 'SOE';
const tiempoConsulta = Number.parseInt(process.env.DB_API_TIMEOUT || '20000', 10);

interface ResultadoSQL<T> {
  success: boolean;
  message?: string;
  affectedRows?: number;
  rows?: T[];
}

let estaConectado = false;

async function ejecutarComandoSQL<T>(command: string): Promise<ResultadoSQL<T>> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/api/Utility/executeSQLCommand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ server: servidor, db: baseDeDatos, command }),
      signal: AbortSignal.timeout(tiempoConsulta),
    });
  } catch (error) {
    estaConectado = false;
    throw error;
  }

  const contenido = await response.text();
  let resultado: ResultadoSQL<T>;
  try {
    resultado = JSON.parse(contenido) as ResultadoSQL<T>;
  } catch {
    estaConectado = false;
    throw new Error(`La API SQL respondió con un formato no JSON (HTTP ${response.status}).`);
  }

  if (!response.ok || resultado.success !== true) {
    estaConectado = false;
    throw new Error(resultado.message || `La API SQL respondió HTTP ${response.status}.`);
  }
  estaConectado = true;
  return resultado;
}

export async function consultarSQL<T>(command: string): Promise<T[]> {
  if (!/^\s*SELECT\b/i.test(command) || /;|--|\/\*|\*\//.test(command)) {
    throw new Error('Solo se permiten consultas SELECT de una sola instrucción.');
  }
  const resultado = await ejecutarComandoSQL<T>(command);
  return resultado.rows || [];
}

export async function actualizarDictamenSQL(
  id: number,
  aprobado: 1 | 4,
  aprobadoPor: string,
): Promise<number> {
  if (!Number.isSafeInteger(id) || id < 1 || (aprobado !== 1 && aprobado !== 4)) {
    throw new Error('Los datos del dictamen no son válidos.');
  }
  if (aprobadoPor.length === 0 || aprobadoPor.length > 200) {
    throw new Error('El nombre del responsable debe tener entre 1 y 200 caracteres.');
  }

  const nombreSQL = aprobadoPor.replace(/'/g, "''");
  const resultado = await ejecutarComandoSQL<never>(`
    UPDATE dbo.Movimientos
    SET aprobado = ${aprobado},
        nvAprobadoPor = N'${nombreSQL}',
        dtAprobado = GETDATE()
    WHERE id = ${id} AND aprobado = 0
  `);
  return resultado.affectedRows ?? -1;
}

export async function actualizarRazonSQL(id: number, razonId: number | null): Promise<number> {
  if (!Number.isSafeInteger(id) || id < 1
    || (razonId !== null && (!Number.isSafeInteger(razonId) || razonId < 1))) {
    throw new Error('Los datos de la razón no son válidos.');
  }

  const resultado = await ejecutarComandoSQL<never>(`
    UPDATE dbo.Movimientos
    SET RazonId = ${razonId === null ? 'NULL' : razonId}
    WHERE id = ${id}
  `);
  return resultado.affectedRows ?? -1;
}

export async function probarConexionSQLServer(): Promise<{ exitoso: boolean; baseDeDatos?: string; mensaje: string }> {
  try {
    const [resultado] = await consultarSQL<{ baseActual: string; servidorActual: string }>(
      'SELECT DB_NAME() AS baseActual, @@SERVERNAME AS servidorActual',
    );
    if (resultado?.baseActual !== baseDeDatos) {
      throw new Error(`La API abrió "${resultado?.baseActual || 'una base desconocida'}", pero se esperaba "${baseDeDatos}".`);
    }
    const servidorActual = resultado.servidorActual.toLocaleLowerCase();
    const servidorEsperado = servidor.toLocaleLowerCase();
    const instanciaActual = servidorActual.split('\\').at(-1);
    if (!servidorActual.startsWith(servidorEsperado) && instanciaActual !== servidorEsperado) {
      throw new Error(`La API conectó al servidor "${resultado.servidorActual}", pero se esperaba "${servidor}".`);
    }

    estaConectado = true;
    return { exitoso: true, baseDeDatos, mensaje: 'Conexión verificada mediante la API corporativa.' };
  } catch (error) {
    estaConectado = false;
    const mensaje = error instanceof Error ? error.message : 'Error desconocido al consultar la API corporativa.';
    return { exitoso: false, mensaje };
  }
}

export async function conectarSQLServer(): Promise<null> {
  const resultado = await probarConexionSQLServer();
  if (!resultado.exitoso) {
    console.error(`❌ [API SQL] No fue posible validar la conexión: ${resultado.mensaje}`);
  } else {
    console.log(`✅ [API SQL] ${resultado.mensaje} (${baseDeDatos} en ${servidor}).`);
  }
  return null;
}

export function estaConectadoSQL(): boolean {
  return estaConectado;
}

const archivoEjecutado = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (fileURLToPath(import.meta.url) === archivoEjecutado) {
  probarConexionSQLServer().then((resultado) => {
    console.log(resultado.mensaje);
    process.exitCode = resultado.exitoso ? 0 : 1;
  });
}
