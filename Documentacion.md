# SCRAPControl: documentación técnica

## 1. Propósito y estado del producto

SCRAPControl es una aplicación web React/TypeScript con backend Node.js/Express para consultar movimientos de Scrap de `SOE`, mostrar trazabilidad disponible y gestionar dos cambios persistentes: dictamen y razón del movimiento.

La siguiente separación evita confundir la interfaz con una integración completa:

| Estado | Funciones |
|---|---|
| Lectura corporativa | Lista/detalle de `dbo.Movimientos`, línea vía `dbo.Certificacion`, razón vía `dbo.vw_Scrap_PowerBI`, agregado Scrap por línea. |
| Escritura corporativa | Dictamen `aprobado`/`rechazado`; actualización de `RazonId` o `NULL`. |
| Cálculo local sobre datos consultados | Filtros visuales, indicadores, reportes, orden y paginación; la mayoría de las gráficas. |
| Local/mock | Catálogo de motivos, notificaciones, configuración visual, algunos atributos de ficha y datos de demostración. |
| No conectado | Alta de movimientos, SAP, costos oficiales, OEE y transacciones masivas. |

Las escrituras cambian datos reales. El backend comprueba la sesión y el rol antes de atender rutas protegidas. No exponer el servicio fuera de una red controlada hasta configurar HTTPS y validar el despliegue integrado.

## 2. Arquitectura

```text
React (frontend)
  └─ ScrapService: GET/PATCH JSON a /api
       └─ Vite proxy (desarrollo) o proxy del host (despliegue)
            └─ Express: controllers → MovimientosRepository
                 └─ database.connection.ts: HTTPS POST
                      └─ API corporativa /api/Utility/executeSQLCommand
                           └─ SQL Server EST02DB / SOE
```

| Área | Archivos principales |
|---|---|
| Rutas y providers | `frontend/src/App.tsx`, `frontend/src/context/` |
| Cliente REST y adaptación | `frontend/src/services/scrapService.ts` |
| Pantallas | `frontend/src/pages/` |
| Servidor y rutas REST | `backend/src/server.ts`, `backend/src/routes/movimientosRoutes.ts` |
| Validación de solicitudes | `backend/src/controllers/movimientosController.ts` |
| Consultas y agregados | `backend/src/repositories/movimientosRepository.ts` |
| Cliente de API SQL | `backend/src/config/database.connection.ts` |
| Ajustes de SQL corporativo | `BaseDeDatos/.env` |

El navegador no recibe la URL corporativa ni manda comandos SQL. Node solicita `server`, `db` y `command` a la API con `Content-Type: application/json`. No se configura usuario/contraseña SQL en el cliente local ni se usa ODBC. La identidad y autorización del siguiente salto, API→SQL, las administra la organización y no se deducen del código.

El backend también consulta `InventarioDB.dbo.MRP_Result_by_week_test` para la página Precio: relaciona el material por `MATNR` y no entrega la tabla semanal completa al navegador.

## 3. Instalación, configuración y comandos

### Requisitos

- Node.js 24 o posterior, npm.
- Conectividad HTTPS con la API corporativa desde el equipo del backend.
- Certificado HTTPS confiable para Node/sistema operativo.

### Instalación y ejecución

Desde la raíz:

```powershell
npm install
npm install --prefix backend
npm install --prefix frontend
npm run test:db
npm test
npm run dev
```

El frontend de Vite usa normalmente `http://localhost:5173`; Express escucha solo en `http://127.0.0.1:3001`. `npm test` ejecuta pruebas unitarias aisladas del backend, sin conexión SQL; `npm run test:db` verifica conexión con un `SELECT` de solo lectura. `npm run build` ejecuta compilación TypeScript del backend y build TypeScript/Vite del frontend. `npm start` arranca el backend compilado y `vite preview`; no sustituye la configuración de un servidor productivo.

### Variables

`BaseDeDatos/.env` se crea copiando `BaseDeDatos/.env.example`:

| Variable | Definición |
|---|---|
| `DB_API_BASE_URL` | Raíz HTTPS de la API, sin `/api/Utility/executeSQLCommand`. |
| `DB_SERVER` | Nombre solicitado al servicio SQL (por defecto `EST02DB`). |
| `DB_DATABASE` | Base solicitada (por defecto `SOE`). |
| `DB_API_TIMEOUT` | Timeout de `fetch` en milisegundos (por defecto `20000`). |
| `AUTH_MANAGER_USERNAME`, `AUTH_MANAGER_PASSWORD_SALT`, `AUTH_MANAGER_PASSWORD_HASH` | Cuenta local de Gerente y hash scrypt de su contraseña. |
| `AUTH_SUPERINTENDENTE_USERNAME`, `AUTH_SUPERINTENDENTE_PASSWORD_SALT`, `AUTH_SUPERINTENDENTE_PASSWORD_HASH` | Cuenta local de Superintendente y hash scrypt de su contraseña. |
| `AUTH_ADMIN_USERNAME`, `AUTH_ADMIN_PASSWORD_SALT`, `AUTH_ADMIN_PASSWORD_HASH` | Credenciales locales adicionales de Administrador; Windows Authentication se conserva como alternativa. |
| `AUTH_SESSION_SECRET` | Secreto de al menos 32 bytes para firmar las cookies de sesión. |
| `WINDOWS_ADMIN_USERS` | Cuentas Windows/UPN autorizadas como Administrador, separadas por coma. |
| `WINDOWS_AUTH_PROXY_KEY` | Secreto compartido entre IIS y Express para la ruta de inicio Windows. |

