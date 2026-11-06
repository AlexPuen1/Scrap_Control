# Despliegue de autenticación híbrida en IIS

SCRAPControl admite cuentas locales configuradas para Gerente, Superintendente y Administrador, además de Windows Authentication para Administradores autorizados. Las contraseñas locales se verifican en el backend contra hashes scrypt y nunca se envían a terceros. Los valores actuales de configuración viven en `BaseDeDatos/.env`, que no se versiona; esta guía no publica nombres de usuario, contraseñas ni secretos.

## Configuración

1. Publica el frontend en IIS con HTTPS y configura ARR/URL Rewrite para enviar `/api/*` a `http://127.0.0.1:3001/api/*`. Ejecuta Express como servicio de Windows bajo una cuenta restringida y bloquea el puerto 3001 desde la red.
2. Deja **Anonymous Authentication** habilitado para el sitio y configura **Windows Authentication** únicamente para la ruta `/api/auth/windows`. La página de login y las demás rutas deben poder llegar a la aplicación sin desafío Windows.
3. En el proxy, reemplaza —no anexes— `X-Authenticated-User` con la identidad validada por IIS y agrega `X-Auth-Proxy-Key` únicamente al reenviar `/api/auth/windows`. Elimina esos encabezados entrantes del cliente para todas las rutas; nunca aceptes los valores que este envíe.
4. Copia `BaseDeDatos/.env.example` a `BaseDeDatos/.env` si preparas un entorno nuevo. Genera sales aleatorias y hashes scrypt para las credenciales locales; configura también `AUTH_SESSION_SECRET` (mínimo 32 bytes). No guardes contraseñas en texto claro ni en Git. La implementación admite una cuenta local de Administrador; Windows Authentication se asigna a las cuentas de `WINDOWS_ADMIN_USERS`.
5. Configura `WINDOWS_AUTH_PROXY_KEY` con un secreto aleatorio de al menos 32 bytes, compartido únicamente entre IIS y el backend. Protege ese secreto y el archivo `.env` con permisos del sistema operativo. Activa HTTPS para que las cookies de sesión se envíen de forma segura.

Las sesiones usan una cookie HttpOnly, SameSite Strict, firmada por HMAC y con expiración de ocho horas. La aplicación valida roles también en el backend: las rutas de configuración, razones, fallas por línea y comparativa mensual son exclusivas de Administrador; Gerente y Superintendente conservan el acceso de aprobación configurado en la interfaz.

## Validación de despliegue

- Inicio de sesión local con usuario/contraseña correctos: devuelve el rol configurado y establece la cookie; contraseña incorrecta: HTTP 401.
- Una ruta exclusiva de Administrador solicitada por Gerente o Superintendente: HTTP 403.
- `/api/auth/windows` mediante IIS: solo una identidad autorizada de `WINDOWS_ADMIN_USERS` obtiene rol Administrador.
- Solicitudes API sin cookie válida o identidad Windows autorizada: HTTP 401; no debe haber acceso directo de red al puerto Express.
- La prueba integrada de Kerberos/NTLM, IIS, ARR y el dominio debe realizarse en el entorno corporativo; las pruebas unitarias no la reemplazan.
