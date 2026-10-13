# ADR 0001: fundamentos para desarrollo local

Fecha: 2026-10-13. Estado: aceptado por el mantenedor en el reinicio.

## Contexto

El enfoque anterior no satisface el flujo de trabajo deseado. El desarrollo de
interfaces depende de demasiada infraestructura y coordinación. La prioridad
es iterar normalmente en local, comprobar cambios y hacer push.

Se conservan fundamentos, reglas y plataformas: GitHub, Supabase y Cloudflare.
La base de datos existente y el bucket R2 no son descartables. El alcance de
este reinicio es documentación de fundamentos y repositorio limpio; no incluye
implementar interfaces, cambiar servicios remotos ni migrar datos.

## Decisión

1. Retirar código y configuración anteriores; iniciar un historial sin padres
   en la rama temporal `foundations`, con respaldo externo recuperable.
2. React + Vite + TypeScript + Tailwind para web y admin separados.
3. Workspace npm pequeño; compartir contratos y UI solo cuando se necesiten.
4. API TypeScript en Cloudflare Workers; Supabase para PostgreSQL/Auth y R2 privado
   para archivos. La API sigue siendo la frontera de datos para consumidores.
5. Inicio de frontend independiente; HMR, proxy de API y fixtures explícitos.
   Docker es opcional para base local, nunca requisito del frontend.
6. Baseline de Supabase a partir del estado real revisado antes de introducir
   migraciones nuevas. Ningún reset remoto implícito.
7. Verificar localmente y en GitHub; despliegue separado y explícito.
8. Diseño premium propio para ambas superficies; velocidad no elimina seguridad,
   procedencia, moderación, identidad canónica ni accesibilidad.

## Consecuencias

No se conserva compatibilidad de la implementación anterior. No hay aplicaciones
ejecutables en el commit de fundamentos. Las capacidades vuelven por fases pequeñas
y verificables. Las configuraciones de hosting y CI se crearán para la nueva base,
sin arrastrar herramientas o dependencias del enfoque retirado.

Reescribir Git no borra copias, forks, referencias de PR ni objetos retenidos por
el proveedor. No es una herramienta de revocación de secretos. Las protecciones
remotas pueden impedir el reemplazo del historial y requieren intervención del
mantenedor; no se desactivan como efecto secundario del reinicio local.
