# SCRAPControl — frontend

Interfaz React 19 + TypeScript + Vite. El frontend consume únicamente las rutas JSON del backend bajo `/api`; la API SQL corporativa, la configuración `DB_*` y los comandos SQL permanecen en Node/Express.

## Componentes principales

- `src/App.tsx`: React Router y rutas de las páginas.
- `src/layouts/MainLayout.tsx`: estructura de navegación, sidebar y encabezado.
- `src/context/ScrapContext.tsx`: estado compartido de movimientos, carga/error, turno, notificaciones, motivos y toasts.
- `src/services/scrapService.ts`: solicitudes HTTP, validación de respuesta y adaptación de filas SQL al modelo de interfaz.
- `src/types/`: interfaces para movimientos, opciones de razón y reportes.
- `src/mock/data.ts`: motivos y notificaciones locales/de demostración.
- `src/pages/`: pantallas.

## Rutas y comportamiento

| Ruta | Página | Datos y comportamiento |
|---|---|---|
| `/dashboard` | `DashboardPage` | Solo Administrador autenticado. Permite otro rango con consulta API, muestra tendencias, exportación y gráficas por empleado/aprobador. |
| `/movimientos` | `MovimientosPage` | Tabla con supervisor reportante (valor de `dbo.Movimientos.Empleado`), fecha de emisión y fecha de aprobación; filtros guiados y búsqueda. |
| `/movimientos/:id` | `MovimientoDetallePage` | Encuentra el registro dentro del contexto cargado y presenta ficha/razón. Carga opciones de razón del backend y permite persistir su selección. |
| `/aprobaciones` | `AprobacionesPage` | Cuatro indicadores clicables para piezas Scrap, pendientes, aprobados y rechazados; cada tarjeta filtra el listado. Incluye la columna Supervisor con el valor `dbo.Movimientos.Empleado`, los mismos filtros progresivos que Movimientos, paginación de 10/25/50 filas y dictamen individual/múltiple para pendientes. |
| `/precio` | `PrecioPage` | Todos los roles autenticados. Valorización estimada de Scrap por `MATNR`, resumen por periodo y detalle paginado. |
| `/fallas-por-linea` | `FallasPorLineaPage` | Solicita el agregado SQL independiente, su periodo y datos por línea; gráfica de barras horizontales, búsqueda y tabla. |
| `/reportes` | `ReportesPage` | Filtra localmente el conjunto ya cargado, calcula resúmenes por certificación/MATNR y exporta CSV. |
| `/comparativa-mensual` | `ComparativaMensualPage` | Solo Administrador autenticado. Compara el mes calendario elegido con el anterior y señala picos propios en cuatro métricas. |
| `/filtros` | `FiltrosPage` | Solo Administrador autenticado. Inicia con el último mes disponible, permite combinar filtros y consulta al servidor solo al pulsar Buscar. |
| `/motivos` | `MotivosPage` | Referencias y formularios locales; no modifica catálogos SQL. |
| `/configuracion` | `ConfiguracionPage` | Valores visuales/locales; guardar muestra confirmación, no persiste configuración corporativa. |

## Cliente y contratos HTTP

La base de rutas se configura con `VITE_API_BASE_URL`; si no existe, es `/api`. Durante desarrollo Vite enruta `/api` a `http://127.0.0.1:3001`.

Al iniciar, la aplicación consulta `GET /api/auth/me` usando una cookie HttpOnly de sesión. El formulario envía credenciales locales a `POST /api/auth/login`; Administrador también puede usar `GET /api/auth/windows`, protegido por IIS. El navegador no guarda la contraseña ni el rol en `sessionStorage`. Vite no implementa ni simula Windows Authentication.

