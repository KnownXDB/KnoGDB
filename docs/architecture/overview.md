# Arquitectura

KnownGDB es un producto autónomo de catálogo, identidad y assets. La arquitectura
prioriza velocidad de desarrollo y una frontera de API estable. Esta revisión
define responsabilidades; las aplicaciones todavía no están implementadas.

## Estructura prevista

```text
apps/
  web/             React + Vite: experiencia pública
  admin/           React + Vite: administración independiente
  api/             TypeScript: API en Cloudflare Workers
packages/
  contracts/       DTOs, validación y cliente HTTP tipado
  ui/              Tokens y primitivas visuales compartidas
supabase/          Configuración y baseline revisado; migraciones futuras
docs/              Reglas y decisiones
```

No crear paquetes vacíos o capas genéricas antes de necesitarlos. Compartir
primitivas y contratos evita duplicación; web y admin conservan navegación,
features, entradas y despliegues propios. El código administrativo nunca forma
parte del bundle público. npm workspaces simplifica instalación y scripts.

## Desarrollo y alojamiento

Vite sirve cada frontend con HMR. Un proxy local dirige `/api` al backend; no
exige HTTPS local, Docker ni reconstruir el servidor antes de editar una pantalla.
El Worker se ejecuta con herramientas oficiales de Cloudflare. Supabase ofrece
PostgreSQL y Auth; R2 conserva archivos privados. Cloudflare aloja los frontends
estáticos y la API; GitHub aloja el código y las verificaciones.

Dos modos explícitos: interfaz con fixtures locales de diseño, o integración
real mediante API. Los fixtures no simulan persistencia ni éxito remoto.
Para integración, conectar a Supabase de desarrollo autorizado; para trabajo
aislado de esquema, usar la CLI local y su runtime opcional. Nunca apuntar
operaciones destructivas a una base compartida para acelerar desarrollo.

Build local y push no equivalen a deploy. No desplegar ni migrar producción
automáticamente. Identificadores, dominios y bindings reales se verifican al
conectar cada entorno; esta documentación no inventa configuración remota.

## Frontera de acceso

Web, admin y consumidores consultan catálogo y assets por `/api/v1`. El SDK de
Supabase se utiliza en el backend para acceso a datos. El admin puede usar el
SDK oficial exclusivamente para Auth con configuración publicable; la API
valida sesión y permisos en cada operación. La estrategia concreta de sesión,
CSRF, MFA y revocación exige ADR y revisión de seguridad antes de implementación.

Las claves privilegiadas y bindings R2 permanecen en el servidor. No habilitar
acceso directo a tablas como atajo. RLS y permisos explícitos acompañan la
autorización del backend. Los archivos se sirven por la API o mediante permisos
temporales emitidos por ella tras comprobar acceso y publicación.

## Dominio

- Game: ID interno estable; nombres y proveedores no definen identidad.
- GameLocalization: nombres, aliases y descripciones por idioma.
- Release: plataforma, edición, región y fecha con precisión explícita.
- Organization y Genre: entidades propias con relaciones y traducciones.
- ExternalIdentity e IdentityDecision: fuente, evidencia, confianza, revisión y
  resultado; coincidencia de nombre no basta para fusionar juegos.
- Assets: archivo inmutable, pieza editorial y asignación son conceptos distintos.
  Asignaciones por Game o Release, rol, idiomas, región, contexto y vigencia.
- Moderación, publicación y vigencia son estados independientes.
- Acceso: colaboración, plan comercial y permisos no son equivalentes.
- Auditoría: autor, fecha, motivo y cambios sensibles verificables.

Los módulos iniciales viven dentro de una API pequeña. Separar procesos y
servicios solo con necesidad medida. No copiar la estructura anterior ni diseñar
frameworks internos para posibilidades futuras.

## Dirección visual

Web: catálogo visual, búsqueda prominente, filtros claros, galerías de assets,
detalle canónico y jerarquía editorial cuidada. Admin: entorno premium enfocado
en trabajo, tablas legibles, formularios claros, revisión y feedback inmediato.
Ambas interfaces tienen identidad propia, tokens coherentes, accesibilidad y
estados responsive. No usar marcas, referencias ni assets ajenos como identidad
del producto. El diseño visual se realizará en la fase de implementación.
