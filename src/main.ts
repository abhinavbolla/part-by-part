// Page wiring. Every catalog page and the build panel arrive as HTML; this
// script attaches behaviour to them and loads the 3D view in a separate chunk,
// so the page is readable and clickable before any 3D code has arrived.

import { BuildStore } from './build/store.ts';
import { itemsOf, loadCategory, peek, remember, searchIndex, type SearchEntry } from './catalog/client.ts';
import type { CasePart, CatalogItem, Category, Step } from './catalog/types.ts';
import { CATEGORY_LABEL, CATEGORY_ORDER, isCable } from './catalog/types.ts';
import { isBlocked, isMisfit } from './rules/compat.ts';
import type { Insets, SceneApi } from './scene/scene.ts';
import { statusHtml } from './ui/html.ts';
import { categoryOf, prefetch, startRouter } from './ui/router.ts';

performance.mark('app-start');

const el = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const canvas = el<HTMLCanvasElement>('view');
const tray = el('tray');
const panel = el('panel');
const status = el('status');
const timeline = el('timeline');
const search = el<HTMLInputElement>('search');
const scrub = el<HTMLInputElement>('scrub');
const undo = el<HTMLButtonElement>('undo');
const redo = el<HTMLButtonElement>('redo');
const replay = el<HTMLButtonElement>('replay');
const count = el('count');
const callout = el('callout');
const chip = el('chip');
const notice = el('notice');
const hud = el('hud');
const lookButton = el<HTMLButtonElement>('look');

const SAVE_KEY = 'pc-builder:build';
const boot = JSON.parse(el('boot').textContent ?? '{}') as { case: CasePart };
const store = new BuildStore(boot.case);
try {
  store.restore(JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null'));
} catch {
  // A build that cannot be read is simply not restored.
}
remember([store.pcCase, ...store.steps.filter((step): step is Exclude<Step, { category: 'cable' }> => !isCable(step))]);

let scene: SceneApi | null = null;
let powered = false;
let scrubbing = false;

/** How much of the window the panels cover, so the case is centred in what is left. */
function insets(): Insets {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const out: Insets = { left: 0, right: 0, top: 0, bottom: 0 };
  const trayRect = tray.getBoundingClientRect();
  const statusRect = status.getBoundingClientRect();
  // On a wide window the panels sit at the sides; on a narrow one they are bands.
  if (trayRect.width > vw * 0.6) out.bottom = vh - trayRect.top;
  else out.left = trayRect.right;
  if (statusRect.width > vw * 0.6) out.top = statusRect.bottom;
  else out.right = vw - statusRect.left;
  out.bottom = Math.max(out.bottom, vh - timeline.getBoundingClientRect().top);
  return out;
}

const sceneReady = import('./scene/scene.ts').then((module) => {
  scene = module.createScene(canvas, store, insets);
  scene.setProgressListener((value) => {
    if (!scrubbing) scrub.value = String(value);
  });
  performance.mark('scene-ready');
  // Chrome spends about 45 ms on the first page update after load. Redrawing
  // the build panel once while idle pays that before the first click does.
  scene.warmShaders(() => {
    refresh();
    fetchCategoriesAhead();
    drawPictures();
  });
  lookButton.textContent = scene.look === 'drawing' ? 'Shaded' : 'Drawing';
  scene.warm(store.steps);
  warmCategory(categoryOf(location.pathname));
  return scene;
});

/**
 * Fetches the eight category pages and their part data once the page has
 * settled (about 15 KB in all), so opening a category never waits on the
 * network. Part pages are still fetched when the pointer reaches their link.
 */
function fetchCategoriesAhead(): void {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData) return;
  const queue = [...CATEGORY_ORDER];
  const next = (): void => {
    const category = queue.shift();
    if (!category) return;
    void prefetch(`/parts/${category}/`).catch(() => undefined)
      .then(() => loadCategory(category).catch(() => undefined))
      .then(() => {
        drawPictures();
        setTimeout(next, 30);
      });
  };
  setTimeout(next, 200);
}

