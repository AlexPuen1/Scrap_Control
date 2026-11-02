# Registro de seguridad — SCRAPControl

**Actualizado:** 2 de noviembre de 2026
**Estado general:** apto únicamente para uso local/controlado; **no listo para exponerse a otros equipos ni a Internet**.
**Alcance de esta evaluación:** revisión estática del código del repositorio y Semgrep. No es una certificación ni una auditoría exhaustiva de la infraestructura, la API corporativa o SQL Server.

## Resumen ejecutivo

SCRAPControl consulta movimientos de Scrap desde SOE a través de una API corporativa y permite modificar la razón o registrar un dictamen. Esas dos operaciones escriben datos persistentes. Se encontraron controles útiles de CORS, validación de entradas, TLS hacia la API corporativa y protección de valores CSV; sin embargo, el backend **no autentica a las personas ni comprueba sus permisos**. El nombre recibido para un dictamen es texto proporcionado por el cliente, no una identidad verificada.

Como mitigación inmediata, el backend se limitó a escuchar en `127.0.0.1`. Esto reduce el acceso desde otros equipos, pero no protege contra otros procesos o usuarios del mismo equipo y **no reemplaza autenticación ni autorización**. La integración de identidad quedó expresamente pendiente; aún se requiere un proveedor corporativo y una política de roles.

| Indicador | Estado |
|---|---|
| Hallazgos críticos identificados | Ninguno en el análisis realizado; no equivale a demostrar que no existan. |
| Semgrep `--config=auto` final | Completado: 0 hallazgos, 227 reglas y 60 archivos analizados. |
| Hallazgo alto confirmado | Rutas de lectura y escritura sin autenticación/autorización. La exposición de red se mitigó limitando el listener a loopback. |
| Autenticación y autorización por rol | Pendientes por decisión del propietario del proyecto. |
| Pruebas ejecutadas | `npm run build`, `npm test` y Semgrep; completadas correctamente. |
| Pruebas de penetración, navegador o escritura real en SOE | No realizadas. |

## Alcance y arquitectura relevantes

```text
Navegador React → API local Express → API corporativa HTTPS
                                  → SQL Server est04db / base SOE
```

- El navegador consume rutas `/api`; no se conecta directamente a SQL Server ni envía SQL.
- Express expone `/api/health` y rutas de movimientos, razones, reportes y dictámenes.
- El backend envía consultas y actualizaciones a `POST /api/Utility/executeSQLCommand`.
- La interfaz y los catálogos locales/mock no constituyen controles de acceso.
- Las acciones de dictamen y actualización de razón modifican datos corporativos reales; no se debe tratar esta aplicación como solo lectura.

## Controles observados y cambios ya realizados

| Área | Estado observado |
|---|---|
| Interfaz de escucha | `backend/src/server.ts` fija el host `127.0.0.1`. El proxy de desarrollo en `frontend/vite.config.ts` apunta a la misma dirección. Esto evita que Express escuche en todas las interfaces; no es una frontera contra procesos locales. |
| Puerto | `PORT` se convierte a entero y se rechaza si no está entre 1 y 65535. |
| CORS | Se limita mediante `CORS_ORIGINS`, con orígenes locales de Vite por defecto. CORS limita navegadores; no autentica, no autoriza y no bloquea clientes HTTP locales. |
| Validación de solicitudes | Los controladores validan IDs decimales positivos seguros, fechas, tipo y razón; validan también dictamen y longitud del nombre capturado. Las pruebas unitarias incluyen IDs malformados y rango seguro. |
| SQL | Las consultas de lectura pasan por una comprobación que permite `SELECT` de una sola instrucción. Los valores dinámicos observados en el repositorio son fechas validadas o enteros validados; el nombre del dictaminador se escapa para comillas SQL. La integración usa un endpoint corporativo de SQL genérico, no parámetros SQL enlazados. |
| Conexión corporativa | La URL por defecto usa HTTPS y `fetch` conserva la validación TLS normal; los scripts Node de operación incluyen `--use-system-ca`. No se verificaron aquí certificados, políticas ni permisos del servicio corporativo. |
| Endurecimiento HTTP local | Express oculta `X-Powered-By`, establece `nosniff`, `DENY`, `no-referrer` y `no-store`, limita JSON a 10 KB, escucha en loopback y omite query strings de los logs de acceso. |
| Errores HTTP | Los errores internos de controladores devuelven mensajes genéricos; el log local registra el contexto y tipo, no el mensaje remoto que podría contener datos operativos. |
| Health check | Solo expone disponibilidad y estado conectado/desconectado; ya no publica nombres de tablas, rutas locales o configuración SQL. |
| Secretos locales | `.gitignore` excluye `.env`, `.env.local` y variantes locales. Esto reduce el riesgo de versionarlos, pero no demuestra que nunca se haya filtrado un secreto ni sustituye un escaneo dedicado de secretos. |
| Exportación CSV | `frontend/src/utils/formatters.ts` usa columnas explícitas, escapa campos y antepone apóstrofo a valores que podrían interpretarse como fórmulas. Las exportaciones aún pueden contener datos operativos identificables y requieren manejo restringido. |
| Pruebas automatizadas | `npm test` valida IDs, códigos de dictamen y que un error remoto no se revele al cliente. No cubre autenticación (aún inexistente), autorizaciones, recorridos E2E ni escrituras válidas. |
| Documentación | `README.md` y `Documentacion.md` advierten que no se publique el servicio sin autenticación/autorización. Este archivo centraliza el estado, los cambios y el plan pendiente. |

