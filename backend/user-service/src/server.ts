import { createServer } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { buildContainer } from './container.js';
import { verifyDatabaseConnection } from './db/pool.js';

const start = async (): Promise<void> => {
  const container = buildContainer();

  try {
    await verifyDatabaseConnection(container.pool);
  } catch (error) {
    await container.pool.end();
    throw error;
  }

  const app = createApp();
  const server = createServer(app);

  server.listen(env.PORT, env.HOST, () => {
    console.log(
      `RailFlow User Service listening on http://${env.HOST}:${env.PORT} (${env.NODE_ENV})`,
    );
  });

  let isShuttingDown = false;

  const shutdown = (signal: NodeJS.Signals): void => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    console.log(`Received ${signal}. Shutting down gracefully...`);

    const forceExitTimer = setTimeout(() => {
      console.error('Graceful shutdown timed out. Forcing exit.');
      process.exit(1);
    }, 10_000);
    forceExitTimer.unref();

    server.close(async (serverError) => {
      clearTimeout(forceExitTimer);

      try {
        await container.pool.end();
      } catch (poolError) {
        console.error('Error while closing the database pool:', poolError);
        process.exit(1);
      }

      if (serverError) {
        console.error('Error while closing the HTTP server:', serverError);
        process.exit(1);
      }

      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

void start().catch((error) => {
  console.error('Failed to start RailFlow User Service:', error);
  process.exit(1);
});