/** Builds a category's parts in the background once its data is here. */
function warmCategory(category: Category | null): void {
  if (!category) return;
  void loadCategory(category).then((items) => {
    scene?.warm(items.filter((item): item is Exclude<CatalogItem, CasePart> => item.category !== 'case'));
    refresh();
  }).catch(() => undefined);
}

// ---- pictures of parts ---------------------------------------------------------

/** Line drawings of single parts, made in the browser from the same models the build uses. */
const pictures = new Map<string, string>();
const figures = new Map<string, string>();
let drawing = false;

/** The part that stands for a category on the home sheet: what is seated, else its first item. */
function faceOf(category: Category): CatalogItem | undefined {
  const slots = store.slots;
  if (category === 'case') return slots.case;
  const seated = category === 'storage' ? slots.storage[0] : slots[category];
  return seated ?? itemsOf(category)?.[0];
}

/** Shows a drawing in the box that was reserved for it, so nothing around it moves. */
function fill(box: Element | null, url: string): void {
  if (!box) return;
  const shown = box.querySelector('img');
  if (shown) {
    if (shown.src !== url) shown.src = url;
    return;
  }
  const image = new Image();
  image.alt = '';
  image.draggable = false;
  image.src = url;
  box.replaceChildren(image);
}

/** Puts the pictures already made into the cards on screen, and queues the rest. */
function drawPictures(): void {
  const waiting: HTMLElement[] = [];
  for (const link of panel.querySelectorAll<HTMLElement>('.catlink')) {
    const face = faceOf(link.dataset.cat as Category);
    if (!face) continue;
    link.dataset.id = face.id;
    const url = pictures.get(face.id);
    if (url) fill(link.querySelector('.shot'), url);
    else waiting.push(link);
  }
  for (const card of panel.querySelectorAll<HTMLElement>('.card[data-id]')) {
    const id = card.dataset.id!;
    if (card.classList.contains('detail')) {
      const item = peek(id);
      const url = figures.get(id) ?? (item && scene?.thumbnail(item, 660, 528, 2));
      if (!url) continue;
      figures.set(id, url);
      fill(card.querySelector('.figure'), url);
      continue;
    }
    const url = pictures.get(id);
    if (url) fill(card.querySelector('.shot'), url);
    else if (peek(id)) waiting.push(card);
  }
  if (drawing || !waiting.length || !scene || scene.look !== 'drawing') return;
  drawing = true;
  const next = (): void => {
    drawing = false;
    const card = waiting.shift();
    const item = card && (peek(card.dataset.id!) ?? (card.dataset.id === store.pcCase.id ? store.pcCase : undefined));
    // Wait for a quiet moment: a picture takes a few milliseconds of the main thread.
    if (item && scene?.stats.settled) {
      const url = scene.thumbnail(item, 168, 132, 3);
      if (url) pictures.set(item.id, url);
    }
    drawPictures();
  };
  if ('requestIdleCallback' in window) window.requestIdleCallback(next, { timeout: 400 });
  else setTimeout(next, 40);
}

// ---- looking things up -------------------------------------------------------

/** A catalog item or cable by id, if its data has arrived. */
function resolve(id: string): CatalogItem | Step | undefined {
  return peek(id)
    ?? store.wiring().find((item) => item.cable.id === id)?.cable
    ?? store.steps.find((step) => step.id === id);
}

const cardOf = (target: EventTarget | null): { card: HTMLElement; item: CatalogItem | Step } | null => {
  const card = (target as Element | null)?.closest<HTMLElement>('.card[data-id]');
  const item = card ? resolve(card.dataset.id!) : undefined;
  return card && item ? { card, item } : null;
};

// ---- filters -------------------------------------------------------------------

interface FilterState {
  fits: boolean;
  facets: Map<string, Set<string>>;
}
const filters = new Map<string, FilterState>();
const filterFor = (category: string): FilterState => {
  let state = filters.get(category);
  if (!state) {
    state = { fits: false, facets: new Map() };
    filters.set(category, state);
  }
  return state;
};