| Interacción | Solicitud | Efecto |
|---|---|---|
| Identidad actual | `GET /api/auth/me` | Devuelve la cuenta y rol asociados a la sesión firmada. |
| Login local | `POST /api/auth/login` | Recibe `{ usuario, contrasena }`; las credenciales se validan solo en backend y se establece cookie HttpOnly. |
| Login Windows | `GET /api/auth/windows` | Intercambia una identidad Windows de Administrador validada por IIS por una sesión de aplicación. |
| Cerrar sesión | `POST /api/auth/logout` | Invalida la cookie de sesión en el navegador. |
| Carga compartida | `GET /api/movimientos` | Filas del periodo reciente calculado por el backend. |
| Búsqueda Dashboard | `GET /api/movimientos?fechaInicio=...&fechaFin=...` | Fechas de UI son inclusivas; el cliente envía fin exclusivo (día posterior). |
| Filtros paso a paso | `GET /api/movimientos` con fechas, tipo, estado, razón, certificación, línea, almacén y texto opcionales | Valida filtros en el backend, obtiene el intervalo y aplica criterios sobre las filas consultadas; el fin enviado es exclusivo. |
| Aprobaciones Dashboard | `GET /api/movimientos/aprobaciones` con `fechaInicio` y `fechaFin` opcionales | Siempre cuenta filas con `aprobado = 1` y agrupa por `nvAprobadoPor`. Sin fechas muestra todas; con ambas fechas limita por `dtAprobado` al rango inclusivo de UI (fin exclusivo enviado). No filtra por tipo de movimiento. |
| Fallas por línea | `GET /api/movimientos/fallas-por-linea` | Periodo reciente y agregado SQL por número y nombre de línea. |
| Comparación mensual | `GET /api/movimientos/comparativa-mensual?mes=YYYY-MM` | Agrega el mes seleccionado y el anterior por tendencia diaria, certificación, razón y línea; independiente del conjunto compartido. |
| Opciones de razón | `GET /api/movimientos/razones?movimientoTipoId=N` | Descripciones válidas desde `dbo.vw_Scrap_PowerBI`. |
| Guardar razón | `PATCH /api/movimientos/:id/razon` | `{ razonId: number | null }`; disponible solo para Administrador. |
| Aprobar/rechazar | `PATCH /api/movimientos/:id/dictamen` | `{ aprobado: 1 | 4 }`; `1` aprueba y `4` rechaza; el servidor escribe la identidad de la sesión autenticada y cambia datos reales. |
| Precio de Scrap | `GET /api/movimientos/precios?periodo=...&pagina=...&limite=...&incluirResumen=...` | Consulta Scrap y `VAL_UNIT` por `MATNR`; admite `mes`, `dos-meses`, `seis-meses`, `anio`, `historico`, tamaños de 10/25/50 y resumen opcional. |

El cliente comprueba `response.ok`, `exitoso` y que exista la estructura de datos esperada. Si la llamada falla, propaga el error a la página/contexto; no sustituye una respuesta SQL fallida por movimientos mock.

### Adaptación de fila

`adaptarMovimiento()` mantiene la fila original bajo `datosDB`, deriva fecha/hora, etiqueta el estado y obtiene el nombre del tipo a partir del mapa `MOVIMIENTO_TIPOS_SSMS`. La API entrega `LineaNombre` y `LineaId`; si falta el nombre, la interfaz conserva una etiqueta de respaldo. La API devuelve el campo original `Empleado` de `dbo.Movimientos`, que la tabla presenta como Supervisor según la definición operativa solicitada. No se enriquece ese nombre desde otro catálogo; costos, historial y unidad oficial pueden estar vacíos, ser constantes o locales.

## Filtros y presentación

