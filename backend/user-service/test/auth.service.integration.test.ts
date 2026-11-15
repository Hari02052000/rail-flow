import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Redis } from 'ioredis';
import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ConflictError, RateLimitError, ValidationError } from '../src/errors/app-error.js';
import { RedisOtpRepository } from '../src/repositories/otp.repository.js';
import { PostgresUserRepository } from '../src/repositories/user.repository.js';
import { DefaultAuthService } from '../src/services/auth.service.js';
import type { EmailSender } from '../src/utils/email.js';
import { verifyPassword } from '../src/utils/password.js';

const connectionString = process.env.TEST_DATABASE_URL;
const redisUrl = process.env.REDIS_URL;

if (!connectionString) {
  throw new Error('TEST_DATABASE_URL is required to run auth service integration tests');
}

if (!redisUrl) {
  throw new Error('REDIS_URL is required to run auth service integration tests');
}

const keyPrefix = `test:${randomUUID()}:`;
const pool = new Pool({ connectionString });
const redis = new Redis(redisUrl, { keyPrefix, lazyConnect: true });
const cleanupRedis = new Redis(redisUrl, { lazyConnect: true });
const userRepository = new PostgresUserRepository(pool);
const otpRepository = new RedisOtpRepository(redis);

const sentEmails: Array<{ to: string; code: string; expiresInMinutes: number }> = [];

const emailSender: EmailSender = {
  async sendOtp(to, code, expiresInMinutes): Promise<void> {
    sentEmails.push({ to, code, expiresInMinutes });
  },
};

const authService = new DefaultAuthService(userRepository, otpRepository, emailSender, {
  otpSecret: 'test-otp-secret-that-is-long-enough',
  otpTtlSeconds: 300,
  otpMaxAttempts: 3,
});

const registerInput = {
  firstName: ' Jane ',
  lastName: ' Doe ',
  email: ' Jane.Doe@Example.com ',
  password: 'correct horse battery staple',
};

const getSentCode = (): string => {
  const code = sentEmails[0]?.code;

  if (!code) {
    throw new Error('Expected an OTP email to have been sent');
  }

  return code;
};

describe('DefaultAuthService', () => {
  beforeAll(async () => {
    await pool.query('SELECT 1');
    await redis.connect();
    await cleanupRedis.connect();
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
    sentEmails.length = 0;

    const keys = await cleanupRedis.keys(`${keyPrefix}*`);

    if (keys.length > 0) {
      await cleanupRedis.del(...keys);
    }
  });

  afterAll(async () => {
    const keys = await cleanupRedis.keys(`${keyPrefix}*`);

    if (keys.length > 0) {
      await cleanupRedis.del(...keys);
    }

    await cleanupRedis.quit();
    await redis.quit();
    await pool.end();
  });

  it('registers a user, hashes the password, and sends a verification OTP', async () => {
    const result = await authService.register(registerInput);

    expect(result.user).toMatchObject({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@example.com',
      emailVerified: false,
    });
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.user).not.toHaveProperty('googleId');
    expect(result.otpSessionId).toEqual(expect.any(String));
    expect(result.expiresInSeconds).toBe(300);

    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0]).toMatchObject({
      to: 'jane.doe@example.com',
      expiresInMinutes: 5,
    });
    expect(getSentCode()).toMatch(/^\d{6}$/);

    const stored = await userRepository.findByEmail('jane.doe@example.com');

    expect(stored?.passwordHash).toEqual(expect.any(String));
    expect(stored?.passwordHash).not.toBe(registerInput.password);

    if (!stored?.passwordHash) {
      throw new Error('Expected a stored password hash');
    }

    await expect(verifyPassword(stored.passwordHash, registerInput.password)).resolves.toBe(true);
  });

  it('rejects duplicate email registrations', async () => {
    await authService.register(registerInput);

    await expect(
      authService.register({ ...registerInput, email: 'JANE.DOE@EXAMPLE.COM' }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('does not reveal unknown emails when sending OTPs', async () => {
    const result = await authService.sendOtp({
      email: 'missing@example.com',
      purpose: 'EMAIL_VERIFICATION',
    });

    expect(result.otpSessionId).toEqual(expect.any(String));
    expect(result.expiresInSeconds).toBe(300);
    expect(sentEmails).toHaveLength(0);
    await expect(otpRepository.findById(result.otpSessionId)).resolves.toBeNull();
  });

  it('sends an OTP for an existing user', async () => {
    const { user } = await authService.register(registerInput);
    sentEmails.length = 0;

    const result = await authService.sendOtp({
      email: ' JANE.DOE@example.com ',
      purpose: 'EMAIL_VERIFICATION',
    });

    expect(result.expiresInSeconds).toBe(300);
    expect(sentEmails).toHaveLength(1);
    await expect(otpRepository.findById(result.otpSessionId)).resolves.toMatchObject({
      email: user.email,
      purpose: 'EMAIL_VERIFICATION',
      attempts: 0,
    });
  });

  it('verifies the email and consumes the OTP session', async () => {
    const { otpSessionId } = await authService.register(registerInput);
    const code = getSentCode();

    const user = await authService.verifyOtp({ otpSessionId, code });

    expect(user.emailVerified).toBe(true);
    await expect(userRepository.findByEmail('jane.doe@example.com')).resolves.toMatchObject({
      emailVerified: true,
    });
    await expect(otpRepository.findById(otpSessionId)).resolves.toBeNull();
    await expect(authService.verifyOtp({ otpSessionId, code })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('rejects invalid OTP codes and enforces the attempt limit', async () => {
    const { otpSessionId } = await authService.register(registerInput);
    const code = getSentCode();
    const wrongCode = code === '000000' ? '111111' : '000000';

    await expect(authService.verifyOtp({ otpSessionId, code: wrongCode })).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(authService.verifyOtp({ otpSessionId, code: wrongCode })).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(authService.verifyOtp({ otpSessionId, code: wrongCode })).rejects.toBeInstanceOf(
      RateLimitError,
    );
    await expect(otpRepository.findById(otpSessionId)).resolves.toBeNull();
  });

  it('rejects unknown OTP sessions', async () => {
    await expect(
      authService.verifyOtp({ otpSessionId: randomUUID(), code: '123456' }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
