# Acceso a datos de SCRAPControl

## Resumen

El backend no crea una conexión SQL Server con ODBC ni utiliza directamente la identidad Windows para autenticar la API de datos. SCRAPControl valida el correo y la contraseña mediante `ad_mailVal`; las credenciales se reenvían desde Express por HTTPS y no se almacenan localmente. Por separado, Node realiza peticiones HTTPS a la API de datos:

```text
POST {DB_API_BASE_URL}/api/Utility/executeSQLCommand
Body: { server, db, command }
```

Configuración actual: servidor solicitado `EST02DB`, base `SOE`, API `https://est02des.magna.global/est_api`. La API responde ejecutando la instrucción SQL. El mecanismo de autenticación y la identidad SQL interna del servicio no se describen en Swagger ni se pueden inferir de este backend; deben confirmarse con el equipo propietario. Las pruebas históricas de este documento usaron `EST04DB`; no demuestran por sí mismas la conectividad ni la paridad de esquema de `EST02DB`.

El endpoint remoto acepta SQL genérico. SCRAPControl genera SQL en el backend y no permite que el navegador envíe comandos. Las lecturas se limitan localmente a una instrucción que inicia con `SELECT`; la API recibe solicitudes de precio, agregaciones y movimientos solo después de autenticar la sesión. La edición de razón es exclusiva de Administrador; Gerente y Administrador pueden dictaminar. Esta protección no limita por sí sola los permisos de la API remota.

## Recorrido de extremo a extremo

```text
Frontend React
  └─ GET/PATCH /api/... (JSON)
       └─ Express local
            └─ Controller: valida parámetros
                 └─ MovimientosRepository: compone consulta
                      └─ database.connection.ts
                           └─ HTTPS POST API corporativa
                                └─ SQL Server EST02DB / SOE
```

El navegador nunca recibe `DB_API_BASE_URL`, `DB_SERVER`, `DB_DATABASE` ni el texto SQL corporativo. El backend también valida el login con `https://estms01ia.magna.global/node-red/ad_mailVal`. Durante desarrollo, Vite reenvía `/api` a Express en `127.0.0.1:4009`; en producción el proxy debe proporcionar el mismo encaminamiento y HTTPS.

## Configuración

El cliente encuentra el directorio `BaseDeDatos` relativo a la ubicación del módulo, no al directorio actual de PowerShell. Copiar `.env.example` como `BaseDeDatos/.env` y editar:

| Variable | Valor predeterminado | Descripción |
|---|---|---|
| `DB_API_BASE_URL` | `https://est02des.magna.global/est_api` | URL raíz HTTPS, se eliminan barras finales. |
| `DB_SERVER` | `EST02DB` | Servidor solicitado a la API. |
| `DB_DATABASE` | `SOE` | Base solicitada. |
| `DB_API_TIMEOUT` | `20000` | Timeout de fetch, milisegundos. |
| `AUTH_ADMIN_EMAIL` | Se configura en `.env` local | Correo devuelto por la API de autenticación que recibe rol Administrador; el resto de cuentas válidas recibe rol Gerente. |
| `AUTH_SESSION_SECRET` | Sin valor predeterminado | Secreto aleatorio de al menos 32 bytes para cookies firmadas. |

No añadir usuario o contraseña SQL a ese archivo. Las contraseñas de SCRAPControl no se guardan en él: se envían a `ad_mailVal` por HTTPS para validación. `AUTH_SESSION_SECRET` y `AUTH_ADMIN_EMAIL` son configuración local; el primero es secreto y el archivo debe mantenerse fuera del control de versiones. `backend/.env` configura por separado `PORT` (4009 por defecto). `VITE_API_BASE_URL` controla la URL local del cliente frontend, no la URL de la API SQL. Ver [autenticación corporativa](../Autenticacion-API.md).

## Arranque del backend

1. `backend/src/server.ts` carga `backend/.env`, configura middleware y las rutas Express.
2. El listener empieza a escuchar en el puerto `PORT`.
3. Después se ejecuta `connectToDatabase()`, que llama a la API con `SELECT DB_NAME() AS baseActual, @@SERVERNAME AS servidorActual`.
4. Se comprueba que la base devuelta coincide exactamente con `SOE` y que el valor configurado (`EST02DB`) coincide con el prefijo del servidor SQL o con su nombre de instancia.
5. Un error se registra y deja la bandera de conexión en falso; el servidor HTTP sigue levantado.

