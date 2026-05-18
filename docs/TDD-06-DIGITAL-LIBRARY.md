# TDD-06: Digital Library Implementation

**Status**: En Desarrollo
**Prioridad**: Media
**Módulo**: Admin + Intranet + Backend
**Endpoint Backend**: `POST/GET/PUT/DELETE /api/v1/library` ❌ NO IMPLEMENTADO

---

## 📋 Descripción

Implementar biblioteca digital para almacenar y gestionar recursos educativos, documentos, y materiales. Los productores pueden acceder a recursos organizados por categorías (ramos).

---

## 🎯 Objetivo

1. Crear CRUD de bibliotecas y recursos en backend
2. Admin gestiona estructura de bibliotecas y ramos
3. Productores pueden descargar recursos
4. Sistema de categorización jerárquico
5. Búsqueda y filtrado de recursos

---

## 📁 Archivos a Crear/Modificar

### Backend - A CREAR

#### 1. **Schemas Prisma (YA EXISTEN)**
```
✅ /backend/prisma/schema.prisma
```

Modelos ya definidos:
- `Biblioteca`
- `Ramo`
- `Recurso`

#### 2. **Crear rutas de biblioteca**
```
📁 /backend/src/api/v1/routes/
    └── library.routes.ts (CREAR)
```

**Estructura:**
```typescript
export const libraryRouter = Router();

// Públicas (autenticadas)
libraryRouter.get('/', authenticate, libraryController.getBibliotecas);
libraryRouter.get('/:id/ramos', authenticate, libraryController.getRamosByBiblioteca);
libraryRouter.get('/ramo/:ramoId/recursos', authenticate, libraryController.getRecursosByRamo);
libraryRouter.get('/recurso/:recursoId/download', authenticate, libraryController.downloadRecurso);

// Privadas (admin)
libraryRouter.post('/', authenticate, authorize(['ADMIN', 'SUPERADMIN']), libraryController.createBiblioteca);
libraryRouter.post('/:id/ramo', authenticate, authorize(['ADMIN', 'SUPERADMIN']), libraryController.createRamo);
libraryRouter.post('/:ramoId/recurso', authenticate, authorize(['ADMIN', 'SUPERADMIN']), libraryController.uploadRecurso);
libraryRouter.delete('/recurso/:recursoId', authenticate, authorize(['ADMIN', 'SUPERADMIN']), libraryController.deleteRecurso);
```

#### 3. **Crear controlador**
```
📁 /backend/src/controllers/
    └── library.controller.ts (CREAR)
```

**Funciones:**
- `getBibliotecas(req, res)` - Listar bibliotecas
- `getRamosByBiblioteca(req, res)` - Listar categorías
- `getRecursosByRamo(req, res)` - Listar recursos
- `createBiblioteca(req, res)` - Crear biblioteca
- `createRamo(req, res)` - Crear ramo/categoría
- `uploadRecurso(req, res)` - Subir archivo
- `deleteRecurso(req, res)` - Eliminar recurso
- `downloadRecurso(req, res)` - Descargar archivo

#### 4. **Crear servicio**
```
📁 /backend/src/services/
    └── library.service.ts (CREAR)
```

**Funciones:**
- `getBibliotecas()`
- `getRamosByBiblioteca(bibliotecaId)`
- `getRecursosByRamo(ramoId, pagination)`
- `createBiblioteca(data)`
- `createRamo(bibliotecaId, data)`
- `uploadRecurso(ramoId, file, usuarioId)`
- `deleteRecurso(recursoId)`

#### 5. **Crear schemas de validación**
```
📁 /backend/src/schemas/
    └── library.schema.ts (CREAR)
```

#### 6. **Crear middleware de upload**
```
📁 /backend/src/middleware/
    └── fileUpload.middleware.ts (CREAR)
```

**Características:**
- Multer para upload de archivos
- Validar tipos de archivo permitidos
- Limitar tamaño máximo
- Guardar en carpeta segura o cloud storage

