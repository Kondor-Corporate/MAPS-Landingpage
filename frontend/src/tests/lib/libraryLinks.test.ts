import { describe, expect, it } from 'vitest';
import { isResolvableLibraryUrl } from '@/shared/utils/libraryLinks';

describe('isResolvableLibraryUrl', () => {
  it('true cuando hay un link configurado, sin importar si el Drive existe', () => {
    expect(isResolvableLibraryUrl('https://drive.google.com/drive/folders/XXXXXXXX')).toBe(true);
    expect(isResolvableLibraryUrl('https://drive.google.com/drive/folders/EXAMPLE')).toBe(true);
  });

  it('false cuando no hay link configurado', () => {
    expect(isResolvableLibraryUrl(null)).toBe(false);
    expect(isResolvableLibraryUrl(undefined)).toBe(false);
    expect(isResolvableLibraryUrl('')).toBe(false);
    expect(isResolvableLibraryUrl('   ')).toBe(false);
  });
});
