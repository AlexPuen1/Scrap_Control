import type { Movimiento } from '../types';

export const formatearMoneda = (cantidad: number, moneda: string = 'USD'): string => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cantidad);
};

export const formatearNumero = (cantidad: number): string => {
  return new Intl.NumberFormat('es-MX').format(cantidad);
};

export const formatearFecha = (fechaStr: string): string => {
  if (!fechaStr) return '';
  const [año, mes, dia] = fechaStr.split('-');
  if (!año || !mes || !dia) return fechaStr;
  const fecha = new Date(Number(año), Number(mes) - 1, Number(dia));
  return fecha.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const descargarCSV = (datos: Movimiento[], nombreArchivo = 'reporte-scrap.csv') => {
  if (!datos || datos.length === 0) return;

  const cabeceras = [
    'ID',
    'CertificacionId',
    'MATNR',
    'fecha_hora',
    'MovimientoTipoId',
    'cantidad',
    'salida',
    'retorno',
    'procesado',
    'aprobado',
    'RazonId',
    'DescripcionRazon',
    'centro_costo',
    'almacen',
    'serial',
    'MATNR_FG',
  ];

  const escaparCSV = (valor: unknown) => {
    const texto = valor === null || valor === undefined ? '' : String(valor);
    let primerCaracter = 0;
    while (primerCaracter < texto.length) {
      const codigo = texto.charCodeAt(primerCaracter);
      if (codigo <= 0x20 || codigo === 0xfeff || texto[primerCaracter].trim() === '') {
        primerCaracter += 1;
      } else {
        break;
      }
    }
    const inicial = texto[primerCaracter];
    const protegido = ['=', '+', '-', '@'].includes(inicial ?? '') ? `'${texto}` : texto;
    return `"${protegido.replace(/"/g, '""')}"`;
  };
  const filas = datos.map((m) => {
    const row = m.datosDB;
    return row
      ? [
          row.id, row.CertificacionId, row.MATNR, row.fecha_hora,
          row.MovimientoTipoId, row.cantidad, row.salida, row.retorno,
          row.procesado, row.aprobado, row.RazonId, row.DescripcionRazon,
          row.centro_costo, row.almacen, row.serial, row.MATNR_FG,
        ].map(escaparCSV)
      : [
          m.id, m.certificacionId, m.matnr, m.fechaHora, m.movimientoTipoId, m.cantidad,
          m.salida, m.retorno, m.procesado, m.aprobado, m.razonId, m.descripcionRazon,
          m.centroCosto, m.almacen, m.serial, m.matnrFg,
        ]
          .map(escaparCSV);
  });

  const contenido = [cabeceras.join(','), ...filas.map((f) => f.join(','))].join('\r\n');
  const blob = new Blob(['\uFEFF' + contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', nombreArchivo);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const simularImpresionPDF = (titulo: string) => {
  const originalTitle = document.title;
  document.title = `${titulo} - SCRAPControl`;
  window.print();
  document.title = originalTitle;
};