#### 7. **Registrar ruta**
```
📁 /backend/src/api/v1/
    └── index.ts (ACTUALIZAR)
```

### Frontend - A CREAR/MODIFICAR

#### 1. **Crear página de biblioteca (Intranet)**
```
📁 /frontend/src/modules/intranet/pages/
    └── DigitalLibraryPage.tsx (ACTUALIZAR)
```

**Elementos:**
- Selector de biblioteca
- Árbol de categorías (ramos)
- Listado de recursos
- Búsqueda
- Descarga

#### 2. **Crear componente de árbol de categorías**
```
📁 /frontend/src/modules/intranet/components/
    └── LibraryTree.tsx (CREAR)
```

#### 3. **Crear tabla de recursos**
```
📁 /frontend/src/modules/intranet/components/
    └── ResourcesTable.tsx (CREAR)
```

#### 4. **Crear formulario de subida de archivos**
```
📁 /frontend/src/modules/admin/components/
    └── FileUploadForm.tsx (CREAR)
```

#### 5. **Crear hook de biblioteca**
```
📁 /frontend/src/modules/intranet/hooks/
    └── useLibrary.ts (CREAR)
```

#### 6. **Crear servicio de biblioteca**
```
📁 /frontend/src/shared/services/
    └── libraryService.ts (CREAR)
```

#### 7. **Crear tipos TypeScript**
```
📁 /frontend/src/shared/types/
    └── library.types.ts (CREAR)
```

---

## 🔌 Endpoints Backend (A CREAR)

### GET /api/v1/library
Obtener listado de bibliotecas disponibles

**Autenticación:** Bearer token requerido (usuarios autenticados)

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "nombre": "Recursos de Café",
      "descripcion": "Materiales educativos sobre cultivo de café...",
      "creadoEn": "2024-01-01T10:00:00Z"
    },
    {
      "id": 2,
      "nombre": "Sostenibilidad Agrícola",
      "descripcion": "Guías sobre prácticas sostenibles...",
      "creadoEn": "2024-01-15T10:00:00Z"
    }
  ],
  "message": "OK",
  "error": null
}
```

---

### GET /api/v1/library/:id/ramos
Obtener categorías (ramos) de una biblioteca

**Path Parameters:**
- `id` - ID de la biblioteca

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "nombre": "Fundamentos",
      "descripcion": "Conceptos básicos de cultivo",
      "orden": 1,
      "recursosCount": 5
    },
    {
      "id": 2,
      "nombre": "Técnicas Avanzadas",
      "descripcion": "Métodos modernos de producción",
      "orden": 2,
      "recursosCount": 8
    }
  ],
  "message": "OK",
  "error": null
}
```

---

### GET /api/v1/library/ramo/:ramoId/recursos
Obtener recursos de un ramo

**Query Parameters:**
- `pagina` (default: 1)
- `limite` (default: 20)
- `buscar` (opcional)
- `ordenar` (nombre|fecha, default: orden)

**Response (200 OK):**
```json
{
  "data": {
    "recursos": [
      {
        "id": 1,
        "nombre": "Guía_Cultivo_Café.pdf",
        "url": "https://storage.example.com/recursos/guide.pdf",
        "tamaño": 2048576,
        "tipo": "application/pdf",
        "subidoPor": {
          "usuario": "admin"
        },
        "creadoEn": "2024-05-18T10:00:00Z"
      }
    ],
    "total": 15,
    "pagina": 1,
    "totalPaginas": 1
  },
  "message": "OK",
  "error": null
}
```

---

### GET /api/v1/library/recurso/:recursoId/download
Descargar archivo (redirect a URL del archivo)

**Response:**
- 302 Redirect a URL del archivo
- O 200 con stream del archivo

---

### POST /api/v1/library
Crear nueva biblioteca (solo admin)

**Autenticación:** Bearer token + rol ADMIN