`BaseDeDatos/.env` debe contener sales aleatorias y hashes scrypt, no contraseñas en texto claro. `backend/.env` controla `PORT` (por defecto `3001`) y `CORS_ORIGINS`. Express escucha exclusivamente en `127.0.0.1`. IIS sobrescribe los encabezados internos únicamente al autenticar `/api/auth/windows`. `VITE_API_BASE_URL` permite definir la base de las rutas Express en el frontend; sin ella se usa `/api`. No almacenar secretos en documentación o archivos versionados.

## 4. Arranque y estado de salud

El servidor carga `backend/.env`, instala CORS limitado a `CORS_ORIGINS`, parser JSON y logging de método/URL; registra `/api/health` y `/api/movimientos`; y escucha en `127.0.0.1:PORT`, sin exponer el listener a la red local. Después invoca `connectToDatabase()`, que llama a la API corporativa mediante:

```sql
SELECT DB_NAME() AS baseActual, @@SERVERNAME AS servidorActual
```

La prueba comprueba que la base sea `SOE` y que `EST02DB` coincida con el prefijo o nombre de instancia del servidor devuelto. Las validaciones anteriores corresponden a `EST04DB` y no prueban el destino nuevo. Si falla, se registra el error, pero Express no cierra el listener. `GET /api/health` muestra el estado de conexión más reciente y su timestamp de respuesta HTTP; no ejecuta una prueba nueva en cada llamada.

La conexión a `SOE` en `EST02DB` ya fue verificada con `SELECT` de solo lectura. Aunque el objeto local `[RapEnsambleEMM].[dbo].[Linea]` no está disponible, `dbo.GetList_Lineas` ya usa el catálogo enlazado `[172.19.216.32].[RapEnsambleEMM].[dbo].[PRENSAS_Cat_NombresLinea]`. El backend ahora usa esa misma fuente para resolver `LineaNombre`; los endpoints de movimientos, detalle y fallas por línea respondieron correctamente en EST02DB.

El payload de salud incluye campos de tablas relacionados que se construyen como metadatos estáticos. Parte de esa lista es heredada y puede mencionar `dbo.EtiquetasCI`, que no existe en la base consultada. Para el catálogo editable, la implementación usa `dbo.vw_Scrap_PowerBI`; no tratar el listado de salud como inspección real del esquema.

Los scripts Node (`dev`, `start`, `test:db`) usan `--use-system-ca`. HTTPS conserva la verificación de certificados; no equivale a confiar en cualquier certificado. Cada consulta realiza una petición HTTP nueva, no se mantiene una sesión SQL local persistente.

## 5. Contrato con la API corporativa

El cliente envía `POST ${DB_API_BASE_URL}/api/Utility/executeSQLCommand`:

```json
{
  "server": "EST02DB",
  "db": "SOE",
  "command": "SELECT ..."
}
```

El resultado esperado es JSON con `success`, opcionalmente `message`, `rows` para lecturas y `affectedRows` para escrituras. Un HTTP no exitoso, JSON inválido, `success !== true`, timeout o error de red se convierte en error de aplicación; no se sustituye por datos simulados. Una lectura exitosa sin `rows` se traduce en lista vacía.

`consultarSQL()` admite únicamente comandos que comienzan con `SELECT` y bloquea `;`, `--`, `/*` y `*/`. Las escrituras no pasan por esa función: las funciones `actualizarDictamenSQL` y `actualizarRazonSQL` construyen comandos específicos. La API remota es genérica; el filtro local no restringe por sí mismo los permisos remotos de esa API.

## 6. Flujo de datos de movimientos

### Carga y periodo

Al montar `ScrapProvider`, el cliente solicita `GET /api/movimientos`. Si no se indican fechas, el repositorio obtiene `MAX(fecha_hora)` de `dbo.Movimientos` y consulta:

- desde `CONVERT(date, DATEADD(MONTH, -1, fechaMaxima))`, inclusivo;
- hasta el día posterior a `fechaMaxima`, exclusivo.

Es una ventana de un mes anclada a la última fecha existente, no el mes calendario actual. Si la tabla está vacía, la comparación de fecha no devuelve filas. La consulta une `dbo.Certificacion` para obtener `LineaId` y resuelve `DescripcionRazon` mediante subconsulta a la vista `dbo.vw_Scrap_PowerBI`.

La lista puede recibir `fechaInicio` inclusiva y `fechaFin` exclusiva, ambas `YYYY-MM-DD`. El controller exige que ambas estén presentes, que sean fechas reales y que `fechaFin > fechaInicio`. El Dashboard presenta ambos días como inclusivos y suma un día al valor de «Hasta» antes de llamar a la API.

### Filtros y límite de volumen

