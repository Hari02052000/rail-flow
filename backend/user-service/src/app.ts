import express, { type Express } from 'express';
import { errorHandler } from './shared/middleware/error-handler.js';
import { notFoundHandler } from './shared/middleware/not-found.js';

export const createApp = (): Express => {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'railflow-user-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
