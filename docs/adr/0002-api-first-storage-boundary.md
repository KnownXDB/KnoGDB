# ADR 0002: Frontera API-first

- Estado: aceptada
- Fecha: 2026-09-26
- Revisión editorial neutral: 2026-10-12

## Decisión

Todo cliente externo accede a KnownGDB por API bajo /api/v1. No hay acceso directo
a base de datos ni bucket. El backend aplica autorización, políticas de consumo,
selección contextual, checksums y caché.

## Consecuencias

OpenAPI es un contrato testeable. La información publicada y los archivos
aprobados se obtienen mediante API; las operaciones administrativas requieren
permisos separados. La estrategia de entrega y caché se concreta antes de implementar.