### Cambio de exposición de red

Antes, `app.listen(PORT, ...)` no fijaba una interfaz, lo que podía permitir escucha en interfaces de red según el entorno. Ahora Express enlaza explícitamente a `127.0.0.1`, y Vite usa `http://127.0.0.1:3001`. Por tanto, equipos remotos no deberían poder conectarse directamente al listener local. Un proxy inverso, túnel, port-forward o cambio de host puede volver a exponerlo; no se probó ninguna configuración de despliegue. Si se necesita acceso compartido, primero debe añadirse autenticación y autorización de servidor.

## Hallazgos y riesgos pendientes

Severidades expresadas como prioridades de remediación; no son un resultado certificado de un marco de cumplimiento.

| Prioridad | Hallazgo o riesgo | Evidencia / efecto | Estado y acción necesaria |
|---|---|---|---|
| **Alta** | No hay autenticación ni autorización por rol en las rutas. | `backend/src/routes/movimientosRoutes.ts` monta GET y PATCH sin middleware de identidad. Clientes locales pueden leer datos e invocar cambios. `aprobadoPor` es texto controlado por el solicitante. | **Pendiente por decisión del usuario.** Elegir proveedor de identidad, validar tokens/sesión en backend, derivar al actor de la identidad verificada y exigir permisos explícitos para cada operación de escritura. |
| **Alta** | Las escrituras son reales y no hay un control de autorización servidor. | Dictamen actualiza `aprobado`, `nvAprobadoPor` y fecha; corrección actualiza `RazonId`. El lote de dictámenes se realiza en solicitudes individuales, sin transacción de conjunto. | Restringir el uso hasta integrar autorización. Probar cambios autorizados y no autorizados en un ambiente aislado y acordar reversión/auditoría con el dueño de SOE. |
| **Media** | No se observan límites de frecuencia ni paginación real en la consulta principal. | `MovimientosRepository.listar` obtiene el conjunto del periodo y aplica varios filtros en memoria; peticiones repetidas o periodos grandes pueden incrementar carga y exposición de datos. | Evaluar límites de solicitudes, límites de fechas/tamaño, paginación y filtros SQL del lado servidor. Medir carga antes de fijar umbrales. |
| **Media** | El endpoint de salud revela metadatos de conexión y estructura. | `GET /api/health` informa motor, estado, nombres de tablas/ruta y versión. No contiene credenciales según el código revisado, pero expone detalles operativos. | Determinar si hace falta acceso público al health check; separar comprobación mínima de información administrativa y limitar detalles. |
| **Media** | Respuestas de error pueden devolver mensajes de excepciones al cliente. | Algunos controladores serializan `error.message` en HTTP 500. Un error de la API SQL podría contener información operativa. | Revisar mensajes de producción: responder de forma genérica al cliente y registrar detalles con acceso restringido, sin registrar secretos ni datos personales. |
| **Media** | SQL genérico se envía a un servicio corporativo. | La API remota acepta el campo `command`; la aplicación valida el patrón de consultas y construye escrituras localmente. La eficacia de permisos depende también del servicio y de la identidad SQL efectiva. | Confirmar con propietarios del servicio identidad efectiva, permisos mínimos, autorización por operación, límites y auditoría. Preferir parámetros enlazados/operaciones específicas si la API lo permite. |
| **Media** | El control de identidad y de ambiente de ejecución no se evaluó de extremo a extremo. | El listener local reduce exposición, pero una configuración externa puede reenviar tráfico. El uso local no evita acceso por otro proceso o usuario del mismo host. | Revisar firewall, usuarios y permisos del equipo, proxy inverso, túneles, contenedores y configuración de despliegue antes de habilitar acceso compartido. |
| **Baja / por revisar** | No se confirmó la presencia de cabeceras HTTP de seguridad ni política explícita de tamaño del JSON. | No se observó middleware dedicado de cabeceras ni configuración explícita de esos límites en `server.ts`. | Evaluar Helmet/CSP según cómo se sirva el frontend y establecer límites apropiados para cuerpos; probar compatibilidad antes de adoptar. |
| **Por evaluar** | Riesgo de dependencias vulnerables o secretos históricos. | Semgrep no reemplaza un análisis de dependencias ni un historial de secretos. | Ejecutar auditoría de dependencias (`npm audit` o herramienta corporativa) y escaneo de secretos sobre el historial permitido; revisar los resultados y falsos positivos antes de remediar. |