function applyFilters(): void {
  const page = panel.querySelector<HTMLElement>('.page[data-kind="list"]');
  if (!page) return;
  const state = filterFor(page.dataset.cat!);
  const fits = page.querySelector<HTMLInputElement>('#fits');
  if (fits) fits.checked = state.fits;
  for (const button of page.querySelectorAll<HTMLButtonElement>('.facet button')) {
    const key = button.parentElement!.dataset.key!;
    button.setAttribute('aria-pressed', String(state.facets.get(key)?.has(button.dataset.v!) ?? false));
  }
  let shown = 0;
  for (const card of page.querySelectorAll<HTMLElement>('.card')) {
    let visible = true;
    for (const [key, wanted] of state.facets) {
      if (wanted.size && !wanted.has(card.getAttribute(`data-f-${key}`) ?? '')) visible = false;
    }
    if (visible && state.fits && card.classList.contains('no')) visible = false;
    card.hidden = !visible;
    if (visible) shown++;
  }
  page.querySelector<HTMLElement>('.none')!.hidden = shown > 0;
}

// ---- rendering what the store says -------------------------------------------

function refresh(): void {
  status.innerHTML = statusHtml(store.slots, store.wiring(), powered);
  let listHint: string | null = null;

  for (const card of document.querySelectorAll<HTMLElement>('.card[data-id]')) {
    const item = resolve(card.dataset.id!);
    if (!item) continue;
    const why = card.querySelector<HTMLElement>('.why');
    const rm = card.querySelector<HTMLElement>('.rm');
    if (item.category === 'case') {
      const current = store.pcCase.id === item.id;
      card.classList.toggle('in', current);
      if (why) why.textContent = current ? 'In use' : store.cursor > 0 ? 'Empty the case to change it.' : '';
      continue;
    }
    const installed = store.isInstalled(item.id);
    const issues = installed ? [] : store.check(item);
    const misfit = isMisfit(issues);
    card.classList.toggle('in', installed);
    card.classList.toggle('no', misfit);
    // In a list, "seat a board first" would repeat on every row: say it once above.
    const inList = card.parentElement?.classList.contains('rows') ?? false;
    if (inList && issues.length && !misfit) listHint ??= issues[0].message;
    if (why) why.textContent = inList && !misfit ? '' : issues[0]?.message ?? '';
    if (rm) rm.hidden = !installed;
  }
  const hint = panel.querySelector<HTMLElement>('.hint');
  if (hint) {
    hint.textContent = listHint ?? '';
    hint.hidden = !listHint;
  }

  const slots = store.slots;
  for (const link of panel.querySelectorAll<HTMLElement>('.catlink')) {
    const category = link.dataset.cat as Category;
    const chosen = category === 'case'
      ? [slots.case.name]
      : category === 'storage'
        ? slots.storage.map((drive) => drive.name)
        : [slots[category]?.name].filter((name): name is string => !!name);
    link.querySelector('.cur')!.textContent = chosen.join(', ');
    link.classList.toggle('in', chosen.length > 0);
  }
  applyFilters();
  drawPictures();

  const total = store.steps.length;
  undo.disabled = store.cursor === 0;
  redo.disabled = store.cursor === total;
  replay.disabled = store.cursor === 0;
  scrub.disabled = total === 0;
  scrub.max = String(Math.max(1, total));
  if (!scene) scrub.value = String(store.cursor);
  count.textContent = `${store.cursor} / ${total}`;
}

store.subscribe(() => {
  powered = false;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(store.save()));
  } catch {
    // Private windows may refuse storage; the build still works for this visit.
  }
  refresh();
});

let noticeTimer = 0;
function notify(message: string, bad = false): void {
  notice.textContent = message;
  notice.classList.toggle('bad', bad);
  notice.hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = window.setTimeout(() => { notice.hidden = true; }, 5000);
}

function nudge(card: HTMLElement): void {
  card.classList.remove('nudge');
  void card.offsetWidth;
  card.classList.add('nudge');
}

function showCallout(text: string | null, bad = false): void {
  const at = text ? scene?.ghostScreen() : null;
  if (!text || !at) {
    callout.hidden = true;
    return;
  }
  callout.textContent = text;
  callout.classList.toggle('bad', bad);
  callout.hidden = false;
  callout.style.transform = `translate(${Math.round(at.x)}px, ${Math.round(at.y)}px) translate(-50%, -130%)`;
}