- La lista de Movimientos se obtiene inicialmente con el último periodo de un mes anclado a `MAX(fecha_hora)`; las búsquedas y filtros de UI operan sobre esas filas.
- Movimientos y Aprobaciones comparten el mismo panel de búsqueda. El periodo predeterminado refleja las fechas disponibles; la razón se habilita después de elegir tipo. Las fechas son controles de calendario y el panel se limita a registros cargados en el contexto.
- Filtros paso a paso propone por defecto el mes calendario de la fecha disponible más reciente. Al pulsar Buscar envía los filtros opcionales a `GET /api/movimientos`; no carga resultados nuevos mientras se cambian opciones.
- La fecha de aprobación mostrada en Movimientos proviene de `dbo.Movimientos.dtAprobado`; los pendientes muestran “Sin aprobar”.
- Las tablas de Movimientos y Aprobaciones permiten desplazamiento horizontal y envuelven el texto largo en varias líneas para mostrar completos los valores, sin truncarlos con puntos suspensivos.
- Gerente y Superintendente tienen acceso de interfaz a Movimientos, Aprobaciones y Precio. Dashboard, Fallas por línea, Reportes, Comparación mensual, Filtros paso a paso, Motivos y Configuración son de Administrador. La autorización del backend se aplica por operación; ocultar una página en el frontend no equivale por sí solo a restringir todos los datos del API.
- Aprobar o denegar una fila abre directamente un diálogo de confirmación, sin la pantalla intermedia de revisión. El responsable proviene de la sesión autenticada y no se captura manualmente; se mantiene el comentario obligatorio al rechazar Scrap.
- El Dashboard consulta otro intervalo al pulsar **Buscar**. El error y rango personalizado corresponden a esa página; no reemplaza la lista compartida para las otras pantallas.
- La gráfica de aprobaciones consulta en forma independiente. «Todas las aprobaciones» no usa rango; «Mes seleccionado» se sincroniza con el periodo aplicado del Dashboard y filtra por `dtAprobado`, fecha real del dictamen.
- Reportes no solicita al backend el rango filtrado: reduce en memoria el conjunto cargado por el contexto. Por tanto no puede mostrar fechas que quedaron fuera de ese conjunto.
- Fallas por línea es una consulta de agregado separada; no cambia con el rango del Dashboard.
- Precio incluye solo `MovimientoTipoId = 1`, relaciona por `MATNR` normalizado y toma una fila numérica de `VAL_UNIT` de la semana `WEEK_A` más reciente por material, no la semana del movimiento. El resumen por periodo incluye movimientos totales, piezas con/sin precio, valor USD y promedio ponderado; el detalle se pagina en backend. Las tarjetas muestran importes sin decimales y la tabla hasta tres, solo por formato. Sin precio disponible no se incluye el movimiento en el monto.
- Movimientos oculta la credencial como columna principal; el CSV también excluye credenciales y datos identificables del aprobador.
- El nombre de línea procede de `[172.19.216.32].[RapEnsambleEMM].[dbo].[PRENSAS_Cat_NombresLinea].Descripcion`, relacionado mediante `Certificacion.LineaId = IdPrensa`; se muestra junto al número.
- Los rangos visibles de las gráficas se calculan a partir de las fechas efectivamente representadas.
- Los colores de las series conservan su estilo habitual. Los números y valores que aparecen en los tooltips son blancos para mejorar su lectura sobre el fondo oscuro.

La Comparación mensual contrasta meses calendario completos. Para la tendencia diaria, alinea las observaciones por número de día del mes. Sus tarjetas resumen los máximos relativos de cada métrica, sin aplicar umbrales de riesgo. En la gráfica, los periodos se distinguen con sus colores de serie; los tooltips muestran los valores en blanco. Indica cuando faltan datos o cuando no existe base anterior para calcular porcentaje; ante error de API muestra la causa y permite reintentar sin presentar resultados obsoletos como actuales. En Dashboard y Aprobaciones se usan las descripciones de razón devueltas por SQL; el ID no se presenta como etiqueta de la razón.

## Verificación funcional (28 de octubre de 2026)

La compilación del frontend pasó y el lint focalizado de las páginas modificadas no reportó advertencias. El lint completo finalizó con advertencias preexistentes en `ScrapContext.tsx` y `ThemeContext.tsx`. Las rutas de pantalla se compilaron; las lecturas del backend se probaron por HTTP. La conexión a base respondió correctamente, se cargaron movimientos, detalle, razones, fallas por línea y comparación mensual, y los casos de error de fechas/mes/ID devolvieron 400. No se ejecutaron aprobaciones/rechazos ni guardado válido de razón desde la interfaz, porque modificarían datos reales; requieren ambiente de pruebas separado. El panel de configuración muestra explícitamente que sus ajustes son temporales y que confirmar no los persiste. En esa verificación del 28 de octubre todavía no había navegador ni framework E2E instalado.

### Revisión de interfaz en navegador (3 de noviembre de 2026)

Playwright recorrió nueve pantallas administrativas en escritorio y móvil de 390 px con fixtures interceptados para todas las rutas `/api`; no se conectó a SOE ni se ejecutaron escrituras. Se comprobó inicio de sesión, navegación móvil y restricción de rutas del rol Gerente. No hubo desbordamiento horizontal de página ni excepciones de aplicación. La prueba no cubrió aceptación de RH/operación, datos corporativos reales, exportación CSV, impresión ni cambios persistentes. Se retiraron las fuentes de Google Fonts para que la interfaz use tipografías del sistema y no haga solicitudes a terceros.

