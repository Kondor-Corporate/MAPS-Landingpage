# TDD-04: News Management Implementation

**Status**: En Desarrollo
**Prioridad**: Alta
**Módulo**: Admin + Backend
**Endpoint Backend**: `POST/GET/PUT/DELETE /api/v1/news` ❌ NO IMPLEMENTADO

---

## 📋 Descripción

Implementar el sistema completo de gestión de noticias (CRUD). Permitir que admins creen, editen y publiquen artículos que se muestren en el sitio público.

---

## 🎯 Objetivo

1. Crear endpoint CRUD de noticias en backend
2. Implementar página de gestión de noticias en admin
3. Mostrar noticias en sitio público
4. Soporte para publicación programada

---

## 📁 Archivos a Crear/Modificar

### Backend - A CREAR

#### 1. **Schema Prisma (YA EXISTE)**
```
✅ /backend/prisma/schema.prisma
```

Modelo `Noticia` ya está definido:
```prisma
model Noticia {
  id          Int      @id @default(autoincrement())
  titulo      String   @db.VarChar(255)
  slug        String   @unique @db.VarChar(255)
  descripcion String   @db.VarChar(500)
  contenido   String   @db.Text
  imagenUrl   String   @db.VarChar(500)
  publicada   Boolean  @default(false)
  publicadaEn DateTime?
  visibilidad String   @default("publica") // "publica", "privada", "borrador"
  autorId     Int
  autor       Usuario  @relation(fields: [autorId], references: [id])
  creadoEn    DateTime @default(now())
  actualizadoEn DateTime @updatedAt

  @@index([slug])
  @@index([publicadaEn])
}
```

#### 2. **Crear ruta de noticias**
```
📁 /backend/src/api/v1/routes/
    └── news.routes.ts (CREAR)
```

**Estructura:**
```typescript
export const newsRouter = Router();

newsRouter.get('/', newsController.getAll);
newsRouter.get('/:slug', newsController.getBySlug);
newsRouter.post('/', authenticate, authorize(['ADMIN', 'SUPERADMIN']), validate(createNewsSchema), newsController.create);
newsRouter.put('/:id', authenticate, authorize(['ADMIN', 'SUPERADMIN']), newsController.update);
newsRouter.delete('/:id', authenticate, authorize(['SUPERADMIN']), newsController.delete);
newsRouter.patch('/:id/publish', authenticate, authorize(['ADMIN', 'SUPERADMIN']), newsController.publish);
```

#### 3. **Crear controlador**
```
📁 /backend/src/controllers/
    └── news.controller.ts (CREAR)
```

**Funciones:**
- `getAll(req, res)` - Listar (público/filtrado por estado)
- `getBySlug(req, res)` - Obtener una por slug
- `create(req, res)` - Crear nueva
- `update(req, res)` - Actualizar
- `delete(req, res)` - Eliminar
- `publish(req, res)` - Publicar

#### 4. **Crear servicio**
```
📁 /backend/src/services/
    └── news.service.ts (CREAR)
```

**Funciones:**
- `createNews(data, usuarioId)` - Crear
- `updateNews(id, data)` - Actualizar
- `deleteNews(id)` - Eliminar
- `getNewsList(filters, pagination)` - Listar con filtros
- `getNewsBySlug(slug)` - Por slug
- `publishNews(id)` - Publicar
- `generateSlug(titulo)` - Generar slug único

#### 5. **Crear schemas de validación**
```
📁 /backend/src/schemas/
    └── news.schema.ts (CREAR)
```

**Validación:**
```typescript
export const createNewsSchema = z.object({
  titulo: z.string().min(5).max(255),
  descripcion: z.string().min(10).max(500),
  contenido: z.string().min(50),
  imagenUrl: z.string().url(),
  visibilidad: z.enum(['publica', 'privada', 'borrador']).default('borrador')
});
```

#### 6. **Registrar ruta**
```
📁 /backend/src/api/v1/
    └── index.ts (ACTUALIZAR)
```

### Frontend - A CREAR/MODIFICAR

#### 1. **Crear página de gestión de noticias**
```
📁 /frontend/src/modules/admin/pages/
    └── NewsManagementPage.tsx (ACTUALIZAR)
```

**Cambios:**
- Implementar interfaz completa (ahora solo retorna null)
- Listar noticias en tabla
- Botones: Crear, Editar, Eliminar, Publicar
- Paginación y filtros

