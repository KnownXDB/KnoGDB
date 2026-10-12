# ADR 0001: Dirección técnica inicial

- Estado: aceptada; formulación neutral actualizada el 2026-10-12
- Fecha original: 2026-09-26

## Decisión

Usar lenguaje tipado y runtime servidor, framework HTTP modular, REST y OpenAPI,
base relacional administrada, ORM con migraciones, object storage privado,
contenedores para desarrollo local y framework web para administración.

## Contexto y consecuencias

El catálogo requiere integridad relacional y separación de archivos binarios.
Comenzar como monolito modular. La neutralidad editorial no obliga a reemplazar
dependencias ya seleccionadas; los nombres concretos se registrarán cuando se
materialicen configuraciones, con necesidad y coste operativo justificados.
