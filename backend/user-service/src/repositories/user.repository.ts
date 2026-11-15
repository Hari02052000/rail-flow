import type { Pool } from 'pg';
import { ConflictError } from '../errors/app-error.js';
import type { User } from '../entities/user.entity.js';
import type { CreateUserInput, UserRepository } from './user.repository.interface.js';

interface UserRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  password_hash: string | null;
  google_id: string | null;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

const mapUser = (row: UserRow): User => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  passwordHash: row.password_hash,
  googleId: row.google_id,
  emailVerified: row.email_verified,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const isUniqueViolation = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }

  return (error as { code?: unknown }).code === '23505';
};

const userColumns = `
  id,
  first_name,
  last_name,
  email,
  password_hash,
  google_id,
  email_verified,
  created_at,
  updated_at
`;

export class PostgresUserRepository implements UserRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: CreateUserInput): Promise<User> {
    try {
      const result = await this.pool.query<UserRow>(
        `INSERT INTO users (first_name, last_name, email, password_hash, google_id, email_verified)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING ${userColumns}`,
        [
          input.firstName,
          input.lastName,
          input.email,
          input.passwordHash,
          input.googleId,
          input.emailVerified,
        ],
      );

      const row = result.rows[0];

      if (!row) {
        throw new Error('User insert returned no row');
      }

      return mapUser(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError('Email already registered', { cause: error });
      }

      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    const result = await this.pool.query<UserRow>(
      `SELECT ${userColumns} FROM users WHERE id = $1`,
      [id],
    );

    const row = result.rows[0];
    return row ? mapUser(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.pool.query<UserRow>(
      `SELECT ${userColumns} FROM users WHERE email = $1`,
      [email],
    );

    const row = result.rows[0];
    return row ? mapUser(row) : null;
  }

  async setEmailVerified(id: string, emailVerified: boolean): Promise<void> {
    await this.pool.query(
      'UPDATE users SET email_verified = $2, updated_at = now() WHERE id = $1',
      [id, emailVerified],
    );
  }
}
