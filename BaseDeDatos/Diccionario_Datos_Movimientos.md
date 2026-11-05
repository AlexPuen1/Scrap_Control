# Diccionario de datos utilizado por SCRAPControl

## Alcance y cautela

Este documento describe los campos que consume o modifica la aplicación, no pretende ser el diccionario oficial del servidor. Los tipos y nulabilidad anotados se basan en la verificación previa documentada en el proyecto; confírmalos con el propietario del esquema antes de una migración. La última consulta de esquema no se repite al editar este documento.

La ruta de datos es backend → API corporativa `POST /api/Utility/executeSQLCommand` → SQL Server solicitado `EST02DB` / base `SOE`. El navegador no consulta SQL directamente. La lista ordinaria lee `dbo.Movimientos`, relaciona certificación, obtiene el ID y nombre de línea desde `dbo.Certificacion` y `[172.19.216.32].[RapEnsambleEMM].[dbo].[PRENSAS_Cat_NombresLinea]`, y añade la descripción de razón desde una vista. Para más detalle de conexión, consulta [`ConexionBaseDatos.md`](ConexionBaseDatos.md).

## `dbo.Movimientos`

La consulta ordinaria obtiene `movimiento.*` y añade `LineaId` y `DescripcionRazon` calculados. En la lista predeterminada, el repositorio busca el máximo `fecha_hora`; filtra desde la fecha equivalente un mes antes hasta el día posterior a esa fecha máxima, con límite final exclusivo. Un rango explícito usa `fechaInicio` inclusiva y `fechaFin` exclusiva.

| Columna física | Tipo documentado | Nulo | Uso en la aplicación |
|---|---|---:|---|
| `id` | `int` | No | Identificador/fuente de rutas y folio. |
| `CertificacionId` | `int` | No | Relación con `dbo.Certificacion.id`; se conserva en ficha, datos originales y CSV. No se muestra como columna en la lista principal. |
| `MATNR` | `varchar(50)` | No | Número de parte principal; listado, búsqueda y reportes. |
| `fecha_hora` | `datetime` | No | Fecha/hora del movimiento; determina periodos y orden temporal. |
| `credencial` | `varchar(50)` | No | Se muestra en ficha técnica; no como columna de Movimientos. Puede usarse en búsqueda, pero se excluye del CSV. |
| `MovimientoTipoId` | `int` | No | Identificador del tipo; `1` se interpreta como Scrap. El nombre se resuelve con un mapa local. |
| `cantidad` | `int` | No | Cantidad registrada; se agrega para reportes y gráficas. |
| `salida` | `bit` | No | Indicador original, visible en algunos detalles/revisión. |
| `retorno` | `bit` | No | Indicador original, visible en algunos detalles/revisión. |
| `EmpleadoId` | `varchar(50)` | Sí | Se conserva en datos originales/ficha de revisión; no se integra desde un directorio de empleados. |
| `Empleado` | `varchar(250)` | Sí | Campo original; no se enriquece desde catálogo corporativo. |
| `procesado` | `int` | Sí | Estado/campo original, sin flujo de procesamiento implementado en la app. |
| `aprobado` | `int` | Sí | `0` pendiente; `1` aprobado; `2` procesado; `4` rechazado; `NULL` sin dictamen/no integrado. |
| `RazonId` | `int` | Sí | Identificador de razón. La descripción se obtiene de `dbo.vw_Scrap_PowerBI`; la ficha puede editar este campo. |
| `centro_costo` | `varchar(50)` | Sí | Campo original. No se integra con catálogo ni cálculo de costo oficial. |
| `almacen` | `varchar(50)` | Sí | Almacén presentado en lista/ficha cuando existe. |
| `serial` | `varchar(50)` | Sí | Serial mostrado junto con ID y ficha; también se usa en búsquedas y marbete visual. |
| `MATNR_FG` | `varchar(50)` | Sí | Número de parte de producto terminado, se presenta cuando existe. |
| `nvAprobadoPor` | `nvarchar(200)` | Sí | Texto capturado en el formulario de dictamen; no es una identidad autenticada. |
| `dtAprobado` | `datetime` | Sí | Fecha/hora asignada por SQL Server con `GETDATE()` al guardar el dictamen. |

### Campos derivados (no físicos en `dbo.Movimientos`)

| Campo de respuesta | Origen | Propósito |
|---|---|---|
| `LineaId` | `dbo.Certificacion.LineaId` mediante `Certificacion.id = Movimientos.CertificacionId` | Línea numérica asociada; puede ser `NULL` si no hay certificación relacionada. |
| `DescripcionRazon` | `dbo.vw_Scrap_PowerBI.desc_Razon` asociado por `RazonId` y `MovimientoTipoId` | Descripción legible usada en tabla, ficha y selector. |
| `MovimientoTipoNombre` | Mapa local en `MovimientosRepository` | Etiqueta de presentación; no proviene de una consulta a `dbo.MovimientoTipo`. |

### Dictamen y edición

La ruta individual actualiza campos del dictamen exclusivamente cuando `id` coincide y `aprobado = 0`. Para aprobar escribe 1; para rechazar escribe 4; además asigna `nvAprobadoPor` y `dtAprobado`. No modifica registros con `aprobado IS NULL` o distinto de 0. El nombre capturado no comprueba que quien lo escribió sea gerente o el empleado indicado.

La edición de razón solo escribe `RazonId`. Las opciones no son texto libre: el backend las valida contra el tipo del movimiento en `dbo.vw_Scrap_PowerBI`. El valor `null` limpia la razón. Aunque el endpoint permanece en el código, el middleware actual responde 403 a esta operación. El dictamen sí escribe datos reales y el backend no autentica usuarios.

