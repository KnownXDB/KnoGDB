# Contribución y workflow

## Ramas

- `main`: producción estable.
- `staging`: integración previa a producción.
- `develop`: integración diaria.
- `release/*`: preparación de una versión desde develop.
- `feature/*`: funcionalidad.
- `fix/*`: correcciones no urgentes.
- `hotfix/*`: correcciones críticas de producción.
- `chore/*`: mantenimiento técnico.
- `docs/*`: documentación.

Las ramas de trabajo parten de `develop`. No se trabaja directamente sobre ramas
protegidas. Todo cambio entra mediante Pull Request y CI exitoso.

## Reglas

Guardar texto en UTF-8 con finales LF. .gitattributes prevalece sobre conversiones
locales de Git; .editorconfig configura editores compatibles. No modificar la
configuración global ni normalizar archivos ajenos al cambio sin revisión.

1. Mantener los cambios pequeños y enfocados.
2. Actualizar documentación y ADRs cuando cambie una decisión.
3. No introducir secretos, datos reales ni binarios de prueba.
4. No usar nombres de productos externos como nombres de módulos, ramas o features.
5. Verificar lint, typecheck y tests antes de abrir el Pull Request.
6. Usar squash merge salvo que exista una razón documentada para conservar commits.

## Promociones y seguridad

PRs de trabajo se integran con squash a develop. Las candidatas pasan por PR a
staging y después a main, preservando ancestría mediante merge entre ramas
duraderas. No aplicar squash a promociones ni promover automáticamente.
Hotfixes parten de main y se reconcilian mediante PR con develop y la candidata
activa. Firmar commits y tags; no desactivar firma ante errores.

Leer SECURITY.md y GOVERNANCE.md. Las contribuciones requieren derechos de
publicación bajo MIT. No introducir referencias a terceros como inspiración en
código o comentarios; referencias directas reales a proveedores y SDKs son válidas.

Ejecutar node scripts/verify-repository.mjs y git diff --check. Mientras no haya
aplicación, no declarar lint, typecheck o tests de producto ejecutados.

main, staging y develop requieren PR, checks, conversaciones resueltas y revisión
según GOVERNANCE.md. Descartar aprobaciones obsoletas y prohibir eliminación y
force push. Aplicar reglas a administradores cuando esté disponible. CODEOWNERS
no sustituye protecciones remotas; verificar configuración antes de publicar.
No exigir historia lineal si impide merges de promoción.