**Request:**
```json
{
  "nombre": "Recursos de Café",
  "descripcion": "Materiales educativos sobre cultivo de café..."
}
```

**Response (201 Created):**
```json
{
  "data": {
    "id": 3,
    "nombre": "Recursos de Café",
    "descripcion": "Materiales educativos..."
  },
  "message": "Biblioteca creada",
  "error": null
}
```

---

### POST /api/v1/library/:id/ramo
Crear nueva categoría (ramo)

**Request:**
```json
{
  "nombre": "Fundamentos",
  "descripcion": "Conceptos básicos",
  "orden": 1
}
```

---

### POST /api/v1/library/:ramoId/recurso
Subir archivo a un ramo (multipart/form-data)

**Form Data:**
- `archivo` (file, requerido)
- `nombre` (string, opcional - usa nombre archivo si no se proporciona)

**Limits:**
- Tamaño máximo: 100MB
- Tipos permitidos: PDF, DOCX, XLSX, ZIP, MP4, MP3, PNG, JPG
- Extensiones bloqueadas: .exe, .sh, .bat, etc.

**Response (201 Created):**
```json
{
  "data": {
    "id": 1,
    "nombre": "Guía_Cultivo.pdf",
    "url": "https://storage.example.com/file.pdf",
    "tamaño": 2048576,
    "tipo": "application/pdf"
  },
  "message": "Archivo subido",
  "error": null
}
```

---

### DELETE /api/v1/library/recurso/:recursoId
Eliminar archivo

**Response (200 OK):**
```json
{
  "data": null,
  "message": "Recurso eliminado",
  "error": null
}
```

---

## 📁 Estructura de Datos

### Base de Datos (Prisma Schema)

```prisma
model Biblioteca {
  id          Int      @id @default(autoincrement())
  nombre      String   @db.VarChar(255)
  descripcion String   @db.Text
  ramos       Ramo[]
  creadoEn    DateTime @default(now())
  actualizadoEn DateTime @updatedAt

  @@index([nombre])
}

model Ramo {
  id          Int      @id @default(autoincrement())
  bibliotecaId Int
  biblioteca  Biblioteca @relation(fields: [bibliotecaId], references: [id], onDelete: Cascade)
  nombre      String   @db.VarChar(255)
  descripcion String?  @db.Text
  orden       Int      @default(0)
  recursos    Recurso[]
  creadoEn    DateTime @default(now())
  actualizadoEn DateTime @updatedAt

  @@index([bibliotecaId])
}

model Recurso {
  id          Int      @id @default(autoincrement())
  ramoId      Int
  ramo        Ramo     @relation(fields: [ramoId], references: [id], onDelete: Cascade)
  url         String   @db.VarChar(500)
  nombre      String   @db.VarChar(255)
  tamaño      BigInt
  tipo        String   @db.VarChar(100)
  subidoPorId Int
  subidoPor   Usuario  @relation(fields: [subidoPorId], references: [id])
  creadoEn    DateTime @default(now())

  @@index([ramoId])
  @@index([subidoPorId])
}
```

---

## 🏗️ Estructura de Código (Ejemplo)

### library.schema.ts (Backend)
```typescript
import { z } from 'zod';

export const createBibliotecaSchema = z.object({
  nombre: z
    .string()
    .min(3)
    .max(255),
  descripcion: z
    .string()
    .min(10)
    .max(1000)
});

export const createRamoSchema = z.object({
  nombre: z
    .string()
    .min(3)
    .max(255),
  descripcion: z
    .string()
    .optional(),
  orden: z
    .number()
    .int()
    .default(0)
});

export type CreateBibliotecaInput = z.infer<typeof createBibliotecaSchema>;
export type CreateRamoInput = z.infer<typeof createRamoSchema>;
```