#### 2. **Crear componente de tabla de noticias**
```
📁 /frontend/src/modules/admin/components/
    └── NewsTable.tsx (CREAR)
```

**Elementos:**
- Tabla con columnas: Título, Fecha, Estado, Acciones
- Estado visual: Borrador, Publicado, Privado
- Acciones: Ver, Editar, Eliminar, Publicar
- Seleccionar múltiples para acciones en lote

#### 3. **Crear formulario de noticia**
```
📁 /frontend/src/modules/admin/components/
    └── NewsForm.tsx (CREAR)
```

**Campos:**
- Título (text input)
- Slug (auto-generado)
- Descripción (textarea)
- Contenido (editor rich text)
- Imagen (upload o URL)
- Visibilidad (select: pública/privada/borrador)
- Publicar automáticamente

#### 4. **Crear modal de edición**
```
📁 /frontend/src/modules/admin/components/
    └── NewsEditModal.tsx (CREAR)
```

#### 5. **Crear hook de noticias**
```
📁 /frontend/src/modules/admin/hooks/
    └── useNews.ts (CREAR)
```

**Funciones:**
- `getNews(filters?)`: Obtener lista
- `createNews(data)`: Crear
- `updateNews(id, data)`: Actualizar
- `deleteNews(id)`: Eliminar
- `publishNews(id)`: Publicar
- Loading y error states

#### 6. **Crear servicio de noticias**
```
📁 /frontend/src/shared/services/
    └── newsService.ts (CREAR)
```

**Funciones:**
- `getAllNews(params)`: GET /news
- `getNewsBySlug(slug)`: GET /news/:slug
- `createNews(data)`: POST /news
- `updateNews(id, data)`: PUT /news/:id
- `deleteNews(id)`: DELETE /news/:id
- `publishNews(id)`: PATCH /news/:id/publish

#### 7. **Crear página pública de noticias**
```
📁 /frontend/src/modules/public-web/pages/
    └── NewsPage.tsx (CREAR O ACTUALIZAR)
```

**Elementos:**
- Listado de noticias publicadas
- Búsqueda y filtros
- Link a detalle de noticia

#### 8. **Crear página de detalle de noticia**
```
📁 /frontend/src/modules/public-web/pages/
    └── NewsDetailPage.tsx (CREAR)
```

**Elementos:**
- Imagen destacada
- Título y meta data
- Contenido completo
- Autor y fecha
- Noticias relacionadas (opcional)

#### 9. **Crear schemas de validación**
```
📁 /frontend/src/modules/admin/schemas/
    └── newsFormSchema.ts (CREAR)
```

#### 10. **Actualizar tipos TypeScript**
```
📁 /frontend/src/shared/types/
    └── news.types.ts (CREAR)
```

```typescript
export interface News {
  id: number;
  titulo: string;
  slug: string;
  descripcion: string;
  contenido: string;
  imagenUrl: string;
  publicada: boolean;
  publicadaEn?: string;
  visibilidad: 'publica' | 'privada' | 'borrador';
  autorId: number;
  autor: {
    id: number;
    usuario: string;
  };
  creadoEn: string;
  actualizadoEn: string;
}
```

---

## 🔌 Endpoints Backend (A CREAR)

### GET /api/v1/news
Obtener lista de noticias (públicas por defecto)

**Query Parameters:**
- `pagina` (default: 1)
- `limite` (default: 10)
- `buscar` (string, optional)
- `visibilidad` (solo si es admin)

**Response (200 OK):**
```json
{
  "data": {
    "noticias": [
      {
        "id": 1,
        "titulo": "Nuevo proyecto de MAPS",
        "slug": "nuevo-proyecto-maps",
        "descripcion": "Descripción corta...",
        "imagenUrl": "https://...",
        "publicada": true,
        "publicadaEn": "2024-05-18T10:00:00Z",
        "autor": { "usuario": "admin" },
        "creadoEn": "2024-05-18T10:00:00Z"
      }
    ],
    "total": 25,
    "pagina": 1,
    "totalPaginas": 3
  },
  "message": "OK",
  "error": null
}
```

---

### GET /api/v1/news/:slug
Obtener noticia por slug