## `dbo.Certificacion`

Se usa para relacionar movimiento con línea. El reporte por línea filtra `MovimientoTipoId = 1`, calcula periodo basado en `MAX(Movimientos.fecha_hora)`, cuenta movimientos y suma `cantidad` agrupando por `LineaId`.

| Columna física | Tipo documentado | Nulo | Uso |
|---|---|---:|---|
| `id` | `int` | No | Clave relacionada con `Movimientos.CertificacionId`. |
| `LineaId` | `int` | No | Identificador de línea derivado de `dbo.Certificacion.LineaId`; la interfaz lo muestra junto con el nombre de línea. |
| `fecha` | `datetime` | No | No se usa para establecer el periodo del reporte. |
| `turno` | `int` | No | No se usa como filtro SQL del reporte. |
| `material` | `varchar(50)` | No | No se usa para las vistas actuales. |
| `permite_autorizacion` | `bit` | No | No se usa para dictaminar movimientos. |
| `terminado` | `bit` | No | No se usa en los reportes actuales. |
| `credencial_inicio` | `varchar(50)` | No | No se usa para identificar al usuario actual. |
| `fecha_inicio` | `datetime` | No | No se usa para el periodo de los agregados. |
| `fecha_fin` | `datetime` | Sí | No se usa para el periodo de los agregados. |
| `notificado_email` | `bit` | Sí | No conectado a notificaciones de la aplicación. |
| `notificado_phone` | `bit` | Sí | No conectado a notificaciones de la aplicación. |
| `SupervisorId` | `varchar(50)` | Sí | No se usa como autorización. |
| `Supervisor` | `varchar(250)` | Sí | No se usa como identidad autenticada. |
| `lock` | `bit` | No | No usado por la aplicación. |

La consulta utiliza `LEFT JOIN`; por ello puede producir un grupo `lineaId = NULL` para movimientos sin coincidencia. El reporte devuelve los límites (`fechaInicio`, `fechaFin`) empleados.

## `dbo.vw_Scrap_PowerBI` y catálogos

La vista `dbo.vw_Scrap_PowerBI` es la fuente SQL para las descripciones de razón. La aplicación utiliza:

| Campo de vista | Uso |
|---|---|
| `RAZONid` | Asociación con `dbo.Movimientos.RazonId`. |
| `desc_Razon` | Texto mostrado como descripción. |
| `MovimientoTipoId` | Filtrado de razones válidas para el tipo del movimiento. |

El selector agrupa por `RAZONid`, ignora descripciones nulas/vacías y muestra el texto. Antes de guardar, backend vuelve a validar el ID. `dbo.EtiquetasCI` no existe en la base consultada anteriormente, por lo que no debe documentarse como fuente activa.

`dbo.MovimientoTipo` tampoco se consulta como catálogo en vivo; las etiquetas se resuelven mediante un mapa local del repositorio y opciones del frontend. El módulo **Motivos** presenta un catálogo local/de referencia y no actualiza ni esta vista ni otro catálogo SQL.

## Cálculos e interpretación

- Scrap se identifica por `MovimientoTipoId = 1`.
- El KPI «Piezas Scrap» suma `cantidad` para tipo 1 en el conjunto cargado, no necesariamente solo el día actual.
- Pendientes/aprobados/rechazados del Dashboard cuentan estados del periodo actual.
- La gráfica de aprobaciones agrupa por `nvAprobadoPor` las filas con `aprobado = 1`. Su modo «Mes seleccionado» aplica el rango de fechas a `dtAprobado`; «Todas las aprobaciones» no agrega filtro temporal ni filtro por tipo de movimiento. Es un conteo de estado actual, no eventos históricos.
- `GET /api/movimientos/fallas-por-linea` calcula su agregado en SQL y no depende del rango del Dashboard.
- `/api/movimientos/comparativa-mensual` contrasta el mes calendario seleccionado con el anterior. Tendencia, razón y línea limitan a Scrap tipo 1; certificación incluye todos los tipos.
- La comparación mensual resume el máximo observado por métrica y periodo en sus tarjetas; las barras distinguen visualmente mes anterior y mes seleccionado, y los valores del tooltip son blancos. El máximo no es un umbral de riesgo ni una clasificación oficial de calidad.
- Reportes agrupa y filtra sobre movimientos ya cargados. Su fecha hasta es inclusiva en el navegador.
- Costos se muestran como cero/locales cuando no hay fuente oficial integrada; no usarlos para contabilidad.
- La exportación CSV usa columnas explícitas y excluye `credencial`, identificadores/nombres de empleado y campos del responsable del dictamen.

## Evidencia de consultas históricas

Una consulta previa al ambiente de desarrollo reportó para un filtro de 2025: 35,068 movimientos, 55 grupos de línea y 15,655 piezas Scrap. Estos valores dependen del ambiente y del instante de consulta; no son constantes ni validan la carga actual. La última fecha máxima registrada históricamente en `memoria.md` fue `2026-05-26T16:48:48.573`; se requiere consultar la API para conocer la fecha más reciente actual.

El 28 de octubre de 2026 se validaron lecturas en el ambiente de desarrollo: 2,894 movimientos en la ventana predeterminada, 4 grupos en el reporte por línea, 57 opciones de razón Scrap y 805 filas agregadas para abril/mayo de 2026. Son conteos de prueba, no datos del diccionario ni valores permanentes. Las escrituras válidas no se probaron en la base real.
