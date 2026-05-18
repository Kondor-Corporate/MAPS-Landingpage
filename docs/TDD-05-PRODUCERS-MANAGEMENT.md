# TDD-05: Producers Management Implementation

**Status**: En Desarrollo
**Prioridad**: Alta
**Módulo**: Admin + Public Web + Backend
**Endpoint Backend**: `POST/GET/PUT/DELETE /api/v1/producers` ❌ NO IMPLEMENTADO

---

## 📋 Descripción

Implementar sistema completo de gestión de productores. Permitir que superadmins gestionen productores y que el sitio público muestre el directorio de productores con filtros.

---

## 🎯 Objetivo

1. Crear CRUD de productores en backend
2. Admin puede crear/editar/eliminar productores
3. Mostrar directorio público de productores
4. Filtrar por ubicación, categoría, etc.
5. Perfil individual de productor

---

## 📁 Archivos a Crear/Modificar

### Backend - A CREAR

#### 1. **Schemas Prisma (YA EXISTEN)**
```
✅ /backend/prisma/schema.prisma
```

Modelos ya definidos:
- `Productor`
- `RedSocial`

#### 2. **Crear ruta de productores**
```
📁 /backend/src/api/v1/routes/
    └── producers.routes.ts (CREAR)
```

**Estructura:**
```typescript
export const producersRouter = Router();

// Públicas
producersRouter.get('/', producersController.getAll);
producersRouter.get('/slug/:slug', producersController.getBySlug);

// Privadas (admin)
producersRouter.post('/', authenticate, authorize(['SUPERADMIN']), producersController.create);
producersRouter.put('/:id', authenticate, authorize(['SUPERADMIN']), producersController.update);
producersRouter.delete('/:id', authenticate, authorize(['SUPERADMIN']), producersController.delete);
```

#### 3. **Crear controlador**
```
📁 /backend/src/controllers/
    └── producers.controller.ts (CREAR)
```

**Funciones:**
- `getAll(req, res)` - Listar productores públicos
- `getBySlug(req, res)` - Obtener uno por slug
- `create(req, res)` - Crear nuevo
- `update(req, res)` - Actualizar
- `delete(req, res)` - Eliminar

#### 4. **Crear servicio**
```
📁 /backend/src/services/
    └── producers.service.ts (CREAR)
```

**Funciones:**
- `createProducer(data, usuarioId)` - Crear
- `updateProducer(id, data)` - Actualizar
- `deleteProducer(id)` - Eliminar
- `getProducersList(filters, pagination)` - Listar
- `getProducerBySlug(slug)` - Por slug
- `generateSlug(nombre, apellido)` - Generar slug único

#### 5. **Crear schemas de validación**
```
📁 /backend/src/schemas/
    └── producers.schema.ts (CREAR)
```

#### 6. **Registrar ruta**
```
📁 /backend/src/api/v1/
    └── index.ts (ACTUALIZAR)
```

### Frontend - A CREAR/MODIFICAR

#### 1. **Crear página de gestión de productores (Admin)**
```
📁 /frontend/src/modules/admin/pages/
    └── ProducersPage.tsx (ACTUALIZAR)
```

#### 2. **Crear tabla de productores**
```
📁 /frontend/src/modules/admin/components/
    └── ProducersTable.tsx (ACTUALIZAR - existe pero retorna null)
```

#### 3. **Crear formulario de productor**
```
📁 /frontend/src/modules/admin/components/
    └── ProducerForm.tsx (CREAR)
```

**Campos:**
- Datos usuario (correo, contraseña)
- Datos personales (nombre, apellido)
- Bio/descripción
- Foto (upload)
- Ubicación (ciudad, coordenadas)
- Teléfono
- Redes sociales (dinámicas)

#### 4. **Crear modal de edición**
```
📁 /frontend/src/modules/admin/components/
    └── ProducerEditModal.tsx (CREAR)
```

#### 5. **Crear hook de productores**
```
📁 /frontend/src/modules/admin/hooks/
    └── useProducers.ts (CREAR)
```

#### 6. **Crear servicio de productores**
```
📁 /frontend/src/shared/services/
    └── producersService.ts (CREAR)
```

#### 7. **Crear página pública de directorio**
```
📁 /frontend/src/modules/public-web/pages/
    └── DirectoryPage.tsx (CREAR)
```

**Elementos:**
- Listado de productores en tarjetas/grid
- Filtros: ubicación, búsqueda
- Mapa (opcional)
- Paginación

