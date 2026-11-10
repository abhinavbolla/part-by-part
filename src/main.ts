// Page wiring. The tray and build panel are already in the HTML; this script
// attaches behaviour to them and loads the 3D view in a separate chunk so the
// page is readable and clickable before any 3D code has arrived.

import { BuildStore } from './build/store.ts';
import { CASE, PARTS, partById } from './catalog/parts.ts';
import type { Part } from './catalog/types.ts';
import { isBlocked, type Issue } from './rules/compat.ts';
import type { Insets, SceneApi } from './scene/scene.ts';
import { statusHtml } from './ui/html.ts';

performance.mark('app-start');

const el = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const canvas = el<HTMLCanvasElement>('view');
const tray = el('tray');
const status = el('status');
const timeline = el('timeline');
const scrub = el<HTMLInputElement>('scrub');
const undo = el<HTMLButtonElement>('undo');
const redo = el<HTMLButtonElement>('redo');
const replay = el<HTMLButtonElement>('replay');
const count = el('count');
const callout = el('callout');
const chip = el('chip');
const notice = el('notice');
const hud = el('hud');

const store = new BuildStore(CASE);
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
  scene.warm(PARTS, refresh);
  return scene;
});

// ---- rendering what the store says -----------------------------------------

const cards = [...tray.querySelectorAll<HTMLElement>('.card')].map((card) => ({
  card,
  part: partById(card.dataset.id!)!,
  why: card.querySelector<HTMLElement>('.why')!,
  rm: card.querySelector<HTMLElement>('.rm')!,
}));

const isMisfit = (issues: Issue[]): boolean =>
  issues.some((issue) => issue.level === 'block' && issue.code !== 'occupied' && !issue.code.startsWith('needs-'));

function refresh(): void {
  for (const { card, part, why, rm } of cards) {
    const installed = store.isInstalled(part.id);
    const issues = installed ? [] : store.check(part);
    card.classList.toggle('in', installed);
    card.classList.toggle('no', isMisfit(issues));
    why.textContent = issues[0]?.message ?? '';
    rm.hidden = !installed;
  }
  status.innerHTML = statusHtml(store.slots, powered);
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

// ---- adding and removing parts ---------------------------------------------

function add(part: Part, card: HTMLElement | null, timeStamp: number): void {
  if (store.isInstalled(part.id)) return;
  scene?.markInput(timeStamp);
  const issues = store.check(part);
  if (isBlocked(issues)) {
    notify(issues[0].message, true);
    if (card) nudge(card);
    scene?.bounce(part);
    return;
  }
  const result = store.install(part);
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

const cardOf = (target: EventTarget | null): { card: HTMLElement; part: Part } | null => {
  const card = (target as Element | null)?.closest<HTMLElement>('.card');
  const part = card ? partById(card.dataset.id!) : undefined;
  return card && part ? { card, part } : null;
};

interface Press {
  part: Part;
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

function hover(part: Part | null): void {
  if (press?.dragging) return;
  const id = part && !store.isInstalled(part.id) ? part.id : null;
  if (id === hovered) return;
  hovered = id;
  if (!scene) return;
  if (!part || !id) {
    scene.showGhost(null);
    showCallout(null);
    return;
  }
  const issues = store.check(part);
  const blocked = isBlocked(issues);
  scene.showGhost(part, blocked); // also builds the part, so a click has nothing left to prepare
  showCallout(blocked ? issues[0].message : null, true);
}

tray.addEventListener('pointerover', (event) => hover(cardOf(event.target)?.part ?? null));
tray.addEventListener('pointerleave', () => hover(null));
tray.addEventListener('focusin', (event) => hover(cardOf(event.target)?.part ?? null));

tray.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 || !(event.target as Element).closest('.pick')) return;
  const hit = cardOf(event.target);
  if (!hit || store.isInstalled(hit.part.id)) return;
  const issues = store.check(hit.part);
  press = {
    ...hit,
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
    scene.dragStart(press.part, press.blocked);
    chip.textContent = press.part.name;
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
  const { part, card, dragging, blocked, reason } = press;
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
    const outcome = store.install(part);
    const warning = outcome.issues.find((issue) => issue.level === 'warn');
    if (warning) notify(warning.message, true);
  } else if (result === 'reject' && blocked) {
    notify(reason, true);
    nudge(card);
  }
}
window.addEventListener('pointerup', (event) => endPress(event, false));
window.addEventListener('pointercancel', (event) => endPress(event, true));

tray.addEventListener('click', (event) => {
  const target = event.target as Element;
  const removeId = target.closest<HTMLElement>('[data-remove]')?.dataset.remove;
  if (removeId) {
    remove(removeId, event.timeStamp);
    return;
  }
  if (suppressClick || !target.closest('.pick')) return;
  const hit = cardOf(target);
  if (hit) add(hit.part, hit.card, event.timeStamp);
});

status.addEventListener('click', (event) => {
  const target = event.target as Element;
  const removeId = target.closest<HTMLElement>('[data-remove]')?.dataset.remove;
  if (removeId) {
    remove(removeId, event.timeStamp);
  } else if (target.closest('#power')) {
    powered = !powered;
    scene?.markInput(event.timeStamp);
    scene?.setPower(powered);
    refresh();
  }
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
window.addEventListener('keydown', (event) => {
  if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return;
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
  if (event.key.toLowerCase() === 'h' && !event.metaKey && !event.ctrlKey) toggleHud(hud.hasAttribute('hidden'));
});

refresh();

// Handle for the measurement script.
Object.assign(window, { __pcb: { store, parts: PARTS, sceneReady, scene: () => scene, percentile } });
