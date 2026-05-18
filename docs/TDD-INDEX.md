# TDD Index - MAPS Landingpage Implementation Plan

**Última actualización**: 2024-05-18
**Versión**: 1.0

---

## 📋 Resumen Ejecutivo

Este documento actúa como índice de todos los Technical Design Documents (TDD) necesarios para completar la implementación de las características del backend que aún no están disponibles en el frontend.

### Estado General

| Componente | Backend | Frontend | Prioridad | Documento |
|---|---|---|---|---|
| Auth Login | ✅ Implementado | ✅ Implementado | - | - |
| Auth Refresh Token | ✅ Implementado | ❌ NO | Alta | [TDD-01](./TDD-01-AUTH-REFRESH-TOKEN.md) |
| Auth Logout | ✅ Implementado | ❌ NO | Alta | [TDD-02](./TDD-02-AUTH-LOGOUT.md) |
| Contact Form | ❌ NO | 🟡 Mockeado | Media | [TDD-03](./TDD-03-CONTACT-FORM.md) |
| News Management | ❌ NO | ❌ NO | Alta | [TDD-04](./TDD-04-NEWS-MANAGEMENT.md) |
| Producers Management | ❌ NO | ❌ NO | Alta | [TDD-05](./TDD-05-PRODUCERS-MANAGEMENT.md) |
| Digital Library | ❌ NO | ❌ NO | Media | [TDD-06](./TDD-06-DIGITAL-LIBRARY.md) |

---

## 🎯 Documentos por Prioridad

### 🔴 PRIORIDAD ALTA (Implementar primero)

#### 1. **TDD-01: Auth Refresh Token**
- **Descripción**: Implementar renovación automática de tokens
- **Tiempo estimado**: 2-3 horas
- **Dependencias**: Ninguna (backend ya existe)
- **Archivos principales**:
  - Frontend: `authService.ts`, `useAuth.ts`, `httpClient.ts`
- **Link**: [TDD-01-AUTH-REFRESH-TOKEN.md](./TDD-01-AUTH-REFRESH-TOKEN.md)

**Por qué es prioritario**:
- Los tokens acceso expiran cada 15 minutos
- Sin esto, los usuarios serán desconectados frecuentemente
- Afecta toda la experiencia de usuario autenticado

---

#### 2. **TDD-02: Auth Logout**
- **Descripción**: Implementar cerrar sesión segura
- **Tiempo estimado**: 1-2 horas
- **Dependencias**: TDD-01 (parcialmente)
- **Archivos principales**:
  - Frontend: `Navbar.tsx`, `useAuth.ts`, `authService.ts`
- **Link**: [TDD-02-AUTH-LOGOUT.md](./TDD-02-AUTH-LOGOUT.md)

**Por qué es prioritario**:
- Feature fundamental de seguridad
- Necesario antes de publicar
- Bloquea protección de rutas

---

#### 3. **TDD-04: News Management**
- **Descripción**: CRUD completo de noticias
- **Tiempo estimado**: 6-8 horas
- **Dependencias**: TDD-01, TDD-02 (para proteger rutas)
- **Archivos principales**:
  - Backend: routes, controller, service, schema
  - Frontend: pages, components, hooks, services
- **Link**: [TDD-04-NEWS-MANAGEMENT.md](./TDD-04-NEWS-MANAGEMENT.md)

**Por qué es prioritario**:
- Módulo core del sitio público
- Requiere más archivos
- Beneficia de autenticación completa

---

#### 4. **TDD-05: Producers Management**
- **Descripción**: CRUD de productores y directorio público
- **Tiempo estimado**: 8-10 horas
- **Dependencias**: TDD-01, TDD-02
- **Archivos principales**:
  - Backend: routes, controller, service, schema
  - Frontend: pages, components, hooks, services
- **Link**: [TDD-05-PRODUCERS-MANAGEMENT.md](./TDD-05-PRODUCERS-MANAGEMENT.md)

