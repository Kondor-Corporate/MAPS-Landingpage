/**
 * Sanitizador HTML mínimo para el contenido enriquecido de Noticias.
 * Usa el DOM del navegador (disponible también en jsdom para tests): parsea el
 * HTML, reconstruye un árbol nuevo con una whitelist estricta de etiquetas y
 * atributos y descarta todo lo demás. Evita XSS sin sumar dependencias.
 *
 * El ADMIN define estructura semántica; la PRESENTACIÓN la fija el frontend
 * (ver `.news-prose` en index.css). Por eso NO se permite `style`, `class`,
 * ni handlers de eventos: sólo etiquetas semánticas y atributos imprescindibles.
 */

/** Etiquetas semánticas permitidas dentro del cuerpo de una noticia. */
const ALLOWED_TAGS = new Set([
  'P',
  'BR',
  'STRONG',
  'B',
  'EM',
  'I',
  'H2',
  'UL',
  'OL',
  'LI',
  'BLOCKQUOTE',
  'A',
  'IMG',
]);

/** Atributos permitidos por etiqueta. El resto se descarta. */
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  A: new Set(['href', 'target', 'rel']),
  IMG: new Set(['src', 'alt']),
};

/** Etiquetas cuyo contenido se elimina por completo (no sólo la etiqueta). */
const DROP_WITH_CONTENT = new Set([
  'SCRIPT',
  'STYLE',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'NOSCRIPT',
  'TEMPLATE',
  'HEAD',
  'META',
  'LINK',
]);

/** Protocolos seguros para `href`. Se admiten rutas relativas y anclas. */
const SAFE_HREF = /^(https?:|mailto:|tel:)/i;
/** Sólo imágenes por http(s), ruta relativa o data-uri de imagen. */
const SAFE_IMG_SRC = /^(https?:\/\/|\/|data:image\/)/i;

function normalizeUrl(raw: string): string {
  // Elimina espacios y caracteres de control (charCode <= 32) que podrían
  // ofuscar el protocolo (p.ej. `java\tscript:` o `java\nscript:`).
  let out = '';
  for (const ch of raw.trim()) {
    if (ch.charCodeAt(0) > 32) out += ch;
  }
  return out;
}

function isSafeHref(raw: string): boolean {
  const url = normalizeUrl(raw);
  if (url.startsWith('/') || url.startsWith('#')) return true;
  return SAFE_HREF.test(url);
}

function sanitizeElement(el: Element, doc: Document): Node | null {
  const tag = el.tagName.toUpperCase();

  if (DROP_WITH_CONTENT.has(tag)) return null;

  // Etiqueta no permitida: la "desenvolvemos" conservando su texto/hijos válidos.
  if (!ALLOWED_TAGS.has(tag)) {
    return unwrapChildren(el, doc);
  }

  const clean = doc.createElement(tag.toLowerCase());
  const allowed = ALLOWED_ATTRS[tag];

  if (allowed) {
    if (tag === 'A') {
      const href = el.getAttribute('href');
      if (href && isSafeHref(href)) {
        const normalized = normalizeUrl(href);
        clean.setAttribute('href', normalized);
        // Links externos: apertura segura en pestaña nueva.
        if (/^https?:/i.test(normalized)) {
          clean.setAttribute('target', '_blank');
          clean.setAttribute('rel', 'noopener noreferrer');
        }
      }
    } else if (tag === 'IMG') {
      const src = el.getAttribute('src');
      if (src && SAFE_IMG_SRC.test(normalizeUrl(src))) {
        clean.setAttribute('src', normalizeUrl(src));
      } else {
        // Imagen sin src seguro: se descarta la etiqueta.
        return null;
      }
      const alt = el.getAttribute('alt');
      if (alt) clean.setAttribute('alt', alt);
    }
  }

  for (const child of Array.from(el.childNodes)) {
    const sanitized = sanitizeNode(child, doc);
    if (sanitized) clean.appendChild(sanitized);
  }

  return clean;
}

/** Devuelve un fragmento con los hijos saneados de un elemento no permitido. */
function unwrapChildren(el: Element, doc: Document): Node {
  const fragment = doc.createDocumentFragment();
  for (const child of Array.from(el.childNodes)) {
    const sanitized = sanitizeNode(child, doc);
    if (sanitized) fragment.appendChild(sanitized);
  }
  return fragment;
}

function sanitizeNode(node: Node, doc: Document): Node | null {
  if (node.nodeType === 3 /* TEXT_NODE */) {
    return doc.createTextNode(node.textContent ?? '');
  }
  if (node.nodeType === 1 /* ELEMENT_NODE */) {
    return sanitizeElement(node as Element, doc);
  }
  // Comentarios y otros tipos de nodo se descartan.
  return null;
}

/**
 * Devuelve una versión saneada del HTML recibido, apta para renderizar con
 * `dangerouslySetInnerHTML`. Fuera de un entorno con DOM devuelve string vacío.
 */
export function sanitizeNewsHtml(html: string): string {
  if (!html) return '';
  if (typeof document === 'undefined' || typeof DOMParser === 'undefined') return '';

  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const container = document.createElement('div');
  for (const child of Array.from(parsed.body.childNodes)) {
    const sanitized = sanitizeNode(child, document);
    if (sanitized) container.appendChild(sanitized);
  }
  return container.innerHTML;
}

/**
 * Heurística para distinguir cuerpos con formato enriquecido (HTML producido por
 * el editor) de noticias antiguas guardadas como texto plano. Busca alguna de las
 * etiquetas de bloque/inline que el editor puede generar.
 */
export function looksLikeNewsHtml(content: string): boolean {
  if (!content) return false;
  return /<(p|br|strong|b|em|i|h2|ul|ol|li|blockquote|a|img)\b[^>]*>/i.test(content);
}
