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
| No conectado | Alta de movimientos, SAP, autenticación/roles, costos oficiales, OEE y transacciones masivas. |

Las escrituras cambian datos reales. Actualmente el backend no comprueba identidad ni rol gerente; el texto del responsable no es autenticación. No exponer el servicio fuera de una red controlada hasta integrar controles de acceso.

## 2. Arquitectura

```text
React (frontend)
  └─ ScrapService: GET/PATCH JSON a /api
       └─ Vite proxy (desarrollo) o proxy del host (despliegue)
            └─ Express: controllers → MovimientosRepository
                 └─ database.connection.ts: HTTPS POST
                      └─ API corporativa /api/Utility/executeSQLCommand
                           └─ SQL Server est04db / SOE
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
| `DB_SERVER` | Nombre solicitado al servicio SQL (por defecto `est04db`). |
| `DB_DATABASE` | Base solicitada (por defecto `SOE`). |
| `DB_API_TIMEOUT` | Timeout de `fetch` en milisegundos (por defecto `20000`). |

`backend/.env` controla `PORT` (por defecto `3001`) y `CORS_ORIGINS`, una lista separada por comas de orígenes permitidos (por defecto `http://localhost:5173,http://127.0.0.1:5173`). Express escucha exclusivamente en `127.0.0.1`, por lo que este backend solo acepta conexiones desde el mismo equipo. CORS no sustituye autenticación ni bloquea clientes locales. `VITE_API_BASE_URL` permite definir la base de las rutas Express en el frontend; sin ella se usa `/api`. No almacenar credenciales en documentación o archivos versionados.

## 4. Arranque y estado de salud

El servidor carga `backend/.env`, instala CORS limitado a `CORS_ORIGINS`, parser JSON y logging de método/URL; registra `/api/health` y `/api/movimientos`; y escucha en `127.0.0.1:PORT`, sin exponer el listener a la red local. Después invoca `connectToDatabase()`, que llama a la API corporativa mediante:

```sql
SELECT DB_NAME() AS baseActual, @@SERVERNAME AS servidorActual
```

La prueba comprueba que la base sea `SOE` y que el nombre del servidor empiece por `est04db` (la instancia observada fue `EST04DB\\QASEMM`). Si falla, se registra el error, pero Express no cierra el listener. `GET /api/health` muestra el estado de conexión más reciente y su timestamp de respuesta HTTP; no ejecuta una prueba nueva en cada llamada.

El payload de salud incluye campos de tablas relacionados que se construyen como metadatos estáticos. Parte de esa lista es heredada y puede mencionar `dbo.EtiquetasCI`, que no existe en la base consultada. Para el catálogo editable, la implementación usa `dbo.vw_Scrap_PowerBI`; no tratar el listado de salud como inspección real del esquema.

Los scripts Node (`dev`, `start`, `test:db`) usan `--use-system-ca`. HTTPS conserva la verificación de certificados; no equivale a confiar en cualquier certificado. Cada consulta realiza una petición HTTP nueva, no se mantiene una sesión SQL local persistente.

## 5. Contrato con la API corporativa

El cliente envía `POST ${DB_API_BASE_URL}/api/Utility/executeSQLCommand`:

