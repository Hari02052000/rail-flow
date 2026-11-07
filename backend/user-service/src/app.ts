import express, { type NextFunction, type Request, type Response } from 'express';

export const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'railflow-user-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  });
});

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  console.error(err);

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
  });
});
