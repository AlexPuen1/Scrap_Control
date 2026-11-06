# Autenticación corporativa

SCRAPControl valida el correo y la contraseña en el servicio corporativo `ad_mailVal` desde el backend. El navegador envía las credenciales únicamente a Express; Express las reenvía por HTTPS y no las escribe en archivos, cookies, logs ni respuestas.

## Inicio de sesión

`POST /api/auth/login` recibe `{ "usuario": "correo", "contrasena": "..." }`. El backend envía `{ "nvMail": "correo", "nvPass": "..." }` a `https://estms01ia.magna.global/node-red/ad_mailVal`. Solo una respuesta HTTP exitosa con `response: "OK"`, `username` y `mail` válidos concede acceso. Los rechazos devuelven HTTP 401; los errores o respuestas inválidas del servicio devuelven HTTP 502 y no inician sesión.

La sesión usa una cookie HttpOnly, SameSite Strict, firmada y con expiración de ocho horas. `AUTH_SESSION_SECRET` debe tener al menos 32 bytes. Al salir, el navegador elimina la cookie.

## Identidad y roles

El backend usa el `fullname` de la respuesta si contiene un valor; si viene vacío, muestra y registra el `mail` devuelto por la API. El navegador no envía el nombre de responsable con el dictamen: se obtiene de la sesión autenticada. La confirmación de aprobación/rechazo muestra quién quedará registrado.

Todos los usuarios validados reciben el rol **Gerente**, excepto la cuenta cuyo correo coincide con `AUTH_ADMIN_EMAIL`, que recibe **Administrador**. Este correo se configura localmente en `BaseDeDatos/.env`; no se guarda ninguna contraseña ni lista local de contraseñas. Las restricciones de Administrador se aplican también en Express.

## Configuración y operación

`npm run iniciar` instala las dependencias y, si falta la configuración, solicita el correo que recibirá el rol Administrador y genera un secreto de sesión. El asistente elimina de `BaseDeDatos/.env` las variables antiguas de contraseñas locales y de Windows Authentication. Mantén ese archivo fuera de Git y protege el acceso al equipo.

Para validar credenciales, el backend necesita conectividad HTTPS y un certificado confiable para `estms01ia.magna.global`. Una indisponibilidad de la API no concede acceso: el backend informa que no pudo validar la cuenta. Las pruebas automatizadas simulan respuestas de la API y no usan credenciales reales.

Express debe permanecer enlazado a `127.0.0.1`; en producción publica la aplicación detrás de HTTPS y no expongas directamente el backend.
