# Políticas de producto

Estas reglas definen alcance acordado; no capacidades implementadas.

## Assets iniciales

| Rol | Dimensiones de referencia (no obligatorias) | Uso |
| --- | --- | --- |
| header | 920 × 430 | Tarjeta horizontal |
| capsule | 600 × 900 | Portada vertical |
| hero | 3840 × 1240 | Fondo panorámico |
| logo | Lado dominante de 1280 en contenido visible | Marca, preferentemente transparente |
| icon | 32 × 32 | Representación pequeña |
| client_icon | 256 × 256 | Aplicación o acceso directo |

JPEG o PNG para cualquier rol; PNG admite transparencia. Las dimensiones,
proporciones, transparencia y ausencia de márgenes son recomendaciones, no
requisitos de subida. Se conservan los bytes y medidas originales sin ampliar,
recortar ni convertir. ICO se admite como original para client_icon, conservando
todas sus imágenes internas sin exigir una resolución concreta. Su metadata
describe la imagen interna de mayor área. Los límites técnicos se revisarán antes
de implementar la ingesta, sin alterar los originales existentes.
WebP, vídeo y animación quedan fuera de la primera etapa.

## Contexto e historial

Archivos inmutables con checksum. Asignaciones por juego o release, idioma,
región y vigencia. Eventos y temporadas no cambian Game.id. Mantener asset base
y fallback determinista tras expiración. La API declara idioma y contexto efectivo.

Global significa sin idioma: contenido sin texto lingüístico. No es una región ni
un idioma desconocido. Cada pieza se clasifica como Global o por idiomas reales;
EN, ES y variantes localizadas pertenecen al mismo Game. Ningún rol es Global
por defecto. Contributors eligen idioma o Global y moderación verifica la elección.

API y web priorizan originales oficiales aprobados, con derechos de distribución.
Separar procedencia oficial/comunitaria de original/derivado. No presentar una
imagen normalizada como original ni publicar fuentes incompatibles automáticamente.
El modelo, filtros y fallback deberán verificarse al implementar este contrato.

## Moderación

Validar firma, decodificación, formato, límites de bytes y píxeles y duplicados
exactos. Las medidas y transparencia son referencias editoriales. Revisar legibilidad, composición,
nitidez, correspondencia, marcas de agua y derechos de distribución.
Traducir calidad editorial en criterios observables, no etiquetas subjetivas.

Estados submitted, in_review, approved, rejected y withdrawn; publicación y
vigencia separadas. Registrar revisor, fecha y motivo. Cambiar bytes exige nueva
revisión. Contenido pendiente o rechazado nunca es público.
Procedencia oficial no equivale a permiso de redistribución.

## Administración

Gestionar información, traducciones, organizaciones, géneros, releases, fuentes,
assets y decisiones. Auditar fusiones y correcciones. Separar permisos de catálogo,
moderación y acceso. Registrar autor, fecha y motivo de cambios sensibles.

## Planes de API

Rol de colaboración, plan comercial y permisos son conceptos separados.
Público tiene caps base; contributors y partners caps mayores configurables.
Partners premium no tienen cuota comercial, pero conservan controles operativos
de concurrencia, tamaño y abuso para proteger disponibilidad.

Administrar solicitudes por intervalo, ráfagas, cuotas, concurrencia y transferencia.
Agregar consumo por organización, separar descarga de metadata, permitir excepciones
temporales y registrar cambios. El panel emite, rota y revoca claves con scopes,
consulta métricas y asigna planes. No fijar cifras sin estimación y medición.
El mecanismo compartido entre instancias requiere decisión antes de escalar.

## Multimedia futura

Trailers, fotografías y vídeos originales requieren procedencia, derechos, idioma,
duración y metadata técnica. Ingreso de desarrolladores precede contribución
comunitaria multimedia. No implementar aún transcodificación ni distribución.

## Localización y calidad pública

Inglés para código y README principal; documentación inglesa y española revisada.
Una fuente versionada alimentará wiki, con revisión de referencia por traducción.
No publicar binarios de referencia ni contenido sin derechos documentados.