`GET /api/movimientos` admite `tipoId`, `aprobado`, `razonId`, `certificacionId`, `lineaId`, `almacen` y `busqueda`, además de fechas. El SQL obtiene las filas del periodo; después `aplicarFiltros()` aplica estos criterios en Node. La búsqueda considera ID, serial, MATNR, MATNR_FG, credencial, nombre local del tipo, RazonId y almacén. Los filtros de estado aceptan `0`, `1`, `2`, `4` o `null`; `razonId=null` busca movimientos sin razón. Los parámetros numéricos se validan y el texto se limita a la longitud permitida. No hay `LIMIT`, paginación ni filtros SQL para estos criterios en el contrato actual.

La lista ordena por ID descendente. El backend enriquece `MovimientoTipoNombre` mediante un mapa local, no consulta `dbo.MovimientoTipo`. El DTO añade `LineaId`, `LineaNombre` y `DescripcionRazon`; son valores derivados, no columnas físicas de `dbo.Movimientos`. `LineaNombre` se obtiene de `[172.19.216.32].[RapEnsambleEMM].[dbo].[PRENSAS_Cat_NombresLinea]`, relacionando `Certificacion.LineaId` con `IdPrensa` y mostrando `Descripcion`. La columna rotulada `Procesado` muestra el valor de `dbo.Movimientos.aprobado`, con los códigos `1` aprobado, `2` procesado y `4` rechazado; no muestra el campo SQL `procesado`, que SCRAPControl no modifica.

### Reporte de Scrap por línea

`GET /api/movimientos/fallas-por-linea` calcula `MAX(fecha_hora)`, determina fecha inicial un mes antes y fecha final según ese máximo; después agrega Scrap (`MovimientoTipoId = 1`) en el rango. Une:

```text
Movimientos.CertificacionId → Certificacion.id → Certificacion.LineaId
Certificacion.LineaId → [172.19.216.32].[RapEnsambleEMM].[dbo].[PRENSAS_Cat_NombresLinea].IdPrensa → Descripcion
```

La salida contiene `periodo` (`fechaInicio`, `fechaFin`) y `datos` (`lineaId`, `lineaNombre`, `movimientos`, `piezasScrap`). `COUNT_BIG(*)` calcula movimientos y `SUM(cantidad)` piezas. La unión a certificación y al catálogo de líneas es `LEFT JOIN`, por lo que valores sin correspondencia pueden aparecer con nombre vacío o `lineaId = null`. Esta consulta no usa el periodo del Dashboard ni un filtro de usuario. La interfaz incluye el periodo y usa barras horizontales con el nombre de línea.

### Comparación mensual

`GET /api/movimientos/comparativa-mensual?mes=YYYY-MM` valida el mes calendario y devuelve agregados del mes indicado y del mes anterior en una sola respuesta. Incluye cuatro métricas: piezas Scrap por día, piezas por certificación, piezas Scrap por razón y piezas Scrap por línea. Los días se alinean por número del día dentro del mes, aunque no coincidan en día de semana y los meses tengan distinta longitud.

La pantalla propone el mes de la fecha más reciente cargada; si no hay movimientos, propone el mes actual. Las tarjetas resumen los picos del mes seleccionado; se trata del máximo relativo a esa métrica, no de un límite industrial ni una regla global. Las barras mantienen colores diferenciados por periodo y los valores del tooltip se muestran en blanco. Se muestran totales y variación respecto del periodo anterior. Si el mes anterior no tiene valor base, se informa que el porcentaje no puede calcularse; si no hay registros, no se inventan picos. Errores de API muestran reintento y no se presentan resultados viejos como si fueran de la nueva selección.

La comparación es independiente de los rangos de Dashboard, Reportes y Fallas por línea. Certificación incluye todos los tipos de movimiento, como su gráfica en Dashboard; tendencia, razón y línea consideran solo `MovimientoTipoId = 1`.

## 7. Endpoints Express

| Método | Ruta | Validación/resultado |
|---|---|---|
| `POST` | `/api/auth/login` | Recibe usuario/contraseña; valida hash scrypt y establece cookie HttpOnly. |
| `POST` | `/api/auth/logout` | Elimina la cookie de sesión. |
| `GET` | `/api/auth/windows` | Solo identidad Windows de Administrador validada por IIS; emite cookie de sesión. |
| `GET` | `/api/auth/me` | Devuelve la cuenta y rol de la sesión firmada. |
| `GET` | `/api/health` | `status`, fecha, tipo de DB, estado más reciente y nombres de tabla como metadatos estáticos. Público. |
| `GET` | `/api/movimientos` | `{ exitoso, datos, conteo }`; acepta fechas y filtros opcionales `tipoId`, `aprobado`, `razonId`, `certificacionId`, `lineaId`, `almacen`, `busqueda`. |
| `GET` | `/api/movimientos/aprobaciones` | `{ exitoso, datos: [{ nombre, aprobaciones }], total }`; siempre `aprobado = 1`, agrupado por `nvAprobadoPor`; fechas opcionales para limitar por `dtAprobado`. |
| `GET` | `/api/movimientos/precios?periodo=...&pagina=...&limite=...&incluirResumen=...` | Valorización Scrap usando `VAL_UNIT` por `MATNR`; los tres roles autenticados pueden usarlo. |
| `GET` | `/api/movimientos/comparativa-mensual?mes=YYYY-MM` | `{ exitoso, periodos, datos }`; agregado del mes seleccionado y el anterior; solo Administrador. |
| `GET` | `/api/movimientos/fallas-por-linea` | `{ exitoso, periodo, datos }`; periodo reciente calculado en el servidor; solo Administrador. |
| `GET` | `/api/movimientos/razones?movimientoTipoId=N` | `{ exitoso, datos: [{ id, descripcion }] }`; requiere tipo entero positivo y rol Administrador. |
| `GET` | `/api/movimientos/:id` | `{ exitoso, datos }`; entero y respuesta 404 si no existe. |
| `PATCH` | `/api/movimientos/:id/razon` | JSON `{ razonId: entero positivo | null }`; valida la razón y requiere rol Administrador. |
| `PATCH` | `/api/movimientos/:id/dictamen` | JSON `{ aprobado: 1 | 4 }`; `1` aprueba, `4` rechaza, solo modifica pendiente `0` y el servidor registra la identidad de sesión. |