**Response (200 OK):**
```json
{
  "data": {
    "id": 1,
    "titulo": "Nuevo proyecto de MAPS",
    "slug": "nuevo-proyecto-maps",
    "descripcion": "...",
    "contenido": "Contenido HTML largo...",
    "imagenUrl": "https://...",
    "publicada": true,
    "publicadaEn": "2024-05-18T10:00:00Z",
    "visibilidad": "publica",
    "autor": {
      "id": 1,
      "usuario": "admin"
    },
    "creadoEn": "2024-05-18T10:00:00Z",
    "actualizadoEn": "2024-05-18T10:00:00Z"
  },
  "message": "OK",
  "error": null
}
```

---

### POST /api/v1/news
Crear nueva noticia (solo admin)

**Autenticación:** Bearer token + rol ADMIN/SUPERADMIN

**Request:**
```json
{
  "titulo": "Nueva noticia",
  "descripcion": "Descripción corta de la noticia...",
  "contenido": "<p>Contenido HTML...</p>",
  "imagenUrl": "https://example.com/image.jpg",
  "visibilidad": "borrador"
}
```

**Response (201 Created):**
```json
{
  "data": {
    "id": 5,
    "titulo": "Nueva noticia",
    "slug": "nueva-noticia",
    "visibilidad": "borrador",
    "publicada": false,
    "creadoEn": "2024-05-18T10:00:00Z"
  },
  "message": "Noticia creada exitosamente",
  "error": null
}
```

---

### PUT /api/v1/news/:id
Actualizar noticia (solo admin)

**Request:**
```json
{
  "titulo": "Título actualizado",
  "descripcion": "Nueva descripción...",
  "contenido": "Contenido actualizado...",
  "imagenUrl": "https://...",
  "visibilidad": "publica"
}
```

---

### DELETE /api/v1/news/:id
Eliminar noticia (solo superadmin)

**Response (200 OK):**
```json
{
  "data": null,
  "message": "Noticia eliminada",
  "error": null
}
```

---

### PATCH /api/v1/news/:id/publish
Publicar noticia (solo admin)

**Request:**
```json
{
  "publicar": true
}
```

---

## 🏗️ Estructura de Código (Ejemplo)

### news.schema.ts (Backend)
```typescript
import { z } from 'zod';

export const createNewsSchema = z.object({
  titulo: z
    .string()
    .min(5, 'Título muy corto')
    .max(255, 'Título muy largo'),
  descripcion: z
    .string()
    .min(10, 'Descripción muy corta')
    .max(500, 'Descripción muy larga'),
  contenido: z
    .string()
    .min(50, 'Contenido muy corto'),
  imagenUrl: z
    .string()
    .url('URL de imagen inválida'),
  visibilidad: z
    .enum(['publica', 'privada', 'borrador'])
    .default('borrador')
});

export type CreateNewsInput = z.infer<typeof createNewsSchema>;
```

### newsService.ts (Backend)
```typescript
import { prisma } from '@/lib/prisma';
import slug from 'slug';

export const newsService = {
  async createNews(data: CreateNewsInput, autorId: number) {
    const newsSlug = slug(data.titulo).toLowerCase();

    return await prisma.noticia.create({
      data: {
        ...data,
        slug: newsSlug,
        autorId
      }
    });
  },

  async getNews(page = 1, limit = 10, isAdmin = false) {
    const skip = (page - 1) * limit;

    const where = isAdmin
      ? {}
      : { publicada: true, visibilidad: 'publica' };

    const [noticias, total] = await Promise.all([
      prisma.noticia.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publicadaEn: 'desc' },
        include: { autor: { select: { usuario: true } } }
      }),
      prisma.noticia.count({ where })
    ]);

    return {
      noticias,
      total,
      pagina: page,
      totalPaginas: Math.ceil(total / limit)
    };
  },

  async getNewsBySlug(newsSlug: string) {
    return await prisma.noticia.findUnique({
      where: { slug: newsSlug },
      include: { autor: true }
    });
  },

  async updateNews(id: number, data: Partial<CreateNewsInput>) {
    return await prisma.noticia.update({
      where: { id },
      data
    });
  },

  async deleteNews(id: number) {
    return await prisma.noticia.delete({ where: { id } });
  },

  async publishNews(id: number) {
    return await prisma.noticia.update({
      where: { id },
      data: {
        publicada: true,
        publicadaEn: new Date()
      }
    });
  }
};
```