// ---- catalog navigation -------------------------------------------------------

const router = startRouter(panel, (path) => {
  search.value = '';
  hovered = null;
  scene?.showGhost(null);
  showCallout(null);
  warmCategory(categoryOf(path));
  refresh();
});

let beforeSearch: string | null = null;
let entries: SearchEntry[] = [];

function runSearch(): void {
  const terms = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) {
    if (beforeSearch !== null) panel.innerHTML = beforeSearch;
    beforeSearch = null;
    refresh();
    return;
  }
  if (beforeSearch === null) beforeSearch = panel.innerHTML;
  const hits = entries.filter((entry) => {
    const text = `${entry.n} ${entry.b} ${entry.s} ${CATEGORY_LABEL[entry.c]}`.toLowerCase();
    return terms.every((term) => text.includes(term));
  });
  const esc = (text: string): string => text.replace(/[&<>"]/g, (ch) => `&#${ch.charCodeAt(0)};`);
  panel.innerHTML = `<div class="page" data-kind="search"><p class="crumbs">${hits.length} ${hits.length === 1 ? 'part' : 'parts'}</p><div class="rows">${
    hits.map((entry) => `<a class="hit" data-nav href="/parts/${entry.c}/${entry.id}/"><svg class="ico"><use href="#i-${entry.c}"/></svg><span class="txt"><b>${esc(entry.n)}</b><i>${esc(entry.b)} · ${CATEGORY_LABEL[entry.c]}</i><span class="spec">${esc(entry.s)}</span></span></a>`).join('')
  }</div>${hits.length ? '' : '<p class="none">No parts match.</p>'}</div>`;
}

search.addEventListener('focus', () => {
  void searchIndex().then((list) => { entries = list; });
});
search.addEventListener('input', () => {
  void searchIndex().then((list) => {
    entries = list;
    runSearch();
  });
});
search.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') panel.querySelector<HTMLAnchorElement>('.hit')?.click();
  if (event.key === 'Escape') {
    search.value = '';
    runSearch();
  }
});

// ---- adding and removing ------------------------------------------------------

function add(item: CatalogItem | Step, card: HTMLElement | null, timeStamp: number): void {
  scene?.markInput(timeStamp);
  if (item.category === 'case') {
    const result = store.setCase(item);
    if (!result.ok && result.reason) {
      notify(result.reason, true);
      if (card) nudge(card);
    }
    return;
  }
  if (store.isInstalled(item.id)) return;
  const issues = store.check(item);
  if (isBlocked(issues)) {
    notify(issues[0].message, true);
    if (card) nudge(card);
    scene?.bounce(item);
    return;
  }
  const result = store.install(item);
  hovered = null;
  scene?.showGhost(null);
  showCallout(null);
  const warning = result.issues.find((issue) => issue.level === 'warn');
  if (warning) notify(warning.message, true);
}

function remove(id: string, timeStamp: number): void {
  scene?.markInput(timeStamp);
  const result = store.remove(id);
  if (!result.ok && result.reason) notify(result.reason, true);
}

interface Press {
  step: Step;
  card: HTMLElement;
  pointerId: number;
  x: number;
  y: number;
  dragging: boolean;
  blocked: boolean;
  reason: string;
}
let press: Press | null = null;
let hovered: string | null = null;
let suppressClick = false;

function hover(item: CatalogItem | Step | null): void {
  if (press?.dragging) return;
  const step = item && item.category !== 'case' && !store.isInstalled(item.id) ? item : null;
  const id = step?.id ?? null;
  if (id === hovered) return;
  hovered = id;
  if (!scene) return;
  if (!step) {
    scene.showGhost(null);
    showCallout(null);
    return;
  }
  const issues = store.check(step);
  const blocked = isBlocked(issues);
  scene.showGhost(step, blocked); // also builds the part, so a click has nothing left to prepare
  showCallout(blocked ? issues[0].message : null, true);
}

