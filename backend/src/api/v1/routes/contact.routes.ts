import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { contactController } from '../../../controllers/contact.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';
import { authorize } from '../../../middlewares/authorize.js';

export const contactRouter = Router();

// Rate limiter para el POST de contacto
// Máximo 5 mensajes por hora por IP
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: process.env.NODE_ENV === 'test' ? 1000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    data: null,
    message: 'Demasiados intentos. Intenta de nuevo en una hora.',
    error: null,
  },
});

/**
 * POST /contact
 * Crear nuevo mensaje de contacto (público, con rate limiting)
 */
contactRouter.post('/', contactLimiter, contactController.create);

/**
 * GET /contact
 * Listar todos los mensajes (solo admin)
 */
contactRouter.get('/', authenticate, authorize('ADMIN', 'SUPERADMIN'), contactController.getAll);

/**
 * GET /contact/:id
 * Obtener un mensaje específico (solo admin)
 */
contactRouter.get('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN'), contactController.getById);

/**
 * PATCH /contact/:id/read
 * Marcar como leído (solo admin)
 */
contactRouter.patch(
  '/:id/read',
  authenticate,
  authorize('ADMIN', 'SUPERADMIN'),
  contactController.markAsRead,
);

/**
 * PATCH /contact/:id/responded
 * Marcar como respondido (solo admin)
 */
contactRouter.patch(
  '/:id/responded',
  authenticate,
  authorize('ADMIN', 'SUPERADMIN'),
  contactController.markAsResponded,
);

/**
 * DELETE /contact/:id
 * Eliminar un mensaje (solo admin)
 */
contactRouter.delete('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN'), contactController.delete);
