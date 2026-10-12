# Próximo paso

Antes de código, concretar los contratos definidos en PRODUCT-PLAN.md y ADR 0004:
cardinalidades, precisión de fechas, permisos, selección de assets y límites.

El primer bloque ejecutable debe incluir workspace, API con healthcheck,
base relacional local, migraciones, OpenAPI, CI y scaffolding web público y
administrativo. Incluir protección administrativa mínima desde la primera escritura.

Criterio de cierre: crear administrativamente un título localizado con ID interno,
consultarlo por API y verificar rechazo de escrituras sin autorización.
No declarar descarga validada en este bloque.

El siguiente bloque incorpora archivo validado y aprobado, storage privado,
selección contextual y descarga íntegra por API con checksum y caché verificados.
No incluir aún ingestión masiva ni procesamiento de vídeo.
