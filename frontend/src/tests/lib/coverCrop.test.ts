import { describe, expect, it } from 'vitest';
import { coverCropToImageStyle, parseCoverCrop, type CoverCrop } from '@/shared/lib/coverCrop';

const crop: CoverCrop = {
  x: -10,
  y: 20,
  zoom: 2,
  area: { x: 25, y: 10, width: 50, height: 40 },
};

describe('parseCoverCrop', () => {
  it('acepta un encuadre válido', () => {
    expect(parseCoverCrop(crop)).toEqual(crop);
  });

  it('rechaza null, no-objetos y áreas inválidas', () => {
    expect(parseCoverCrop(null)).toBeNull();
    expect(parseCoverCrop('x')).toBeNull();
    expect(parseCoverCrop({ x: 0, y: 0, zoom: 1 })).toBeNull();
    expect(
      parseCoverCrop({ x: 0, y: 0, zoom: 1, area: { x: 0, y: 0, width: 0, height: 10 } }),
    ).toBeNull();
  });
});

describe('coverCropToImageStyle', () => {
  it('mapea el sub-rectángulo para que llene el contenedor', () => {
    const style = coverCropToImageStyle(crop);
    // width = 10000/50 = 200%, height = 10000/40 = 250%
    expect(style.width).toBe('200.000%');
    expect(style.height).toBe('250.000%');
    // left = -(25/50)*100 = -50%, top = -(10/40)*100 = -25%
    expect(style.left).toBe('-50.000%');
    expect(style.top).toBe('-25.000%');
    expect(style.position).toBe('absolute');
    expect(style.objectFit).toBe('fill');
  });
});