Las rutas literales (`fallas-por-linea`, `razones`) y rutas de acción se registran antes de `/:id`. Al rechazar Scrap desde la interfaz, se exige un comentario y se muestra en Movimientos durante la sesión actual. No se envía a Express ni se persiste; se pierde al recargar la aplicación. En rechazo múltiple, el comentario se aplica a cada movimiento Scrap seleccionado.

`GET /api/movimientos/aprobaciones` acepta ambas fechas `fechaInicio` y `fechaFin` o ninguna. Con ambas, el inicio es inclusivo y el fin exclusivo para `dtAprobado`; sin fechas, incluye todas las filas aprobadas sin límite temporal. En ambos modos el único filtro de negocio es `aprobado = 1`; no se filtra por `MovimientoTipoId`. Nombres nulos/vacíos se agrupan como «Sin responsable registrado». El `total` es la suma de todos los grupos. No es un historial de dictámenes, sino un conteo del estado actual por fila.

### Respuestas de error

Los controllers responden JSON `{ exitoso: false, mensaje }`. Según la operación se esperan:

- `400`: parámetro/rango/ID/tipo/razón/dictamen inválidos.
- `401`: credenciales/sesión no válidas o ausentes.
- `403`: el rol no está autorizado para la operación.
- `503`: falta una configuración de autenticación requerida.
- `404`: movimiento inexistente.
- `409`: el dictamen ya no está pendiente o el `UPDATE` no afectó la fila.
- `500`: error de API SQL, lectura, actualización o verificación.

`GET /api/movimientos/:id` exige un ID decimal positivo completo y seguro; no acepta sufijos, decimales, cero ni valores fuera del rango seguro. Los endpoints de escritura exigen también ID positivo seguro. El controller del dictamen acepta únicamente `1` (aprobado) o `4` (rechazado); el responsable se obtiene de la sesión autenticada del servidor, no del cuerpo HTTP. El valor `2` ya no se interpreta ni se escribe como rechazo; los datos históricos no se migran. `razonId` debe ser `null` o entero positivo seguro.

## 8. Escrituras de negocio

### Dictamen individual

`PATCH /api/movimientos/:id/dictamen` repite las validaciones en controller y cliente SQL. La identidad proviene de la sesión validada en backend; se escapan apóstrofos antes de insertarla como literal SQL Unicode. El `UPDATE` fijo:

```sql
UPDATE dbo.Movimientos
SET aprobado = 1 | 4,
    nvAprobadoPor = N'...',
    dtAprobado = GETDATE()
WHERE id = ... AND aprobado = 0
```

El repositorio vuelve a leer el movimiento. Si no existe, responde 404; si no se actualizó/no era pendiente, 409; al confirmar, devuelve el registro actualizado. Los `NULL` no son candidatos por la condición `aprobado = 0`. El valor `nvAprobadoPor` es el nombre asociado a la sesión autenticada. Para rechazo de Scrap, la interfaz pide comentario, pero el esquema actual no lo admite: se conserva solo en memoria de la sesión del navegador y no se envía al backend, no se escribe en SQL y se pierde al recargar.

### Dictamen múltiple

El frontend toma IDs seleccionados que continúan visibles y confirmación; la identidad se deriva de la sesión en el servidor. Ejecuta cada dictamen secuencialmente mediante la misma ruta individual. Informa registros exitosos y fallidos. Los fallidos permanecen seleccionados para reintentar. No hay transacción de lote, rollback ni garantía de atomicidad.

### Actualización de razón

`GET /api/movimientos/razones?movimientoTipoId=N` agrupa razones con descripción no vacía desde `dbo.vw_Scrap_PowerBI`. La ruta de `PATCH /api/movimientos/:id/razon` implementa validación de pertenencia al catálogo y actualización de `dbo.Movimientos.RazonId`; requiere rol Administrador. La tabla `dbo.EtiquetasCI` no se usa porque no existe en la base consultada.

