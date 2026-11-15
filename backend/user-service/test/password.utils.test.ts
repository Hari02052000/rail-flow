import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../src/utils/password.js';

describe('password utilities', () => {
  it('hashes passwords with Argon2id and verifies them', async () => {
    const password = 'correct horse battery staple';

    const passwordHash = await hashPassword(password);

    expect(passwordHash).toMatch(/^\$argon2id\$/);
    await expect(verifyPassword(passwordHash, password)).resolves.toBe(true);
    await expect(verifyPassword(passwordHash, 'wrong password')).resolves.toBe(false);
  });
});
