import { Router } from 'express';
import { getStoredFile } from '../../../controllers/uploads.controller.js';

export const uploadsRouter = Router();

uploadsRouter.get('/:category/:filename', getStoredFile);