Ambos cambios son persistentes. Para la configuración de IIS y las variables de autenticación, consultar [Windows Authentication en IIS](IIS-Windows-Authentication.md).

## 9. Modelo SQL utilizado

### `dbo.Movimientos`

El repositorio consulta `movimiento.*`, más `LineaId` y `DescripcionRazon` derivados. El conjunto físico de columnas conocido figura en [`BaseDeDatos/Diccionario_Datos_Movimientos.md`](BaseDeDatos/Diccionario_Datos_Movimientos.md). La UI conserva algunos campos originales para su ficha y aprobaciones; el CSV aplica una selección separada y explícita de columnas, descrita en la sección 10.

`aprobado`: `0` pendiente, `1` aprobado, `2` procesado, `4` rechazado, `NULL` sin dictamen. Otros valores desconocidos se muestran como otro estado; no se modifican automáticamente. `MovimientoTipoId = 1` se trata como Scrap. El nombre de tipo sale de un mapa local. Las razones descriptivas salen de `dbo.vw_Scrap_PowerBI`.

### `dbo.Certificacion`

Se usa la relación `Certificacion.id` y `Certificacion.LineaId`. El nombre se obtiene desde `[172.19.216.32].[RapEnsambleEMM].[dbo].[PRENSAS_Cat_NombresLinea]`, donde `IdPrensa` corresponde al ID de línea y `Descripcion` es el nombre mostrado en Movimientos, Aprobaciones y Fallas por línea.

### Vista `dbo.vw_Scrap_PowerBI`

Se consultan `RAZONid`, `desc_Razon` y `MovimientoTipoId`. La vista es la fuente de las opciones por tipo y las descripciones del movimiento. Un catálogo local de motivos en frontend es independiente y no actualiza la vista.

## 10. Aplicación frontend

Rutas React bajo `MainLayout`:

| Ruta | Página | Alcance |
|---|---|---|
| `/dashboard` | `DashboardPage` | Solo Administrador autorizado: filtro de fechas, tendencia, SCRAP por línea desglosado por motivo, Top de razones y gráficas por empleado/aprobador. |
| `/movimientos` | `MovimientosPage` | Tabla con `Empleado` presentado como Supervisor, fecha de emisión y aprobación, filtros guiados compartidos, orden, paginación visual y CSV. |
| `/movimientos/:id` | `MovimientoDetallePage` | Ficha; Administrador puede editar persistentemente la razón. |
| `/aprobaciones` | `AprobacionesPage` | Indicadores de Scrap/pendientes/aprobados/rechazados que filtran la tabla, columna Supervisor (`dbo.Movimientos.Empleado`), filtros compartidos, paginación de 10/25/50 filas, selección y dictamen para pendientes. |
| `/precio` | `PrecioPage` | Disponible para los tres roles; tarjetas de resumen por periodo y detalle paginado de Scrap valorizado en USD. |
| `/fallas-por-linea` | `FallasPorLineaPage` | Agregado SQL, periodo, búsqueda local, barras horizontales y tabla. |
| `/reportes` | `ReportesPage` | Filtrado y agrupación de movimientos cargados; con ambas fechas seleccionadas, consulta al backend el rango inclusivo solicitado. |
| `/comparativa-mensual` | `ComparativaMensualPage` | Solo Administrador autorizado; comparación mensual SQL para cuatro gráficas, con descripción de razón, picos y estados de error/sin datos. |
| `/filtros` | `FiltrosPage` | Solo Administrador autorizado; consulta del mes calendario elegido con filtros opcionales al solicitar Buscar. |
| `/motivos` | `MotivosPage` | Catálogo local, referencia y formularios locales. |
| `/configuracion` | `ConfiguracionPage` | Parámetros de presentación; botón de guardado solo muestra confirmación. |

`ScrapContext` carga los movimientos por periodo predeterminado. Al dictaminar se recarga ese contexto; en cambio, el rango del Dashboard se guarda localmente a su pantalla hasta usar «Último mes». El Dashboard muestra conteos/cantidades por `aprobado`, pero sus KPIs no son contadores «de hoy» necesariamente: se calculan sobre el conjunto del periodo. El KPI de costos y tasas usa valores fijos/cero por falta de integración.

La pantalla Precio solo incluye `MovimientoTipoId = 1`. El backend compara `MATNR` normalizado entre `dbo.Movimientos` y `InventarioDB.dbo.MRP_Result_by_week_test`, elige una sola fila por material con `VAL_UNIT` numérico y `WEEK_A` numérica de semana más reciente, y calcula `cantidad × VAL_UNIT`. Los materiales sin precio quedan separados y no se suman al monto. El API calcula el resumen para el periodo y pagina únicamente el detalle (10/25/50); la pantalla conserva el resumen al cambiar página o tamaño para no volver a solicitarlo. Las tarjetas muestran importes sin decimales y el detalle hasta tres, solo como presentación: los cálculos conservan precisión. El importe es una valorización estimada, no un costo oficial contable.

