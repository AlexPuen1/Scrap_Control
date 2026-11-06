# Seguridad — SCRAPControl

**Actualizado:** 6 de noviembre de 2026
**Estado:** login local y autorización básica por sesión implementados; el inicio Windows necesita validación integrada en IIS/ARR antes de exponer la aplicación en red.
**Alcance:** estado visible en el código y pruebas locales de esta versión. No es una auditoría independiente, prueba de penetración ni certificación de la API corporativa, SQL Server o infraestructura.

## Resumen actual

SCRAPControl obtiene datos de SOE y valoraciones desde una API corporativa SQL. Gerente, Superintendente y Administrador local usan cuentas configuradas en `BaseDeDatos/.env`; las contraseñas se almacenan allí como sales y hashes scrypt, no como texto claro ni en el repositorio. Administrador también puede intercambiar una identidad Windows de IIS autorizada por una sesión de la aplicación.

El backend firma una cookie `HttpOnly`, `SameSite=Strict`, de ocho horas con HMAC. La cookie usa `Secure` si el proceso se ejecuta con `NODE_ENV=production`. El servidor exige una sesión para las rutas API protegidas y aplica controles de rol a algunas operaciones. El frontend no es la frontera de autorización.

## Roles y rutas

| Operación | Acceso actual |
|---|---|
| Iniciar/cerrar sesión | `/api/auth/login` y `/api/auth/logout`; no requieren sesión. |
| Intercambiar identidad Windows | `/api/auth/windows`; requiere encabezados confiables del proxy, clave compartida y cuenta en `WINDOWS_ADMIN_USERS`. |
| Health check | `/api/health` es público y devuelve el estado actual de conexión. |
| Movimientos, aprobaciones, precios, detalle y dictamen | Cualquier sesión autenticada de los tres roles. |
| Razones, edición de razón, fallas por línea y comparación mensual | Solo Administrador; la restricción se verifica en backend. |
| Dashboard, Reportes, Filtros, Motivos y Configuración | La interfaz los restringe a Administrador. El acceso a páginas del cliente no sustituye controles por endpoint. |

El backend obtiene `nvAprobadoPor` del usuario asociado a la sesión, no de un nombre enviado por el navegador. Dictámenes y cambios de razón modifican datos corporativos persistentes; no hay una función de deshacer y los dictámenes por lote son solicitudes individuales, sin transacción de conjunto.

## Controles observados

- Express escucha en `127.0.0.1`; el puerto no debe exponerse directamente a la red.
- El inicio Windows valida el secreto del proxy en tiempo constante y compara la identidad normalizada con la allowlist.
- Al inicio, la aplicación comprueba que el secreto de sesión y los hashes/sales obligatorios estén configurados y que las cuentas locales no se repitan.
- Las respuestas de autenticación no incluyen contraseñas ni hashes; las cookies son HttpOnly y las sesiones alteradas o expiradas se rechazan.
- CORS usa orígenes configurados y permite credenciales. CORS no reemplaza autenticación ni bloquea clientes HTTP que no sean navegadores.
- El backend limita JSON a 10 KB, oculta `X-Powered-By` y establece `nosniff`, `DENY`, `no-referrer` y `no-store`.
- El cliente no recibe la URL SQL ni manda comandos SQL; el backend conserva la validación TLS de la API corporativa.
- La exportación CSV utiliza columnas explícitas, neutraliza valores interpretables como fórmulas y omite credenciales y campos identificables de aprobador/empleado.

## Riesgos y validaciones pendientes

| Prioridad | Riesgo / limitación | Acción pendiente |
|---|---|---|
| Alta antes de uso compartido | IIS/ARR, Kerberos/NTLM, reemplazo de `X-Authenticated-User`, secreto compartido y HTTPS no se han probado de extremo a extremo. La identidad Windows solo es confiable si IIS elimina encabezados entrantes y los reemplaza en la ruta dedicada. | Configurar y probar `/api/auth/windows` desde una estación corporativa; mantener Express en loopback y HTTPS hasta completar la integración. |
| Media | No hay límite de intentos de login ni política de bloqueo o espera ante contraseñas erróneas. | Añadir limitación de intentos/monitorización acorde con las políticas corporativas antes de exposición compartida. |
| Media | La cookie firmada es autocontenida y dura ocho horas; cerrar sesión elimina la cookie del navegador, pero el servidor no mantiene una lista de revocación. | Proteger el secreto, definir respuesta ante compromiso y considerar revocación central si la política lo requiere. |
| Media | Los movimientos consultados no tienen paginación general en servidor; intervalos amplios pueden aumentar volumen y exposición. | Medir y agregar límites/paginación/filtros en SQL según los requisitos de operación. |
| Media | El servicio corporativo recibe SQL generado por el backend y su identidad/permisos efectivos no se determinan desde este proyecto. | Confirmar permisos mínimos, auditoría y configuración del servicio con sus responsables. |
| Operativa | Dictámenes/cambios de razón son persistentes; Precio es una valorización estimada que depende de datos de inventario, no una valoración contable. | Validar acciones de escritura en un entorno aislado y confirmar con los dueños de datos qué valores de inventario pueden usarse. |

El secreto `AUTH_SESSION_SECRET`, sales, hashes y `WINDOWS_AUTH_PROXY_KEY` deben mantenerse en el entorno privado ignorado por Git y con permisos de sistema operativo restringidos. No copiar contraseñas a documentación, logs, frontend ni respuestas HTTP. En producción, configurar `NODE_ENV=production` y publicar solo detrás de HTTPS.

## Verificación de esta actualización

- `npm test`: 22 pruebas backend aprobadas, incluidas autenticación local/hash, cookies de sesión, logout, expiración, rechazo de roles y mapeo Windows simulado.
- `npm run build`: compilación backend/frontend correcta.
- `npm run lint --prefix frontend`: terminó correctamente con tres advertencias existentes en `AnimatedValue.tsx`, `ThemeContext.tsx` y `ScrapContext.tsx`.
- Las cuentas locales configuradas en el `.env` ignorado se validaron contra sus hashes y roles sin imprimir contraseñas ni hashes.
- `git diff --check` terminó correctamente.

Estas pruebas no verifican IIS/ARR, la negociación Windows real, la exposición desde otra laptop, permisos de producción, cifras actuales de SOE/InventarioDB ni escrituras contra una base aislada. No se realizó una nueva prueba de penetración, escaneo de dependencias ni escaneo de secretos en esta actualización.

## Referencias

- [Autenticación híbrida en IIS](IIS-Windows-Authentication.md)
- [Documentación técnica](Documentacion.md)
- [Configuración de acceso a datos](BaseDeDatos/ConexionBaseDatos.md)
- `backend/src/middleware/authentication.ts`
- `backend/src/server.ts`
- `backend/src/routes/movimientosRoutes.ts`