### library.service.ts (Backend)
```typescript
import { prisma } from '@/lib/prisma';
import { storage } from '@/lib/storage'; // AWS S3, local storage, etc.

export const libraryService = {
  async getBibliotecas() {
    return await prisma.biblioteca.findMany({
      include: {
        ramos: { select: { id: true } }
      }
    });
  },

  async getRamosByBiblioteca(bibliotecaId: number) {
    return await prisma.ramo.findMany({
      where: { bibliotecaId },
      include: {
        recursos: { select: { id: true } }
      },
      orderBy: { orden: 'asc' }
    });
  },

  async getRecursosByRamo(ramoId: number, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [recursos, total] = await Promise.all([
      prisma.recurso.findMany({
        where: { ramoId },
        skip,
        take: limit,
        include: { subidoPor: { select: { usuario: true } } },
        orderBy: { creadoEn: 'desc' }
      }),
      prisma.recurso.count({ where: { ramoId } })
    ]);

    return { recursos, total, pagina: page, totalPaginas: Math.ceil(total / limit) };
  },

  async uploadRecurso(ramoId: number, file: Express.Multer.File, usuarioId: number) {
    // Guardar en storage (S3, local, etc.)
    const fileUrl = await storage.uploadFile(file);

    const recurso = await prisma.recurso.create({
      data: {
        ramoId,
        url: fileUrl,
        nombre: file.originalname,
        tamaño: file.size,
        tipo: file.mimetype,
        subidoPorId: usuarioId
      }
    });

    return recurso;
  },

  async deleteRecurso(recursoId: number) {
    const recurso = await prisma.recurso.findUnique({ where: { id: recursoId } });

    if (recurso) {
      await storage.deleteFile(recurso.url);
      await prisma.recurso.delete({ where: { id: recursoId } });
    }

    return recurso;
  }
};
```

### libraryService.ts (Frontend)
```typescript
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export const libraryService = {
  async getBibliotecas() {
    const response = await axios.get(`${API_BASE}/library`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      withCredentials: true
    });
    return response.data.data;
  },

  async getRamos(bibliotecaId: number) {
    const response = await axios.get(`${API_BASE}/library/${bibliotecaId}/ramos`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      withCredentials: true
    });
    return response.data.data;
  },

  async getRecursos(ramoId: number, page = 1) {
    const response = await axios.get(`${API_BASE}/library/ramo/${ramoId}/recursos`, {
      params: { pagina: page },
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      withCredentials: true
    });
    return response.data.data;
  },

  async uploadFile(ramoId: number, file: File) {
    const formData = new FormData();
    formData.append('archivo', file);

    const response = await axios.post(
      `${API_BASE}/library/${ramoId}/recurso`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'multipart/form-data'
        },
        withCredentials: true
      }
    );
    return response.data.data;
  },

  async deleteRecurso(recursoId: number) {
    await axios.delete(`${API_BASE}/library/recurso/${recursoId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      withCredentials: true
    });
  },

  downloadRecurso(recursoUrl: string) {
    window.location.href = recursoUrl;
  }
};
```

### useLibrary.ts (Frontend Hook)
```typescript
import { useState, useCallback } from 'react';
import { libraryService } from '@shared/services/libraryService';