`GET /api/health` devuelve el indicador más reciente guardado por el cliente de conexión. No ejecuta SQL al consultarlo. El payload incluye nombres de tablas configurados como metadatos estáticos; puede contener referencias heredadas (por ejemplo, `dbo.EtiquetasCI`) que no reflejan el esquema activo. Las consultas efectivas de razón usan `dbo.vw_Scrap_PowerBI`.

Los comandos `dev`, `start` y `test:db` de backend usan `node --use-system-ca`. Node verifica HTTPS con autoridades del sistema; no se deshabilita la validación TLS. Cada operación llama a `fetch` con timeout y no deja una sesión SQL local persistente.

## Prueba de conexión

Desde la raíz:

```powershell
npm test
npm run test:db
```

`npm test` ejecuta una prueba unitaria aislada que valida IDs de detalle y no realiza llamadas a SQL.

El comando ejecuta `backend/src/config/database.connection.ts` directamente, sin levantar Express. Su consulta es:

```sql
SELECT DB_NAME() AS baseActual, @@SERVERNAME AS servidorActual
```

La prueba no lee `dbo.Movimientos`, no consulta datos personales y no escribe. Salida de éxito significa que la API respondió, ejecutó la consulta y que base/servidor coincidieron con la configuración en ese momento. No verifica permisos de negocio, identidad SQL efectiva, otras rutas o conectividad de otra máquina.

## Estado de la migración a EST02DB

La comprobación de conexión de solo lectura respondió correctamente para `SOE`; SQL informó `ESTMS02DB\EST02DB`, cuyo nombre de instancia coincide con el servidor solicitado `EST02DB`. Las consultas directas de conteo también leyeron `dbo.Movimientos` (92,547 filas; fecha máxima observada `2026-11-05 09:06:19.593`) y `dbo.Certificacion` (76,132 filas). Aprobaciones, razones y comparación mensual respondieron correctamente en pruebas HTTP locales, sin imprimir datos personales.

El objeto local `[RapEnsambleEMM].[dbo].[Linea]` no está en ese servidor; la inspección encontró que el procedimiento existente `dbo.GetList_Lineas` usa el catálogo enlazado `[172.19.216.32].[RapEnsambleEMM].[dbo].[PRENSAS_Cat_NombresLinea]`. Se comprobó que sus 171 IDs no tienen duplicados y que las 5,364 filas del periodo predeterminado de movimientos tienen una línea con nombre. Movimientos, detalle y fallas por línea ya respondieron correctamente al adaptar el `JOIN` a ese catálogo. Esta equivalencia se apoya en el procedimiento de línea existente en `SOE`; su disponibilidad depende del linked server.

El backend actual no envía usuario/contraseña ni un encabezado `Authorization` a la API corporativa. Las credenciales compartidas no se incorporaron ni utilizaron; para la ruta existente, la API ejecuta con la identidad y permisos que administre su propietario. No guardar esas credenciales en `.env`, código o documentación sin un mecanismo de autenticación formalmente aprobado.

## Contrato de la llamada HTTP

El cliente hace `POST` con `Content-Type: application/json` al recurso corporativo y el cuerpo:

```json
{
  "server": "EST02DB",
  "db": "SOE",
  "command": "SELECT ..."
}
```

El contrato esperado incluye `success`, opcionalmente `message`, y para lecturas `rows`; para escrituras se usa `affectedRows`. El backend trata un HTTP no exitoso, JSON inválido, `success !== true`, error de red o timeout como error y lo propaga. No hay fallback silencioso a datos de ejemplo para estas llamadas.

El código no agrega encabezado `Authorization` ni credenciales SQL al payload. Esto no demuestra que la API no tenga controles adicionales ni identifica la cuenta usada entre API y SQL; consultar esa información con los responsables.

## Lecturas actualmente usadas

### Aprobaciones por responsable

`GET /api/movimientos/aprobaciones` consulta directamente `dbo.Movimientos` y cuenta filas con `aprobado = 1`, agrupándolas por `nvAprobadoPor`. Acepta `fechaInicio` y `fechaFin` opcionales: deben enviarse ambas o ninguna. Con ambas, filtra `dtAprobado >= fechaInicio AND dtAprobado < fechaFin`; sin ellas, incluye todas las filas aprobadas sin restricción de fecha. No filtra por tipo de movimiento. Devuelve cada grupo, incluyendo nombres nulos/vacíos bajo «Sin responsable registrado», y el total de filas.

