import React, { useState } from 'react';
import {
  RotateCcw,
  Save,
  Database,
} from 'lucide-react';
import { useScrap } from '../context/ScrapContext';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { INFO_PLANTA, TURNOS_PLANTA, ALMACENES } from '../constants';

export const ConfiguracionPage: React.FC = () => {
  const { turnoActivo, resetearDatosMock, agregarToast } = useScrap();

  const [plantaConfig, setPlantaConfig] = useState({
    nombre: INFO_PLANTA.nombre,
    division: INFO_PLANTA.organizacion,
    sapCode: INFO_PLANTA.codigoSapPlanta,
    toleranciaScrap: 1.2,
    alertaSonora: true,
    notificacionesEmail: true,
  });

  const handleGuardarAjustes = (e: React.FormEvent) => {
    e.preventDefault();
    agregarToast('info', 'Ajustes locales', 'Los valores solo se mantienen en esta pantalla; no se guardan en SQL ni en almacenamiento persistente.');
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Configuración del Sistema MES
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Parámetros de operación de planta y conexión de datos mediante la API corporativa.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          icon={<RotateCcw className="w-4 h-4 text-rose-500" />}
          onClick={resetearDatosMock}
          title="Restablece los motivos y notificaciones locales; no modifica movimientos SQL."
        >
          Reiniciar datos locales
        </Button>
      </div>

      <form onSubmit={handleGuardarAjustes} className="space-y-6">
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          Estos parámetros son de presentación y no se persisten; los cambios no modifican datos ni reglas de SQL Server.
        </p>
        <Card
          title="Conexión de datos"
          subtitle="Acceso al sistema SOE mediante la API corporativa"
        >
          <div className="flex items-start gap-3 text-xs">
            <Database className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <p className="text-slate-600 dark:text-slate-300">
              El backend consulta SQL Server a través de la API corporativa. La configuración del servidor,
              la base de datos y la URL se administra en <code className="font-mono">BaseDeDatos/.env</code>;
              la aplicación local no usa conexión ODBC ni autenticación Windows directa.
            </p>
          </div>
        </Card>

        {/* Parámetros de la Planta Automotriz */}
        <Card title="Parámetros de Planta" subtitle="Identificación de la unidad de manufactura">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nombre de Planta
              </label>
              <input
                type="text"
                value={plantaConfig.nombre}
                onChange={(e) => setPlantaConfig({ ...plantaConfig, nombre: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                División Corporativa
              </label>
              <input
                type="text"
                value={plantaConfig.division}
                onChange={(e) => setPlantaConfig({ ...plantaConfig, division: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Código SAP de Planta (Werks)
              </label>
              <input
                type="text"
                value={plantaConfig.sapCode}
                onChange={(e) => setPlantaConfig({ ...plantaConfig, sapCode: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

        </Card>

        {/* Turnos de Operación y Umbrales de Calidad */}
        <Card
          title="Turnos de Manufactura & Metas de Calidad"
          subtitle="Horarios fijos; el turno activo se calcula automáticamente con el reloj local."
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {TURNOS_PLANTA.map((turno) => (
                <div
                  key={turno.id}
                  className={`p-3 rounded-xl border transition-all ${
                    turnoActivo === turno.id
                      ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-900 dark:text-blue-100 font-semibold'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{turno.etiqueta}</span>
                    {turnoActivo === turno.id && (
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    )}
                  </div>
                  <div className="text-[11px] opacity-75 font-mono mt-1">{turno.horario}</div>
                  {turnoActivo === turno.id && (
                    <div className="text-[10px] mt-2 font-normal">
                      Activo según la hora local del dispositivo
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-medium text-slate-800 dark:text-slate-200 block">
                  Tolerancia Máxima Admisible de Scrap General
                </span>
                <span className="text-slate-500 text-[11px]">
                  Si el scrap acumulado del día supera este porcentaje, se detona alerta crítica.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={plantaConfig.toleranciaScrap}
                  onChange={(e) =>
                    setPlantaConfig({ ...plantaConfig, toleranciaScrap: parseFloat(e.target.value) })
                  }
                  className="w-20 px-2 py-1 text-center rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                />
                <span className="font-bold text-slate-700 dark:text-slate-300">%</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Almacenes y Centros Logísticos */}
        <Card
          title="Directorio de Almacenes Industriales"
          subtitle="Bahías y patios registrados para transferencias de chapa"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {ALMACENES.map((alm) => (
              <div
                key={alm.codigo}
                className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
              >
                <div>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400 block">
                    {alm.codigo}
                  </span>
                  <span className="text-slate-700 dark:text-slate-300">{alm.nombre}</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500" title="Activo"></span>
              </div>
            ))}
          </div>
        </Card>

        {/* Botón Guardar */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="submit" variant="primary" icon={<Save className="w-4 h-4" />}>
            Confirmar ajustes locales
          </Button>
        </div>
      </form>
    </div>
  );
};
