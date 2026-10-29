import { describe, expect, it } from 'vitest';
import { looksLikeNewsHtml, sanitizeNewsHtml } from '@/shared/lib/sanitizeHtml';

describe('sanitizeNewsHtml', () => {
  it('conserva las etiquetas semánticas permitidas', () => {
    const input =
      '<p>Hola <strong>equipo</strong> <em>MAPS</em></p><h2>Sección</h2><ul><li>uno</li></ul><blockquote>cita</blockquote>';
    expect(sanitizeNewsHtml(input)).toBe(input);
  });

  it('elimina <script> y su contenido', () => {
    const out = sanitizeNewsHtml('<p>ok</p><script>alert(1)</script>');
    expect(out).toBe('<p>ok</p>');
    expect(out).not.toContain('script');
  });

  it('neutraliza href con javascript: y quita handlers de eventos', () => {
    const out = sanitizeNewsHtml('<a href="javascript:alert(1)" onclick="hack()">x</a>');
    expect(out).not.toContain('javascript');
    expect(out).not.toContain('onclick');
    expect(out).toBe('<a>x</a>');
  });

  it('agrega target/rel seguros a links externos', () => {
    const out = sanitizeNewsHtml('<a href="https://maps.org">sitio</a>');
    expect(out).toContain('href="https://maps.org"');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it('descarta estilos inline pero preserva el texto', () => {
    const out = sanitizeNewsHtml('<p style="color:red;font-size:40px">texto</p>');
    expect(out).toBe('<p>texto</p>');
  });

  it('descarta imágenes con src inseguro', () => {
    expect(sanitizeNewsHtml('<img src="javascript:alert(1)">')).toBe('');
    expect(sanitizeNewsHtml('<img src="https://cdn/x.png" alt="ok">')).toContain(
      'src="https://cdn/x.png"',
    );
  });
});

describe('looksLikeNewsHtml', () => {
  it('detecta contenido enriquecido', () => {
    expect(looksLikeNewsHtml('<p>hola</p>')).toBe(true);
    expect(looksLikeNewsHtml('texto <strong>fuerte</strong>')).toBe(true);
  });

  it('trata el texto plano de noticias antiguas como no-HTML', () => {
    expect(looksLikeNewsHtml('Continúan abiertas las inscripciones.\n👉 Inscribite acá')).toBe(
      false,
    );
    expect(looksLikeNewsHtml('')).toBe(false);
  });
});
