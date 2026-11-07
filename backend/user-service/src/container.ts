import type { Pool } from 'pg';
import { env } from './config/env.js';
import { createPool } from './db/pool.js';

export interface AppContainer {
  readonly pool: Pool;
}

export const buildContainer = (): AppContainer => {
  const pool = createPool({
    connectionString: env.DATABASE_URL,
    maxConnections: env.DATABASE_POOL_MAX,
    ssl: env.DATABASE_SSL,
  });

  return { pool };
};
