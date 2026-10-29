import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/redis.js', () => ({
  getRedisClient: () => null,
  isRedisHealthy: () => false,
}));

describe('runWithNominatimSlot', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('serializa tareas respetando al menos 1s entre inicios (máx. 1 req/s global)', async () => {
    const { runWithNominatimSlot } = await import('../src/lib/nominatimLimiter.js');
    const starts: number[] = [];

    const tasks = [1, 2, 3].map(() =>
      runWithNominatimSlot(async () => {
        starts.push(Date.now());
        return null;
      }),
    );

    await vi.runAllTimersAsync();
    await Promise.all(tasks);

    expect(starts).toHaveLength(3);
    expect(starts[1] - starts[0]).toBeGreaterThanOrEqual(1000);
    expect(starts[2] - starts[1]).toBeGreaterThanOrEqual(1000);
  });

  it('una única tarea no espera cupo (sin cache-misses concurrentes)', async () => {
    const { runWithNominatimSlot } = await import('../src/lib/nominatimLimiter.js');
    const task = vi.fn(async () => 'ok');

    const result = await runWithNominatimSlot(task);

    expect(result).toBe('ok');
    expect(task).toHaveBeenCalledTimes(1);
  });
});