La repetición posterior al cambio confirmó cero solicitudes externas, errores de consola y escrituras; los endpoints corporativos que usa el backend para SOE no forman parte de ese bloqueo de recursos del navegador.

## Selección y dictamen masivo

La casilla general selecciona todas las solicitudes pendientes visibles respetando los filtros de certificación, línea y fecha/hora. Las acciones aprobar/rechazar requieren confirmación y un nombre de responsable. El frontend llama al endpoint individual en secuencia para cada ID. El conjunto no es transaccional: puede haber resultados parciales. Se notifican errores y se mantienen seleccionados los folios que fallaron; el nombre ingresado no comprueba la identidad del usuario.

Los movimientos pendientes se identifican con `aprobado === 0`; `NULL` se representa como sin dictamen y no se incluye en el flujo actual. La identidad del responsable procede de la sesión firmada del backend, no de un nombre introducido en la pantalla.

## Estado local y datos simulados

`ScrapContext` guarda motivos y notificaciones en `localStorage` usando:

- `scrap_mes_motivos_ssms_v2`
- `scrap_mes_notificaciones_ssms_v2`

El botón de reinicio borra estas claves y restaura referencias iniciales; no altera SQL. El tema, turno y toasts son estado de interfaz. El turno se calcula según la hora local del equipo. Las preferencias de configuración no se guardan en la base. Motivos locales no son la fuente del selector de ficha, que consulta `dbo.vw_Scrap_PowerBI`.

## CSV e impresión

La función `descargarCSV()` crea CSV UTF-8 con BOM y una selección explícita de columnas de movimiento. Excluye `credencial`, `EmpleadoId`, `Empleado`, `nvAprobadoPor` y `dtAprobado`. No es una exportación Excel `.xlsx`; puede abrirse en Excel como CSV. La impresión invoca `window.print()` y cambia temporalmente el título del documento a `${titulo} - SCRAPControl`. El patrón gráfico del marbete es ilustrativo, no es un código de barras escaneable.

## Desarrollo

Desde `frontend/`:

```powershell
npm run dev
npm run build
npm run lint
npm run preview
```

`npm run build` ejecuta `tsc -b` y `vite build`. `npm run lint` ejecuta Oxlint. Para correr la aplicación con el backend desde la raíz, usa `npm run dev`; para compilar ambos paquetes, `npm run build`.

## Límites de seguridad

- El navegador no debe recibir secretos ni conectarse a `executeSQLCommand`.
- En IIS, Windows Authentication se limita a `/api/auth/windows`; los demás accesos usan sesión local.
- Las contraseñas locales se guardan como hashes scrypt en `BaseDeDatos/.env`; nunca se incluyen en el frontend ni en archivos versionados.
- El nombre de responsable de un dictamen se obtiene del backend a partir de la sesión, no de un campo enviado por el navegador.
- Vite y `vite preview` no simulan autenticación. La prueba automatizada de autorización no sustituye la prueba integrada de IIS/AD/Kerberos o NTLM.
- Datos de costos, historial, empleados y funcionalidades SAP no deben usarse como registros oficiales mientras sigan siendo locales/mock.

Consulta la [documentación técnica](../Documentacion.md), el [README del proyecto](../README.md), la [guía de conexión](../BaseDeDatos/ConexionBaseDatos.md) y la [configuración de IIS](../IIS-Windows-Authentication.md).

## Cambio reciente: gráfica de aprobaciones (2 de noviembre de 2026)

La gráfica agrupa las filas actuales con `aprobado = 1` por responsable y ofrece dos modos: todos los registros o el periodo aplicado en el Dashboard, limitado por `dtAprobado`. Incluye filas sin nombre bajo «Sin responsable registrado» y presenta todos los responsables. La columna `aprobado` representa el estado actual por fila; no existe un histórico de eventos en esta consulta. Build, pruebas backend y lint se ejecutaron localmente; no se consultó ni escribió SOE para validar cifras.
