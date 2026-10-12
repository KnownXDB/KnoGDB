# Versionado

KnoxDB usa Semantic Versioning (`MAJOR.MINOR.PATCH`) para releases de software y
contratos públicos.

- `MAJOR`: cambio incompatible.
- `MINOR`: funcionalidad compatible.
- `PATCH`: corrección compatible.

Mientras el proyecto permanezca en `0.x`, el contrato se considera experimental.
La API se versionará además en su ruta: `/api/v1`.

## Commits

Se recomienda Conventional Commits:

```text
feat(api): add game lookup endpoint
fix(identity): handle release year collisions
docs(architecture): record storage decision
chore(repo): configure test tooling
```

## Releases

Las releases se crearán desde `main` usando tags anotados:

```text
v0.1.0
v0.1.1
```

No se deben reutilizar ni mover tags publicados.

Backend y web comparten inicialmente una versión de producto. Cada despliegue
identifica versión y commit. Tags de release anotados y firmados; mantener changelog.
Los cambios incompatibles en 0.x también requieren aviso y migración documentada.

La versión del producto, la ruta de API, las migraciones de base de datos, la
política de assets y las revisiones de archivos son identificadores separados.
Temporadas o eventos no cambian la versión del servicio ni la identidad del juego.
