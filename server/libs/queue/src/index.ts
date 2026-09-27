import { type Processor, Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

// BullMQ queue names. pv-parse and pv-runtime belonged to services the new architecture removed; the names stay
// reserved.
export const QUEUE_NAMES = { parse: 'pv-parse', ai: 'pv-ai', runtime: 'pv-runtime', ml: 'pv-ml' } as const;

// BullMQ needs maxRetriesPerRequest = null on its connections.
export function createRedis(url: string, lazy = false): Redis {
  return new Redis(url, { maxRetriesPerRequest: null, lazyConnect: lazy });
}

export function createQueue<T = unknown>(name: string, connection: Redis): Queue<T> {
  return new Queue<T>(name, { connection });
}

export function createWorker<T = unknown, R = unknown>(name: string, connection: Redis, processor: Processor<T, R>, concurrency = 2): Worker<T, R> {
  return new Worker<T, R>(name, processor, { connection, concurrency });
}
