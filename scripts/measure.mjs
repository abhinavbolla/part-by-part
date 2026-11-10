// Measures how fast the built site loads and responds, and checks the main
// interactions on the way. Run `npm run build` first, then `npm run measure`.
//
// It serves dist/ the way a CDN would (Brotli, immutable hashed assets), drives
// the installed Chrome, and prints medians. Options:
//   --runs N       page loads per profile (default 5)
//   --shots DIR    save screenshots of the build in progress
//   --headed       show the browser window

import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { chromium } from 'playwright-core';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};
const RUNS = Number(option('--runs', 5));
const SHOTS = option('--shots', null);
const HEADED = args.includes('--headed');

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('dist/ is missing. Run `npm run build` first.');
  process.exit(1);
}

// ---- a small static server that behaves like the eventual host --------------

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };
const compressed = new Map();

function body(path) {
  if (!compressed.has(path)) compressed.set(path, brotliCompressSync(readFileSync(path)));
  return compressed.get(path);
}

const server = createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const path = join(DIST, url.pathname === '/' ? 'index.html' : url.pathname);
  if (!path.startsWith(DIST) || !existsSync(path)) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, {
    'content-type': TYPES[extname(path)] ?? 'application/octet-stream',
    'content-encoding': 'br',
    'cache-control': url.pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  response.end(body(path));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;

// ---- helpers ---------------------------------------------------------------

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};
const quantile = (values, q) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
};
const round = (value, digits = 0) => Number(value.toFixed(digits));

const PROFILES = [
  { name: 'This machine, local', cpu: 1, net: null },
  {
    name: '4x slower CPU, Fast 4G (9 Mbps, 165 ms)',
    cpu: 4,
    net: { offline: false, latency: 165, downloadThroughput: (9e6 / 8) * 0.9, uploadThroughput: (1.5e6 / 8) * 0.9 },
  },
];

const BUILD_ORDER = [
  'msi-b650-tomahawk-wifi',
  'amd-ryzen-7-7800x3d',
  'noctua-nh-u12s',
  'corsair-vengeance-ddr5-32-6000',
  'samsung-990-pro-1tb',
  'corsair-rm750e',
];
const GPU = 'asus-dual-rtx-4070';

async function open(browser, profile) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  if (profile.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.cpu });
  if (profile.net) {
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', profile.net);
  }
  await page.addInitScript(() => {
    window.__lcp = 0;
    window.__long = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) window.__lcp = entry.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) window.__long.push(entry.duration);
    }).observe({ type: 'longtask', buffered: true });
  });
  return { context, page };
}

async function loadOnce(browser, profile) {
  const { context, page } = await open(browser, profile);
  await page.goto(ORIGIN, { waitUntil: 'load' });
  await page.waitForFunction(() => performance.getEntriesByName('scene-first-frame').length > 0, null, { timeout: 60000 });
  const result = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const resources = performance.getEntriesByType('resource');
    return {
      ttfb: nav.responseStart,
      fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0,
      lcp: window.__lcp,
      firstFrame: performance.getEntriesByName('scene-first-frame')[0].startTime,
      bytes: nav.transferSize + resources.reduce((sum, entry) => sum + entry.transferSize, 0),
      requests: 1 + resources.length,
      longTasks: window.__long.length,
      longest: Math.max(0, ...window.__long),
    };
  });
  await context.close();
  return result;
}

/**
 * Presses a control with plain mouse events, the way a hand does: move, then
 * press and release. (Playwright's own click() runs extra checks inside the
 * page on first use, which would be counted as the page's latency.)
 */
async function press(page, selector) {
  const box = await page.evaluate((query) => {
    const element = document.querySelector(query);
    element.scrollIntoView({ block: 'nearest' });
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }, selector);
  await page.mouse.move(box.x + Math.min(60, box.width / 2), box.y + Math.min(20, box.height / 2));
  await page.waitForTimeout(60);
  await page.mouse.down();
  await page.mouse.up();
}