**Por qué es prioritario**:
- Valor principal del negocio (directorio de productores)
- Requiere integración con usuario/autenticación
- Complejidad media-alta

---

### 🟡 PRIORIDAD MEDIA (Después de prioritarios altos)

#### 5. **TDD-03: Contact Form**
- **Descripción**: Implementar endpoint y conectar formulario de contacto
- **Tiempo estimado**: 2-3 horas
- **Dependencias**: Ninguna especial
- **Archivos principales**:
  - Backend: routes, controller, service, schema
  - Frontend: useContactForm.ts, ContactFormModal.tsx
- **Link**: [TDD-03-CONTACT-FORM.md](./TDD-03-CONTACT-FORM.md)

**Por qué es media prioridad**:
- Frontend ya está 90% hecho
- Solo necesita conectar endpoint
- No bloquea otras features

---

#### 6. **TDD-06: Digital Library**
- **Descripción**: Sistema de gestión de recursos educativos
- **Tiempo estimado**: 8-10 horas
- **Dependencias**: TDD-01, TDD-02
- **Archivos principales**:
  - Backend: routes, controller, service, schema, middleware upload
  - Frontend: pages, components, hooks, services
- **Link**: [TDD-06-DIGITAL-LIBRARY.md](./TDD-06-DIGITAL-LIBRARY.md)

**Por qué es media prioridad**:
- Funcionalidad secundaria
- Requiere setup de storage (S3 o local)
- No afecta otras features

---

## 🗂️ Estructura de Archivos por TDD

### TDD-01: Auth Refresh Token

**Backend**: ✅ Completo
- `/backend/src/api/v1/routes/auth.routes.ts`
- `/backend/src/controllers/auth.controller.ts`
- `/backend/src/services/auth.service.ts`

**Frontend - A Crear/Modificar**:
```
frontend/src/
├── shared/
│   ├── services/
│   │   └── authService.ts (CREATE)
│   └── utils/
│       └── httpClient.ts (CREATE - interceptor)
└── modules/auth/
    └── hooks/
        └── useAuth.ts (CREATE/UPDATE)
```

---

### TDD-02: Auth Logout

**Backend**: ✅ Completo
- `/backend/src/api/v1/routes/auth.routes.ts`
- `/backend/src/controllers/auth.controller.ts`

**Frontend - A Crear/Modificar**:
```
frontend/src/
├── shared/
│   ├── components/
│   │   └── Navbar.tsx (CREATE)
│   └── layout/
│       └── MainLayout.tsx (CREATE/UPDATE)
└── modules/auth/
    └── hooks/
        └── useAuth.ts (UPDATE - add logout)
```

---

### TDD-03: Contact Form

**Backend - A Crear**:
```
backend/src/
├── api/v1/routes/
│   └── contact.routes.ts (CREATE)
├── controllers/
│   └── contact.controller.ts (CREATE)
├── services/
│   └── contact.service.ts (CREATE)
└── schemas/
    └── contact.schema.ts (CREATE)
```

**Prisma**: `schema.prisma` - ADD `Contacto` model

**Frontend - A Modificar**:
```
frontend/src/
├── shared/services/
│   └── contactService.ts (CREATE)
└── modules/public-web/
    ├── hooks/
    │   └── useContactForm.ts (UPDATE)
    └── components/
        └── ContactFormModal.tsx (UPDATE)
```

---

### TDD-04: News Management

**Backend - A Crear**:
```
backend/src/
├── api/v1/routes/
│   └── news.routes.ts (CREATE)
├── controllers/
│   └── news.controller.ts (CREATE)
├── services/
│   └── news.service.ts (CREATE)
└── schemas/
    └── news.schema.ts (CREATE)
```

**Prisma**: ✅ `Noticia` model existe

