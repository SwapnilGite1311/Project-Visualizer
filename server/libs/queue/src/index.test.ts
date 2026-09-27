import { describe, expect, it } from 'vitest';
import { createRedis, QUEUE_NAMES } from './index';

describe('queue helpers', () => {
  it('names the queues', () => {
    expect(QUEUE_NAMES.parse).toBe('pv-parse');
    expect(QUEUE_NAMES.ai).toBe('pv-ai');
    expect(QUEUE_NAMES.ml).toBe('pv-ml');
  });

  it('creates a lazy Redis connection without connecting', async () => {
    const redis = createRedis('redis://localhost:6379', true);
    expect(redis.status).toBe('wait');
    expect(redis.options.maxRetriesPerRequest).toBeNull();
    redis.disconnect();
  });
});