La gráfica del Dashboard selecciona «Todas las aprobaciones» o «Mes seleccionado». El segundo modo usa el periodo actualmente aplicado en esa página, con fecha final inclusiva en UI convertida a límite exclusivo para SQL. Esta consulta refleja el estado actual por fila; no reconstruye eventos ni aprobaciones históricas.

### Movimientos

`GET /api/movimientos` consulta `dbo.Movimientos`, une `dbo.Certificacion` para obtener la línea y busca la descripción de razón en `dbo.vw_Scrap_PowerBI`.

Sin fechas, obtiene `MAX(fecha_hora)` y usa como inicio la fecha resultante menos un mes; el final es el día posterior a la fecha máxima, exclusivo. El intervalo no equivale necesariamente al mes calendario anterior. Con rango explícito, el controller recibe `fechaInicio` inclusiva y `fechaFin` exclusiva. Los filtros opcionales `tipoId`, `aprobado`, `razonId`, `certificacionId`, `lineaId`, `almacen` y `busqueda` se aplican después de recibir las filas SQL, en el proceso Node. `aprobado=null` y `razonId=null` permiten localizar movimientos sin dictamen o sin razón.

No se ha implementado paginación de servidor. Evitar consultar rangos excesivamente amplios hasta que el endpoint/repositorio incorporen límites adecuados.

### Razones

`GET /api/movimientos/razones?movimientoTipoId=N` lee descripciones no vacías desde `dbo.vw_Scrap_PowerBI`, por tipo de movimiento. `dbo.EtiquetasCI` no existe en la base que se verificó anteriormente y no se usa.

### Fallas por línea

`GET /api/movimientos/fallas-por-linea` calcula periodo a partir de `MAX(fecha_hora)`, filtra `MovimientoTipoId = 1`, une `dbo.Movimientos.CertificacionId` con `dbo.Certificacion.id`, agrupa por `LineaId`, cuenta registros y suma `cantidad`. Responde periodo y agregados; no acepta el filtro personalizado del Dashboard.

### Comparación mensual

`GET /api/movimientos/comparativa-mensual?mes=YYYY-MM` recibe un mes calendario, valida el formato y calcula sus límites y los del mes anterior en el backend. Una sola consulta SQL devuelve agregados por día, certificación, razón y línea. Tendencia, razón y línea filtran `MovimientoTipoId = 1`; certificación incluye todos los tipos. La ruta no recibe SQL ni descarga filas individuales al navegador.

### Valorización de Scrap

`GET /api/movimientos/precios?periodo=mes|dos-meses|seis-meses|anio|historico&pagina=N&limite=10|25|50&incluirResumen=true|false` obtiene movimientos `MovimientoTipoId = 1` desde `dbo.Movimientos` y relaciona `MATNR` con `InventarioDB.dbo.MRP_Result_by_week_test`. Para cada material selecciona una sola fila cuyo `VAL_UNIT` y `WEEK_A` sean convertibles a número, ordenada por semana numérica descendente. No requiere que la semana del precio coincida con la fecha del movimiento. El resumen calcula movimientos, piezas con/sin precio, total `cantidad × VAL_UNIT` y promedio ponderado; el detalle usa `OFFSET/FETCH`. Las consultas de resumen y detalle se ejecutan en paralelo cuando el resumen se solicita; al paginar, la interfaz puede solicitar solo el detalle y reutiliza el resumen del periodo. No hay escrituras en ninguna de las dos bases.

Esta valorización depende de que exista un precio numérico para el MATNR. No es costo contable ni cotización oficial. Si InventarioDB no tiene fila utilizable, el material queda “Sin precio” y no se suma al total. El formato de pantalla no cambia los datos: tarjetas sin decimales y precios del detalle con hasta tres.

## Verificaciones ejecutadas

