# Reporte de seguridad — SCRAPControl

**Fecha:** 29 de octubre de 2026  
**Alcance:** código fuente versionado del repositorio. Revisión estática; no se ejecutaron escrituras en SOE.

## Resumen

- **Hallazgos críticos:** ninguno identificado.
- **Semgrep:** 0 hallazgos; análisis completado sobre 60 archivos versionados.
- **Hallazgo alto:** el API carecía de autenticación y escuchaba en todas las interfaces. El listener ahora queda limitado a `127.0.0.1`, reduciendo la exposición a clientes de red.
- **Riesgo pendiente:** no se implementaron autenticación ni autorización por rol. Cualquier proceso local que alcance el backend puede consultar datos y solicitar cambios persistentes. No publicar ni compartir este backend hasta integrar controles de identidad y permisos del lado servidor.

## Escaneo automatizado

Se ejecutó `semgrep scan --config=auto --exclude Presentacion`. La ejecución inicial sin exclusión se interrumpió al intentar leer un archivo temporal de PowerPoint bloqueado (`Presentacion/~$SCRAPControl.pptx`); el escaneo con la carpeta de presentaciones excluida finalizó correctamente.

| Resultado | Valor |
|---|---:|
| Archivos versionados analizados | 60 |
| Reglas ejecutadas | 227 |
| Hallazgos | 0 |
| Archivos excluidos | 3 por patrón; 1 por `.semgrepignore` |

Las imágenes y presentaciones no son código fuente y no se incluyeron en el análisis.

## Hallazgo y corrección

### Acceso sin autenticación desde la red

**Severidad:** Alta antes de la mitigación  
**Confianza:** 9/10  
**Ubicación:** `backend/src/server.ts`; rutas de movimientos en `backend/src/routes/movimientosRoutes.ts`.

Las rutas de consulta y escritura no verifican identidad ni permisos. El servidor escuchaba sin fijar una interfaz, lo que podía exponer las operaciones a otros equipos según la red y el despliegue. CORS solo limita navegadores; no autentica clientes.

**Mitigación aplicada:** Express escucha exclusivamente en `127.0.0.1`; el proxy de desarrollo apunta a esa misma interfaz. La documentación aclara que el servicio no debe exponerse en red y que las operaciones siguen sin autenticar usuarios locales.

**Pendiente:** implementar autenticación corporativa, autorización por rol y auditoría antes de habilitar acceso a otros equipos o confiar dictámenes a usuarios concretos. La mitigación de red no reemplaza esos controles.

## Validación

`npm run build`, `npm test` y el escaneo final de Semgrep completaron correctamente. `git diff --check` no reportó errores.