Los puntos marcados Media/Baja son recomendaciones basadas en la configuración revisada; no significan que se haya demostrado explotación. El reporte no afirma que la lista sea exhaustiva.

## Trabajo realizado y no realizado

### Realizado

1. Se ejecutó Semgrep y se repitió después de la mitigación.
2. Se limitó el listener de Express a `127.0.0.1`, se alineó el proxy local de Vite y se validó el puerto.
3. Se documentó la restricción local, la falta de autenticación y la prohibición de exponer el servicio sin los controles pendientes.
4. Se compiló backend y frontend con `npm run build`; terminó correctamente.
5. Se ejecutó `npm test`; pasó la prueba automatizada existente.
6. El escaneo final de Semgrep y `git diff --check` terminaron sin hallazgos/errores.

### No realizado

- No se añadió autenticación, proveedor de identidad, autorización por rol ni auditoría de actor: el proveedor no se había definido y el usuario pidió dejarlo pendiente.
- No se hicieron escrituras válidas, aprobaciones ni cambios de razón en SOE; tampoco pruebas contra una base aislada.
- No se ejecutó una prueba de penetración, análisis dinámico (DAST), fuzzing, E2E de navegador ni evaluación de red/firewall/proxy.
- No se ejecutó una auditoría de dependencias ni un escaneo dedicado de secretos.
- No se verificaron los permisos SQL efectivos, los controles de la API corporativa, la configuración productiva ni certificados de una conexión real.
- No se hizo una revisión exhaustiva de todos los flujos de datos personales, retención, respaldos, recuperación o cumplimiento normativo.
- No se afirmó ausencia total de vulnerabilidades: un escaneo estático sin hallazgos solo describe reglas y archivos analizados en ese momento.

## Semgrep: evidencia y límites

Comando del análisis final: `semgrep scan --config=auto --exclude Presentacion`.

| Métrica del resultado final | Resultado |
|---|---:|
| Archivos objetivo analizados | 60 |
| Reglas ejecutadas | 227 |
| Hallazgos | 0 |
| Archivos omitidos por patrones | 3 |
| Archivos omitidos por `.semgrepignore` | 1 |

La primera ejecución sin exclusiones se interrumpió al intentar abrir un archivo temporal bloqueado por PowerPoint: `Presentacion/~$SCRAPControl.pptx`. Se volvió a ejecutar excluyendo `Presentacion`, que contiene presentaciones/imágenes y no código fuente, y el análisis completó correctamente. El resultado depende de las reglas automáticas obtenidas por Semgrep y no incluye evaluación de runtime, dependencias completa, configuración corporativa ni despliegue.

