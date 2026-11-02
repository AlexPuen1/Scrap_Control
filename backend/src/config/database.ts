/** Estado de acceso a los datos consultados mediante la API corporativa. */

import {
  conectarSQLServer,
  probarConexionSQLServer,
  estaConectadoSQL,
} from './database.connection.js';

export function isDbConnected(): boolean {
  return estaConectadoSQL();
}

export async function connectToDatabase() {
  return conectarSQLServer();
}

export { probarConexionSQLServer };
