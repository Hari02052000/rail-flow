import { Redis } from 'ioredis';

export interface RedisConfig {
  url: string;
  keyPrefix?: string;
}

export const createRedis = (config: RedisConfig): Redis => {
  const redis = new Redis(config.url, {
    keyPrefix: config.keyPrefix,
    lazyConnect: true,
    maxRetriesPerRequest: 2,
  });

  redis.on('error', (error) => {
    console.error('Unexpected Redis error:', error);
  });

  return redis;
};

export const verifyRedisConnection = async (redis: Redis): Promise<void> => {
  if (redis.status === 'wait') {
    await redis.connect();
  }

  await redis.ping();
};
