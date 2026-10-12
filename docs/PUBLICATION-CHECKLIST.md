# Preparación para publicación

## Estado verificado el 2026-10-12

- Repositorio público KnownXDB/KnownGDB; rama predeterminada main.
- Wiki y discussions habilitadas; wiki pendiente de contenido bilingüe revisado.
- main, staging y develop protegidas: PR, CI estricto, conversaciones resueltas,
  commits firmados y reglas aplicadas a administradores; sin force push ni eliminación.
- Aprobaciones obligatorias: cero mientras exista un solo mantenedor con escritura.
  Contribuciones externas requieren revisión manual; añadir aprobación independiente
  obligatoria al incorporar otro mantenedor.
- Secret scanning, push protection y reporte privado de vulnerabilidades activados.
- Proyecto público KnownGDB vinculado al repositorio, con bloques de roadmap planificados.
- Organización sin permisos base; creación de repositorios restringida.
- MFA obligatorio y restricciones de eliminación/cambio de visibilidad requieren
  configuración en la interfaz: la API no aplicó esos campos. No declararlos activos.
- Sin servicio desplegado ni dominio público.

## Requisitos antes de apertura

- [x] Escaneo especializado de commits accesibles por las ramas revisadas: sin hallazgos.
- [x] Revisión de nombres, metadata y documentación actual.
- [ ] Revocación de cualquier secreto detectado antes de limpiar historial.
- [x] Protección verificada de main, staging y develop.
- [x] Secret scanning y push protection activados.
- [x] Reporte privado habilitado; no se envió un reporte de prueba.
- [x] CI exitoso en las tres ramas tras promover la identidad.
- [x] Autoría y MIT verificadas; no hay medios de terceros versionados.
- [x] Apertura pública autorizada y rama predeterminada main configurada.
- [ ] Documentación bilingüe revisada desde una fuente versionada.

Los documentos no activan controles remotos. Publicación de wiki y apertura de
discussions son acciones separadas y requieren capacidad de moderación.