document.addEventListener('pointerover', (event) => {
  const inPanels = (event.target as Element).closest?.('#tray, #status');
  if (inPanels) hover(cardOf(event.target)?.item ?? null);
});
tray.addEventListener('pointerleave', () => hover(null));
status.addEventListener('pointerleave', () => hover(null));
document.addEventListener('focusin', (event) => {
  const hit = cardOf(event.target);
  if (hit) hover(hit.item);
});

document.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 || !(event.target as Element).closest?.('.pick')) return;
  const hit = cardOf(event.target);
  if (!hit || hit.item.category === 'case' || store.isInstalled(hit.item.id)) return;
  const issues = store.check(hit.item);
  press = {
    step: hit.item,
    card: hit.card,
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    dragging: false,
    blocked: isBlocked(issues),
    reason: issues[0]?.message ?? '',
  };
});

window.addEventListener('pointermove', (event) => {
  if (!press || event.pointerId !== press.pointerId) return;
  if (!press.dragging) {
    if (event.pointerType === 'touch' || !scene) return;
    if (Math.hypot(event.clientX - press.x, event.clientY - press.y) < 6) return;
    press.dragging = true;
    hovered = null;
    scene.markInput(event.timeStamp);
    scene.dragStart(press.step, press.blocked);
    chip.textContent = press.step.name;
    chip.hidden = false;
    document.body.style.cursor = 'grabbing';
  }
  chip.style.transform = `translate(${event.clientX + 14}px, ${event.clientY + 16}px)`;
  const snapped = scene!.dragMove(event.clientX, event.clientY);
  chip.hidden = snapped;
  if (press.blocked) showCallout(press.reason, true);
  else showCallout(snapped ? 'Release to seat' : 'Goes here', false);
});

function endPress(event: PointerEvent, cancelled: boolean): void {
  if (!press || event.pointerId !== press.pointerId) return;
  const { step, card, dragging, blocked, reason } = press;
  press = null;
  if (!dragging || !scene) return;
  suppressClick = true;
  window.setTimeout(() => { suppressClick = false; }, 0);
  chip.hidden = true;
  showCallout(null);
  document.body.style.cursor = '';
  if (cancelled) scene.dragMove(-9999, -9999);
  const result = scene.dragEnd();
  if (result === 'drop') {
    scene.markInput(event.timeStamp);
    const outcome = store.install(step);
    const warning = outcome.issues.find((issue) => issue.level === 'warn');
    if (warning) notify(warning.message, true);
  } else if (result === 'reject' && blocked) {
    notify(reason, true);
    nudge(card);
  }
}
window.addEventListener('pointerup', (event) => endPress(event, false));
window.addEventListener('pointercancel', (event) => endPress(event, true));

document.addEventListener('click', (event) => {
  const target = event.target as Element;
  if (!target.closest('#tray, #status')) return;

  const removeId = target.closest<HTMLElement>('[data-remove]')?.dataset.remove;
  if (removeId) {
    remove(removeId, event.timeStamp);
    return;
  }
  if (target.closest('#power')) {
    powered = !powered;
    scene?.markInput(event.timeStamp);
    scene?.setPower(powered);
    refresh();
    return;
  }
  if (target.closest('#plugall')) {
    scene?.markInput(event.timeStamp);
    for (const { cable, plugged } of store.wiring()) {
      if (!plugged && !isBlocked(store.check(cable))) store.install(cable);
    }
    return;
  }
  const facet = target.closest<HTMLButtonElement>('.facet button');
  if (facet) {
    const page = facet.closest<HTMLElement>('.page')!;
    const state = filterFor(page.dataset.cat!);
    const key = facet.parentElement!.dataset.key!;
    const wanted = state.facets.get(key) ?? new Set<string>();
    if (wanted.has(facet.dataset.v!)) wanted.delete(facet.dataset.v!);
    else wanted.add(facet.dataset.v!);
    state.facets.set(key, wanted);
    applyFilters();
    return;
  }
  if (suppressClick || !target.closest('.pick')) return;
  const hit = cardOf(target);
  if (hit) add(hit.item, hit.card, event.timeStamp);
});