La gráfica de aprobaciones consulta `/api/movimientos/aprobaciones` separadamente del conjunto compartido: «Todas las aprobaciones» no envía fechas; «Mes seleccionado» envía el periodo aplicado (fin exclusivo) y filtra por `dtAprobado`. Cuenta filas con `aprobado = 1`, sin filtrar tipo, y agrupa por `nvAprobadoPor`. Las barras incluyen todos los responsables y nombres vacíos. Por tanto, en modo mensual la suma puede no coincidir con una consulta SQL que filtre por `fecha_hora`; para comparar deben usarse `dtAprobado`, el mismo rango y el mismo predicado `aprobado = 1`.

Movimientos y Aprobaciones comparten controles grandes de búsqueda por folio/serial/material, fechas con calendario, estado, tipo, razón, certificación, línea y almacén. La razón se habilita al elegir tipo. Las fechas predeterminadas corresponden al intervalo de los movimientos cargados. Aprobaciones agrega cuatro tarjetas: total de piezas Scrap, pendientes, aprobados y rechazados; las tres tarjetas de estado filtran el listado, y Total de piezas muestra todos los estados sin modificar los demás filtros. Las acciones de dictamen solo aparecen en filas pendientes.

La vista Filtros paso a paso propone el mes calendario de la fecha más reciente disponible. El usuario puede elegir filtros y pulsa Buscar para enviarlos a `GET /api/movimientos`; el servidor valida parámetros, consulta el rango y aplica los criterios disponibles sobre el resultado. La fecha final elegida se convierte al límite exclusivo del día siguiente. Cambiar una opción no ejecuta una llamada hasta pulsar Buscar.

La tabla de Movimientos presenta `dbo.Movimientos.Empleado` bajo la columna Supervisor y `dtAprobado` como Fecha aprobación; un registro pendiente muestra “Sin aprobar”. Gerente y Superintendente tienen acceso de interfaz a Movimientos, Aprobaciones y Precio. Dashboard, Fallas por línea, Reportes, Comparación mensual, Filtros paso a paso, Motivos y Configuración son exclusivos de Administrador.

Las tablas de Movimientos y Aprobaciones permiten desplazamiento horizontal cuando no caben en la pantalla y envuelven los valores largos en varias líneas para evitar recortes o puntos suspensivos. En pantallas pequeñas la tabla puede ocupar más ancho que el viewport; se desplaza dentro de su contenedor.

Movimientos y reportes se filtran sobre los resultados cargados. En Reportes, seleccionar ambas fechas hace una nueva consulta a backend para ese intervalo (fecha final inclusiva); si solo se selecciona una fecha o el intervalo es inválido, no se muestran resultados parciales. La exportación CSV aplica protección frente a fórmulas de hojas de cálculo y omite credenciales, identificadores/nombres de empleado y datos de aprobación; conserva los campos operativos del reporte. El botón «Registrar incidencia» está deshabilitado. La impresión llama a `window.print()` y no genera un PDF desde backend.

Motivos/notificaciones se inicializan de datos de `frontend/src/mock/data.ts` y se persisten en claves `localStorage` `scrap_mes_motivos_ssms_v2` y `scrap_mes_notificaciones_ssms_v2`. El reinicio borra solo esos datos locales, no los movimientos SQL. Tema y varios estados pertenecen a la interfaz.

## 11. Errores, límites y despliegue

- `GET /api/health` es una instantánea del último estado, no un chequeo por petición. Una respuesta `online` no asegura que la próxima consulta corporativa funcione.
- La lista de movimientos no tiene paginación de servidor. El volumen del periodo se descarga a Node y se envía al frontend; filtros de certificación/razón siguen aplicándose en memoria. En Reportes, al elegir ambas fechas se vuelve a consultar ese intervalo en el servidor (fin inclusivo); evita rangos innecesariamente amplios.
- La API corporativa es un ejecutor SQL genérico. El backend controla sus propias llamadas, pero los permisos efectivos deben restringirse en el servicio corporativo.
- Las rutas `/api` operativas requieren una cookie HttpOnly de sesión firmada. Login local está disponible para los tres roles; Windows Authentication se limita al intercambio de identidad de Administrador en `/api/auth/windows`.
- Antes de publicar, completar y probar el despliegue IIS/ARR para `/api/auth/windows`, reemplazo de encabezados, CORS real, TLS y protección de secretos. Express debe permanecer en loopback y no exponerse directamente.
- No poner secretos en `.md`, repositorio ni logs. Mantener HTTPS y certificados confiables.

Para detalles de conexión y campos, consultar [Conexión a datos](BaseDeDatos/ConexionBaseDatos.md) y [Diccionario de datos](BaseDeDatos/Diccionario_Datos_Movimientos.md).

La interfaz usa fuentes del sistema disponibles en el equipo y no carga tipografías desde Google Fonts ni desde otros servidores externos. Esto evita solicitudes externas de recursos de presentación y permite mostrar las pantallas sin acceso a Internet; no elimina la conexión corporativa requerida por el backend para consultar SOE.

## Autenticación y autorización

El frontend consulta `GET /api/auth/me` al iniciar. `POST /api/auth/login` valida las credenciales locales configuradas para Gerente, Superintendente y Administrador con hashes scrypt; Administrador también puede usar Windows Authentication en IIS. El backend firma una cookie HttpOnly con expiración de ocho horas y aplica restricciones de rol en las rutas protegidas. No confía en un rol enviado por el frontend.

