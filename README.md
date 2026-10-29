# SCRAPControl

**Una vista práctica para consultar y dar seguimiento a movimientos de Scrap.**

SCRAPControl es una aplicación web interna que reúne información de movimientos registrados en la base corporativa **SOE**. Ayuda a los equipos a revisar qué ocurrió, cuándo, en qué certificación o línea, y qué razón está asociada con cada movimiento. También permite registrar un dictamen y corregir la razón cuando corresponda.

> **En pocas palabras:** consulta información operativa, la organiza en listas y gráficas, y facilita revisar movimientos pendientes. No reemplaza los sistemas corporativos ni decide por sí misma qué debe aprobarse.

## ¿Para qué sirve?

- **Entender la situación del Scrap:** consultar cantidades y movimientos del periodo disponible, y observar su distribución por fecha, certificación, línea y razón.
- **Encontrar registros:** buscar y filtrar movimientos para revisar sus datos y seguimiento.
- **Dar seguimiento a pendientes:** revisar movimientos pendientes y registrar si se aprueban o rechazan, individualmente o en grupo.
- **Mantener la razón asociada:** consultar las razones disponibles y corregir la razón de un movimiento cuando sea necesario.
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
Cuando corresponde, registra un dictamen o corrige una razón
```

La aplicación obtiene información mediante un servicio corporativo. Algunas pantallas consultan datos directamente para generar sus resúmenes; otras filtran o agrupan los registros que ya se cargaron. Los cambios de dictamen y de razón se guardan en la base corporativa, no solo en la pantalla.

## ¿Qué encontrará en la aplicación?

| Sección | ¿Qué permite hacer? |
|---|---|
| **Panel principal** | Revisar indicadores y tendencias del periodo seleccionado. El periodo predeterminado se basa en los movimientos disponibles, no necesariamente en el día de hoy. |
| **Movimientos** | Buscar, ordenar y filtrar los movimientos cargados; abrir su ficha y exportar los resultados a CSV. |
| **Ficha del movimiento** | Consultar los datos disponibles del registro y, si hace falta, cambiar su razón por una opción válida o dejarla sin razón. |
| **Aprobaciones** | Revisar movimientos pendientes, aplicar filtros y registrar un dictamen. También permite procesar una selección de pendientes. |
| **Fallas por línea** | Consultar un resumen de cantidad y número de movimientos de Scrap por línea para un periodo reciente calculado por el sistema. |
| **Comparación mensual** | Comparar el mes elegido con el mes calendario anterior en tendencias y desgloses por certificación, razón y línea. |
| **Reportes** | Filtrar los movimientos cargados; si se eligen ambas fechas, consultar el intervalo completo al servidor y exportar el resultado. |
| **Motivos y configuración** | Consultar referencias y opciones visuales de la aplicación. Estos datos y ajustes son locales; no actualizan catálogos corporativos. |

## ¿Qué significa cada estado del dictamen?

- **Pendiente:** aún no se ha registrado un dictamen (`0`).
- **Aprobado:** se registró aprobación (`1`).
- **Rechazado:** se registró rechazo (`2`).
- **Sin dictamen:** el registro no tiene un valor asignado.

La aplicación permite registrar aprobación o rechazo en movimientos pendientes. En una operación por grupo, cada movimiento se procesa por separado: algunos pueden guardarse y otros fallar. La pantalla informa los que no se completaron para que puedan revisarse.

## Alcance y límites importantes

| La aplicación sí… | La aplicación no… |
|---|---|
| Consulta movimientos y algunos datos relacionados desde SOE. | Crea movimientos nuevos ni sustituye el sistema donde se originan los registros. |
| Presenta resúmenes, gráficas, filtros y exportaciones. | Garantiza que los datos disponibles incluyan todos los periodos o campos que un área necesita. |
| Guarda cambios de dictamen y de razón en datos corporativos. | Determina si un movimiento debe aprobarse ni valida que quien captura tenga un rol autorizado. |
| Permite revisar motivos en sus pantallas. | Sincroniza el catálogo local de «Motivos» con el catálogo corporativo usado para corregir razones. |
| Muestra una comparación de periodos para facilitar el análisis. | Define por sí misma metas, límites aceptables, costos oficiales, OEE o causas raíz. |

**Antes de registrar un dictamen o cambiar una razón:** verifique que el movimiento sea el correcto y que el cambio esté autorizado según el proceso de su área. Estos cambios son persistentes; la aplicación no ofrece una función para deshacerlos. El nombre del responsable que se captura es un dato de registro, no una comprobación de identidad.

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

El 28 de octubre de 2026 se corrigieron la protección y minimización de datos en CSV, la carga de fichas de movimientos fuera del periodo inicial, la consulta del rango de Reportes, la descripción de razones en la comparativa mensual, y textos que daban a entender una identidad o integraciones inexistentes. También se restringió CORS a orígenes configurados y se corrigió el estado de conexión ante respuestas SQL no JSON. La documentación técnica registra el detalle de los cambios y las verificaciones realizadas.

La guía de instalación, configuración, endpoints, modelo de datos y comportamiento técnico está disponible en:

- [Documentación técnica del sistema](Documentacion.md)
- [Guía del frontend](frontend/README.md)
- [Guía de acceso a datos](BaseDeDatos/ConexionBaseDatos.md)
- [Diccionario de datos de movimientos](BaseDeDatos/Diccionario_Datos_Movimientos.md)
- [Memoria de arquitectura y decisiones](memoria.md)
