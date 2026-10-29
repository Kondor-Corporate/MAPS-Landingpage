export type StorageConsistencyCategory = 'certificaciones' | 'fotos' | 'noticias';

export type StorageConsistencyOperation =
  | 'compensate_upload'
  | 'cleanup_after_db_replace'
  | 'cleanup_after_db_delete';

export type CleanupBestEffortOptions = {
  operation: StorageConsistencyOperation;
  category: StorageConsistencyCategory;
  resourceId: string | number;
  cleanup: () => void | Promise<void>;
};

function normalizeError(error: unknown): { errorName: string; errorMessage: string } {
  if (error instanceof Error) {
    return { errorName: error.name, errorMessage: error.message };
  }
  return { errorName: 'UnknownError', errorMessage: String(error) };
}

export async function cleanupBestEffort(options: CleanupBestEffortOptions): Promise<void> {
  try {
    await options.cleanup();
  } catch (error) {
    const { errorName, errorMessage } = normalizeError(error);
    console.warn('storage.consistency_cleanup_failed', {
      operation: options.operation,
      category: options.category,
      resourceId: options.resourceId,
      errorName,
      errorMessage,
    });
  }
}

export async function compensateUploadFailure(
  options: Omit<CleanupBestEffortOptions, 'operation'>,
): Promise<void> {
  await cleanupBestEffort({ ...options, operation: 'compensate_upload' });
}