Express escucha solo en loopback. Dashboard y otras páginas administrativas también están restringidas en la interfaz; el backend reserva explícitamente para Administrador las rutas de razones, edición de razones, fallas por línea y comparación mensual. Los dictámenes registran el nombre asociado a la sesión en `nvAprobadoPor`; los tres roles autenticados tienen acceso al flujo de dictamen. No se debe confundir el ocultamiento de páginas frontend con la autorización de cada endpoint. El inicio Windows integrado con IIS/ARR no se probó en este equipo; las pruebas automatizadas no certifican la negociación Kerberos/NTLM. Consulta [Configuración de IIS](IIS-Windows-Authentication.md).

La pantalla Aprobaciones muestra tarjetas de total de piezas Scrap, pendientes, aprobados y rechazados; las tarjetas de estado filtran las filas y solo las pendientes conservan botones de dictamen. Movimientos y Aprobaciones usan el mismo panel guiado de búsqueda. La ruta Filtros paso a paso consulta por rango y criterios al pulsar Buscar. La tabla de Movimientos presenta `dbo.Movimientos.Empleado` en Supervisor y `dtAprobado` en Fecha aprobación. Al pulsar Aprobar o Denegar se muestra un diálogo de confirmación y el comentario obligatorio al denegar Scrap; el responsable se obtiene de la sesión autenticada.

El Dashboard muestra piezas Scrap por línea en barras apiladas por motivo. El nombre abreviado del motivo se imprime dentro de cada segmento de color; los segmentos pequeños se amplían visualmente para que el texto quepa y la referencia inferior conserva los nombres completos. Por esta expansión, la longitud de los segmentos pequeños no es proporcional a las piezas: consultar el tooltip para cantidades exactas. «TOP RAZONES SCRAP» permanece debajo a ancho completo. Las gráficas administrativas muestran suma de `cantidad` Scrap por `Empleado` y conteo de filas con `aprobado = 1`, agrupadas por `nvAprobadoPor`; cuentan estado actual, no historial de dictámenes.

## 12. Verificación funcional ejecutada

El 28 de octubre de 2026 se ejecutaron compilación backend/frontend, `npm test`, lint y pruebas HTTP contra el backend local configurado para usar la API SQL corporativa. La prueba independiente de conexión validó la base `SOE` y el prefijo de servidor `est04db`. Lecturas: `GET /api/health` respondió 200 y conectado; `/api/movimientos` respondió 200 con 2,894 filas; `/fallas-por-linea`, 200 con 4 grupos; `/razones?movimientoTipoId=1`, 200 con 57 opciones; la comparación de mayo de 2026, 200 con 805 filas agregadas; octubre respondió 200 sin agregados; y un detalle elegido de la lista respondió 200. Un intervalo válido sin filas regresó 200 y cero registros. **Es evidencia histórica de EST04DB, no del destino actual.**

En la migración a EST02DB, `npm run test:db` pasó y confirmó `SOE` en `ESTMS02DB\EST02DB`. Las lecturas directas encontraron 92,547 movimientos y 76,132 certificaciones. Aprobaciones (509 registros agrupados en 3 responsables), razones (59 opciones) y comparación de octubre de 2026 (2,931 filas agregadas) respondieron 200. Inicialmente la lista y la gráfica por línea fallaron por el catálogo local inexistente; al sustituirlo por la fuente enlazada ya usada por `dbo.GetList_Lineas`, movimientos respondió 200 con 5,364 filas, el detalle respondió 200 con `LineaId` y nombre, y fallas por línea respondió 200 con 50 grupos. Los 5,364 movimientos del periodo tuvieron nombre de línea. No se hicieron escrituras.

Se comprobó `npm test` (prueba de validación de IDs), además de casos HTTP inválidos de fechas, mes, ID y cuerpos de dictamen/razón; se rechazaron con 400 antes de escribir. La prueba detectó que `GET /api/movimientos/:id` aceptaba prefijos numéricos seguidos de texto por el uso de `parseInt`; se cambió a validación de ID positivo completo y seguro, y después se confirmó que un ID malformado y cero responden 400. No se probó una escritura válida ni dictamen individual/múltiple contra la base real. La interfaz compila, pero esos cambios persistentes requieren una base de pruebas aislada para validar el ciclo completo sin alterar movimientos corporativos. No hay navegador/framework E2E instalado: no se automatizaron interacciones visuales, CSV ni impresión. El lint completo terminó con advertencias en los contextos preexistentes `ScrapContext.tsx` y `ThemeContext.tsx`, no en las páginas modificadas.

## 13. Correcciones de revisión de código (28 de octubre de 2026)

Esta ronda de cambios de código se verificó localmente con compilación backend/frontend, `npm test`, lint frontend y `git diff --check`. No se ejecutaron escrituras ni consultas de validación contra la base corporativa para probar las correcciones nuevas.

