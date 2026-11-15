import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Redis } from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RedisOtpRepository } from '../src/repositories/otp.repository.js';
import type { OtpSession } from '../src/repositories/otp.repository.interface.js';

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error('REDIS_URL is required to run OTP repository integration tests');
}

const keyPrefix = `test:${randomUUID()}:`;
const redis = new Redis(redisUrl, { keyPrefix, lazyConnect: true });
const repository = new RedisOtpRepository(redis);

const createSession = (): OtpSession => ({
  id: randomUUID(),
  email: 'jane.doe@example.com',
  purpose: 'EMAIL_VERIFICATION',
  otpHash: 'hashed-otp',
  attempts: 0,
});

describe('RedisOtpRepository', () => {
  beforeAll(async () => {
    await redis.connect();
  });

  afterAll(async () => {
    await redis.quit();
  });

  it('saves a session with a TTL and finds it', async () => {
    const session = createSession();

    await repository.save(session, 300);

    await expect(repository.findById(session.id)).resolves.toEqual(session);

    const ttl = await redis.ttl(`otp:${session.id}`);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(300);

    await repository.delete(session.id);
  });

  it('returns null for unknown sessions', async () => {
    await expect(repository.findById(randomUUID())).resolves.toBeNull();
  });

  it('increments attempts', async () => {
    const session = createSession();
    await repository.save(session, 300);

    await expect(repository.incrementAttempts(session.id)).resolves.toBe(1);
    await expect(repository.findById(session.id)).resolves.toMatchObject({ attempts: 1 });

    await repository.delete(session.id);
  });

  it('does not create sessions when incrementing unknown attempts', async () => {
    const id = randomUUID();

    await expect(repository.incrementAttempts(id)).resolves.toBe(0);
    await expect(repository.findById(id)).resolves.toBeNull();
    await expect(redis.exists(`otp:${id}`)).resolves.toBe(0);
  });

  it('consumes sessions atomically', async () => {
    const session = createSession();
    await repository.save(session, 300);

    await expect(repository.consume(session.id)).resolves.toBe(true);
    await expect(repository.consume(session.id)).resolves.toBe(false);
    await expect(repository.findById(session.id)).resolves.toBeNull();
  });

  it('deletes sessions', async () => {
    const session = createSession();
    await repository.save(session, 300);

    await repository.delete(session.id);

    await expect(repository.findById(session.id)).resolves.toBeNull();
  });
});
