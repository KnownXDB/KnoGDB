# Preparación para publicación

## Estado verificado el 2026-10-12

- Repositorio privado; rama predeterminada develop.
- Wiki y discussions deshabilitadas.
- Rulesets: HTTP 403 por disponibilidad del plan. No se verificó protección.
- Sin servicio desplegado ni dominio público.

## Requisitos antes de apertura

- [ ] Escaneo especializado de todos los commits, ramas y tags.
- [ ] Revisión manual de archivos, metadata y superficies públicas.
- [ ] Revocación de cualquier secreto detectado antes de limpiar historial.
- [ ] Protección verificada de main, staging y develop.
- [ ] Secret scanning y push protection activados según disponibilidad.
- [ ] Reporte privado de vulnerabilidades habilitado y probado.
- [ ] CI remoto exitoso en el commit candidato.
- [ ] Autoría, LICENSE y derechos de terceros revisados.
- [ ] Apertura pública y rama predeterminada confirmadas explícitamente.
- [ ] Documentación bilingüe revisada desde una fuente versionada.

Los documentos no activan controles remotos. Publicación de wiki y apertura de
discussions son acciones separadas y requieren capacidad de moderación.