```json
{
  "server": "est04db",
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

`GET /api/movimientos` admite `tipoId`, `aprobado`, `razonId` y `busqueda`, además de fechas. El SQL obtiene la fila de movimiento y la consulta de fecha; después `aplicarFiltros()` filtra tipo, dictamen, razón y texto en el proceso Node. La búsqueda considera ID, serial, MATNR, MATNR_FG, credencial, nombre local del tipo, RazonId y almacén. No hay `LIMIT`, paginación ni filtros SQL para esos cuatro criterios en el contrato actual.

La lista ordena por ID descendente. El backend enriquece `MovimientoTipoNombre` mediante un mapa local, no consulta `dbo.MovimientoTipo`. El DTO añade `LineaId`, `LineaNombre` y `DescripcionRazon`; son valores derivados, no columnas físicas de `dbo.Movimientos`. `LineaNombre` se obtiene de `[RapEnsambleEMM].[dbo].[Linea]`, relacionando `Certificacion.LineaId` con `Linea.linea` y mostrando `Linea.Descripcion`; la consulta requiere acceso a esa base y tabla. La columna rotulada `Procesado` muestra el valor de `dbo.Movimientos.aprobado`, con los códigos `1` aprobado, `2` procesado y `4` rechazado; no muestra el campo SQL `procesado`, que SCRAPControl no modifica.

### Reporte de Scrap por línea

`GET /api/movimientos/fallas-por-linea` calcula `MAX(fecha_hora)`, determina fecha inicial un mes antes y fecha final según ese máximo; después agrega Scrap (`MovimientoTipoId = 1`) en el rango. Une:

```text
Movimientos.CertificacionId → Certificacion.id → Certificacion.LineaId
Certificacion.LineaId → [RapEnsambleEMM].[dbo].[Linea].linea → Linea.Descripcion
```

La salida contiene `periodo` (`fechaInicio`, `fechaFin`) y `datos` (`lineaId`, `lineaNombre`, `movimientos`, `piezasScrap`). `COUNT_BIG(*)` calcula movimientos y `SUM(cantidad)` piezas. La unión a certificación y al catálogo de líneas es `LEFT JOIN`, por lo que valores sin correspondencia pueden aparecer con nombre vacío o `lineaId = null`. Esta consulta no usa el periodo del Dashboard ni un filtro de usuario. La interfaz incluye el periodo y usa barras horizontales con el nombre de línea.

### Comparación mensual

`GET /api/movimientos/comparativa-mensual?mes=YYYY-MM` valida el mes calendario y devuelve agregados del mes indicado y del mes anterior en una sola respuesta. Incluye cuatro métricas: piezas Scrap por día, piezas por certificación, piezas Scrap por razón y piezas Scrap por línea. Los días se alinean por número del día dentro del mes, aunque no coincidan en día de semana y los meses tengan distinta longitud.

La pantalla propone el mes de la fecha más reciente cargada; si no hay movimientos, propone el mes actual. Las tarjetas resumen los picos del mes seleccionado; se trata del máximo relativo a esa métrica, no de un límite industrial ni una regla global. Las barras mantienen colores diferenciados por periodo y los valores del tooltip se muestran en blanco. Se muestran totales y variación respecto del periodo anterior. Si el mes anterior no tiene valor base, se informa que el porcentaje no puede calcularse; si no hay registros, no se inventan picos. Errores de API muestran reintento y no se presentan resultados viejos como si fueran de la nueva selección.

La comparación es independiente de los rangos de Dashboard, Reportes y Fallas por línea. Certificación incluye todos los tipos de movimiento, como su gráfica en Dashboard; tendencia, razón y línea consideran solo `MovimientoTipoId = 1`.

## 7. Endpoints Express

| Método | Ruta | Validación/resultado |
|---|---|---|
| `GET` | `/api/health` | `status`, fecha, tipo de DB, estado más reciente, modo y nombres de tabla como metadatos estáticos. |
| `GET` | `/api/movimientos` | `{ exitoso, datos, conteo }`; rango opcional y filtros `tipoId`, `aprobado`, `razonId`, `busqueda`. |
| `GET` | `/api/movimientos/aprobaciones` | `{ exitoso, datos: [{ nombre, aprobaciones }], total }`; siempre `aprobado = 1`, agrupado por `nvAprobadoPor`; fechas opcionales para limitar por `dtAprobado`. |
| `GET` | `/api/movimientos/comparativa-mensual?mes=YYYY-MM` | `{ exitoso, periodos, datos }`; agregado del mes seleccionado y el anterior. |
| `GET` | `/api/movimientos/fallas-por-linea` | `{ exitoso, periodo, datos }`; periodo reciente calculado en el servidor. |
| `GET` | `/api/movimientos/razones?movimientoTipoId=N` | `{ exitoso, datos: [{ id, descripcion }] }`; requiere tipo entero positivo. |
| `GET` | `/api/movimientos/:id` | `{ exitoso, datos }`; entero y respuesta 404 si no existe. |
| `PATCH` | `/api/movimientos/:id/razon` | JSON `{ razonId: entero positivo | null }`; la ruta valida la razón pero el middleware actual responde 403. |
| `PATCH` | `/api/movimientos/:id/dictamen` | JSON `{ aprobado: 1 | 4, aprobadoPor: string }`; `1` aprueba, `4` rechaza y solo modifica pendiente `0`. |

Las rutas literales (`fallas-por-linea`, `razones`) y rutas de acción se registran antes de `/:id`. Al rechazar Scrap desde la interfaz, se exige un comentario y se muestra en Movimientos durante la sesión actual. No se envía a Express ni se persiste; se pierde al recargar la aplicación. En rechazo múltiple, el comentario se aplica a cada movimiento Scrap seleccionado.

`GET /api/movimientos/aprobaciones` acepta ambas fechas `fechaInicio` y `fechaFin` o ninguna. Con ambas, el inicio es inclusivo y el fin exclusivo para `dtAprobado`; sin fechas, incluye todas las filas aprobadas sin límite temporal. En ambos modos el único filtro de negocio es `aprobado = 1`; no se filtra por `MovimientoTipoId`. Nombres nulos/vacíos se agrupan como «Sin responsable registrado». El `total` es la suma de todos los grupos. No es un historial de dictámenes, sino un conteo del estado actual por fila.

### Respuestas de error

Los controllers responden JSON `{ exitoso: false, mensaje }`. Según la operación se esperan:

- `400`: parámetro/rango/ID/tipo/razón/dictamen inválidos.
- `404`: movimiento inexistente.
- `409`: el dictamen ya no está pendiente o el `UPDATE` no afectó la fila.
- `500`: error de API SQL, lectura, actualización o verificación.

`GET /api/movimientos/:id` exige un ID decimal positivo completo y seguro; no acepta sufijos, decimales, cero ni valores fuera del rango seguro. Los endpoints de escritura exigen también ID positivo seguro. El controller del dictamen acepta únicamente `1` (aprobado) o `4` (rechazado) y nombre recortado de 1 a 200 caracteres. El valor `2` ya no se interpreta ni se escribe como rechazo; los datos históricos no se migran. `razonId` debe ser `null` o entero positivo seguro.

## 8. Escrituras de negocio

### Dictamen individual

`PATCH /api/movimientos/:id/dictamen` repite las validaciones en controller y cliente SQL. El nombre se recorta en controller y se escapan apóstrofos antes de insertarlo como literal SQL Unicode. El `UPDATE` fijo:

```sql
UPDATE dbo.Movimientos
SET aprobado = 1 | 4,
    nvAprobadoPor = N'...',
    dtAprobado = GETDATE()
