# TDD-03: Contact Form Implementation

**Status**: En Desarrollo
**Prioridad**: Media
**Módulo**: Public Web + Backend
**Endpoint Backend**: `POST /api/v1/contact` ❌ NO IMPLEMENTADO

---

## 📋 Descripción

Implementar la funcionalidad completa del formulario de contacto. Frontend ya tiene validación y UI, pero solo está mockeado. Necesita:
1. Crear endpoint en backend
2. Conectar frontend con endpoint real
3. Implementar almacenamiento de mensajes
4. Opcional: Enviar email de confirmación

---

## 🎯 Objetivo

Permitir que visitantes del sitio envíen mensajes de contacto que se almacenen en la BD y se notifique al equipo.

---

## 📁 Archivos a Crear/Modificar

### Backend - A CREAR

#### 1. **Crear tabla en Prisma Schema**
```
📁 /backend/prisma/
    └── schema.prisma (ACTUALIZAR)
```

**Modelo:**
```prisma
model Contacto {
  id        Int      @id @default(autoincrement())
  nombre    String   @db.VarChar(100)
  email     String   @db.VarChar(255)
  telefono  String?  @db.VarChar(20)
  asunto    String   @db.VarChar(150)
  mensaje   String   @db.Text
  leido     Boolean  @default(false)
  respondido Boolean @default(false)
  creadoEn  DateTime @default(now())
  actualizadoEn DateTime @updatedAt

  @@index([email])
  @@index([creadoEn])
}
```

#### 2. **Crear ruta de contacto**
```
📁 /backend/src/api/v1/routes/
    └── contact.routes.ts (CREAR)
```

**Estructura:**
```typescript
export const contactRouter = Router();

contactRouter.post(
  '/',
  validate(contactSchema),
  contactController.create
);
```

#### 3. **Crear controlador**
```
📁 /backend/src/controllers/
    └── contact.controller.ts (CREAR)
```

**Funciones:**
- `create(req, res)` - Crear nuevo contacto
- `getAll(req, res)` - Listar todos (solo admin)
- `markAsRead(req, res)` - Marcar como leído
- `respond(req, res)` - Registrar respuesta

#### 4. **Crear servicio**
```
📁 /backend/src/services/
    └── contact.service.ts (CREAR)
```

**Funciones:**
- `createContactMessage(data)` - Guardar en BD
- `getMessages(filters)` - Obtener con filtros
- `markAsRead(id)` - Actualizar
- `sendConfirmationEmail(email, nombre)` - Email opcional

#### 5. **Crear schema de validación**
```
📁 /backend/src/schemas/
    └── contact.schema.ts (CREAR)
```

**Validación con Zod:**
```typescript
export const contactSchema = z.object({
  nombre: z.string().min(2).max(100),
  email: z.string().email(),
  telefono: z.string().optional(),
  asunto: z.string().min(3).max(150),
  mensaje: z.string().min(10).max(2000)
});
```

#### 6. **Registrar ruta en main router**
```
📁 /backend/src/api/v1/
    └── index.ts (ACTUALIZAR)
```

**Cambio:**
```typescript
import { contactRouter } from './routes/contact.routes';

app.use('/contact', contactRouter);
```

#### 7. **Crear migración de Prisma**
```bash
npx prisma migrate dev --name add_contacto_table
```

### Frontend - A ACTUALIZAR

#### 1. **Actualizar useContactForm Hook**
```
📁 /frontend/src/modules/public-web/
    └── hooks/useContactForm.ts (ACTUALIZAR)
```

**Cambios:**
- Reemplazar `console.log()` con llamada real a API
- Usar `authService` o nuevo `contactService`
- Manejar errores del backend
- Estado de loading y error
- Mostrar mensajes de éxito/error

#### 2. **Crear contactService**
```
📁 /frontend/src/shared/services/
    └── contactService.ts (CREAR)
```

**Funciones:**
- `submitContactForm(data: ContactFormData): Promise<void>`
- `getContactMessages(): Promise<Message[]>` (solo admin)

#### 3. **Actualizar ContactFormModal**
```
📁 /frontend/src/modules/public-web/
    └── components/ContactFormModal.tsx (ACTUALIZAR)
```