const settled = (page) =>
  page.waitForFunction(() => window.__pcb.scene()?.stats.settled === true, null, { timeout: 30000 });

async function interact(browser, profile) {
  const { context, page } = await open(browser, profile);
  const failures = [];
  const expect = (condition, label) => { if (!condition) failures.push(label); };
  await page.goto(ORIGIN, { waitUntil: 'load' });
  await page.waitForFunction(() => performance.getEntriesByName('scene-warm').length > 0, null, { timeout: 30000 });
  await settled(page);
  const warmAt = await page.evaluate(() => performance.getEntriesByName('scene-warm')[0].startTime);

  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });

  // Nothing should be drawn while nothing is happening.
  const idle = await page.evaluate(async () => {
    const before = window.__pcb.scene().stats.rendered;
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return window.__pcb.scene().stats.rendered - before;
  });

  // Click each part in; time from the click to the first frame that answers it.
  await page.evaluate(() => { window.__pcb.scene().stats.frames.length = 0; });
  const latencies = [];
  let shot = 0;
  for (const id of BUILD_ORDER) {
    await press(page, `.card[data-id="${id}"] .pick`);
    latencies.push(await page.evaluate(() => new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve(window.__pcb.scene().stats.inputLatency)));
    })));
    if (SHOTS) {
      for (const delay of [500, 600, 600]) {
        await page.waitForTimeout(delay);
        await page.screenshot({ path: join(SHOTS, `${String(shot++).padStart(2, '0')}-${id}.png`) });
      }
    }
    await settled(page);
    expect(await page.evaluate((part) => window.__pcb.store.isInstalled(part), id), `click installs ${id}`);
  }
  const buildFrames = await page.evaluate(() => [...window.__pcb.scene().stats.frames]);

  // A part that does not fit is refused, with the reason shown.
  await page.click('.card[data-id="intel-core-i5-14600k"] .pick');
  await page.waitForTimeout(200);
  expect(!(await page.evaluate(() => window.__pcb.store.isInstalled('intel-core-i5-14600k'))), 'second CPU is refused');
  expect(await page.isVisible('#notice'), 'refusal shows a notice');
  if (SHOTS) await page.screenshot({ path: join(SHOTS, `${String(shot++).padStart(2, '0')}-rejected.png`) });
  await settled(page);

  // Drag the graphics card from the tray to its slot.
  const pick = page.locator(`.card[data-id="${GPU}"] .pick`);
  await pick.scrollIntoViewIfNeeded();
  const card = await pick.boundingBox();
  await page.mouse.move(card.x + 40, card.y + 20);
  await page.mouse.down();
  await page.mouse.move(card.x + 80, card.y + 30, { steps: 4 });
  const slot = await page.evaluate(() => window.__pcb.scene().ghostScreen());
  await page.mouse.move(slot.x, slot.y + 40, { steps: 24 });
  if (SHOTS) await page.screenshot({ path: join(SHOTS, `${String(shot++).padStart(2, '0')}-dragging.png`) });
  await page.mouse.up();
  const dropLatency = await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve(window.__pcb.scene().stats.inputLatency)));
  }));
  expect(await page.evaluate((id) => window.__pcb.store.isInstalled(id), GPU), 'drag and drop installs the graphics card');
  await settled(page);
  if (SHOTS) await page.screenshot({ path: join(SHOTS, `${String(shot++).padStart(2, '0')}-built.png`) });

  // Undo, redo, remove.
  await page.click('#undo');
  await settled(page);
  expect(!(await page.evaluate((id) => window.__pcb.store.isInstalled(id), GPU)), 'undo takes the last part out');
  await page.click('#redo');
  await settled(page);
  expect(await page.evaluate((id) => window.__pcb.store.isInstalled(id), GPU), 'redo puts it back');
  await page.click('.card[data-id="amd-ryzen-7-7800x3d"] .rm');
  expect(await page.evaluate(() => window.__pcb.store.isInstalled('amd-ryzen-7-7800x3d')), 'CPU under a cooler cannot be removed');
  await settled(page);

  // Power on and watch the frame rate with fans spinning.
  expect(await page.isEnabled('#power'), 'power button is enabled for a complete build');
  await page.evaluate(() => { window.__pcb.scene().stats.frames.length = 0; });
  await page.click('#power');
  await page.waitForTimeout(3000);
  const poweredFrames = await page.evaluate(() => [...window.__pcb.scene().stats.frames]);
  if (SHOTS) await page.screenshot({ path: join(SHOTS, `${String(shot++).padStart(2, '0')}-powered.png`) });
  const scene = await page.evaluate(() => {
    const { drawCalls, triangles } = window.__pcb.scene().stats;
    return { drawCalls, triangles };
  });

  await context.close();
  return { renderer, idle, latencies, dropLatency, buildFrames, poweredFrames, scene, failures, warmAt };
}