panel.addEventListener('change', (event) => {
  const box = event.target as HTMLInputElement;
  if (box.id !== 'fits') return;
  filterFor(box.closest<HTMLElement>('.page')!.dataset.cat!).fits = box.checked;
  applyFilters();
});

// ---- timeline ---------------------------------------------------------------

function powerDown(): void {
  if (!powered) return;
  powered = false;
  refresh();
}

scrub.addEventListener('input', () => {
  scrubbing = true;
  powerDown();
  scene?.scrub(Number(scrub.value));
});
scrub.addEventListener('change', () => {
  scrubbing = false;
  const value = scene ? scene.scrubEnd() : Number(scrub.value);
  store.setCursor(Math.round(value));
  refresh();
});
undo.addEventListener('click', (event) => { scene?.markInput(event.timeStamp); store.undo(); });
redo.addEventListener('click', (event) => { scene?.markInput(event.timeStamp); store.redo(); });
replay.addEventListener('click', (event) => {
  powerDown();
  scene?.markInput(event.timeStamp);
  scene?.replay();
});
lookButton.addEventListener('click', () => {
  if (!scene) return;
  scene.setLook(scene.look === 'drawing' ? 'shaded' : 'drawing');
  lookButton.textContent = scene.look === 'drawing' ? 'Shaded' : 'Drawing';
  drawPictures();
});
window.addEventListener('keydown', (event) => {
  if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return;
  if (event.target === search) return;
  event.preventDefault();
  if (event.shiftKey) store.redo();
  else store.undo();
});

// ---- looking around ---------------------------------------------------------

let orbit: { id: number; x: number; y: number } | null = null;
canvas.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  orbit = { id: event.pointerId, x: event.clientX, y: event.clientY };
  canvas.setPointerCapture(event.pointerId);
  canvas.classList.add('orbit');
});
canvas.addEventListener('pointermove', (event) => {
  if (!orbit || event.pointerId !== orbit.id) return;
  scene?.orbit(event.clientX - orbit.x, event.clientY - orbit.y);
  orbit.x = event.clientX;
  orbit.y = event.clientY;
});
const endOrbit = (): void => {
  orbit = null;
  canvas.classList.remove('orbit');
};
canvas.addEventListener('pointerup', endOrbit);
canvas.addEventListener('pointercancel', endOrbit);
canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  scene?.zoomBy(event.deltaY);
}, { passive: false });

// ---- speed readout (add ?hud to the address, or press H) ---------------------

function percentile(values: number[], q: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}

function hudText(): string {
  const paint = performance.getEntriesByName('first-contentful-paint')[0]?.startTime;
  const first = performance.getEntriesByName('scene-first-frame')[0]?.startTime;
  const stats = scene?.stats;
  const ms = (value: number | null | undefined): string => (value == null ? '—' : `${value.toFixed(0)} ms`);
  return [
    `first paint     ${ms(paint)}`,
    `first 3D frame  ${ms(first)}`,
    `input to frame  ${ms(stats?.inputLatency)}`,
    `page swap       ${ms(router.lastSwap)}`,
    `frame p50/p95   ${stats ? `${percentile(stats.frames, 0.5).toFixed(1)} / ${percentile(stats.frames, 0.95).toFixed(1)} ms` : '—'}`,
    `draw calls      ${stats?.drawCalls ?? '—'}`,
    `triangles       ${stats?.triangles ?? '—'}`,
  ].join('\n');
}

let hudTimer = 0;
function toggleHud(on: boolean): void {
  hud.hidden = !on;
  clearInterval(hudTimer);
  if (on) {
    hud.textContent = hudText();
    hudTimer = window.setInterval(() => { hud.textContent = hudText(); }, 400);
  }
}
if (new URLSearchParams(location.search).has('hud')) toggleHud(true);
window.addEventListener('keydown', (event) => {
  if (event.target === search) return;
  if (event.key.toLowerCase() === 'h' && !event.metaKey && !event.ctrlKey) toggleHud(hud.hasAttribute('hidden'));
});

refresh();

// Handle for the measurement script.
Object.assign(window, { __pcb: { store, sceneReady, scene: () => scene, router, resolve, loadCategory } });
