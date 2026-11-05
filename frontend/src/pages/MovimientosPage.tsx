import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpDown,
  Eye,
  FileSpreadsheet,
  Database,
  Tag,
} from 'lucide-react';
import { useScrap } from '../context/ScrapContext';
import { Badge } from '../components/common/Badge';
import { Pagination } from '../components/common/Pagination';
import { descargarCSV } from '../utils/formatters';
import { MovementFilters, type FiltrosMovimientoUI } from '../components/common/MovementFilters';

type CampoOrden = 'id' | 'fecha' | 'matnr' | 'cantidad' | 'estatus' | 'linea' | 'serial' | 'razonId';

export const MovimientosPage: React.FC = () => {
  const { movimientos, movimientosCargando, errorMovimientos, recargarMovimientos } = useScrap();
  const navigate = useNavigate();
  const [filtros, setFiltros] = useState<FiltrosMovimientoUI>({
    busqueda: '',
    estado: '',
    tipo: '',
    razon: '',
    certificacion: '',
    linea: '',
    almacen: '',
    fechaInicio: '',
    fechaFin: '',
  });
  const rangoInicial = useMemo(() => {
    const fechas = movimientos.map((movimiento) => movimiento.fecha).filter(Boolean).sort();
    return { fechaInicio: fechas[0] ?? '', fechaFin: fechas.at(-1) ?? '' };
  }, [movimientos]);
  const filtrosActivos = useMemo(
    () => !filtros.fechaInicio && !filtros.fechaFin ? { ...filtros, ...rangoInicial } : filtros,
    [filtros, rangoInicial],
  );

  // Ordenamiento
  const [ordenCampo, setOrdenCampo] = useState<CampoOrden>('id');
  const [ordenAsc, setOrdenAsc] = useState(false);

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [elementosPorPagina, setElementosPorPagina] = useState(10);

  // Filtrado reactivo con soporte para campos de dbo.Movimientos
  const movimientosFiltrados = useMemo(() => {
    return movimientos.filter((m) => {
      const q = filtrosActivos.busqueda.toLowerCase().trim();
      const coincideBusqueda =
        q === '' ||
        m.id.toString().includes(q) ||
        (m.serial && m.serial.toLowerCase().includes(q)) ||
        m.matnr.toLowerCase().includes(q) ||
        (m.matnrFg && m.matnrFg.toLowerCase().includes(q)) ||
        m.credencial.toLowerCase().includes(q) ||
        Boolean(m.descripcionRazon?.toLowerCase().includes(q));

      const coincideEstatus = filtrosActivos.estado === ''
        || (filtrosActivos.estado === 'null' ? m.aprobado === null : m.aprobado === Number(filtrosActivos.estado));
      const coincideTipo = filtrosActivos.tipo === '' || String(m.movimientoTipoId) === filtrosActivos.tipo;
      const coincideRazon = filtrosActivos.razon === ''
        || (filtrosActivos.razon === 'null' ? m.razonId === null : String(m.razonId) === filtrosActivos.razon);
      const coincideCertificacion = filtrosActivos.certificacion === '' || String(m.certificacionId) === filtrosActivos.certificacion;
      const coincideLinea = filtrosActivos.linea === '' || String(m.datosDB?.LineaId ?? '') === filtrosActivos.linea;
      const coincideAlmacen = filtrosActivos.almacen === '' || m.almacen === filtrosActivos.almacen;
      const coincideFecha = (!filtrosActivos.fechaInicio || m.fecha >= filtrosActivos.fechaInicio)
        && (!filtrosActivos.fechaFin || m.fecha <= filtrosActivos.fechaFin);

      return coincideBusqueda && coincideEstatus && coincideTipo && coincideRazon
        && coincideCertificacion && coincideLinea && coincideAlmacen && coincideFecha;
    });
  }, [movimientos, filtrosActivos]);

  // Ordenar resultados
  const movimientosOrdenados = useMemo(() => {
    return [...movimientosFiltrados].sort((a, b) => {
      let valorA: any = a[ordenCampo];
      let valorB: any = b[ordenCampo];

      if (ordenCampo === 'fecha') {
        valorA = `${a.fecha} ${a.hora}`;
        valorB = `${b.fecha} ${b.hora}`;
      } else if (ordenCampo === 'id') {
        valorA = Number(a.id) || 0;
        valorB = Number(b.id) || 0;
      }

      if (typeof valorA === 'string') {
        return ordenAsc ? valorA.localeCompare(valorB) : valorB.localeCompare(valorA);
      }
      return ordenAsc ? valorA - valorB : valorB - valorA;
    });
  }, [movimientosFiltrados, ordenCampo, ordenAsc]);

  // Elementos paginados
  const totalPaginas = Math.ceil(movimientosOrdenados.length / elementosPorPagina);
  const movimientosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * elementosPorPagina;
    return movimientosOrdenados.slice(inicio, inicio + elementosPorPagina);
  }, [movimientosOrdenados, paginaActual, elementosPorPagina]);

  const alternarOrden = (campo: CampoOrden) => {
    if (ordenCampo === campo) {
      setOrdenAsc(!ordenAsc);
    } else {
      setOrdenCampo(campo);
      setOrdenAsc(true);
    }
  };

  const limpiarFiltros = () => {
    const fechas = movimientos.map((movimiento) => movimiento.fecha).filter(Boolean).sort();
    setFiltros({
      busqueda: '',
      estado: '',
      tipo: '',
      razon: '',
      certificacion: '',
      linea: '',
      almacen: '',
      fechaInicio: fechas[0] ?? '',
      fechaFin: fechas.at(-1) ?? '',
    });
    setPaginaActual(1);
  };

  return (
    <div className="space-y-5">
      {/* Cabecera de Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Control de Movimientos de Materiales
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              <Database className="w-3 h-3" />
              dbo.Movimientos
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Lectura de registros desde SQL Server, tabla <code>dbo.Movimientos</code>. Los campos pendientes se muestran como no integrados.
          </p>
        </div>

        {/* Acciones de Cabecera */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => descargarCSV(movimientosFiltrados, 'movimientos-dbo-scrap.csv')}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors shadow-xs"
            title="Exportar registros filtrados a CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      <div>
        {errorMovimientos && (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
            <span>No fue posible cargar movimientos: {errorMovimientos}</span>
            <button onClick={recargarMovimientos} className="font-semibold underline">Reintentar</button>
          </div>
        )}
        {movimientosCargando && <p className="text-xs text-slate-500">Consultando dbo.Movimientos…</p>}
        <MovementFilters
          movimientos={movimientos}
          filtros={filtrosActivos}
          onChange={(nuevosFiltros) => {
            setFiltros(nuevosFiltros);
            setPaginaActual(1);
          }}
          onClear={limpiarFiltros}
        />
      </div>

      {/* Tabla Principal de Movimientos */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[1830px] table-auto text-left text-[11px]">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th
                  onClick={() => alternarOrden('id')}
                  className="min-w-[120px] px-2 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>ID / Serial</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => alternarOrden('matnr')}
                  className="min-w-[150px] px-2 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>MATNR (SAP)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => alternarOrden('fecha')}
                  className="min-w-[135px] px-2 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Fecha / Hora</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="min-w-[170px] px-2 py-3">Tipo Movimiento</th>
                <th className="min-w-[180px] px-2 py-3">Supervisor</th>
                <th className="min-w-[240px] px-2 py-3">Razón</th>
                <th
                  onClick={() => alternarOrden('cantidad')}
                  className="min-w-[95px] px-2 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Cantidad</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="min-w-[125px] px-2 py-3">Almacén</th>
                <th className="min-w-[140px] px-2 py-3">Línea</th>
                <th className="min-w-[90px] px-2 py-3">Procesado</th>
                <th
                  onClick={() => alternarOrden('estatus')}
                  className="min-w-[150px] px-2 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Aprobado</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="min-w-[150px] px-2 py-3">Fecha aprobación</th>
                <th className="min-w-[85px] px-2 py-3 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-normal">
              {movimientosCargando ? (
                Array.from({ length: 8 }, (_, fila) => (
                  <tr key={`skeleton-${fila}`} aria-hidden="true">
                    {Array.from({ length: 13 }, (_, columna) => (
                      <td key={columna} className="px-2 py-3.5">
                        <div className="skeleton h-3.5 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : errorMovimientos ? (
                <tr><td colSpan={13} className="px-4 py-10 text-center text-rose-600">No se pudieron leer los registros de la base de datos.</td></tr>
              ) : movimientosPaginados.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-10 text-center text-slate-500">
                    No se encontraron movimientos registrados en dbo.Movimientos con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                movimientosPaginados.map((mov) => (
                  <tr
                    key={mov.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* ID y Serial */}
                    <td className="px-2 py-3 font-mono">
                      <button
                        onClick={() => navigate(`/movimientos/${mov.id}`)}
                        className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex flex-col text-left"
                      >
                        <span>#{mov.id}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                          {mov.serial || '—'}
                        </span>
                      </button>
                    </td>

                    {/* MATNR y MATNR_FG */}
                    <td className="px-2 py-3">
                      <div className="break-all font-mono font-semibold text-slate-800 dark:text-slate-200" title={mov.matnr}>
                        {mov.matnr}
                      </div>
                      {mov.matnrFg && (
                        <span className="inline-block break-all text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">
                          FG: {mov.matnrFg}
                        </span>
                      )}
                    </td>

                    {/* Fecha y Hora */}
                    <td className="px-2 py-3 text-slate-600 dark:text-slate-300">
                      <div>{mov.fecha}</div>
                      <div className="text-[10px] text-slate-400">{mov.hora}</div>
                    </td>

                    {/* MovimientoTipoId */}
                    <td className="px-2 py-3 font-medium text-slate-700 dark:text-slate-200">
                      <span className="inline-block max-w-full break-words rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {mov.movimientoTipoId} - {mov.movimientoTipo}
                      </span>
                    </td>

                    <td className="px-2 py-3 text-slate-700 dark:text-slate-200">
                      <span className="block break-words" title={mov.empleado || 'Sin supervisor registrado'}>
                        {mov.empleado || 'Sin supervisor registrado'}
                      </span>
                    </td>

                    {/* Descripción de razón */}
                    <td className="px-2 py-3">
                      <div className="flex min-w-0 items-start gap-1">
                        <Tag className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="break-words text-slate-500 dark:text-slate-400" title={mov.descripcionRazon}>
                          {mov.razonId === null ? 'Sin razón' : mov.descripcionRazon || 'Razón sin descripción disponible'}
                        </span>
                      </div>
                    </td>

                    {/* Cantidad */}
                    <td className="px-2 py-3 font-mono font-bold text-right text-slate-800 dark:text-slate-100">
                      {mov.cantidad} <span className="text-[10px] text-slate-400 font-normal">{mov.unidad}</span>
                    </td>

                    {/* Almacén */}
                    <td className="px-2 py-3 font-mono text-[10px] text-slate-600 dark:text-slate-300">
                      <span className="block break-words rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800" title={mov.almacen}>
                        {mov.almacen}
                      </span>
                    </td>

                    {/* Línea relacionada a través de CertificacionId */}
                    <td className="px-2 py-3 text-slate-500 dark:text-slate-400">
                      <div title={mov.linea || 'Sin línea asignada'}>
                        <span className="block break-words font-semibold text-slate-800 dark:text-slate-200">
                          {mov.datosDB?.LineaNombre || mov.linea || 'Sin línea asignada'}
                        </span>
                        {mov.datosDB?.LineaId != null && (
                          <span className="mt-0.5 block text-[10px] text-slate-500 dark:text-slate-400">
                            Línea {mov.datosDB.LineaId}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Esta columna refleja aprobado; procesado es un campo independiente administrado por otro software. */}
                    <td
                      className="px-2 py-3 font-mono text-center text-slate-600 dark:text-slate-300"
                      title="Valor de dbo.Movimientos.aprobado: 1 aprobado, 2 procesado, 4 rechazado"
                    >
                      {mov.aprobado ?? '—'}
                    </td>

                    {/* Estatus / Aprobado */}
                    <td className="px-2 py-3">
                      <Badge estatus={mov.estatus} size="sm" />
                      {mov.nvAprobadoPor && (
                        <div className="mt-0.5 break-words text-[10px] text-slate-400">
                          {mov.nvAprobadoPor}
                        </div>
                      )}
                      {mov.comentarioRechazo && (
                        <div
                          className="mt-1 break-words text-[10px] text-rose-700 dark:text-rose-300"
                          title={mov.comentarioRechazo}
                        >
                          Comentario: {mov.comentarioRechazo}
                        </div>
                      )}
                    </td>

                    <td className="px-2 py-3 text-slate-600 dark:text-slate-300">
                      {mov.dtAprobado
                        ? <time dateTime={mov.dtAprobado}>{mov.dtAprobado.replace('T', ' ')}</time>
                        : <span className="text-slate-400">Sin aprobar</span>}
                    </td>

                    {/* Acciones */}
                    <td className="px-2 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => navigate(`/movimientos/${mov.id}`)}
                          className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Ver Ficha Técnica 360°"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPaginas > 1 && (
          <Pagination
            paginaActual={paginaActual}
            totalPaginas={totalPaginas}
            totalElementos={movimientosOrdenados.length}
            elementosPorPagina={elementosPorPagina}
            onCambiarPagina={(p: number) => setPaginaActual(p)}
            onCambiarElementosPorPagina={(cant: number) => {
              setElementosPorPagina(cant);
              setPaginaActual(1);
            }}
          />
        )}
      </div>

    </div>
  );
};
