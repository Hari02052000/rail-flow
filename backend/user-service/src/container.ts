import type { Redis } from 'ioredis';
import type { Pool } from 'pg';
import { env } from './config/env.js';
import { createPool } from './db/pool.js';
import { createRedis } from './db/redis.js';
import { RedisOtpRepository } from './repositories/otp.repository.js';
import type { OtpRepository } from './repositories/otp.repository.interface.js';
import { PostgresUserRepository } from './repositories/user.repository.js';
import type { UserRepository } from './repositories/user.repository.interface.js';
import { DefaultAuthService } from './services/auth.service.js';
import type { AuthService } from './services/auth.service.interface.js';
import { createEmailSender, type EmailSender } from './utils/email.js';

export interface AppContainer {
  readonly pool: Pool;
  readonly redis: Redis;
  readonly userRepository: UserRepository;
  readonly otpRepository: OtpRepository;
  readonly emailSender: EmailSender;
  readonly authService: AuthService;
}

export const buildContainer = (): AppContainer => {
  const pool = createPool({
    connectionString: env.DATABASE_URL,
    maxConnections: env.DATABASE_POOL_MAX,
    ssl: env.DATABASE_SSL,
  });

  const redis = createRedis({
    url: env.REDIS_URL,
    keyPrefix: env.REDIS_KEY_PREFIX,
  });

  const emailSender = createEmailSender({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    user: env.SMTP_USER || undefined,
    pass: env.SMTP_PASS || undefined,
    from: env.SMTP_FROM,
  });

  const userRepository = new PostgresUserRepository(pool);
  const otpRepository = new RedisOtpRepository(redis);

  const authService = new DefaultAuthService(userRepository, otpRepository, emailSender, {
    otpSecret: env.OTP_HMAC_SECRET,
    otpTtlSeconds: env.OTP_TTL_SECONDS,
    otpMaxAttempts: env.OTP_MAX_ATTEMPTS,
  });

  return {
    pool,
    redis,
    userRepository,
    otpRepository,
    emailSender,
    authService,
  };
};
