import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';

import { CASE, PARTS } from './src/catalog/parts.ts';
import { slotsFrom } from './src/rules/compat.ts';
import { ICON_SPRITE, statusHtml, trayHtml } from './src/ui/html.ts';

const CSS = 'src/styles.css';

const minify = (css: string): string =>
  css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{}:;,>])\s*/g, '$1').trim();

/**
 * Renders the page shell at build time: the stylesheet goes inline, and the
 * parts tray and build panel arrive as HTML instead of being built by script.
 */
function shell(): Plugin {
  return {
    name: 'pc-builder-shell',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html
          .replace('<!--css-->', `<style>${minify(readFileSync(CSS, 'utf8'))}</style>`)
          .replace('<!--sprite-->', ICON_SPRITE)
          .replace('<!--case-->', `${CASE.brand} ${CASE.name} · ATX mid tower`)
          .replace('<!--tray-->', trayHtml(PARTS))
          .replace('<!--status-->', statusHtml(slotsFrom(CASE, []), false));
      },
    },
    configureServer(server) {
      server.watcher.add(CSS);
      server.watcher.on('change', (file) => {
        if (file.endsWith(CSS)) server.ws.send({ type: 'full-reload' });
      });
    },
  };
}

/** Starts fetching the 3D code alongside the page instead of after its script runs. */
function preloadScene(): Plugin {
  return {
    name: 'pc-builder-preload-scene',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        if (!ctx.bundle) return [];
        return Object.values(ctx.bundle)
          .filter((chunk) => chunk.type === 'chunk' && !chunk.isEntry)
          .map((chunk) => ({
            tag: 'link',
            attrs: { rel: 'modulepreload', href: `/${chunk.fileName}` },
            injectTo: 'head' as const,
          }));
      },
    },
  };
}

export default defineConfig({
  plugins: [shell(), preloadScene()],
  build: { target: 'es2022', cssMinify: true, reportCompressedSize: true },
  server: { port: 5173, strictPort: true },
});