export const useLibrary = () => {
  const [bibliotecas, setBibliotecas] = useState([]);
  const [ramos, setRamos] = useState([]);
  const [recursos, setRecursos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBibliotecas = useCallback(async () => {
    setLoading(true);
    try {
      const data = await libraryService.getBibliotecas();
      setBibliotecas(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRamos = useCallback(async (bibliotecaId: number) => {
    setLoading(true);
    try {
      const data = await libraryService.getRamos(bibliotecaId);
      setRamos(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRecursos = useCallback(async (ramoId: number, page = 1) => {
    setLoading(true);
    try {
      const data = await libraryService.getRecursos(ramoId, page);
      setRecursos(data.recursos);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const upload = useCallback(async (ramoId: number, file: File) => {
    setLoading(true);
    try {
      await libraryService.uploadFile(ramoId, file);
      await loadRecursos(ramoId); // Recargar lista
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [loadRecursos]);

  return {
    bibliotecas,
    ramos,
    recursos,
    loading,
    error,
    loadBibliotecas,
    loadRamos,
    loadRecursos,
    upload
  };
};
```

---

## 🧪 Casos de Prueba

### Test 1: Ver bibliotecas disponibles
- **Given**: Usuario autenticado
- **When**: Accede a biblioteca digital
- **Then**: GET `/library`
- **Expected**: Listado de bibliotecas se carga

### Test 2: Expandir categorías
- **Given**: Usuario viendo biblioteca
- **When**: Clica en una biblioteca
- **Then**: GET `/library/:id/ramos`
- **Expected**: Categorías (ramos) se despliegan

### Test 3: Ver recursos de categoría
- **Given**: Usuario expandiendo un ramo
- **When**: Clica en ramo
- **Then**: GET `/library/ramo/:ramoId/recursos`
- **Expected**: Lista de archivos se carga

### Test 4: Descargar recurso
- **Given**: Usuario viendo recursos
- **When**: Clica en "Descargar"
- **Then**: GET `/library/recurso/:id/download`
- **Expected**: Archivo se descarga en navegador

### Test 5: Subir archivo como admin
- **Given**: Admin en panel de gestión
- **When**: Selecciona archivo y sube
- **Then**: POST `/library/:ramoId/recurso` (multipart)
- **Expected**: Archivo se guarda, lista se actualiza

### Test 6: Validar tipo de archivo
- **Given**: Admin intenta subir .exe
- **When**: Intenta hacer upload
- **Then**: Rechaza en backend
- **Expected**: Error de tipo de archivo no permitido

---

## 🔐 Seguridad

- ✅ Solo usuarios autenticados pueden acceder
- ✅ Solo admins pueden subir/eliminar
- ✅ Validar tipos de archivo permitidos
- ✅ Limitar tamaño de archivos
- ✅ Escanear virus si es posible (ClamAV)
- ✅ Usar storage seguro (S3, etc.)
- ✅ No exponer rutas de archivos reales

---

## 🛠️ Configuración de Storage

### Opción 1: Amazon S3
```typescript
import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY
});

export const uploadToS3 = (file: Express.Multer.File) => {
  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: `library/${Date.now()}-${file.originalname}`,
    Body: file.buffer,
    ContentType: file.mimetype
  };

  return s3.upload(params).promise();
};
```

### Opción 2: Local Storage
```typescript
import fs from 'fs/promises';
import path from 'path';

const uploadDir = path.join(process.cwd(), 'uploads', 'library');

export const uploadLocal = async (file: Express.Multer.File) => {
  const filename = `${Date.now()}-${file.originalname}`;
  const filepath = path.join(uploadDir, filename);

  await fs.writeFile(filepath, file.buffer);

  return `/uploads/library/${filename}`;
};
```

---

## 📊 Checklist de Implementación

### Backend
- [ ] Crear `library.routes.ts`
- [ ] Crear `library.controller.ts`
- [ ] Crear `library.service.ts`
- [ ] Crear `library.schema.ts`
- [ ] Implementar middleware de upload (multer)
- [ ] Configurar storage (S3 o local)
- [ ] Registrar rutas en `/api/v1/index.ts`
- [ ] Tests para endpoints
- [ ] Tests para upload/delete

### Frontend
- [ ] Crear `libraryService.ts`
- [ ] Crear `useLibrary.ts` hook
- [ ] Actualizar `DigitalLibraryPage.tsx`
- [ ] Crear `LibraryTree.tsx`
- [ ] Crear `ResourcesTable.tsx`
- [ ] Crear `FileUploadForm.tsx`
- [ ] Crear tipos TypeScript
- [ ] Rutas en router
- [ ] Tests de componentes

---

## 🔗 Referencias

- [Multer Documentation](https://github.com/expressjs/multer)
- [AWS S3 Node.js](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/welcome.html)
- [React File Upload](https://github.com/react-dropzone/react-dropzone)
