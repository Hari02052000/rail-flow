import { argon2id, hash, verify } from 'argon2';

const PASSWORD_HASH_OPTIONS = {
  type: argon2id,
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 4,
} as const;

export const hashPassword = (password: string): Promise<string> =>
  hash(password, PASSWORD_HASH_OPTIONS);

export const verifyPassword = (passwordHash: string, password: string): Promise<boolean> =>
  verify(passwordHash, password);
