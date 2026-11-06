# Seguridad — SCRAPControl

**Actualizado:** 6 de noviembre de 2026
**Estado:** login corporativo mediante `ad_mailVal` y autorización por sesión implementados; la integración productiva requiere conectividad HTTPS al servicio corporativo.
**Alcance:** estado visible en el código y pruebas locales de esta versión. No es una auditoría independiente, prueba de penetración ni certificación de la API corporativa, SQL Server o infraestructura.

## Resumen actual

SCRAPControl obtiene datos de SOE desde una API corporativa SQL y valida credenciales con `ad_mailVal`. El backend reenvía correo y contraseña por HTTPS; no los guarda en disco, cookies ni logs. Todos los usuarios validados reciben rol Gerente, excepto el correo configurado en `AUTH_ADMIN_EMAIL`, que recibe rol Administrador.

El backend firma una cookie `HttpOnly`, `SameSite=Strict`, de ocho horas con HMAC. La cookie usa `Secure` si el proceso se ejecuta con `NODE_ENV=production`. El servidor exige una sesión para las rutas API protegidas y aplica controles de rol a algunas operaciones. El frontend no es la frontera de autorización.

## Roles y rutas

| Operación | Acceso actual |
|---|---|
| Iniciar/cerrar sesión | `/api/auth/login` y `/api/auth/logout`; no requieren sesión. |
| Health check | `/api/health` es público y devuelve el estado actual de conexión. |
| Movimientos, aprobaciones, precios, detalle y dictamen | Cualquier sesión autenticada de los dos roles. |
| Razones, edición de razón, fallas por línea y comparación mensual | Solo Administrador; la restricción se verifica en backend. |
| Dashboard, Reportes, Filtros, Motivos y Configuración | La interfaz los restringe a Administrador. El acceso a páginas del cliente no sustituye controles por endpoint. |

El backend obtiene `nvAprobadoPor` del usuario asociado a la sesión, no de un nombre enviado por el navegador. Dictámenes y cambios de razón modifican datos corporativos persistentes; no hay una función de deshacer y los dictámenes por lote son solicitudes individuales, sin transacción de conjunto.

## Controles observados

- Express escucha en `127.0.0.1`; el puerto no debe exponerse directamente a la red.
- El login concede sesión solo si el API responde HTTP exitoso con `response: "OK"` e identidad válida; otros resultados no conceden acceso.
- Al inicio, la aplicación comprueba que `AUTH_SESSION_SECRET` tenga al menos 32 bytes y que el correo de Administrador, si está configurado, sea válido.
- Las respuestas de autenticación no incluyen contraseñas ni hashes; las cookies son HttpOnly y las sesiones alteradas o expiradas se rechazan.
- CORS usa orígenes configurados y permite credenciales. CORS no reemplaza autenticación ni bloquea clientes HTTP que no sean navegadores.
- El backend limita JSON a 10 KB, oculta `X-Powered-By` y establece `nosniff`, `DENY`, `no-referrer` y `no-store`.
- El cliente no recibe la URL SQL ni manda comandos SQL; el backend conserva la validación TLS de la API corporativa.
- La exportación CSV utiliza columnas explícitas, neutraliza valores interpretables como fórmulas y omite credenciales y campos identificables de aprobador/empleado.

## Riesgos y validaciones pendientes

| Prioridad | Riesgo / limitación | Acción pendiente |
|---|---|---|
| Alta antes de uso compartido | El login depende de disponibilidad, permisos y contrato de `ad_mailVal`; el código no puede validar credenciales reales en pruebas automatizadas. | Probar en una estación corporativa con una cuenta autorizada; confirmar TLS, respuestas de éxito/rechazo, monitoreo y política de disponibilidad con el dueño de la API. |
| Media | No hay límite local de intentos de login ni política de espera ante contraseñas erróneas. | Añadir limitación de intentos/monitorización acorde con las políticas corporativas antes de exposición compartida. |
| Media | La cookie firmada es autocontenida y dura ocho horas; cerrar sesión elimina la cookie del navegador, pero el servidor no mantiene una lista de revocación. | Proteger el secreto, definir respuesta ante compromiso y considerar revocación central si la política lo requiere. |
| Media | Los movimientos consultados no tienen paginación general en servidor; intervalos amplios pueden aumentar volumen y exposición. | Medir y agregar límites/paginación/filtros en SQL según los requisitos de operación. |
| Media | El servicio corporativo recibe SQL generado por el backend y su identidad/permisos efectivos no se determinan desde este proyecto. | Confirmar permisos mínimos, auditoría y configuración del servicio con sus responsables. |
| Operativa | Dictámenes/cambios de razón son persistentes; Precio es una valorización estimada que depende de datos de inventario, no una valoración contable. | Validar acciones de escritura en un entorno aislado y confirmar con los dueños de datos qué valores de inventario pueden usarse. |

El secreto `AUTH_SESSION_SECRET` debe mantenerse fuera de Git y con permisos de sistema operativo restringidos. No copiar contraseñas a documentación, logs, frontend ni respuestas HTTP. En producción, configurar `NODE_ENV=production` y publicar solo detrás de HTTPS.

## Verificación de esta actualización

- `npm test`: incluye pruebas de respuestas simuladas de `ad_mailVal`, asignación de roles, cookies de sesión, logout y expiración. No envía credenciales reales.
- `npm run build`: compilación backend/frontend correcta.
- `npm run lint --prefix frontend`: terminó correctamente con tres advertencias existentes en `AnimatedValue.tsx`, `ThemeContext.tsx` y `ScrapContext.tsx`.
- `git diff --check` terminó correctamente.

Estas pruebas no verifican la API corporativa real, la exposición desde otra laptop, permisos de producción, cifras actuales de SOE/InventarioDB ni escrituras contra una base aislada. No se realizó una nueva prueba de penetración, escaneo de dependencias ni escaneo de secretos en esta actualización.

## Referencias

- [Autenticación corporativa](Autenticacion-API.md)
- [Documentación técnica](Documentacion.md)
- [Configuración de acceso a datos](BaseDeDatos/ConexionBaseDatos.md)
- `backend/src/middleware/authentication.ts`
- `backend/src/server.ts`
- `backend/src/routes/movimientosRoutes.ts`