### newsService.ts (Frontend)
```typescript
import axios from 'axios';
import type { News } from '@shared/types/news.types';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export const newsService = {
  async getAllNews(page = 1, limit = 10) {
    const response = await axios.get(`${API_BASE}/news`, {
      params: { pagina: page, limite: limit },
      withCredentials: true
    });
    return response.data.data;
  },

  async getNewsBySlug(slug: string) {
    const response = await axios.get(`${API_BASE}/news/${slug}`);
    return response.data.data;
  },

  async createNews(data: any) {
    const response = await axios.post(`${API_BASE}/news`, data, {
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      withCredentials: true
    });
    return response.data.data;
  },

  async updateNews(id: number, data: any) {
    const response = await axios.put(`${API_BASE}/news/${id}`, data, {
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      withCredentials: true
    });
    return response.data.data;
  },

  async deleteNews(id: number) {
    await axios.delete(`${API_BASE}/news/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      withCredentials: true
    });
  },

  async publishNews(id: number) {
    const response = await axios.patch(
      `${API_BASE}/news/${id}/publish`,
      { publicar: true },
      {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        withCredentials: true
      }
    );
    return response.data.data;
  }
};
```

### useNews.ts (Frontend Hook)
```typescript
import { useState, useCallback } from 'react';
import { newsService } from '@shared/services/newsService';
import type { News } from '@shared/types/news.types';

export const useNews = () => {
  const [noticias, setNoticias] = useState<News[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ pagina: 1, total: 0 });

  const getNews = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const data = await newsService.getAllNews(page);
      setNoticias(data.noticias);
      setPagination({ pagina: data.pagina, total: data.total });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createNews = useCallback(async (data: any) => {
    setLoading(true);
    setError(null);
    try {
      const nuevaNoticia = await newsService.createNews(data);
      setNoticias([nuevaNoticia, ...noticias]);
      return nuevaNoticia;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [noticias]);

  return { noticias, loading, error, pagination, getNews, createNews };
};
```

---

## 🧪 Casos de Prueba

### Test 1: Crear noticia como admin
- **Given**: Admin logueado
- **When**: Completa formulario y envía
- **Then**: POST a `/news`
- **Expected**: Noticia se guarda como borrador

### Test 2: Publicar noticia
- **Given**: Noticia en estado borrador
- **When**: Admin clica "Publicar"
- **Then**: PATCH a `/news/:id/publish`
- **Expected**: Noticia visible en sitio público

### Test 3: Editar noticia publicada
- **Given**: Noticia publicada
- **When**: Admin modifica contenido
- **Then**: PUT a `/news/:id`
- **Expected**: Cambios se guardan

### Test 4: Ver noticias públicas
- **Given**: Usuario en sitio público
- **When**: Accede a /noticias
- **Then**: GET `/news` sin filtro admin
- **Expected**: Solo noticias publicadas se muestran

### Test 5: Eliminar noticia
- **Given**: Superadmin
- **When**: Clica eliminar
- **Then**: DELETE `/news/:id`
- **Expected**: Noticia se borra completamente

---

## 🔐 Seguridad

- ✅ Solo admins pueden crear/editar
- ✅ Solo superadmins pueden eliminar
- ✅ Validar ownership si aplica
- ✅ Rate limiting en creación
- ✅ Sanitizar contenido HTML (proteger XSS)

---

## 📊 Checklist de Implementación

### Backend
- [ ] Tablas Prisma ya existen
- [ ] Crear `news.routes.ts`
- [ ] Crear `news.controller.ts`
- [ ] Crear `news.service.ts`
- [ ] Crear `news.schema.ts` con validaciones
- [ ] Registrar rutas en `/api/v1/index.ts`
- [ ] Implementar autorización
- [ ] Tests para endpoints

### Frontend
- [ ] Crear `newsService.ts`
- [ ] Crear `useNews.ts` hook
- [ ] Actualizar `NewsManagementPage.tsx`
- [ ] Crear `NewsTable.tsx`
- [ ] Crear `NewsForm.tsx`
- [ ] Crear `NewsPage.tsx` (pública)
- [ ] Crear `NewsDetailPage.tsx`
- [ ] Crear rutas en router
- [ ] Tests para servicios y hooks

---

## 🔗 Referencias

- [Backend Routes Structure](../TDD-01-AUTH-REFRESH-TOKEN.md)
- [Slug Generation](https://github.com/dodo/node-slug)
- [Rich Text Editor Options](https://github.com/saleebm/react-quill)