#### 8. **Crear página de perfil de productor**
```
📁 /frontend/src/modules/public-web/pages/
    └── ProducerProfilePage.tsx (CREAR)
```

**Elementos:**
- Foto del productor
- Nombre y datos
- Bio completa
- Redes sociales (links)
- Ubicación (mapa)
- Productos/recursos (opcional)

#### 9. **Crear componente de tarjeta de productor**
```
📁 /frontend/src/modules/public-web/components/
    └── ProducerCard.tsx (CREAR)
```

#### 10. **Crear tipos TypeScript**
```
📁 /frontend/src/shared/types/
    └── producers.types.ts (CREAR)
```

---

## 🔌 Endpoints Backend (A CREAR)

### GET /api/v1/producers
Obtener lista de productores

**Query Parameters:**
- `pagina` (default: 1)
- `limite` (default: 12)
- `ciudad` (string, opcional)
- `buscar` (string, opcional)
- `ordenar` (nombre|fecha, default: nombre)

**Response (200 OK):**
```json
{
  "data": {
    "productores": [
      {
        "id": 1,
        "slug": "juan-garcia",
        "nombre": "Juan",
        "apellido": "García",
        "bio": "Productor de café orgánico en Quindío...",
        "ciudad": "Armenia",
        "foto": "https://...",
        "latitud": 4.5,
        "longitud": -75.5,
        "usuario": {
          "usuario": "jgarcia"
        },
        "redesSociales": [
          {
            "plataforma": "instagram",
            "url": "https://instagram.com/jgarcia"
          }
        ]
      }
    ],
    "total": 45,
    "pagina": 1,
    "totalPaginas": 4
  },
  "message": "OK",
  "error": null
}
```

---

### GET /api/v1/producers/slug/:slug
Obtener perfil completo de productor

**Response (200 OK):**
```json
{
  "data": {
    "id": 1,
    "slug": "juan-garcia",
    "nombre": "Juan",
    "apellido": "García",
    "bio": "Descripción completa...",
    "ciudad": "Armenia",
    "dni": "1234567890",
    "foto": "https://...",
    "latitud": 4.5,
    "longitud": -75.5,
    "telefono": "+573001234567",
    "usuario": {
      "id": 5,
      "usuario": "jgarcia"
    },
    "redesSociales": [
      {
        "id": 1,
        "plataforma": "instagram",
        "url": "https://instagram.com/jgarcia",
        "orden": 1
      },
      {
        "id": 2,
        "plataforma": "facebook",
        "url": "https://facebook.com/jgarcia",
        "orden": 2
      }
    ],
    "creadoEn": "2024-01-15T10:00:00Z",
    "actualizadoEn": "2024-05-18T10:00:00Z"
  },
  "message": "OK",
  "error": null
}
```

---

### POST /api/v1/producers
Crear nuevo productor (solo superadmin)

**Autenticación:** Bearer token + rol SUPERADMIN

**Request:**
```json
{
  "usuario": "jgarcia",
  "password": "SecurePassword123",
  "nombre": "Juan",
  "apellido": "García",
  "bio": "Productor de café orgánico con 15 años de experiencia...",
  "ciudad": "Armenia",
  "dni": "1234567890",
  "foto": "https://example.com/photo.jpg",
  "latitud": 4.5,
  "longitud": -75.5,
  "telefono": "+573001234567",
  "redesSociales": [
    {
      "plataforma": "instagram",
      "url": "https://instagram.com/jgarcia",
      "orden": 1
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "data": {
    "id": 25,
    "slug": "juan-garcia",
    "nombre": "Juan",
    "apellido": "García",
    "usuario": {
      "usuario": "jgarcia"
    }
  },
  "message": "Productor creado exitosamente",
  "error": null
}
```

---

### PUT /api/v1/producers/:id
Actualizar productor (solo superadmin)

**Request:**
```json
{
  "nombre": "Juan",
  "apellido": "García Pérez",
  "bio": "Nueva bio...",
  "ciudad": "Pereira",
  "foto": "https://...",
  "latitud": 4.8,
  "longitud": -75.7,
  "telefono": "+573009876543",
  "redesSociales": [
    {
      "plataforma": "instagram",
      "url": "https://instagram.com/jgarcia2",
      "orden": 1
    }
  ]
}
```

---

### DELETE /api/v1/producers/:id
Eliminar productor (solo superadmin)

