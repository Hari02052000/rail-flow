import type { Redis } from 'ioredis';
import type { OtpPurpose, OtpRepository, OtpSession } from './otp.repository.interface.js';

const otpKey = (id: string): string => `otp:${id}`;

const isOtpPurpose = (value: string | undefined): value is OtpPurpose =>
  value === 'EMAIL_VERIFICATION';

const incrementAttemptsScript = `
  if redis.call('EXISTS', KEYS[1]) == 0 then
    return 0
  end
  return redis.call('HINCRBY', KEYS[1], 'attempts', 1)
`;

export class RedisOtpRepository implements OtpRepository {
  constructor(private readonly redis: Redis) {}

  async save(session: OtpSession, ttlSeconds: number): Promise<void> {
    await this.redis
      .multi()
      .hset(otpKey(session.id), {
        email: session.email,
        purpose: session.purpose,
        otpHash: session.otpHash,
        attempts: session.attempts,
      })
      .expire(otpKey(session.id), ttlSeconds)
      .exec();
  }

  async findById(id: string): Promise<OtpSession | null> {
    const data = await this.redis.hgetall(otpKey(id));

    if (!data.email || !data.otpHash || !isOtpPurpose(data.purpose)) {
      return null;
    }

    return {
      id,
      email: data.email,
      purpose: data.purpose,
      otpHash: data.otpHash,
      attempts: Number(data.attempts ?? 0),
    };
  }

  async incrementAttempts(id: string): Promise<number> {
    const attempts = await this.redis.eval(incrementAttemptsScript, 1, otpKey(id));
    return Number(attempts);
  }

  async consume(id: string): Promise<boolean> {
    const deleted = await this.redis.del(otpKey(id));
    return deleted > 0;
  }

  async delete(id: string): Promise<void> {
    await this.redis.del(otpKey(id));
  }
}
