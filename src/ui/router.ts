// In-page navigation for the catalog panel. Links marked data-nav swap only
// the panel's content, so the 3D view and the build stay on screen. The next
// page is fetched when the pointer reaches a link, before the click.

import { loadCategory } from '../catalog/client.ts';
import { CATEGORY_ORDER, type Category } from '../catalog/types.ts';

const fragments = new Map<string, Promise<string>>();
const scrolls = new Map<string, number>();

const clean = (href: string): string => new URL(href, location.href).pathname;

export function categoryOf(path: string): Category | null {
  const match = /^\/parts\/([a-z]+)\//.exec(path);
  return match && (CATEGORY_ORDER as string[]).includes(match[1]) ? (match[1] as Category) : null;
}

/** Fetches a page's panel and the part data it needs. Safe to call repeatedly. */
export function prefetch(path: string): Promise<string> {
  let load = fragments.get(path);
  if (!load) {
    load = fetch(`${path}panel.html`).then((response) => {
      if (!response.ok) throw new Error(`${path}: ${response.status}`);
      return response.text();
    });
    load.catch(() => fragments.delete(path));
    fragments.set(path, load);
  }
  const category = categoryOf(path);
  if (category) void loadCategory(category).catch(() => undefined);
  return load;
}

export interface Router {
  go(path: string): Promise<void>;
  /** Milliseconds from the last link click to the frame showing the new page. */
  lastSwap: number | null;
}

export function startRouter(panel: HTMLElement, onSwap: (path: string) => void): Router {
  let current = location.pathname;
  let token = 0;

  const router: Router = {
    lastSwap: null,
    async go(path) {
      await show(path, true, null);
    },
  };

  async function show(path: string, push: boolean, clickedAt: number | null): Promise<void> {
    const mine = ++token;
    scrolls.set(current, panel.scrollTop);
    let html: string;
    try {
      html = await prefetch(path);
    } catch {
      location.href = path; // fall back to a normal page load
      return;
    }
    if (mine !== token) return; // a later click won
    panel.innerHTML = html;
    const page = panel.firstElementChild as HTMLElement | null;
    if (page?.dataset.title) document.title = page.dataset.title;
    if (push) history.pushState(null, '', path);
    panel.scrollTop = push ? 0 : scrolls.get(path) ?? 0;
    current = path;
    onSwap(path);
    if (clickedAt !== null) {
      requestAnimationFrame(() => { router.lastSwap = performance.now() - clickedAt; });
    }
  }

  const linkOf = (target: EventTarget | null): HTMLAnchorElement | null =>
    (target as Element | null)?.closest<HTMLAnchorElement>('a[data-nav]') ?? null;

  const warm = (event: Event): void => {
    const link = linkOf(event.target);
    if (link) void prefetch(clean(link.href)).catch(() => undefined);
  };
  document.addEventListener('pointerover', warm);
  document.addEventListener('pointerdown', warm);
  document.addEventListener('focusin', warm);

  document.addEventListener('click', (event) => {
    const link = linkOf(event.target);
    if (!link || event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const path = clean(link.href);
    if (path !== current) void show(path, true, event.timeStamp);
  });

  window.addEventListener('popstate', () => {
    void show(location.pathname, false, null);
  });

  return router;
}
