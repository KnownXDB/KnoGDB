# Roadmap

Estado: planificación. Las fases describen entregables futuros, no funcionalidad
implementada. KnoGDB es autónomo y prioriza cobertura desktop.

## Fase 0 — Contratos y gobernanza

- Autoría, MIT, seguridad, contribuciones y preparación para publicación.
- Completar docs/PUBLICATION-CHECKLIST.md antes de apertura pública.
- Registrar identidad, assets, moderación y políticas de acceso en ADRs.
- Definir OpenAPI, permisos, localización y criterios de aceptación.
- Preparar documentación inglesa y española desde una fuente versionada.

## Fase 1 — Base ejecutable

- Workspace tipado, API modular, migraciones y base relacional local.
- CI, lint, formatter, typecheck y tests aplicables.
- Scaffolding web público y estructura administrativa.
- Autorización administrativa mínima, auditoría y logs redactados.
- Backups y recuperación antes de conservar datos de valor.

## Fase 2 — Catálogo y administración

- IDs canónicos, nombres localizados, descripciones y géneros.
- Organizaciones, roles, releases, plataformas y referencias externas.
- Gestión administrativa de información y publicación.
- Homónimos separados; un título en varias tiendas conserva identidad.
- Conciliación con evidencia, revisión de ambigüedades y correcciones auditadas.

## Fase 3 — Assets gráficos

- Seis roles iniciales, validación técnica y revisión editorial.
- Storage privado, metadata, checksums y descarga por API.
- Localización, regiones, eventos, vigencia e historial inmutable.
- Expiración y fallback deterministas; caché sin exponer credenciales.

## Fase 4 — Acceso y contribuciones

- Credenciales, scopes, planes y cuotas administrables por organización.
- Caps mayores para partners y contributors; premium sin cuota comercial.
- Controles operativos y de abuso en todos los planes.
- Panel de consumo, rotación, revocación y excepciones temporales.
- Subida comunitaria autenticada con moderación antes de publicación.

## Fase 5 — Integración y publicación

- API de información publicada y assets aprobados de extremo a extremo.
- Pruebas de permisos, cuotas, idiomas, fechas, moderación y recuperación.
- Release SemVer trazable; documentación y controles remotos verificados.

## Fase 6 — Multimedia

- Trailers, fotografías y vídeos originales de desarrolladores.
- Metadata, derechos, procesamiento y distribución con políticas propias.
- Contribución comunitaria multimedia en un bloque posterior.

## Fase 7 — Escala con evidencia

- Workers, caché distribuida, CDN y búsqueda dedicada cuando sea necesario.
- Métricas y límites operativos guían inversiones y separación de módulos.
