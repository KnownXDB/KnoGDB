# Arquitectura

KnoGDB es un monolito modular autónomo. Los clientes y las interfaces web usan
una API versionada. La base relacional guarda entidades, procedencia, decisiones
e historial; object storage privado conserva originales y derivados.

## Módulos

Catálogo, identidad, assets, moderación, acceso y auditoría. Adaptadores externos
se aíslan del dominio. Los workers se separan cuando exista evidencia operativa.

## Identidad e información

- Game: ID interno estable; el título nunca es una clave única.
- GameLocalization: títulos, aliases y descripciones por idioma.
- Organization: desarrolladores y distribuidores; relaciones con rol y alcance.
- Genre y sus traducciones: IDs de taxonomía independientes del idioma.
- Release: plataforma, edición, región y fecha con precisión conocida.
- Storefront y StoreListing: distribución separada de identidad canónica.
- ExternalIdentity: fuente, namespace e identificador externo.
- IdentityDecision: evidencia, confianza, revisor y resultado.

Ports equivalentes pueden compartir Game; coincidencia de nombre no basta.
Remakes y variantes requieren política explícita antes de fusionar. Fusiones
conservan resolución de IDs previos; las separaciones se auditan. Año inicial
se deriva de releases según una regla documentada, sin inventar fechas.

## Assets

Separar archivo inmutable, pieza editorial y asignación al título o release.
La asignación contiene rol, idioma, región y vigencia; temporada o evento son
contextos, no nuevas identidades. Historial de revisión y publicación separado.

## Administración y API

El MVP administrativo gestiona catálogo, assets, moderación, usuarios, roles,
planes, claves y consumo. El frontend público comienza como scaffolding.
Toda información publicada se obtiene por API. Borradores, auditoría y datos
sensibles requieren endpoints y permisos administrativos.

La autorización se aplica en backend. Credenciales de consumo no otorgan
administración. Claves se almacenan con hash; sesiones son individuales y
revocables. Límites agregados por organización evitan multiplicar cuota con claves.

Consultar PRODUCT-PLAN.md para reglas de assets, moderación y acceso.
