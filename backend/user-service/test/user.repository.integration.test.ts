import 'dotenv/config';
import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ConflictError } from '../src/errors/app-error.js';
import { PostgresUserRepository } from '../src/repositories/user.repository.js';
import type { CreateUserInput } from '../src/repositories/user.repository.interface.js';

const connectionString = process.env.TEST_DATABASE_URL;

if (!connectionString) {
  throw new Error('TEST_DATABASE_URL is required to run repository integration tests');
}

const pool = new Pool({ connectionString });
const repository = new PostgresUserRepository(pool);

const userInput: CreateUserInput = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane.doe@example.com',
  passwordHash: 'hashed-password',
  googleId: null,
  emailVerified: false,
};

describe('PostgresUserRepository', () => {
  beforeAll(async () => {
    await pool.query('SELECT 1');
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
  });

  afterAll(async () => {
    await pool.end();
  });

  it('creates a user and finds it by id and email', async () => {
    const created = await repository.create(userInput);

    expect(created.id).toEqual(expect.any(String));
    expect(created.firstName).toBe(userInput.firstName);
    expect(created.email).toBe(userInput.email);
    expect(created.emailVerified).toBe(false);
    expect(created.createdAt).toBeInstanceOf(Date);

    await expect(repository.findById(created.id)).resolves.toEqual(created);
    await expect(repository.findByEmail(userInput.email)).resolves.toEqual(created);
  });

  it('returns null for unknown users', async () => {
    await expect(repository.findById('00000000-0000-0000-0000-000000000000')).resolves.toBeNull();
    await expect(repository.findByEmail('missing@example.com')).resolves.toBeNull();
  });

  it('rejects duplicate emails', async () => {
    await repository.create(userInput);

    await expect(repository.create(userInput)).rejects.toBeInstanceOf(ConflictError);
  });

  it('updates email verification status', async () => {
    const created = await repository.create(userInput);

    await repository.setEmailVerified(created.id, true);

    const updated = await repository.findById(created.id);
    expect(updated?.emailVerified).toBe(true);
  });
});
