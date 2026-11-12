import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

import { CATALOG, DEFAULT_CASE } from './src/catalog/parts.ts';
import { CATEGORY_ORDER, type Category } from './src/catalog/types.ts';
import { cablesFor, slotsFrom } from './src/rules/compat.ts';
import { ICON_SPRITE, allPages, searchIndex, statusHtml, type Page } from './src/ui/html.ts';

const CSS = 'src/styles.css';

const minify = (css: string): string =>
  css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{}:;,>])\s*/g, '$1').trim();

const pages = (): Page[] => allPages(CATALOG);
const pageAt = (path: string): Page => pages().find((page) => page.path === path) ?? pages()[0];
const dataFor = (category: Category): string =>
  JSON.stringify(CATALOG.filter((item) => item.category === category));
const preloadFor = (page: Page): string =>
  page.data ? `<link rel="preload" as="fetch" crossorigin href="/data/${page.data}.json">` : '';

/** Everything that differs between pages, wrapped in markers so a page can be re-stamped. */
function fill(html: string, page: Page): string {
  return html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${page.title}</title>`)
    .replace(/<!--preload-->|<!--l0-->[\s\S]*?<!--l1-->/, `<!--l0-->${preloadFor(page)}<!--l1-->`)
    .replace(/<!--panel-->|<!--p0-->[\s\S]*?<!--p1-->/, `<!--p0-->${page.panel}<!--p1-->`);
}

/**
 * Renders the site at build time. The stylesheet goes inline; every catalog
 * page is written out as real HTML, plus a small fragment of just its panel
 * for in-page navigation, plus the part data each category needs.
 */
function shell(): Plugin {
  let outDir = 'dist';
  return {
    name: 'part-by-part-shell',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const path = (ctx.originalUrl ?? '/').split('?')[0];
        const empty = slotsFrom(DEFAULT_CASE, []);
        return fill(html, pageAt(path))
          .replace('<!--css-->', `<style>${minify(readFileSync(CSS, 'utf8'))}</style>`)
          .replace('<!--sprite-->', ICON_SPRITE)
          .replace('<!--status-->', statusHtml(empty, cablesFor(empty).map((cable) => ({ cable, plugged: false })), false))
          .replace('<!--boot-->', `<script type="application/json" id="boot">${JSON.stringify({ case: DEFAULT_CASE }).replace(/</g, '\\u003c')}</script>`);
      },
    },
    configureServer(server) {
      server.watcher.add(CSS);
      server.watcher.on('change', (file) => {
        if (file.endsWith(CSS)) server.ws.send({ type: 'full-reload' });
      });
      server.middlewares.use((request, response, next) => {
        const path = (request.url ?? '').split('?')[0];
        const data = /^\/data\/([a-z]+)\.json$/.exec(path);
        if (data) {
          response.setHeader('content-type', 'application/json');
          response.end(data[1] === 'index' ? JSON.stringify(searchIndex(CATALOG)) : dataFor(data[1] as Category));
          return;
        }
        if (path.endsWith('/panel.html')) {
          const page = pages().find((item) => item.path === path.slice(0, -'panel.html'.length));
          if (page) {
            response.setHeader('content-type', 'text/html; charset=utf-8');
            response.end(page.panel);
            return;
          }
        }
        next();
      });
    },
    closeBundle() {
      const write = (file: string, content: string): void => {
        const target = join(outDir, file);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, content);
      };
      const home = readFileSync(join(outDir, 'index.html'), 'utf8');
      for (const page of pages()) {
        if (page.path !== '/') write(`${page.path}index.html`, fill(home, page));
        write(`${page.path}panel.html`, page.panel);
      }
      for (const category of CATEGORY_ORDER) write(`data/${category}.json`, dataFor(category));
      write('data/index.json', JSON.stringify(searchIndex(CATALOG)));
      // The minifier strips licence comments, so ship the notices as a file.
      write('THIRD-PARTY-LICENSES.txt', [
        'This site includes the following third-party software.',
        '',
        'three.js (https://threejs.org)',
        '',
        readFileSync('node_modules/three/LICENSE', 'utf8').trim(),
        '',
      ].join('\n'));
    },
  };
}

/** Starts fetching the 3D code alongside the page instead of after its script runs. */
function preloadScene(): Plugin {
  return {
    name: 'part-by-part-preload-scene',
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
