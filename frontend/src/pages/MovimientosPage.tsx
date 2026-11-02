import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ArrowUpDown,
  Eye,
  FileSpreadsheet,
  RotateCcw,
  Database,
  Tag,
} from 'lucide-react';
import { useScrap } from '../context/ScrapContext';
import { Badge } from '../components/common/Badge';
import { Pagination } from '../components/common/Pagination';
import { descargarCSV } from '../utils/formatters';
import { CATEGORIAS_MOTIVOS } from '../constants';

type CampoOrden = 'id' | 'fecha' | 'matnr' | 'cantidad' | 'estatus' | 'linea' | 'serial' | 'razonId';

export const MovimientosPage: React.FC = () => {
  const { movimientos, movimientosCargando, errorMovimientos, recargarMovimientos } = useScrap();
  const navigate = useNavigate();
  const razonesDisponibles = useMemo(() => {
    const razones = new Map<number, string>();
    movimientos.forEach((movimiento) => {
      if (movimiento.razonId !== null && movimiento.descripcionRazon) {
        razones.set(movimiento.razonId, movimiento.descripcionRazon);
      }
    });
    return [...razones.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [movimientos]);

  // Estados de filtros y búsqueda
  const [busqueda, setBusqueda] = useState('');
  const [filtroSerial, setFiltroSerial] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroRazon, setFiltroRazon] = useState('');

  // Ordenamiento
  const [ordenCampo, setOrdenCampo] = useState<CampoOrden>('id');
  const [ordenAsc, setOrdenAsc] = useState(false);

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [elementosPorPagina, setElementosPorPagina] = useState(10);

  // Filtrado reactivo con soporte para campos de dbo.Movimientos
  const movimientosFiltrados = useMemo(() => {
    return movimientos.filter((m) => {
      const q = busqueda.toLowerCase().trim();
      const coincideBusqueda =
        q === '' ||
        m.id.toString().includes(q) ||
        (m.serial && m.serial.toLowerCase().includes(q)) ||
        m.matnr.toLowerCase().includes(q) ||
        (m.matnrFg && m.matnrFg.toLowerCase().includes(q)) ||
        m.credencial.toLowerCase().includes(q) ||
        Boolean(m.descripcionRazon?.toLowerCase().includes(q));

      const coincideSerial = filtroSerial.trim() === ''
        || m.serial.toLocaleLowerCase().includes(filtroSerial.trim().toLocaleLowerCase());
      const coincideEstatus = filtroEstatus === '' || m.estatus === filtroEstatus;
      const coincideTipo = filtroTipo === '' || m.movimientoTipo === filtroTipo;
      const coincideRazon = filtroRazon === '' || m.razonId?.toString() === filtroRazon;

      return coincideBusqueda && coincideSerial && coincideEstatus && coincideTipo && coincideRazon;
    });
  }, [movimientos, busqueda, filtroSerial, filtroEstatus, filtroTipo, filtroRazon]);

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
    setBusqueda('');
    setFiltroSerial('');
    setFiltroEstatus('');
    setFiltroTipo('');
    setFiltroRazon('');
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

      {/* Barra de Filtros y Búsqueda */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        {errorMovimientos && (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
            <span>No fue posible cargar movimientos: {errorMovimientos}</span>
            <button onClick={recargarMovimientos} className="font-semibold underline">Reintentar</button>
          </div>
        )}
        {movimientosCargando && <p className="text-xs text-slate-500">Consultando dbo.Movimientos…</p>}
        <div className="flex flex-col md:flex-row gap-3">
          {/* Buscador General */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setPaginaActual(1);
              }}
              placeholder="Buscar por ID, Serial, MATNR o credencial..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Filtros Dropdown */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <input
              type="search"
              aria-label="Filtrar por serial"
              value={filtroSerial}
              onChange={(e) => {
                setFiltroSerial(e.target.value);
                setPaginaActual(1);
              }}
              placeholder="Filtrar por serial"
              className="min-w-0 px-2.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {/* Filtro Estatus / Aprobado */}
            <select
              value={filtroEstatus}
              onChange={(e) => {
                setFiltroEstatus(e.target.value);
                setPaginaActual(1);
              }}
              className="px-2.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Estado Aprobación</option>
              <option value="Pendiente">Pendiente (aprobado = 0)</option>
              <option value="Aprobado">Aprobado (aprobado = 1)</option>
              <option value="Rechazado">Rechazado (aprobado = 4)</option>
            </select>

            {/* Filtro Tipo de Movimiento */}
            <select
              value={filtroTipo}
              onChange={(e) => {
                setFiltroTipo(e.target.value);
                setPaginaActual(1);
              }}
              className="px-2.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Tipo Movimiento</option>
              {CATEGORIAS_MOTIVOS.map((cat, idx) => (
                <option key={cat} value={cat}>
                  {idx + 1} - {cat}
                </option>
              ))}
            </select>

            {/* Filtro Razón de Falla */}
            <select
              value={filtroRazon}
              onChange={(e) => {
                setFiltroRazon(e.target.value);
                setPaginaActual(1);
              }}
              className="px-2.5 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todas las razones</option>
              {razonesDisponibles.map(([idRazon, descripcion]) => (
                <option key={idRazon} value={String(idRazon)}>
                  {descripcion}
                </option>
              ))}
            </select>

            {/* Limpiar */}
            <button
              onClick={limpiarFiltros}
              className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:white bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors"
              title="Restablecer filtros"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpiar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabla Principal de Movimientos */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="w-full">
          <table className="w-full table-fixed text-left text-[11px]">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th
                  onClick={() => alternarOrden('id')}
                  className="w-[10%] px-2 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>ID / Serial</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => alternarOrden('matnr')}
                  className="w-[12%] px-2 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>MATNR (SAP)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => alternarOrden('fecha')}
                  className="w-[11%] px-2 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Fecha / Hora</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="w-[14%] px-2 py-3">Tipo Movimiento</th>
                <th className="w-[17%] px-2 py-3">Razón</th>
                <th
                  onClick={() => alternarOrden('cantidad')}
                  className="w-[7%] px-2 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Cantidad</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="w-[7%] px-2 py-3">Almacén</th>
                <th className="w-[7%] px-2 py-3">Línea</th>
                <th className="w-[7%] px-2 py-3">Procesado</th>
                <th
                  onClick={() => alternarOrden('estatus')}
                  className="w-[9%] px-2 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Aprobado</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="w-[6%] px-2 py-3 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-normal">
              {movimientosCargando ? (
                Array.from({ length: 8 }, (_, fila) => (
                  <tr key={`skeleton-${fila}`} aria-hidden="true">
                    {Array.from({ length: 11 }, (_, columna) => (
                      <td key={columna} className="px-2 py-3.5">
                        <div className="skeleton h-3.5 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : errorMovimientos ? (
                <tr><td colSpan={11} className="px-4 py-10 text-center text-rose-600">No se pudieron leer los registros de la base de datos.</td></tr>
              ) : movimientosPaginados.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-slate-500">
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
                      <div className="truncate font-mono font-semibold text-slate-800 dark:text-slate-200" title={mov.matnr}>
                        {mov.matnr}
                      </div>
                      {mov.matnrFg && (
                        <span className="inline-block text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">
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

                    {/* Descripción de razón */}
                    <td className="px-2 py-3">
                      <div className="flex min-w-0 items-center gap-1">
                        <Tag className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate text-slate-500 dark:text-slate-400" title={mov.descripcionRazon}>
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
                      <span className="block truncate rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800" title={mov.almacen}>
                        {mov.almacen}
                      </span>
                    </td>

                    {/* Línea relacionada a través de CertificacionId */}
                    <td className="px-2 py-3 text-slate-500 dark:text-slate-400">
                      <div title={mov.linea || 'Sin línea asignada'}>
                        <span className="block truncate font-semibold text-slate-800 dark:text-slate-200">
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
                        <div className="text-[10px] text-slate-400 truncate max-w-[110px] mt-0.5">
                          {mov.nvAprobadoPor}
                        </div>
                      )}
                      {mov.comentarioRechazo && (
                        <div
                          className="mt-1 max-w-[140px] truncate text-[10px] text-rose-700 dark:text-rose-300"
                          title={mov.comentarioRechazo}
                        >
                          Comentario: {mov.comentarioRechazo}
                        </div>
                      )}
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