**Cambios:**
- Usar nuevo hook actualizado
- Mostrar loading spinner mientras envía
- Mostrar mensaje de error si falla
- Mostrar confirmación de envío
- Limpiar form tras envío exitoso

#### 4. **Actualizar schema de validación (si es necesario)**
```
📁 /frontend/src/modules/public-web/
    └── schemas/contactFormSchema.ts (REVISAR)
```

---

## 🔌 Endpoints Backend (A CREAR)

### POST /api/v1/contact

**Request:**
```json
{
  "nombre": "Juan García",
  "email": "juan@example.com",
  "telefono": "+34 611223344",
  "asunto": "Consulta sobre nuestros servicios",
  "mensaje": "Me gustaría obtener más información sobre los productores..."
}
```

**Response (201 Created):**
```json
{
  "data": {
    "id": 1,
    "nombre": "Juan García",
    "email": "juan@example.com",
    "creadoEn": "2024-05-18T10:30:00Z"
  },
  "message": "Mensaje de contacto guardado exitosamente",
  "error": null
}
```

**Response (400 Bad Request):**
```json
{
  "data": null,
  "message": "Validación fallida",
  "error": {
    "campo": "email debe ser un email válido"
  }
}
```

---

### GET /api/v1/contact (Solo Admin)

**Autenticación:** Requiere `Authorization: Bearer {accessToken}` con rol ADMIN

**Query Parameters:**
- `pagina` (default: 1)
- `limite` (default: 20)
- `leido` (true/false, opcional)
- `desde` (fecha ISO, opcional)
- `hasta` (fecha ISO, opcional)

**Response (200 OK):**
```json
{
  "data": {
    "mensajes": [
      {
        "id": 1,
        "nombre": "Juan García",
        "email": "juan@example.com",
        "asunto": "Consulta",
        "leido": false,
        "creadoEn": "2024-05-18T10:30:00Z"
      }
    ],
    "total": 150,
    "pagina": 1,
    "totalPaginas": 8
  },
  "message": "OK",
  "error": null
}
```

---

### PATCH /api/v1/contact/:id/read (Solo Admin)

**Response (200 OK):**
```json
{
  "data": null,
  "message": "Marcado como leído",
  "error": null
}
```

---

## 📝 Validaciones

### Backend (Zod)
- ✅ `nombre`: string, 2-100 caracteres, requerido
- ✅ `email`: email válido, requerido
- ✅ `telefono`: formato opcional, validar si está presente
- ✅ `asunto`: string, 3-150 caracteres, requerido
- ✅ `mensaje`: string, 10-2000 caracteres, requerido
- ✅ Rate limiting: 5 mensajes por IP por hora

### Frontend (Yup - YA EXISTE)
- ✅ Mismo validaciones que backend
- ✅ Feedback inmediato en formulario

---

## 🏗️ Estructura de Código (Ejemplo)

### contact.schema.ts (Backend)
```typescript
import { z } from 'zod';

export const contactSchema = z.object({
  nombre: z
    .string()
    .min(2, 'Nombre debe tener al menos 2 caracteres')
    .max(100, 'Nombre no puede exceder 100 caracteres'),
  email: z
    .string()
    .email('Email inválido'),
  telefono: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^[\d\s\-\+\(\)]+$/.test(val),
      'Teléfono inválido'
    ),
  asunto: z
    .string()
    .min(3, 'Asunto muy corto')
    .max(150, 'Asunto muy largo'),
  mensaje: z
    .string()
    .min(10, 'Mensaje muy corto')
    .max(2000, 'Mensaje muy largo')
});

export type ContactInput = z.infer<typeof contactSchema>;
```

### contact.service.ts (Backend)
```typescript
import { prisma } from '@/lib/prisma';
import type { ContactInput } from '@/schemas/contact.schema';

export const contactService = {
  async createMessage(data: ContactInput) {
    return await prisma.contacto.create({
      data,
      select: {
        id: true,
        nombre: true,
        email: true,
        creadoEn: true
      }
    });
  },

  async getMessages(skip = 0, take = 20, filters = {}) {
    const [mensajes, total] = await Promise.all([
      prisma.contacto.findMany({
        skip,
        take,
        where: filters,
        orderBy: { creadoEn: 'desc' }
      }),
      prisma.contacto.count({ where: filters })
    ]);

    return { mensajes, total };
  }
};
```