| Área | Corrección aplicada |
|---|---|
| CORS | Se eliminó `origin: '*'`. El backend admite la lista separada por comas `CORS_ORIGINS`; el valor predeterminado permite los orígenes locales de Vite (`localhost:5173` y `127.0.0.1:5173`). En despliegues deben establecerse los orígenes reales. |
| CSV | Se prefijan los valores que pudieran interpretarse como fórmulas, incluso con espacios o caracteres de control al inicio. Se excluyeron del archivo `credencial`, `EmpleadoId`, `Empleado`, `nvAprobadoPor` y `dtAprobado`; el resto de columnas exportadas está enumerado explícitamente. |
| Detalle por ID | Si el movimiento no está en la lista cargada, la ficha solicita `GET /api/movimientos/:id` cuando la ruta contiene un ID numérico. Los identificadores que no son numéricos (por ejemplo, un serial fuera de la lista) no se resuelven desde SQL. |
| Reportes | Con fecha inicial y final se consulta de nuevo el rango en el backend. La fecha final elegida se convierte al límite exclusivo del día siguiente; fechas incompletas o en orden incorrecto no presentan resultados parciales y muestran un aviso. |
| Comparativa de razones | La agregación mensual incorpora la descripción disponible del catálogo además del `RazonId`; las razones sin descripción conservan su ID y los registros sin razón se etiquetan explícitamente. |
| Estado de conexión | Una respuesta no JSON de la API SQL ahora marca la conexión como fallida y registra el mensaje en `ultimoError`. |
| Textos de interfaz | Se quitaron nombres/roles ficticios y afirmaciones no integradas. El perfil actual muestra la cuenta autenticada por Windows. |

**Estado actual de acceso:** el login local por contraseña y la sesión firmada están implementados; Windows Authentication para Administrador requiere configuración de ruta en IIS/ARR, sobrescritura de encabezados, HTTPS y secreto compartido. La prueba unitaria no certifica el inicio de sesión integrado desde una laptop.

**Pendiente de capacidad:** los movimientos siguen sin paginación del lado servidor; la consulta inicial y los intervalos amplios pueden traer muchas filas. La búsqueda y ciertos filtros siguen aplicándose en memoria.

**Resultado de validación de esta ronda:** builds backend y frontend exitosos; `npm test` pasó (1 prueba); lint frontend terminó sin errores y con las advertencias preexistentes en `ThemeContext.tsx` y `ScrapContext.tsx`; `git diff --check` pasó. No se creó commit. La carpeta local `Presentacion/` ya existía como no rastreada y no se modificó.

## 15. Reorganización de filtros y validación de interfaces

Se recorrieron las diez rutas de la interfaz anterior con fixtures interceptados en escritorio. En móvil (390 px) se comprobaron Movimientos, Aprobaciones, Comparación mensual y Filtros. Las tarjetas de Aprobaciones filtraron las filas de estado correspondiente y Total de piezas volvió a mostrar todos los estados; Filtros consultó el fixture al pulsar Buscar. La columna Fecha aprobación se encontró en Movimientos. Esta revisión visual histórica no validó autenticación; el selector de usuarios utilizado entonces fue eliminado y sustituido por la verificación Windows del servidor.

No se observaron desbordamientos horizontales en las páginas verificadas ni errores de consola/excepciones. Se interceptaron las solicitudes API y se rechazaron las salidas a otros orígenes; no se observó ninguna solicitud externa ni se envió un PATCH. Las validaciones visuales de acceso por roles correspondían al selector de la versión anterior y no representan la autorización actual. Estas pruebas no validan datos reales, persistencia, exportación/impresión ni IIS/Windows Authentication. El recorrido previo también comprobó menú móvil y retiro de fuentes externas; el backend sigue requiriendo la API corporativa para consultar SOE.

Validación automatizada de código: `npm test` pasó con 9 pruebas, `npm run build` pasó para backend y frontend, y lint terminó sin errores. Permanecen tres advertencias previas en `AnimatedValue.tsx`, `ThemeContext.tsx` y `ScrapContext.tsx`. `git diff --check` pasó.

### Ajustes de confirmación y acceso por rol (3 de noviembre de 2026)

Aprobar o denegar una fila pendiente abre directamente un solo diálogo de confirmación, sin la pantalla intermedia «Revisión para aprobar/denegar». Se mantiene el campo de responsable y el comentario obligatorio al denegar Scrap. La tabla de Movimientos muestra `dbo.Movimientos.Empleado` en una columna llamada Supervisor; no usa el campo físico independiente `Supervisor` como fuente para esa columna.

Comparación mensual y Filtros paso a paso se quitaron del menú de Gerente y Superintendente. Además, el acceso directo a `/comparativa-mensual` o `/filtros` redirige a Aprobaciones. Administrador conserva ambas pantallas. Esta regla solo aplica a navegación del frontend, no impone permisos en el backend.

Playwright con datos de API simulados confirmó que la columna Supervisor muestra el `Empleado` recibido, Aprobar/Denegar abre un solo diálogo sin revisión intermedia, el comentario de rechazo de Scrap continúa siendo requerido y ambos roles no ven las dos rutas restringidas ni pueden abrirlas directamente. No se hicieron escrituras, solicitudes externas ni hubo excepciones de navegador.