El 28 de octubre de 2026, `npm run test:db` confirmó mediante consulta de solo lectura la conexión a `SOE` y al servidor configurado `est04db`. En la API local se validaron lecturas de movimientos (2,894 filas en la ventana predeterminada), Scrap por línea (4 grupos), razones tipo 1 (57 opciones), comparación abril/mayo de 2026 (805 filas agregadas), comparación octubre sin filas y detalle de un movimiento cargado. Un rango válido sin datos devolvió una lista vacía, no un error.

Se probaron entradas inválidas de fechas, mes, ID, decisión y razón; respondieron HTTP 400. No se enviaron valores válidos a las rutas `PATCH`: dictamen y edición de razón son escrituras reales, y no se dispuso de una base aislada para probarlas sin alterar datos corporativos. Las verificaciones confirman el estado observado, no garantizan disponibilidad futura ni permisos de escritura.

El 2 de noviembre de 2026 se añadieron pruebas unitarias aisladas para el endpoint de aprobaciones con y sin rango, incluyendo validación de fechas. Pasaron 7 pruebas, la compilación backend/frontend y lint (con 3 advertencias conocidas). Estas verificaciones no llamaron a la API corporativa para verificar conteos; no se compararon resultados reales con SOE.

## Escrituras actualmente usadas

### Dictamen

`PATCH /api/movimientos/:id/dictamen` recibe `{ "aprobado": 1 | 4 }`. Backend exige una sesión autenticada, ID positivo entero seguro y decisión 1 o 4. Actualiza únicamente `dbo.Movimientos` con `id` correspondiente y `aprobado = 0`, asignando `aprobado`, `nvAprobadoPor` desde la identidad de sesión y `dtAprobado = GETDATE()`. El código 2 representa procesado por otro software y SCRAPControl no lo escribe. Luego relee el registro para validar y formar la respuesta. Un registro ausente da 404; un registro que ya no es pendiente o no se actualizó da 409.

El valor `aprobado = NULL` no pasa el predicado de pendiente. El backend ignora cualquier nombre que el navegador intente enviar y registra la identidad derivada de la sesión autenticada.

### Razón

`PATCH /api/movimientos/:id/razon` recibe `{ "razonId": entero positivo | null }`. El repositorio primero obtiene el movimiento; si el valor no es `null`, vuelve a consultar opciones válidas para el tipo del registro y rechaza una razón no presente. Después actualiza solo `dbo.Movimientos.RazonId`, relee el registro y confirma la persistencia. `null` significa «Sin razón».

La edición de razones requiere rol Administrador. El servidor obtiene la identidad de la sesión y nunca acepta un nombre enviado por el navegador.

## Diagnóstico de fallos

1. Revisar que exista `BaseDeDatos/.env`, que los nombres de variables estén escritos exactamente y que la URL no incluya la ruta final de la operación.
2. Confirmar que el equipo puede resolver y alcanzar la URL HTTPS; verificar proxy/VPN/red según política corporativa.
3. Confirmar que Node confía en el certificado instalado y que no se haya desactivado TLS.
4. Revisar el timeout y el mensaje de respuesta del servicio sin copiar secretos a logs.
5. Ejecutar `npm run test:db` para aislar acceso básico de la aplicación.
6. Si la prueba simple funciona pero una función no, comprobar permisos SQL, tabla/vista, nombres y tipos con los propietarios de API/base.

Que la prueba de conexión pase no confirma el permiso para leer/escribir tablas de negocio. La API puede tener políticas y permisos distintos al entorno de desarrollo.

## Seguridad y operación

- No exponer directamente `executeSQLCommand` a clientes web.
- No permitir SQL proveniente del navegador.
- `ad_mailVal` valida las credenciales; SCRAPControl no las guarda. Las sesiones son cookies HttpOnly, SameSite Strict, firmadas y con expiración de ocho horas. Usar HTTPS en producción (`NODE_ENV=production`) para que la cookie tenga atributo Secure.
- El backend debe tener conectividad HTTPS con `ad_mailVal` y confiar en su certificado TLS. Si el servicio no responde o devuelve una respuesta inválida, el login no concede acceso.
- La cuenta de servicio Node debe correr bajo permisos mínimos; Express debe permanecer en loopback y el secreto de sesión debe protegerse en el entorno de Node.
- Confirmar los permisos efectivos de la identidad corporativa y habilitar solo los estrictamente necesarios.
- Mantener datos locales de configuración y secretos fuera de Git.
- Las operaciones de dictamen/razón no tienen rollback automático ni transacción agrupada.