### contact.controller.ts (Backend)
```typescript
import { contactService } from '@/services/contact.service';

export const contactController = {
  async create(req, res, next) {
    try {
      const data = req.body;
      const resultado = await contactService.createMessage(data);

      res.status(201).json({
        data: resultado,
        message: 'Mensaje de contacto guardado exitosamente',
        error: null
      });
    } catch (error) {
      next(error);
    }
  }
};
```

### contactService.ts (Frontend)
```typescript
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export interface ContactFormData {
  nombre: string;
  email: string;
  telefono?: string;
  asunto: string;
  mensaje: string;
}

export const contactService = {
  async submitForm(data: ContactFormData): Promise<void> {
    const response = await axios.post(
      `${API_BASE}/contact`,
      data
    );

    if (response.status !== 201) {
      throw new Error(response.data.message);
    }
  }
};
```

### useContactForm.ts (Frontend - Actualizar)
```typescript
import { useState } from 'react';
import { contactService } from '@shared/services/contactService';
import { contactFormSchema } from '../schemas/contactFormSchema';

export const useContactForm = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = async (data: any) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await contactFormSchema.validate(data);
      await contactService.submitForm(data);
      setSuccess(true);

      // Limpiar después de 5 segundos
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(err.message || 'Error al enviar formulario');
    } finally {
      setLoading(false);
    }
  };

  return { submit, loading, error, success };
};
```

---

## 🧪 Casos de Prueba

### Test 1: Envío Exitoso
- **Given**: Formulario con datos válidos
- **When**: Usuario hace click en "Enviar"
- **Then**: POST a `/contact`
- **Expected**: Mensaje se guarda, confirma envío

### Test 2: Validación Frontend
- **Given**: Campo email vacío
- **When**: Usuario intenta enviar
- **Then**: No hace llamada a API
- **Expected**: Muestra error de validación

### Test 3: Validación Backend
- **Given**: Email inválido en request
- **When**: Envía al endpoint
- **Then**: Valida con Zod
- **Expected**: Retorna 400 con error

### Test 4: Rate Limiting
- **Given**: Misma IP envía 5 mensajes en corto tiempo
- **When**: Intenta 6to mensaje
- **Then**: Rechaza la solicitud
- **Expected**: Error de límite de frecuencia

### Test 5: Admin puede ver mensajes
- **Given**: Admin logueado
- **When**: GET `/contact`
- **Then**: Retorna lista de mensajes
- **Expected**: Paginado, filtrable

---

## 🔐 Seguridad

- ✅ Validar todos los campos en backend
- ✅ Rate limiting por IP
- ✅ Sanitizar entrada para prevenir XSS
- ✅ No mostrar errores internos del servidor
- ✅ CORS configurado
- ✅ Logs de intentos sospechosos

---

## 📊 Checklist de Implementación Backend

- [ ] Crear modelo `Contacto` en schema.prisma
- [ ] Ejecutar migración con Prisma
- [ ] Crear `contact.routes.ts`
- [ ] Crear `contact.controller.ts`
- [ ] Crear `contact.service.ts`
- [ ] Crear `contact.schema.ts` con validaciones
- [ ] Registrar rutas en `/api/v1/index.ts`
- [ ] Implementar rate limiting
- [ ] Escribir tests para endpoints
- [ ] Documentar en README

---

## 📊 Checklist de Implementación Frontend

- [ ] Crear `contactService.ts`
- [ ] Actualizar `useContactForm.ts` con lógica real
- [ ] Actualizar `ContactFormModal.tsx` con loading/error states
- [ ] Probar envío de formulario
- [ ] Validar mensaje de éxito
- [ ] Validar manejo de errores
- [ ] Escribir tests para servicio y hook
- [ ] Probar sin conexión a internet

---

## 🔗 Referencias

- [Prisma Schema](https://www.prisma.io/docs/concepts/components/prisma-schema)
- [Zod Validation](https://zod.dev/)
- [Rate Limiting Express](https://github.com/nfriedly/express-rate-limit)