**Frontend - A Crear/Actualizar**:
```
frontend/src/
├── shared/
│   ├── services/
│   │   └── newsService.ts (CREATE)
│   └── types/
│       └── news.types.ts (CREATE)
└── modules/
    ├── admin/
    │   ├── pages/
    │   │   └── NewsManagementPage.tsx (UPDATE)
    │   ├── components/
    │   │   ├── NewsTable.tsx (CREATE)
    │   │   └── NewsForm.tsx (CREATE)
    │   ├── hooks/
    │   │   └── useNews.ts (CREATE)
    │   └── schemas/
    │       └── newsFormSchema.ts (CREATE)
    └── public-web/
        └── pages/
            ├── NewsPage.tsx (CREATE)
            └── NewsDetailPage.tsx (CREATE)
```

---

### TDD-05: Producers Management

**Backend - A Crear**:
```
backend/src/
├── api/v1/routes/
│   └── producers.routes.ts (CREATE)
├── controllers/
│   └── producers.controller.ts (CREATE)
├── services/
│   └── producers.service.ts (CREATE)
└── schemas/
    └── producers.schema.ts (CREATE)
```

**Prisma**: ✅ `Productor` y `RedSocial` existen

**Frontend - A Crear/Actualizar**:
```
frontend/src/
├── shared/
│   ├── services/
│   │   └── producersService.ts (CREATE)
│   └── types/
│       └── producers.types.ts (CREATE)
└── modules/
    ├── admin/
    │   ├── pages/
    │   │   └── ProducersPage.tsx (UPDATE)
    │   ├── components/
    │   │   ├── ProducersTable.tsx (UPDATE)
    │   │   ├── ProducerForm.tsx (CREATE)
    │   │   └── ProducerEditModal.tsx (CREATE)
    │   ├── hooks/
    │   │   └── useProducers.ts (CREATE)
    │   └── schemas/
    │       └── producerFormSchema.ts (CREATE)
    └── public-web/
        ├── pages/
        │   ├── DirectoryPage.tsx (CREATE)
        │   └── ProducerProfilePage.tsx (CREATE)
        └── components/
            └── ProducerCard.tsx (CREATE)
```

---

### TDD-06: Digital Library

**Backend - A Crear**:
```
backend/src/
├── api/v1/routes/
│   └── library.routes.ts (CREATE)
├── controllers/
│   └── library.controller.ts (CREATE)
├── services/
│   └── library.service.ts (CREATE)
├── schemas/
│   └── library.schema.ts (CREATE)
└── middleware/
    └── fileUpload.middleware.ts (CREATE)
```

**Prisma**: ✅ `Biblioteca`, `Ramo`, `Recurso` existen

**Frontend - A Crear/Actualizar**:
```
frontend/src/
├── shared/
│   ├── services/
│   │   └── libraryService.ts (CREATE)
│   └── types/
│       └── library.types.ts (CREATE)
└── modules/
    ├── intranet/
    │   ├── pages/
    │   │   └── DigitalLibraryPage.tsx (UPDATE)
    │   ├── components/
    │   │   ├── LibraryTree.tsx (CREATE)
    │   │   └── ResourcesTable.tsx (CREATE)
    │   └── hooks/
    │       └── useLibrary.ts (CREATE)
    └── admin/
        └── components/
            └── FileUploadForm.tsx (CREATE)
```

---

## 🚀 Plan de Implementación Recomendado

### Fase 1: Autenticación Completa (Semana 1)

1. ✅ TDD-01: Auth Refresh Token
   - Crear `authService.ts` con `refreshAccessToken()`
   - Crear `httpClient.ts` con interceptores
   - Actualizar `useAuth.ts` hook
   - **Duración**: 2-3 horas

2. ✅ TDD-02: Auth Logout
   - Añadir `logout()` a `authService.ts`
   - Crear `Navbar.tsx` con botón logout
   - Actualizar `MainLayout.tsx`
   - **Duración**: 1-2 horas

3. ⏸️ TDD-03: Contact Form
   - Implementar endpoint backend
   - Conectar frontend hook
   - **Duración**: 2-3 horas

**Total Fase 1**: 5-8 horas (incluyendo TDD-03 es media prioridad)

---

### Fase 2: Core Features (Semana 2)

