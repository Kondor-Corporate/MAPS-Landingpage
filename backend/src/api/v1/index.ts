import { Router } from 'express';
import { healthRouter } from './routes/health.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { producersRouter } from './routes/producers.routes.js';
import { adminsRouter } from './routes/admins.routes.js';
import { newsRouter } from './routes/news.routes.js';
import { libraryRouter } from './routes/library.routes.js';

export const v1Router = Router();

v1Router.use(healthRouter);
v1Router.use('/auth', authRouter);
v1Router.use('/producers', producersRouter);
v1Router.use('/admins', adminsRouter);
v1Router.use('/news', newsRouter);
v1Router.use('/library', libraryRouter);
