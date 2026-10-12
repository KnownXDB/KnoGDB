# Seguridad

## Reportes privados

No publicar secretos, datos personales ni vulnerabilidades explotables en issues,
PRs, comentarios, wiki, discussions o foros. No adjuntar logs sin revisar.
Usar Report a vulnerability en Security cuando esté habilitado. Si no está
disponible, contactar al mantenedor por un canal privado verificado; no publicar
el hallazgo. No existe todavía un correo de seguridad declarado. Habilitar y
probar un canal privado es obligatorio antes de abrir el repositorio.

## Credenciales

- No crear una contraseña administrativa global ni credenciales predeterminadas.
- Implementar accesos individuales, MFA, permisos por rol y sesiones revocables.
- Separar claves de consumo de API y permisos administrativos.
- Mantener secretos en el gestor privado del entorno, con permisos mínimos y
  separación de desarrollo, staging y producción.
- Nunca incrustar secretos en fuentes, comentarios, fixtures, documentación,
  imágenes, bundles, source maps o variables públicas del frontend.
- No incluir secretos en URLs, argumentos de procesos, logs, respuestas API,
  errores, informes o artefactos CI. Redactar antes de registrar.
- Mostrar claves API solo al emitirlas y almacenar únicamente hashes adecuados
  y metadata. No ofrecer recuperación del valor original.
- Proteger sesiones web con cookies Secure, HttpOnly, SameSite, expiración y
  defensa CSRF. El navegador no recibe credenciales de infraestructura ni una
  clave administrativa compartida.
- Ejemplos de configuración solo contienen valores vacíos o placeholders.

## Prevención y respuesta

.gitignore no protege archivos ya versionados ni impide git add --force.
CI y escáneres no garantizan detectar todos los secretos. Antes de publicar,
revisar historial completo, ramas, tags y superficies públicas con un escáner
especializado y revisión manual; activar protección de pushes cuando esté disponible.

Ante exposición: revocar o rotar primero, investigar alcance y luego limpiar
historial y copias según corresponda. Borrar un archivo no revoca una clave.
No reproducir secretos en tickets de incidentes.

PRs externos ejecutan sin secretos de producción, sin runners propios y con
permisos mínimos. No ejecutar código no confiable con pull_request_target y
credenciales. Fijar actions por SHA revisado. Despliegues futuros requieren
entornos protegidos y aprobación; no promover automáticamente.

## Estado

Proyecto documental, sin servicio desplegado. Los controles administrativos
descritos son requisitos de implementación, no capacidades ya verificadas.
