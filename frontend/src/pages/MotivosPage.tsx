import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Table,
  LayoutGrid,
} from 'lucide-react';
import { useScrap } from '../context/ScrapContext';
import type { Motivo, CategoriaMotivo } from '../types';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { CATEGORIAS_MOTIVOS } from '../constants';
import { formatearMoneda } from '../utils/formatters';

export const MotivosPage: React.FC = () => {
  const { motivos, razonesCatalogo, crearMotivo, actualizarMotivo } = useScrap();

  const [vistaActiva, setVistaActiva] = useState<'tabla' | 'tarjetas'>('tabla');
  const [busqueda, setBusqueda] = useState('');

  // Modales
  const [modalAbierto, setModalAbierto] = useState(false);
  const [motivoEditando, setMotivoEditando] = useState<Motivo | null>(null);

  // Formulario
  const [formData, setFormData] = useState<Omit<Motivo, 'id'>>({
    codigo: '',
    razonId: 5001,
    nombre: '',
    categoria: 'Scrap',
    descripcion: '',
    severidad: 'Media',
    activo: true,
    costoDefectoPromedio: 185,
  });

  // Las razones son un catálogo local y no se consultan en la API.
  const razonesFiltradas = useMemo(() => {
    return razonesCatalogo.filter((r) => {
      const q = busqueda.toLowerCase().trim();
      return (
        q === '' ||
        r.idRazon.toString().includes(q) ||
        r.descripcion.toLowerCase().includes(q)
      );
    });
  }, [razonesCatalogo, busqueda]);

  const abrirModalCrear = () => {
    setMotivoEditando(null);
    setFormData({
      codigo: `RAZ-${Math.floor(5000 + Math.random() * 1000)}`,
      razonId: Math.floor(5000 + Math.random() * 1000),
      nombre: '',
      categoria: 'Scrap',
      descripcion: '',
      severidad: 'Media',
      activo: true,
      costoDefectoPromedio: 185,
    });
    setModalAbierto(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (motivoEditando) {
      actualizarMotivo(motivoEditando.id, formData);
    } else {
      crearMotivo(formData);
    }
    setModalAbierto(false);
  };

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Catálogo de Razones de Falla & Defectos
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Catálogo local
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Catálogo local de referencia relacionado con <code className="font-mono text-blue-600 dark:text-blue-400">RazonId</code>. No se sincroniza con SQL Server.
          </p>
        </div>

        {/* Acciones y Conmutador de Vistas */}
        <div className="flex items-center gap-2">
          <div className="p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center">
            <button
              onClick={() => setVistaActiva('tabla')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                vistaActiva === 'tabla'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Vista de tabla</span>
            </button>
            <button
              onClick={() => setVistaActiva('tarjetas')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                vistaActiva === 'tarjetas'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Tarjetas de Severidad</span>
            </button>
          </div>

          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={abrirModalCrear}
          >
            Nueva Razón
          </Button>
        </div>
      </div>

      {/* Buscador y Filtros */}
      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por IdRazon (ej. 5001) o Descripción..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400">
          Total en catálogo local: <strong className="text-slate-800 dark:text-slate-200 font-mono">{razonesFiltradas.length}</strong>
        </div>
      </div>

      {/* Vista tabular del catálogo local */}
      {vistaActiva === 'tabla' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Table className="w-4 h-4 text-blue-500" />
              Razones de referencia
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-100/70 font-mono text-[11px] text-slate-600 border-b border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-2.5 w-14">#</th>
                  <th className="px-4 py-2.5">IdMovimiento</th>
                  <th className="px-4 py-2.5">IdRazon (PK)</th>
                  <th className="px-4 py-2.5">Descripcion</th>
                  <th className="px-4 py-2.5">Id</th>
                  <th className="px-4 py-2.5">CC_Sugerido</th>
                  <th className="px-4 py-2.5">Notifica</th>
                  <th className="px-4 py-2.5">PuntaCola</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono text-[11px]">
                {razonesFiltradas.map((r, idx) => (
                  <tr
                    key={r.idRazon}
                    className="hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-4 py-2 text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                      {r.idMovimiento || 553}
                    </td>
                    <td className="px-4 py-2 font-bold text-blue-600 dark:text-blue-400">
                      {r.idRazon}
                    </td>
                    <td className="px-4 py-2 font-sans font-semibold text-slate-800 dark:text-slate-200">
                      {r.descripcion}
                    </td>
                    <td className="px-4 py-2 text-slate-500">{r.id || idx + 1}</td>
                    <td className="px-4 py-2 text-slate-500">{r.ccSugerido || 'NULL'}</td>
                    <td className="px-4 py-2 text-slate-400">{r.notifica || 'NULL'}</td>
                    <td className="px-4 py-2 text-slate-400">{r.puntaCola || 'NULL'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISTA 2: TARJETAS OPERATIVAS */}
      {vistaActiva === 'tarjetas' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {motivos.map((motivo) => (
            <div
              key={motivo.id}
              className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                    IdRazon: {motivo.razonId}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    {motivo.severidad}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                  {motivo.nombre}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {motivo.descripcion}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Costo Estimado:</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                  {formatearMoneda(motivo.costoDefectoPromedio || 185)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear Razón */}
      <Modal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        title="Registrar razón en el catálogo local"
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                IdRazon (Código Numérico)
              </label>
              <input
                type="number"
                required
                value={formData.razonId}
                onChange={(e) => setFormData({ ...formData, razonId: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Categoría MovimientoTipo
              </label>
              <select
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value as CategoriaMotivo })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                {CATEGORIAS_MOTIVOS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Descripción de la Falla
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Arrugas en embutido profundo..."
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Criterio Técnico y Tolerancia
            </label>
            <textarea
              rows={2}
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" onClick={() => setModalAbierto(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Guardar en Catálogo
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