## Plan recomendado para la siguiente corrección

1. **Antes de compartir el backend:** definir proveedor de identidad con el propietario del sistema; mantener loopback mientras no se implemente.
2. **Autenticar en servidor:** comprobar credenciales/tokens en backend, no solo en frontend ni mediante CORS; no aceptar el nombre de actor desde el cuerpo como prueba de identidad.
3. **Autorizar cada operación:** mínimo privilegio y roles claros para lectura, corrección de razón y dictamen. Denegar por defecto y probar respuestas 401/403.
4. **Auditar escrituras:** identidad verificada, acción, registro, fecha, resultado y correlación; no almacenar secretos y acordar retención con el dueño de datos.
5. **Endurecer API:** límite de frecuencia y cuerpo, paginación/filtros en SQL, mensajes de error sanitizados y health check mínimo.
6. **Validar integración corporativa:** confirmar permisos mínimos y comportamiento de la API SQL; probar operaciones en ambiente aislado, incluidos conflictos, fallos parciales y recuperación.
7. **Verificar dependencias y secretos:** ejecutar análisis dedicado y resolver hallazgos priorizados.
8. **Repetir verificaciones:** build, pruebas unitarias, Semgrep, y después pruebas dinámicas/E2E adecuadas al entorno antes de habilitar acceso de red.

**Criterio para declarar listo para acceso compartido:** identidad verificada en backend, autorización por operación, auditoría de escrituras, configuración de despliegue revisada y pruebas negativas/positivas en un ambiente aprobado. Este criterio todavía no se cumple.

## Revisión integral — 2 de noviembre de 2026

| Comprobación | Resultado |
|---|---|
| Build de backend y frontend (`npm run build`) | Correcto. |
| Pruebas backend (`npm test`) | Correctas; 3 pruebas después de agregar la prueba de errores internos. |
| Lint frontend (`npm run lint --prefix frontend`) | Termina con advertencias `only-export-components` en ambos contextos; las advertencias de impureza de render y setState en efecto se corrigieron. |
| TypeScript con `noUnusedLocals` y `noUnusedParameters` | Backend limpio; en frontend se corrigió un callback con parámetro sin uso. |
| Auditoría de dependencias (`npm audit --audit-level=high`) | Backend y frontend: 0 vulnerabilidades reportadas. |
| Semgrep local (`p/default`, 227 reglas, excluida Presentacion) | 0 hallazgos; 60 archivos versionados analizados. La ejecución `--config=auto` no se repitió porque Semgrep requiere telemetría para generar la configuración automática cuando se deshabilitan métricas. |
| Configuración local `.env` | `BaseDeDatos/.env` está excluido por `.gitignore`; no se inspeccionó su contenido. |
| SQL corporativo y flujos reales de escritura | No probados para evitar consultas/escrituras no autorizadas sobre datos de producción. |

Se corrigieron referencias documentales obsoletas (códigos de dictamen, nombre de línea, proxy local, CSV y CORS), se redujo la información del health check y se sanitizaron las respuestas de error. El análisis y las pruebas no constituyen una certificación de ausencia total de vulnerabilidades ni sustituyen pruebas en un entorno autorizado.

## Archivos de referencia

- `backend/src/server.ts` — listener, CORS y middleware.
- `backend/src/routes/movimientosRoutes.ts` — rutas de lectura/escritura.
- `backend/src/controllers/movimientosController.ts` — validación de entradas y respuestas.
- `backend/src/repositories/movimientosRepository.ts` — filtros, consultas y coordinación de actualizaciones.
- `backend/src/config/database.connection.ts` — API SQL, TLS, validación de consultas y escrituras.
- `frontend/src/utils/formatters.ts` — exportación CSV.
- `frontend/vite.config.ts` — proxy local del frontend.
- `backend/test/movimientosController.test.ts` — prueba unitaria de IDs de movimiento.
- `README.md` y `Documentacion.md` — advertencias y configuración documentadas.
