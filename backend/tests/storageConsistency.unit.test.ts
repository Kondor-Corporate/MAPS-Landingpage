import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanupBestEffort,
  compensateUploadFailure,
} from '../src/lib/storageConsistency.js';

describe('storageConsistency', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('ejecuta el callback exactamente una vez', async () => {
    const cleanup = vi.fn().mockResolvedValue(undefined);

    await cleanupBestEffort({
      operation: 'cleanup_after_db_delete',
      category: 'fotos',
      resourceId: 42,
      cleanup,
    });

    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('cleanup exitoso no emite warning', async () => {
    await cleanupBestEffort({
      operation: 'cleanup_after_db_replace',
      category: 'noticias',
      resourceId: 'news-1',
      cleanup: async () => undefined,
    });

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('cleanup con Error no propaga el throw', async () => {
    await expect(
      cleanupBestEffort({
        operation: 'cleanup_after_db_delete',
        category: 'certificaciones',
        resourceId: 7,
        cleanup: async () => {
          throw new Error('delete failed');
        },
      }),
    ).resolves.toBeUndefined();
  });

  it('cleanup con Error emite warning exactamente una vez', async () => {
    await cleanupBestEffort({
      operation: 'cleanup_after_db_delete',
      category: 'fotos',
      resourceId: 9,
      cleanup: async () => {
        throw new Error('provider down');
      },
    });

    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalledWith('storage.consistency_cleanup_failed', {
      operation: 'cleanup_after_db_delete',
      category: 'fotos',
      resourceId: 9,
      errorName: 'Error',
      errorMessage: 'provider down',
    });
  });

  it('no incluye URL, buffer ni secrets en metadata del warning', async () => {
    await cleanupBestEffort({
      operation: 'compensate_upload',
      category: 'noticias',
      resourceId: 3,
      cleanup: async () => {
        throw new Error('https://secret.example/uploads/noticias/token.pdf');
      },
    });

    const payload = warnSpy.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(payload).toEqual({
      operation: 'compensate_upload',
      category: 'noticias',
      resourceId: 3,
      errorName: 'Error',
      errorMessage: 'https://secret.example/uploads/noticias/token.pdf',
    });
    expect(payload).not.toHaveProperty('url');
    expect(payload).not.toHaveProperty('buffer');
    expect(payload).not.toHaveProperty('token');
  });

  it('normaliza rejects no-Error sin romper el helper', async () => {
    await expect(
      cleanupBestEffort({
        operation: 'cleanup_after_db_replace',
        category: 'certificaciones',
        resourceId: 1,
        cleanup: async () => {
          throw 'plain failure';
        },
      }),
    ).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith('storage.consistency_cleanup_failed', {
      operation: 'cleanup_after_db_replace',
      category: 'certificaciones',
      resourceId: 1,
      errorName: 'UnknownError',
      errorMessage: 'plain failure',
    });
  });

  it('compensateUploadFailure usa operation compensate_upload', async () => {
    await compensateUploadFailure({
      category: 'fotos',
      resourceId: 55,
      cleanup: async () => {
        throw new Error('compensation failed');
      },
    });

    expect(warnSpy).toHaveBeenCalledWith('storage.consistency_cleanup_failed', {
      operation: 'compensate_upload',
      category: 'fotos',
      resourceId: 55,
      errorName: 'Error',
      errorMessage: 'compensation failed',
    });
  });
});
