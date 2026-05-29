# Changelog

Todos los cambios relevantes del proyecto MAPS Asesores se resumen en este archivo.

Este changelog es release-oriented: lista cambios importantes para producto, arquitectura, infraestructura o experiencia de desarrollo. No reemplaza a los TDDs ni a los work-logs, que conservan el detalle tecnico de cada feature.

Formato basado en [Keep a Changelog](https://keepachangelog.com/) y versionado semantico cuando el proyecto defina versiones formales.

---

## [Sin publicar]

### Added

- Dockerizacion fullstack de desarrollo con servicios `frontend`, `backend` y `db`.
- Documentacion viva del modulo Auth/Routing en `docs/modules/auth.md`.
- Indice general de documentacion en `docs/README.md`.
- Guia de contribucion en `docs/CONTRIBUTING.md`.
- Template de Pull Request en `.github/pull_request_template.md`.
- Arquitectura viva en `docs/ARCHITECTURE.md`.
- Estrategia de testing en `docs/TESTING.md`.
- Guia de migraciones y seed en `docs/MIGRATIONS.md`.
- Snapshot actualizado del repositorio en `docs/inventario-proyecto.md`.
- Documentacion viva de modulos en `docs/modules/`: productores, biblioteca, web publica, noticias y administradores.

### Changed

- Convenciones documentales actualizadas con fuentes de verdad y relacion entre README, modulos, TDDs y work-logs.
- README raiz actualizado como onboarding actual del proyecto.
- Work-log MAPS-011 de Biblioteca Digital aclarado como historico y supersedido por MAPS-012 para API/persistencia.

### Fixed

- Import de errores JWT desde `jsonwebtoken` compatible con runtime ESM/CommonJS.
- Imagen Docker del backend ajustada a Debian slim para compatibilidad Prisma/OpenSSL.

### Removed

- N/A

### Security

- N/A

---

<!--
Guia de uso:

Cada PR que introduzca cambios relevantes debe agregar una entrada en [Sin publicar].

Categorias:

- Added: funcionalidades, documentos o capacidades nuevas.
- Changed: cambios sobre comportamiento existente, arquitectura o flujo de trabajo.
- Fixed: correcciones de bugs.
- Removed: funcionalidades, archivos o dependencias eliminadas.
- Security: cambios relacionados con seguridad.

Formato recomendado:

- Descripcion breve del cambio (#PR o MAPS-XXX).

Cuando se cierre una version o entrega, mover [Sin publicar] a una version fechada:

## [0.1.0] - YYYY-MM-DD
-->