1. ✅ TDD-04: News Management
   - Crear todas las rutas backend
   - Implementar admin panel
   - Crear página pública
   - **Duración**: 6-8 horas

2. ✅ TDD-05: Producers Management
   - Crear todas las rutas backend
   - Implementar admin panel
   - Crear directorio público
   - **Duración**: 8-10 horas

**Total Fase 2**: 14-18 horas

---

### Fase 3: Características Secundarias (Semana 3)

1. ✅ TDD-06: Digital Library
   - Crear rutas y servicios
   - Implementar upload de archivos
   - Crear interfaz de biblioteca
   - **Duración**: 8-10 horas

**Total Fase 3**: 8-10 horas

---

## 📊 Resumen de Horas

| TDD | Feature | Backend | Frontend | Total | Prioridad |
|---|---|---|---|---|---|
| 01 | Auth Refresh | 0h* | 2-3h | 2-3h | Alta |
| 02 | Auth Logout | 0h* | 1-2h | 1-2h | Alta |
| 03 | Contact Form | 2-3h | 1-2h | 3-5h | Media |
| 04 | News | 4-5h | 2-3h | 6-8h | Alta |
| 05 | Producers | 5-6h | 3-4h | 8-10h | Alta |
| 06 | Library | 5-6h | 3-4h | 8-10h | Media |
| **TOTAL** | | **16-20h** | **12-18h** | **28-38h** | |

*Endpoint ya implementado en backend

---

## 🔗 Relaciones Entre TDDs

```
TDD-01 (Refresh Token)
    ↓
TDD-02 (Logout)
    ├─→ TDD-04 (News) ← requiere auth
    ├─→ TDD-05 (Producers) ← requiere auth
    └─→ TDD-06 (Library) ← requiere auth

TDD-03 (Contact) ← independiente pero opcional
```

---

## ✅ Checklist de Validación

Para cada TDD completado, verificar:

- [ ] Backend: Rutas creadas y probadas
- [ ] Backend: Validaciones implementadas
- [ ] Backend: Errores manejados correctamente
- [ ] Backend: Tests unitarios escritos
- [ ] Backend: Tests de integración escritos
- [ ] Frontend: Servicio creado
- [ ] Frontend: Hook creado
- [ ] Frontend: Componentes creados
- [ ] Frontend: Tipos TypeScript definidos
- [ ] Frontend: Rutas añadidas si aplica
- [ ] Frontend: Tests escritos
- [ ] Frontend-Backend: Integración testada end-to-end
- [ ] Documentación actualizada
- [ ] Commit creado con cambios

---

## 📖 Cómo Usar Este Documento

1. **Leer primero**: Este documento (TDD-INDEX.md)
2. **Seleccionar TDD**: Basándose en prioridad
3. **Leer TDD**: El documento específico (ej. TDD-01-AUTH-REFRESH-TOKEN.md)
4. **Implementar**: Siguiendo estructura de archivos y checklist
5. **Validar**: Asegurando que se cumplan todos los requerimientos
6. **Testear**: End-to-end con backend ejecutándose
7. **Commit**: Con mensaje descriptivo

---

## 🆘 Referencias Cruzadas

- [Backend Setup](./README.md)
- [Frontend Architecture](./README.md)
- [API Documentation](./API.md) *(si existe)*
- [Database Schema](./SCHEMA.md) *(si existe)*

---

## 📝 Notas Importantes

1. **Backend DB**: Las tablas ya existen en Prisma para Contact, News, Producers, y Library
2. **Frontend Base URL**: Configurado en `/frontend/.env` como `VITE_API_BASE_URL`
3. **Autenticación**: Usa JWT con Bearer tokens en headers
4. **CORS**: Configurado en backend para `FRONTEND_ORIGIN`
5. **Cookies**: Refresh token se almacena en cookie httpOnly (automático si es posible)

---

**Última revisión**: 2024-05-18
**Versión**: 1.0
**Estado**: Listo para implementación