WHERE id = ... AND aprobado = 0
```

El repositorio vuelve a leer el movimiento. Si no existe, responde 404; si no se actualizó/no era pendiente, 409; al confirmar, devuelve el registro actualizado. Los `NULL` no son candidatos por la condición `aprobado = 0`. El nombre guardado no es autenticación. Para rechazo de Scrap, la interfaz pide comentario, pero el esquema actual no lo admite: se conserva solo en memoria de la sesión del navegador y no se envía al backend, no se escribe en SQL y se pierde al recargar.

### Dictamen múltiple

El frontend toma IDs seleccionados que continúan visibles, solicita nombre y confirmación, y ejecuta cada dictamen de forma secuencial mediante la misma ruta individual. Informa registros exitosos y fallidos. Los fallidos permanecen seleccionados para reintentar. No hay transacción de lote, rollback ni garantía de atomicidad.

### Actualización de razón

`GET /api/movimientos/razones?movimientoTipoId=N` agrupa razones con descripción no vacía desde `dbo.vw_Scrap_PowerBI`. La ruta de `PATCH /api/movimientos/:id/razon` implementa validación de pertenencia al catálogo y actualización de `dbo.Movimientos.RazonId`, pero en la configuración actual queda bloqueada por el middleware (HTTP 403). La tabla `dbo.EtiquetasCI` no se usa porque no existe en la base consultada.

Ambos cambios son persistentes y no tienen autenticación/autorización en el backend actual.

## 9. Modelo SQL utilizado

### `dbo.Movimientos`

El repositorio consulta `movimiento.*`, más `LineaId` y `DescripcionRazon` derivados. El conjunto físico de columnas conocido figura en [`BaseDeDatos/Diccionario_Datos_Movimientos.md`](BaseDeDatos/Diccionario_Datos_Movimientos.md). La UI conserva algunos campos originales para su ficha y aprobaciones; el CSV aplica una selección separada y explícita de columnas, descrita en la sección 10.

`aprobado`: `0` pendiente, `1` aprobado, `2` procesado, `4` rechazado, `NULL` sin dictamen. Otros valores desconocidos se muestran como otro estado; no se modifican automáticamente. `MovimientoTipoId = 1` se trata como Scrap. El nombre de tipo sale de un mapa local. Las razones descriptivas salen de `dbo.vw_Scrap_PowerBI`.

### `dbo.Certificacion`

Se usa la relación `Certificacion.id` y `Certificacion.LineaId`. El nombre se obtiene desde `[RapEnsambleEMM].[dbo].[Linea]`, donde `Linea.linea` corresponde al ID de línea y `Linea.Descripcion` es el nombre mostrado en Movimientos, Aprobaciones y Fallas por línea.

### Vista `dbo.vw_Scrap_PowerBI`

Se consultan `RAZONid`, `desc_Razon` y `MovimientoTipoId`. La vista es la fuente de las opciones por tipo y las descripciones del movimiento. Un catálogo local de motivos en frontend es independiente y no actualiza la vista.

## 10. Aplicación frontend

Rutas React bajo `MainLayout`:

| Ruta | Página | Alcance |
|---|---|---|
| `/dashboard` | `DashboardPage` | Filtro de fechas, indicadores, tendencia, SCRAP por línea desglosado por motivo, Top de razones y exportación. Incluye gráficas por empleado/aprobador; la de aprobaciones alterna entre toda la tabla y el periodo del Dashboard. |
| `/movimientos` | `MovimientosPage` | Tabla compacta, búsqueda, filtros, orden, paginación visual, CSV. |
| `/movimientos/:id` | `MovimientoDetallePage` | Ficha y edición persistente de razón. Usa el movimiento presente en el contexto; no hace una solicitud de detalle por separado. |
| `/aprobaciones` | `AprobacionesPage` | Filtros, selección, revisión, dictamen individual y múltiple. |
| `/fallas-por-linea` | `FallasPorLineaPage` | Agregado SQL, periodo, búsqueda local, barras horizontales y tabla. |
| `/reportes` | `ReportesPage` | Filtrado y agrupación de movimientos cargados; con ambas fechas seleccionadas, consulta al backend el rango inclusivo solicitado. |
| `/comparativa-mensual` | `ComparativaMensualPage` | Comparación mensual SQL para cuatro gráficas, con descripción junto al ID de razón cuando está disponible, tarjetas resumen de picos, colores diferenciados por periodo y estados explícitos de error/sin datos. |
| `/motivos` | `MotivosPage` | Catálogo local, referencia y formularios locales. |
| `/configuracion` | `ConfiguracionPage` | Parámetros de presentación; botón de guardado solo muestra confirmación. |

`ScrapContext` carga los movimientos por periodo predeterminado. Al dictaminar se recarga ese contexto; en cambio, el rango del Dashboard se guarda localmente a su pantalla hasta usar «Último mes». El Dashboard muestra conteos/cantidades por `aprobado`, pero sus KPIs no son contadores «de hoy» necesariamente: se calculan sobre el conjunto del periodo. El KPI de costos y tasas usa valores fijos/cero por falta de integración.

La gráfica de aprobaciones consulta `/api/movimientos/aprobaciones` separadamente del conjunto compartido: «Todas las aprobaciones» no envía fechas; «Mes seleccionado» envía el periodo aplicado (fin exclusivo) y filtra por `dtAprobado`. Cuenta filas con `aprobado = 1`, sin filtrar tipo, y agrupa por `nvAprobadoPor`. Las barras incluyen todos los responsables y nombres vacíos. Por tanto, en modo mensual la suma puede no coincidir con una consulta SQL que filtre por `fecha_hora`; para comparar deben usarse `dtAprobado`, el mismo rango y el mismo predicado `aprobado = 1`.

Movimientos y reportes se filtran sobre los resultados cargados. En Reportes, seleccionar ambas fechas hace una nueva consulta a backend para ese intervalo (fecha final inclusiva); si solo se selecciona una fecha o el intervalo es inválido, no se muestran resultados parciales. La exportación CSV aplica protección frente a fórmulas de hojas de cálculo y omite credenciales, identificadores/nombres de empleado y datos de aprobación; conserva los campos operativos del reporte. El botón «Registrar incidencia» está deshabilitado. La impresión llama a `window.print()` y no genera un PDF desde backend.

Motivos/notificaciones se inicializan de datos de `frontend/src/mock/data.ts` y se persisten en claves `localStorage` `scrap_mes_motivos_ssms_v2` y `scrap_mes_notificaciones_ssms_v2`. El reinicio borra solo esos datos locales, no los movimientos SQL. Tema y varios estados pertenecen a la interfaz.

## 11. Errores, límites y despliegue

- `GET /api/health` es una instantánea del último estado, no un chequeo por petición. Una respuesta `online` no asegura que la próxima consulta corporativa funcione.
- La lista de movimientos no tiene paginación de servidor. El volumen del periodo se descarga a Node y se envía al frontend; filtros de certificación/razón siguen aplicándose en memoria. En Reportes, al elegir ambas fechas se vuelve a consultar ese intervalo en el servidor (fin inclusivo); evita rangos innecesariamente amplios.
- La API corporativa es un ejecutor SQL genérico. El backend controla sus propias llamadas, pero los permisos efectivos deben restringirse en el servicio corporativo.
- Express limita CORS por origen, pero todavía no autentica usuarios ni autoriza roles. Las rutas de lectura siguen accesibles a cualquier cliente que alcance el servidor. En el modo actual, se permiten `PATCH /api/movimientos/:id/dictamen` desde cualquier cliente que alcance el backend; los `PATCH` restantes, incluido cambio de razón, responden 403. La UI no es una frontera de autorización.
- No publicar hasta integrar autenticación/autorización y auditoría del lado del servidor; configurar los orígenes CORS reales; revisar redes y TLS; asegurar permisos mínimos de la API; y limitar volumen con paginación/filtrado SQL si hace falta.
- No poner secretos en `.md`, repositorio ni logs. Mantener HTTPS y certificados confiables.

Para detalles de conexión y campos, consultar [Conexión a datos](BaseDeDatos/ConexionBaseDatos.md) y [Diccionario de datos](BaseDeDatos/Diccionario_Datos_Movimientos.md).

La interfaz usa fuentes del sistema disponibles en el equipo y no carga tipografías desde Google Fonts ni desde otros servidores externos. Esto evita solicitudes externas de recursos de presentación y permite mostrar las pantallas sin acceso a Internet; no elimina la conexión corporativa requerida por el backend para consultar SOE.

## 14. Acceso de demostración y permisos de interfaz (2 de noviembre de 2026)

La pantalla de entrada ofrece seis identidades de prueba, sin contraseña: dos Administradores, dos Gerentes y dos Superintendentes. El rol se asigna a partir de la identidad de demostración elegida y se muestra en la cabecera. La sesión se conserva en `sessionStorage`.

En la interfaz, Gerente y Superintendente tienen acceso a Dashboard, Movimientos, detalle de movimiento y Aprobaciones; el resto de rutas se reserva visualmente a Administrador. Administrador ve todas las secciones. Esto es únicamente navegación/experiencia de demostración: los roles no están autenticados y no se validan en backend.

Los controles de aprobación individual y múltiple están habilitados para todos los roles de la interfaz demo. Los dictámenes modifican datos reales de SOE y no pueden deshacerse desde SCRAPControl. El backend solo permite `PATCH /api/movimientos/:id/dictamen`; las demás escrituras, incluido el cambio de razón, siguen bloqueadas con HTTP 403. El nombre prellenado proviene del usuario demo, pero puede editarse y no acredita identidad. Ni el login, ni los roles ni el nombre se verifican en el servidor; cualquier cliente que alcance el backend puede solicitar un dictamen. Este cambio fue autorizado para habilitar aprobaciones en la demostración, pero no vuelve seguro el servicio para una red compartida. Mantenerlo local/controlado hasta implementar y probar autenticación, permisos y auditoría en el servidor.

El Dashboard muestra piezas Scrap por línea en barras apiladas por motivo. El nombre abreviado del motivo se imprime dentro de cada segmento de color; los segmentos pequeños se amplían visualmente para que el texto quepa y la referencia inferior conserva los nombres completos. Por esta expansión, la longitud de los segmentos pequeños no es proporcional a las piezas: consultar el tooltip para cantidades exactas. «TOP RAZONES SCRAP» permanece debajo a ancho completo. También muestra al Administrador demo dos gráficas: suma de `cantidad` Scrap por `Empleado` en los movimientos del periodo seleccionado y conteo de las filas de `dbo.Movimientos` con `aprobado = 1`, agrupadas por el nombre de `nvAprobadoPor`. La gráfica de aprobaciones ofrece dos modos: todas las filas aprobadas de la tabla, o el mismo periodo del Dashboard, filtrado por `dtAprobado`; no filtra por tipo de movimiento. Incluye «Sin responsable registrado» y todas las barras por nombre para que sumen el total. El nombre capturado no verifica identidad. Cuenta estado actual por fila, no historial de cambios de dictamen. La condición de visibilidad es solo frontend; el endpoint de movimientos sigue devolviendo columnas de `dbo.Movimientos` a clientes que alcancen el backend, por lo que la información no está protegida por rol. Mantener el servicio local/controlado hasta implementar autorización y minimización de datos en servidor.

Las gráficas «Piezas SCRAP por línea y motivo» y «TOP RAZONES SCRAP» se presentan una debajo de la otra a ancho completo. En la primera, cada línea tiene una barra apilada por motivo y el nombre abreviado se imprime dentro de cada segmento; el tooltip y la referencia inferior adaptativa muestran la cantidad y el nombre completo. Los segmentos pequeños tienen un mínimo visual para permitir leer el motivo, por lo que su longitud no expresa con precisión las cantidades pequeñas. «Sin razón» y razones sin descripción son categorías distintas.

## 12. Verificación funcional ejecutada

El 28 de octubre de 2026 se ejecutaron compilación backend/frontend, `npm test`, lint y pruebas HTTP contra el backend local configurado para usar la API SQL corporativa. La prueba independiente de conexión validó la base `SOE` y el prefijo de servidor `est04db`. Lecturas: `GET /api/health` respondió 200 y conectado; `/api/movimientos` respondió 200 con 2,894 filas; `/fallas-por-linea`, 200 con 4 grupos; `/razones?movimientoTipoId=1`, 200 con 57 opciones; la comparación de mayo de 2026, 200 con 805 filas agregadas; octubre respondió 200 sin agregados; y un detalle elegido de la lista respondió 200. Un intervalo válido sin filas regresó 200 y cero registros.

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
| Textos de interfaz | Se quitaron el nombre/correo/rol de aprobador ficticios, las afirmaciones no integradas sobre desvío a retrabajo y firma/SAP, y la promesa de alerta automática en Configuración. El perfil ahora declara que la sesión no está autenticada. |

**Pendiente crítico:** no se integró autenticación ni autorización. La persona responsable y el rol «Aprobador» mencionados en la interfaz no verifican identidad ni permisos. El usuario indicó que aún no dispone de un proveedor identificado; la integración queda pendiente hasta elegir uno. Limitar CORS mejora el control de acceso desde navegadores, pero no impide solicitudes de otros clientes ni protege por sí solo las rutas. Mantener el API en una red controlada y no exponerlo públicamente mientras no tenga autorización real del lado servidor.

**Pendiente de capacidad:** los movimientos siguen sin paginación del lado servidor; la consulta inicial y los intervalos amplios pueden traer muchas filas. La búsqueda y ciertos filtros siguen aplicándose en memoria.

**Resultado de validación de esta ronda:** builds backend y frontend exitosos; `npm test` pasó (1 prueba); lint frontend terminó sin errores y con las advertencias preexistentes en `ThemeContext.tsx` y `ScrapContext.tsx`; `git diff --check` pasó. No se creó commit. La carpeta local `Presentacion/` ya existía como no rastreada y no se modificó.

## 15. Revisión de interfaces con Playwright (3 de noviembre de 2026)

Se recorrieron las nueve pantallas del Administrador demo (`/dashboard`, `/movimientos`, `/movimientos/:id`, `/aprobaciones`, `/motivos`, `/fallas-por-linea`, `/reportes`, `/comparativa-mensual` y `/configuracion`) en viewport de escritorio y móvil (390 px), con fixtures locales interceptando las llamadas `/api`. También se comprobó el inicio de sesión demo, la apertura del menú móvil y que el rol Gerente redirige rutas administrativas y solo muestra Dashboard, Movimientos y Aprobaciones.

No se detectaron desbordamientos horizontales de página ni excepciones de aplicación en los recorridos. No se accionaron aprobaciones, rechazos, cambios de razón ni formularios con escritura; la API fue simulada, por lo que este recorrido no valida consultas, datos reales, persistencia, exportación/impresión ni una aceptación de usuario. Se detectó una solicitud a `fonts.googleapis.com` en cada carga y se retiraron los enlaces de Google Fonts; la tipografía usa ahora fuentes del sistema. La repetición confirmó cero solicitudes externas, errores de consola y escrituras.
