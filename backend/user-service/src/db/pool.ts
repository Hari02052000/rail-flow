import { Pool } from 'pg';

export interface DatabaseConfig {
  connectionString: string;
  maxConnections?: number;
  ssl?: boolean;
  idleTimeoutMs?: number;
  connectionTimeoutMs?: number;
}

export const createPool = (config: DatabaseConfig): Pool => {
  const pool = new Pool({
    connectionString: config.connectionString,
    max: config.maxConnections ?? 10,
    ssl: config.ssl ? { rejectUnauthorized: true } : undefined,
    idleTimeoutMillis: config.idleTimeoutMs ?? 30_000,
    connectionTimeoutMillis: config.connectionTimeoutMs ?? 5_000,
  });

  pool.on('error', (error) => {
    console.error('Unexpected PostgreSQL pool error:', error);
  });

  return pool;
};

export const verifyDatabaseConnection = async (pool: Pool): Promise<void> => {
  const client = await pool.connect();

  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
};
