/** Estado de acceso a los datos consultados mediante la API corporativa. */

import {
  obtenerEstadoConexion,
  conectarSQLServer,
  probarConexionSQLServer,
} from './database.connection.js';

export interface DbConfigInfo {
  motor: string;
  tablaPrincipal: string;
  tablasRelacionadas: string[];
  modo: string;
  rutaScripts: string;
  archivoConexion: string;
}

export function getDbStatus(): DbConfigInfo {
  const conexion = obtenerEstadoConexion();
  return {
    motor: 'SQL Server',
    tablaPrincipal: 'dbo.Movimientos',
    tablasRelacionadas: ['dbo.MovimientoTipo', 'dbo.EtiquetasCI', 'dbo.Certificacion'],
    modo: `Acceso mediante ${conexion.autenticacion}`,
    rutaScripts: 'BaseDeDatos/',
    archivoConexion: 'BaseDeDatos/.env',
  };
}

export function isDbConnected(): boolean {
  return obtenerEstadoConexion().conectado;
}

export async function connectToDatabase() {
  return conectarSQLServer();
}

export {
  obtenerEstadoConexion,
  conectarSQLServer,
  probarConexionSQLServer,
};
