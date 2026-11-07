import { createServer } from 'node:http';
import { app } from './app.js';
import { env } from './config/env.js';

const server = createServer(app);

server.listen(env.PORT, env.HOST, () => {
  console.log(
    `RailFlow User Service listening on http://${env.HOST}:${env.PORT} (${env.NODE_ENV})`,
  );
});

const shutdown = (signal: NodeJS.Signals) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);

  server.close((error) => {
    if (error) {
      console.error('Error while closing the HTTP server:', error);
      process.exit(1);
    }

    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
