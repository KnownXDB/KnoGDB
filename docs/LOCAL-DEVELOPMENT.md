# Desarrollo local

Estado: flujo acordado, pendiente de implementación. No hay `package.json` ni
scripts de aplicación en esta revisión; no ejecutar comandos de la base anterior.

## Flujo objetivo

1. Clonar e instalar con el lockfile versionado.
2. Iniciar web o admin individualmente con Vite y HMR.
3. Diseñar con fixtures locales claramente identificados, sin infraestructura.
4. Para integración, iniciar API local y configurar Supabase de desarrollo.
5. Probar permisos, contratos y errores con integración real.
6. Ejecutar formato, lint, tipos, tests pertinentes y builds.
7. Hacer commit firmado y push; verificar CI del commit exacto.
8. Desplegar explícitamente cuando corresponda.

## Supabase y R2

Antes de conectar, verificar proyecto y bucket reales sin emitir secretos.
Inspeccionar esquema existente, historial de migraciones y políticas. No recrear
tablas, usuarios ni archivos. Establecer baseline revisado y probar futuras
migraciones en un entorno aislado antes de aplicarlas a uno compartido.

Variables privilegiadas solo para API; ninguna clave secreta con prefijo Vite.
Los ejemplos tendrán valores vacíos. Configuración privada, datos locales y
outputs generados permanecen ignorados. El SDK y CLI oficiales sustituyen
orquestadores propios de infraestructura.

La opción local de Supabase puede requerir Docker; no condiciona el desarrollo
de interfaces. R2 local conserva datos fuera de Git y no modifica el bucket remoto.
