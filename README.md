# SCRAPControl

**Una vista práctica para consultar y dar seguimiento a movimientos de Scrap.**

SCRAPControl es una aplicación web interna que reúne información de movimientos registrados en la base corporativa **SOE**. Ayuda a los equipos a revisar qué ocurrió, cuándo, en qué certificación o línea, y qué razón está asociada con cada movimiento. También permite registrar un dictamen. Aunque existe una ruta de actualización de razón, permanece bloqueada por el backend en la configuración demo actual.

> **En pocas palabras:** consulta información operativa, la organiza en listas y gráficas, y facilita revisar movimientos pendientes. No reemplaza los sistemas corporativos ni decide por sí misma qué debe aprobarse.

## ¿Para qué sirve?

- **Entender la situación del Scrap:** consultar cantidades y movimientos del periodo disponible, y observar su distribución por fecha, certificación, línea y razón.
- **Encontrar registros:** buscar y filtrar movimientos para revisar sus datos y seguimiento.
- **Dar seguimiento a pendientes:** revisar movimientos pendientes y registrar si se aprueban o rechazan, individualmente o en grupo.
- **Mantener la razón asociada:** consultar las razones disponibles; la modificación de una razón no está habilitada en la configuración demo actual.
- **Preparar información para revisión:** consultar reportes en pantalla y exportar movimientos a un archivo CSV que puede abrirse en Excel.

La herramienta apoya la revisión y el seguimiento; **la interpretación de los resultados y las decisiones de negocio corresponden a las personas responsables**.

## ¿Cómo funciona?

```text
Información registrada en SOE
            ↓
SCRAPControl consulta y organiza los movimientos
            ↓
El equipo revisa listas, fichas, indicadores y reportes
            ↓
Cuando corresponde, registra un dictamen autorizado
```

La aplicación obtiene información mediante un servicio corporativo. Algunas pantallas consultan datos directamente para generar sus resúmenes; otras filtran o agrupan los registros que ya se cargaron. Los cambios de dictamen y de razón se guardan en la base corporativa, no solo en la pantalla.

La interfaz usa fuentes disponibles en el equipo y no descarga tipografías de terceros al abrirse; la conexión que la aplicación necesita con SOE sigue siendo un destino de red independiente.

## ¿Qué encontrará en la aplicación?

| Sección | ¿Qué permite hacer? |
|---|---|
| **Panel principal** | Dashboard para Administradores demo: revisar tendencias y gráficas del periodo seleccionado. |
| **Movimientos** | Buscar por filtros guiados compartidos, consultar fecha de aprobación, abrir la ficha y exportar resultados a CSV. |
| **Ficha del movimiento** | Consultar los datos disponibles del registro. La ruta de cambio de razón está bloqueada en la configuración demo actual. |
| **Aprobaciones** | Consultar piezas Scrap, pendientes, aprobados y rechazados; las tarjetas filtran el listado. Permite emitir dictámenes de pendientes. |
| **Filtros paso a paso** | Para Administradores demo: elegir un mes y criterios; los resultados se consultan al pulsar Buscar. |
| **Fallas por línea** | Consultar un resumen de cantidad y número de movimientos de Scrap por línea para un periodo reciente calculado por el sistema. |
| **Comparación mensual** | Para Administradores demo: comparar el mes elegido con el anterior. |
| **Reportes** | Filtrar los movimientos cargados; si se eligen ambas fechas, consultar el intervalo completo al servidor y exportar el resultado. |
| **Motivos y configuración** | Páginas informativas/locales que ya no aparecen como pestañas en el menú lateral. |

En el Dashboard, la gráfica **Aprobaciones por responsable** permite elegir entre todas las filas aprobadas de la tabla y las aprobaciones del periodo seleccionado. El conteo usa `aprobado = 1`, agrupa por `nvAprobadoPor` y, al elegir el periodo, delimita por la fecha de aprobación `dtAprobado`. No filtra por tipo de movimiento.

Gerente y Superintendente solo ven Movimientos y Aprobaciones. Dashboard, Comparación mensual y Filtros paso a paso quedan para Administradores demo. En Movimientos, la columna **Supervisor** muestra el valor de `dbo.Movimientos.Empleado`. Estas restricciones son solo de navegación en la interfaz; no representan autorización real.

## ¿Qué significa cada estado del dictamen?

- **Pendiente:** aún no se ha registrado un dictamen (`0`).
- **Aprobado:** se registró aprobación (`1`).
- **Procesado:** movimiento procesado por el software correspondiente (`2`).
- **Rechazado:** se registró rechazo (`4`).
- **Sin dictamen:** el registro no tiene un valor asignado.

La aplicación permite registrar aprobación o rechazo en movimientos pendientes. En una operación por grupo, cada movimiento se procesa por separado: algunos pueden guardarse y otros fallar. La pantalla informa los que no se completaron para que puedan revisarse.

