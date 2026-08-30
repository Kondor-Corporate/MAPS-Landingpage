import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, type HtmlTagDescriptor, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type PublicHtmlMetadata = {
  indexing: boolean;
  siteUrl: string | null;
};

function isPublicIndexingEnabled(value: string | undefined): boolean {
  if (value == null || value.trim() === '') {
    return false;
  }

  return value.trim().toLowerCase() === 'true';
}

function parsePublicSiteUrl(value: string | undefined): string | null {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed === '' || trimmed.endsWith('/')) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:') {
    return null;
  }

  if (parsed.username !== '' || parsed.password !== '') {
    return null;
  }

  if (parsed.search !== '' || parsed.hash !== '') {
    return null;
  }

  if (parsed.pathname !== '/' && parsed.pathname !== '') {
    return null;
  }

  if (trimmed !== parsed.origin) {
    return null;
  }

  return parsed.origin;
}

function resolvePublicHtmlMetadata(env: Record<string, string>): PublicHtmlMetadata {
  const indexing = isPublicIndexingEnabled(env.VITE_PUBLIC_INDEXING);
  const rawSiteUrl = env.VITE_PUBLIC_SITE_URL;

  if (indexing) {
    const siteUrl = parsePublicSiteUrl(rawSiteUrl);
    if (!siteUrl) {
      const received = rawSiteUrl?.trim() ? ` Recibido: "${rawSiteUrl.trim()}".` : '';
      throw new Error(
        'VITE_PUBLIC_INDEXING=true requiere VITE_PUBLIC_SITE_URL con un origen HTTPS válido, ' +
          `sin path, query, fragment ni barra final.${received}`,
      );
    }

    return { indexing: true, siteUrl };
  }

  return {
    indexing: false,
    siteUrl: parsePublicSiteUrl(rawSiteUrl),
  };
}

function mapsPublicHtmlMetadata({ indexing, siteUrl }: PublicHtmlMetadata): Plugin {
  const robotsContent = indexing ? 'index,follow' : 'noindex,nofollow';

  return {
    name: 'maps-public-html-metadata',
    transformIndexHtml(html) {
      const nextHtml = html.replace(
        /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i,
        `<meta name="robots" content="${robotsContent}" />`,
      );

      const tags: HtmlTagDescriptor[] = [];

      if (!/<meta\s+name=["']robots["']/i.test(nextHtml)) {
        tags.push({
          tag: 'meta',
          attrs: { name: 'robots', content: robotsContent },
          injectTo: 'head',
        });
      }

      if (siteUrl) {
        const pageUrl = `${siteUrl}/`;
        tags.push(
          {
            tag: 'link',
            attrs: { rel: 'canonical', href: pageUrl },
            injectTo: 'head',
          },
          {
            tag: 'meta',
            attrs: { property: 'og:url', content: pageUrl },
            injectTo: 'head',
          },
        );
      }

      return { html: nextHtml, tags };
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const publicHtml = resolvePublicHtmlMetadata(env);

  return {
    plugins: [react(), mapsPublicHtmlMetadata(publicHtml)],
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: true,
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
