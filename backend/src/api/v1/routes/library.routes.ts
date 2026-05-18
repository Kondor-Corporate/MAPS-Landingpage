import { Router } from 'express';
import { libraryController } from '../../../controllers/library.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';
import { authorize } from '../../../middlewares/authorize.js';

export const libraryRouter = Router();

// ============ BIBLIOTECAS ============

/**
 * POST /library/bibliotecas
 * Crear biblioteca (solo admin)
 */
libraryRouter.post('/bibliotecas', authenticate, authorize('ADMIN', 'SUPERADMIN'), libraryController.createBiblioteca);

/**
 * GET /library/bibliotecas
 * Listar todas las bibliotecas
 */
libraryRouter.get('/bibliotecas', libraryController.getBibliotecas);

/**
 * GET /library/bibliotecas/:id
 * Obtener biblioteca por ID
 */
libraryRouter.get('/bibliotecas/:id', libraryController.getBibliotecaById);

/**
 * PATCH /library/bibliotecas/:id
 * Actualizar biblioteca (solo admin)
 */
libraryRouter.patch('/bibliotecas/:id', authenticate, authorize('ADMIN', 'SUPERADMIN'), libraryController.updateBiblioteca);

/**
 * DELETE /library/bibliotecas/:id
 * Eliminar biblioteca (solo admin)
 */
libraryRouter.delete('/bibliotecas/:id', authenticate, authorize('ADMIN', 'SUPERADMIN'), libraryController.deleteBiblioteca);

// ============ RAMOS ============

/**
 * POST /library/ramos
 * Crear ramo (solo admin)
 */
libraryRouter.post('/ramos', authenticate, authorize('ADMIN', 'SUPERADMIN'), libraryController.createRamo);

/**
 * GET /library/ramos/:id
 * Obtener ramo por ID
 */
libraryRouter.get('/ramos/:id', libraryController.getRamoById);

/**
 * PATCH /library/ramos/:id
 * Actualizar ramo (solo admin)
 */
libraryRouter.patch('/ramos/:id', authenticate, authorize('ADMIN', 'SUPERADMIN'), libraryController.updateRamo);

/**
 * DELETE /library/ramos/:id
 * Eliminar ramo (solo admin)
 */
libraryRouter.delete('/ramos/:id', authenticate, authorize('ADMIN', 'SUPERADMIN'), libraryController.deleteRamo);

// ============ RECURSOS ============

/**
 * POST /library/recursos
 * Crear recurso (solo admin/autenticados)
 */
libraryRouter.post('/recursos', authenticate, libraryController.createRecurso);

/**
 * GET /library/recursos/:id
 * Obtener recurso por ID
 */
libraryRouter.get('/recursos/:id', libraryController.getRecursoById);

/**
 * PATCH /library/recursos/:id
 * Actualizar recurso (solo admin)
 */
libraryRouter.patch('/recursos/:id', authenticate, authorize('ADMIN', 'SUPERADMIN'), libraryController.updateRecurso);

/**
 * DELETE /library/recursos/:id
 * Eliminar recurso (solo admin)
 */
libraryRouter.delete('/recursos/:id', authenticate, authorize('ADMIN', 'SUPERADMIN'), libraryController.deleteRecurso);