**Response (200 OK):**
```json
{
  "data": null,
  "message": "Productor eliminado",
  "error": null
}
```

---

## 🏗️ Estructura de Código (Ejemplo)

### producers.schema.ts (Backend)
```typescript
import { z } from 'zod';

export const createProducerSchema = z.object({
  usuario: z
    .string()
    .min(3)
    .max(50),
  password: z
    .string()
    .min(8, 'Contraseña muy corta'),
  nombre: z
    .string()
    .min(2)
    .max(100),
  apellido: z
    .string()
    .min(2)
    .max(100),
  bio: z
    .string()
    .min(20)
    .max(2000),
  ciudad: z
    .string()
    .min(2)
    .max(100),
  dni: z
    .string()
    .regex(/^\d{8,12}$/, 'DNI inválido'),
  foto: z
    .string()
    .url(),
  latitud: z
    .number()
    .min(-90)
    .max(90),
  longitud: z
    .number()
    .min(-180)
    .max(180),
  telefono: z
    .string()
    .regex(/^\+?[\d\s\-\(\)]{7,}$/, 'Teléfono inválido'),
  redesSociales: z
    .array(z.object({
      plataforma: z.string(),
      url: z.string().url(),
      orden: z.number()
    }))
    .optional()
});

export type CreateProducerInput = z.infer<typeof createProducerSchema>;
```

### producersService.ts (Backend)
```typescript
import { prisma } from '@/lib/prisma';
import { hash } from 'bcrypt';
import slug from 'slug';

export const producersService = {
  async createProducer(data: CreateProducerInput) {
    const hashedPassword = await hash(data.password, 10);
    const producerSlug = slug(`${data.nombre}-${data.apellido}`);

    const usuario = await prisma.usuario.create({
      data: {
        usuario: data.usuario,
        passwordHash: hashedPassword,
        rol: 'PRODUCTOR',
        activo: true
      }
    });

    const productor = await prisma.productor.create({
      data: {
        usuarioId: usuario.id,
        slug: producerSlug,
        nombre: data.nombre,
        apellido: data.apellido,
        bio: data.bio,
        ciudad: data.ciudad,
        dni: data.dni,
        foto: data.foto,
        latitud: data.latitud,
        longitud: data.longitud,
        telefono: data.telefono
      },
      include: {
        usuario: { select: { usuario: true } }
      }
    });

    // Crear redes sociales si existen
    if (data.redesSociales?.length > 0) {
      await prisma.redSocial.createMany({
        data: data.redesSociales.map(rs => ({
          productorId: productor.id,
          plataforma: rs.plataforma,
          url: rs.url,
          orden: rs.orden
        }))
      });
    }

    return productor;
  },

  async getProducersList(page = 1, limit = 12, filters = {}) {
    const skip = (page - 1) * limit;

    const [productores, total] = await Promise.all([
      prisma.productor.findMany({
        skip,
        take: limit,
        where: filters,
        orderBy: { nombre: 'asc' },
        include: {
          usuario: { select: { usuario: true } },
          redesSociales: true
        }
      }),
      prisma.productor.count({ where: filters })
    ]);

    return {
      productores,
      total,
      pagina: page,
      totalPaginas: Math.ceil(total / limit)
    };
  },

  async getProducerBySlug(producerSlug: string) {
    return await prisma.productor.findUnique({
      where: { slug: producerSlug },
      include: {
        usuario: { select: { id: true, usuario: true } },
        redesSociales: {
          orderBy: { orden: 'asc' }
        }
      }
    });
  },

  async updateProducer(id: number, data: any) {
    const { redesSociales, ...producerData } = data;

    const productor = await prisma.productor.update({
      where: { id },
      data: producerData,
      include: {
        usuario: { select: { usuario: true } },
        redesSociales: true
      }
    });

    // Actualizar redes sociales si se proporcionan
    if (redesSociales) {
      await prisma.redSocial.deleteMany({ where: { productorId: id } });
      await prisma.redSocial.createMany({
        data: redesSociales.map((rs: any) => ({
          productorId: id,
          plataforma: rs.plataforma,
          url: rs.url,
          orden: rs.orden
        }))
      });
    }

    return productor;
  },

  async deleteProducer(id: number) {
    const productor = await prisma.productor.delete({
      where: { id }
    });

    // Opcional: eliminar también al usuario asociado
    if (productor.usuarioId) {
      await prisma.usuario.delete({ where: { id: productor.usuarioId } });
    }

    return productor;
  }
};
```