// ---- run -------------------------------------------------------------------

if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch({
  channel: 'chrome',
  headless: !HEADED,
  args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'],
});

const assets = readdirSync(join(DIST, 'assets')).map((name) => `assets/${name}`);
console.log('\nBundle (bytes on disk / gzip / Brotli)');
for (const file of ['index.html', ...assets]) {
  const raw = readFileSync(join(DIST, file));
  console.log(`  ${file.padEnd(34)} ${String(raw.length).padStart(7)} ${String(gzipSync(raw).length).padStart(7)} ${String(brotliCompressSync(raw).length).padStart(7)}`);
}

let failed = false;
for (const profile of PROFILES) {
  const loads = [];
  for (let i = 0; i < RUNS; i++) loads.push(await loadOnce(browser, profile));
  const pick = (key) => median(loads.map((load) => load[key]));
  const run = await interact(browser, profile);
  const frames = (values) =>
    `p50 ${round(quantile(values, 0.5), 1)} ms, p95 ${round(quantile(values, 0.95), 1)} ms, worst ${round(Math.max(0, ...values), 1)} ms, ${values.filter((ms) => ms > 20).length} of ${values.length} over 20 ms`;

  console.log(`\n${profile.name}  (median of ${RUNS} cold loads)`);
  console.log(`  WebGL renderer          ${run.renderer}`);
  console.log(`  first byte              ${round(pick('ttfb'))} ms`);
  console.log(`  first contentful paint  ${round(pick('fcp'))} ms`);
  console.log(`  largest contentful paint ${round(pick('lcp'))} ms`);
  console.log(`  first 3D frame          ${round(pick('firstFrame'))} ms`);
  console.log(`  transferred             ${round(pick('bytes') / 1024, 1)} KB in ${pick('requests')} requests`);
  console.log(`  all parts ready         ${round(run.warmAt)} ms`);
  console.log(`  long tasks during load  ${pick('longTasks')} (longest ${round(pick('longest'))} ms)`);
  console.log(`  click to first frame    median ${round(median(run.latencies), 1)} ms, worst ${round(Math.max(...run.latencies), 1)} ms (${run.latencies.length} clicks)`);
  if (args.includes('--verbose')) console.log(`    each click: ${run.latencies.map((ms) => round(ms, 1)).join(', ')} ms`);
  console.log(`  drop to first frame     ${round(run.dropLatency, 1)} ms`);
  console.log(`  frames while building   ${frames(run.buildFrames)}`);
  console.log(`  frames while powered on ${frames(run.poweredFrames)}`);
  console.log(`  frames drawn while idle ${run.idle} in 1.5 s`);
  console.log(`  scene                   ${run.scene.drawCalls} draw calls, ${run.scene.triangles} triangles`);
  if (run.failures.length) {
    failed = true;
    console.log(`  FAILED CHECKS: ${run.failures.join('; ')}`);
  } else {
    console.log('  interaction checks      all passed');
  }
}

await browser.close();
server.close();
process.exit(failed ? 1 : 0);
