import type { User } from '../entities/user.entity.js';

export type CreateUserInput = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;

export interface UserRepository {
  create(input: CreateUserInput): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  setEmailVerified(id: string, emailVerified: boolean): Promise<void>;
}