### producersService.ts (Frontend)
```typescript
import axios from 'axios';
import type { Productor } from '@shared/types/producers.types';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export const producersService = {
  async getAllProducers(page = 1, filters: any = {}) {
    const response = await axios.get(`${API_BASE}/producers`, {
      params: { pagina: page, ...filters }
    });
    return response.data.data;
  },

  async getProducerBySlug(slug: string): Promise<Productor> {
    const response = await axios.get(`${API_BASE}/producers/slug/${slug}`);
    return response.data.data;
  },

  async createProducer(data: any) {
    const response = await axios.post(`${API_BASE}/producers`, data, {
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      withCredentials: true
    });
    return response.data.data;
  },

  async updateProducer(id: number, data: any) {
    const response = await axios.put(`${API_BASE}/producers/${id}`, data, {
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      withCredentials: true
    });
    return response.data.data;
  },

  async deleteProducer(id: number) {
    await axios.delete(`${API_BASE}/producers/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      withCredentials: true
    });
  }
};
```

### useProducers.ts (Frontend Hook)
```typescript
import { useState, useCallback } from 'react';
import { producersService } from '@shared/services/producersService';

export const useProducers = () => {
  const [productores, setProductores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getProducers = useCallback(async (page = 1, filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await producersService.getAllProducers(page, filters);
      setProductores(data.productores);
      return data;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createProducer = useCallback(async (data: any) => {
    setLoading(true);
    setError(null);
    try {
      const nuevoProductor = await producersService.createProducer(data);
      setProductores([...productores, nuevoProductor]);
      return nuevoProductor;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [productores]);

  return { productores, loading, error, getProducers, createProducer };
};
```

---

## 🧪 Casos de Prueba

### Test 1: Crear productor como superadmin
- **Given**: Superadmin en página de productores
- **When**: Completa formulario y envía
- **Then**: POST a `/producers`
- **Expected**: Productor se crea con usuario asociado

### Test 2: Ver directorio público
- **Given**: Usuario en sitio público
- **When**: Accede a /directorio
- **Then**: GET `/producers`
- **Expected**: Listado de productores se carga

### Test 3: Filtrar productores por ciudad
- **Given**: Usuario en directorio
- **When**: Selecciona una ciudad
- **Then**: GET `/producers?ciudad=Armenia`
- **Expected**: Solo productores de esa ciudad se muestran

### Test 4: Ver perfil de productor
- **Given**: Usuario en directorio
- **When**: Clica en un productor
- **Then**: GET `/producers/slug/juan-garcia`
- **Expected**: Perfil completo con redes sociales

### Test 5: Editar productor
- **Given**: Superadmin editando productor
- **When**: Modifica datos y guarda
- **Then**: PUT a `/producers/:id`
- **Expected**: Cambios se guardan

---

## 🔐 Seguridad

- ✅ Solo superadmin puede crear/editar/eliminar
- ✅ Validar ownership de datos
- ✅ Hash de contraseña con bcrypt
- ✅ No exposer datos sensibles (DNI, etc.)
- ✅ Rate limiting
- ✅ Validar URLs de redes sociales

---

## 📊 Checklist de Implementación

### Backend
- [ ] Crear `producers.routes.ts`
- [ ] Crear `producers.controller.ts`
- [ ] Crear `producers.service.ts`
- [ ] Crear `producers.schema.ts`
- [ ] Registrar rutas en `/api/v1/index.ts`
- [ ] Implementar lógica de slug único
- [ ] Crear relación con RedSocial
- [ ] Tests unitarios
- [ ] Tests de integración

### Frontend - Admin
- [ ] Actualizar `ProducersPage.tsx`
- [ ] Actualizar `ProducersTable.tsx`
- [ ] Crear `ProducerForm.tsx`
- [ ] Crear `ProducerEditModal.tsx`
- [ ] Crear `useProducers.ts` hook
- [ ] Crear `producersService.ts`
- [ ] Crear tipos TypeScript
- [ ] Tests para servicios

### Frontend - Público
- [ ] Crear `DirectoryPage.tsx`
- [ ] Crear `ProducerProfilePage.tsx`
- [ ] Crear `ProducerCard.tsx`
- [ ] Implementar filtros
- [ ] Rutas en router
- [ ] Tests de componentes

---

## 🔗 Referencias

- [Backend Pattern](./TDD-04-NEWS-MANAGEMENT.md)
- [Mapbox API (opcional)](https://docs.mapbox.com/)
