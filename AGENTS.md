# Instrucciones para agentes de IA

## Alcance

KnoGDB es un servicio autónomo de catálogo canónico, identidad y assets de
videojuegos. Ningún consumidor externo determina el modelo del dominio.

## Reglas obligatorias

- Leer `README.md`, `ROADMAP.md` y la arquitectura relevante antes de modificar código.
- No inventar credenciales, IDs externos ni datos de producción.
- Leer SECURITY.md y GOVERNANCE.md antes de modificar autenticación, CI o permisos.
- Nunca imprimir, persistir ni publicar secretos; redactar logs antes de emitirlos.
- No cambiar visibilidad ni publicar contenido externo sin autorización explícita.
- No guardar assets binarios, dumps, screenshots ni outputs de Playwright en Git.
- Mantener la API como única frontera de acceso para clientes externos.
- Preservar procedencia, confianza y estado de moderación de los datos.
- No mezclar identidad de `Game` con una `Release` concreta.
- Evitar dependencias nuevas sin justificar su necesidad y coste operativo.
- Registrar decisiones estructurales en `docs/adr/`.
- Ejecutar las verificaciones disponibles antes de declarar terminado un cambio.
- Mantener UTF-8 y finales LF según .gitattributes y .editorconfig. No cambiar
  la configuración global de Git ni introducir conversiones CRLF.

## Estilo de trabajo

Preferir cambios pequeños, reversibles y verificables. Si una tarea requiere una
decisión de producto o infraestructura no documentada, crear un ADR antes de
implementarla. Los nombres de código, ramas y features deben ser neutrales y no
referenciar productos externos usados como inspiración.

## Verificación

Cuando se incorpore Playwright, sus reports, traces, videos, screenshots y
resultados temporales deben permanecer ignorados por Git. Solo se versionarán
tests y fixtures pequeños, deterministas y deliberadamente revisados.