Al rechazar movimientos Scrap, la aplicación solicita un comentario y lo muestra en la tabla de Movimientos durante la sesión actual. El comentario no se envía al backend ni se guarda en SQL o almacenamiento local; desaparece al recargar la aplicación.

## Alcance y límites importantes

| La aplicación sí… | La aplicación no… |
|---|---|
| Consulta movimientos y algunos datos relacionados desde SOE. | Crea movimientos nuevos ni sustituye el sistema donde se originan los registros. |
| Presenta resúmenes, gráficas, filtros y exportaciones. | Garantiza que los datos disponibles incluyan todos los periodos o campos que un área necesita. |
| Guarda dictámenes en datos corporativos. | Permite cambiar razones en el modo demo actual; determina si un movimiento debe aprobarse o verifica el rol de quien captura. |
| Permite revisar motivos en sus pantallas. | Sincroniza el catálogo local de «Motivos» con el catálogo corporativo usado para corregir razones. |
| Muestra una comparación de periodos para facilitar el análisis. | Define por sí misma metas, límites aceptables, costos oficiales, OEE o causas raíz. |

**Antes de registrar un dictamen:** verifique que el movimiento sea el correcto y que el cambio esté autorizado según el proceso de su área. El dictamen es persistente; la aplicación no ofrece una función para deshacerlo. El nombre del responsable que se captura es un dato de registro, no una comprobación de identidad.

### Información que no debe interpretarse como dato oficial

En esta versión no están conectados como operaciones corporativas los costos oficiales, OEE, historial completo, integración con SAP, creación de movimientos ni varios datos de personal o materiales. Algunos catálogos, notificaciones y ajustes son de demostración o se guardan localmente. **No utilice esos elementos como fuente oficial para decisiones financieras, de desempeño individual o de recursos humanos.**

La exportación CSV omite credenciales y datos identificables de empleados/aprobadores, y protege valores que podrían interpretarse como fórmulas en una hoja de cálculo. Aun así, comparta los archivos solo con personas autorizadas y siguiendo las políticas de información de la organización.

## ¿Quién puede usar esta información?

- **Gerentes y directivos:** revisar tendencias y distribuciones disponibles como apoyo para conversar sobre el proceso y solicitar análisis adicionales.
- **Equipos operativos y personas revisoras:** localizar movimientos, consultar su ficha y dar seguimiento a pendientes conforme a las reglas internas.
- **RH:** la aplicación no es un sistema de recursos humanos; no evalúa personas ni administra información laboral. Si una exportación contiene credenciales u otros datos identificables, debe manejarse con acceso restringido.

Las gráficas describen los registros que la aplicación consultó. Una variación o concentración es una señal para analizar, **no una explicación de causa ni una conclusión automática sobre el desempeño de un área o una persona**.

## Acceso y soporte técnico

SCRAPControl está pensado para uso local: el backend escucha solo en `127.0.0.1`, mientras el equipo necesita acceso de red al servicio corporativo. La aplicación no inicia sesión por sí sola ni comprueba permisos de gerente; clientes locales todavía pueden invocar las rutas y las escrituras. El backend limita los orígenes web mediante `CORS_ORIGINS`, pero CORS no sustituye autenticación ni autorización. No exponga el backend en una red compartida o públicamente hasta implementar controles de identidad y permisos del lado servidor.

## Cambios recientes

El 2 de noviembre de 2026 se habilitó en el Dashboard el selector «Todas las aprobaciones» / «Mes seleccionado». La consulta agrupa por responsable, cuenta filas con `aprobado = 1` y usa `dtAprobado` solo para el modo mensual. Los archivos técnicos documentan el endpoint, las pruebas y los límites de identidad/autorización. La verificación no consultó ni escribió datos de SOE.

El 3 de noviembre de 2026 se recorrieron con Playwright las nueve pantallas administrativas en escritorio y móvil, con respuestas API simuladas y sin ejecutar escrituras. Se quitó la descarga de Google Fonts para evitar solicitudes externas y permitir el uso de fuentes del sistema sin conexión. La prueba no sustituye la validación con datos reales ni las pruebas de aceptación con RH/operación.

El 28 de octubre de 2026 se corrigieron la protección y minimización de datos en CSV, la carga de fichas de movimientos fuera del periodo inicial, la consulta del rango de Reportes, la descripción de razones en la comparativa mensual, y textos que daban a entender una identidad o integraciones inexistentes. También se restringió CORS a orígenes configurados y se corrigió el estado de conexión ante respuestas SQL no JSON. La documentación técnica registra el detalle de los cambios y las verificaciones realizadas.

La guía de instalación, configuración, endpoints, modelo de datos y comportamiento técnico está disponible en:

- [Documentación técnica del sistema](Documentacion.md)
- [Guía del frontend](frontend/README.md)
- [Guía de acceso a datos](BaseDeDatos/ConexionBaseDatos.md)
- [Diccionario de datos de movimientos](BaseDeDatos/Diccionario_Datos_Movimientos.md)
- [Memoria de arquitectura y decisiones](memoria.md)
