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
| `/dashboard` | `DashboardPage` | Usa el conjunto predeterminado de movimientos; permite otro rango con consulta API, muestra periodo, indicadores, tendencias, exportación y gráficas por empleado/aprobador. Aprobaciones ofrece «Todas» o «Mes seleccionado»; el rango personalizado se mantiene local a esa pantalla. |
| `/movimientos` | `MovimientosPage` | Tabla compacta de movimientos cargados, búsqueda, filtros locales por estado/tipo/razón, ordenamiento, paginación visual y exportación CSV. |
| `/movimientos/:id` | `MovimientoDetallePage` | Encuentra el registro dentro del contexto cargado y presenta ficha/razón. Carga opciones de razón del backend y permite persistir su selección. |
| `/aprobaciones` | `AprobacionesPage` | Pendientes cargados; filtros por certificación, línea y fecha/hora; selección múltiple y dictamen individual o por lote. |
| `/fallas-por-linea` | `FallasPorLineaPage` | Solicita el agregado SQL independiente, su periodo y datos por línea; gráfica de barras horizontales, búsqueda y tabla. |
| `/reportes` | `ReportesPage` | Filtra localmente el conjunto ya cargado, calcula resúmenes por certificación/MATNR y exporta CSV. |
| `/comparativa-mensual` | `ComparativaMensualPage` | Compara el mes calendario elegido con el anterior y señala picos propios en cuatro métricas. |
| `/motivos` | `MotivosPage` | Referencias y formularios locales; no modifica catálogos SQL. |
| `/configuracion` | `ConfiguracionPage` | Valores visuales/locales; guardar muestra confirmación, no persiste configuración corporativa. |

## Cliente y contratos HTTP

La base de rutas se configura con `VITE_API_BASE_URL`; si no existe, es `/api`. Durante desarrollo Vite enruta `/api` a `http://127.0.0.1:3001`.

| Interacción | Solicitud | Efecto |
|---|---|---|
| Carga compartida | `GET /api/movimientos` | Filas del periodo reciente calculado por el backend. |
| Búsqueda Dashboard | `GET /api/movimientos?fechaInicio=...&fechaFin=...` | Fechas de UI son inclusivas; el cliente envía fin exclusivo (día posterior). |
| Aprobaciones Dashboard | `GET /api/movimientos/aprobaciones` con `fechaInicio` y `fechaFin` opcionales | Siempre cuenta filas con `aprobado = 1` y agrupa por `nvAprobadoPor`. Sin fechas muestra todas; con ambas fechas limita por `dtAprobado` al rango inclusivo de UI (fin exclusivo enviado). No filtra por tipo de movimiento. |
| Fallas por línea | `GET /api/movimientos/fallas-por-linea` | Periodo reciente y agregado SQL por número y nombre de línea. |
| Comparación mensual | `GET /api/movimientos/comparativa-mensual?mes=YYYY-MM` | Agrega el mes seleccionado y el anterior por tendencia diaria, certificación, razón y línea; independiente del conjunto compartido. |
| Opciones de razón | `GET /api/movimientos/razones?movimientoTipoId=N` | Descripciones válidas desde `dbo.vw_Scrap_PowerBI`. |
| Guardar razón | `PATCH /api/movimientos/:id/razon` | `{ razonId: number | null }`; responde 403 en el middleware actual. |
| Aprobar/rechazar | `PATCH /api/movimientos/:id/dictamen` | `{ aprobado: 1 | 4, aprobadoPor }`; `1` aprueba y `4` rechaza; cambia datos reales. |

El cliente comprueba `response.ok`, `exitoso` y que exista la estructura de datos esperada. Si la llamada falla, propaga el error a la página/contexto; no sustituye una respuesta SQL fallida por movimientos mock.

### Adaptación de fila

`adaptarMovimiento()` mantiene la fila original bajo `datosDB`, deriva fecha/hora, etiqueta el estado y obtiene el nombre del tipo a partir del mapa `MOVIMIENTO_TIPOS_SSMS`. La API entrega `LineaNombre` y `LineaId`; si falta el nombre, la interfaz conserva una etiqueta de respaldo. La API no entrega nombre enriquecido del material, empleado, costos, historial ni unidad oficial; varios valores de presentación pueden estar vacíos, ser constantes o locales.

## Filtros y presentación

- La lista de Movimientos se obtiene inicialmente con el último periodo de un mes anclado a `MAX(fecha_hora)`; las búsquedas y filtros de UI operan sobre esas filas.
- El Dashboard consulta otro intervalo al pulsar **Buscar**. El error y rango personalizado corresponden a esa página; no reemplaza la lista compartida para las otras pantallas.
- La gráfica de aprobaciones consulta en forma independiente. «Todas las aprobaciones» no usa rango; «Mes seleccionado» se sincroniza con el periodo aplicado del Dashboard y filtra por `dtAprobado`, fecha real del dictamen.
- Reportes no solicita al backend el rango filtrado: reduce en memoria el conjunto cargado por el contexto. Por tanto no puede mostrar fechas que quedaron fuera de ese conjunto.
- Fallas por línea es una consulta de agregado separada; no cambia con el rango del Dashboard.
- Movimientos oculta la credencial como columna principal; el CSV también excluye credenciales y datos identificables del aprobador.
- El nombre de línea procede de `[RapEnsambleEMM].[dbo].[Linea].Descripcion`, relacionado mediante `Certificacion.LineaId = Linea.linea`; se muestra junto al número.
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

Los movimientos pendientes se identifican con `aprobado === 0`; `NULL` se representa como sin dictamen y no se incluye en el flujo actual.

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
- La API local no implementa autenticación ni rol gerente. Dictámenes persistentes están habilitados para cualquier cliente que alcance el backend; los demás `PATCH`, incluido cambio de razón, se bloquean con 403.
- El campo de responsable es texto suministrado por el usuario.
- CORS se limita a `CORS_ORIGINS` (orígenes locales por defecto), pero no sustituye autenticación ni autorización.
- Datos de costos, historial, empleados y funcionalidades SAP no deben usarse como registros oficiales mientras sigan siendo locales/mock.

Consulta la [documentación técnica](../Documentacion.md), el [README del proyecto](../README.md) y la [guía de conexión](../BaseDeDatos/ConexionBaseDatos.md).

## Cambio reciente: gráfica de aprobaciones (2 de noviembre de 2026)

La gráfica agrupa las filas actuales con `aprobado = 1` por responsable y ofrece dos modos: todos los registros o el periodo aplicado en el Dashboard, limitado por `dtAprobado`. Incluye filas sin nombre bajo «Sin responsable registrado» y presenta todos los responsables. La columna `aprobado` representa el estado actual por fila; no existe un histórico de eventos en esta consulta. Build, pruebas backend y lint se ejecutaron localmente; no se consultó ni escribió SOE para validar cifras.
