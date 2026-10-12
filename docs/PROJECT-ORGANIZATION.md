# Organización del proyecto

## Identidad

KnownXDB es la organización paraguas de bases de conocimiento por entidad.
KnownGDB significa Known Games DataBase y prioriza juegos desktop. Las verticales
futuras son tentativas; no crear repositorios vacíos para ellas ni acoplar su dominio.

## Repositorios e interfaces

KnownGDB conserva inicialmente API, web pública, administración, contratos y
documentación en un monorepo. Separar repositorios solo por ciclo de release,
permisos o responsables independientes. Nunca versionar secretos en ningún repo.

El proyecto GitHub KnownGDB coordina las fases del ROADMAP. Usar estados Todo,
In Progress y Done. Las tarjetas de planificación no equivalen a tareas completadas.
Issues describen entregables verificables; PRs enlazan issues y evidencia.

## Colaboración pública

Publicar código con MIT y mantener derechos de datos y assets separados.
Requerir MFA, permisos mínimos y revisión de cambios externos por el mantenedor.
Proteger main, staging y develop; sin force pushes ni eliminación tras la transición.
Con un único mantenedor, no exigir una aprobación independiente imposible:
mantener PR, CI y conversaciones resueltas; añadir aprobación obligatoria cuando
exista un segundo mantenedor. Hasta entonces solo el propietario recibe escritura.

Wiki usa documentación revisada y versionada. No publicar versiones traducidas
como completas si todavía no se revisaron. Discussions para preguntas y propuestas;
vulnerabilidades se reportan exclusivamente mediante el canal privado.
