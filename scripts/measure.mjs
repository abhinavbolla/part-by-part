// Measures how fast the built site loads and responds, and checks the main
// interactions on the way. Run `npm run build` first, then `npm run measure`.
//
// It serves dist/ the way a CDN would (Brotli, immutable hashed assets), drives
// the installed Chrome with plain mouse and keyboard events, and prints medians.
// Options:
//   --runs N       page loads per profile (default 5)
//   --shots DIR    save screenshots of the build in progress
//   --headed       show the browser window
//   --verbose      print every sample

import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
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
const VERBOSE = args.includes('--verbose');

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('dist/ is missing. Run `npm run build` first.');
  process.exit(1);
}

// ---- a small static server that behaves like the eventual host --------------

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
};
const compressed = new Map();

function body(path) {
  if (!compressed.has(path)) compressed.set(path, brotliCompressSync(readFileSync(path)));
  return compressed.get(path);
}

const server = createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  let path = join(DIST, decodeURIComponent(url.pathname));
  if (path.startsWith(DIST) && existsSync(path) && statSync(path).isDirectory()) path = join(path, 'index.html');
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
const spread = (values) => `median ${round(median(values), 1)} ms, worst ${round(Math.max(...values), 1)} ms`;

const PROFILES = [
  { name: 'This machine, local', cpu: 1, net: null },
  {
    name: '4x slower CPU, Fast 4G (9 Mbps, 165 ms)',
    cpu: 4,
    net: { offline: false, latency: 165, downloadThroughput: (9e6 / 8) * 0.9, uploadThroughput: (1.5e6 / 8) * 0.9 },
  },
];

/** The build the script assembles: [category, part id]. */
const BUILD = [
  ['motherboard', 'msi-b650-tomahawk-wifi'],
  ['cpu', 'amd-ryzen-7-7800x3d'],
  ['cooler', 'noctua-nh-u12s'],
  ['ram', 'corsair-vengeance-ddr5-32-6000'],
  ['storage', 'samsung-990-pro-1tb'],
  ['storage', 'samsung-870-evo-1tb'],
  ['psu', 'corsair-rm750e'],
];
const GPU = 'asus-dual-rtx-4070';
const DEEP_LINK = '/parts/gpu/asus-dual-rtx-4070/';

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
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(String(error)));
  return { context, page, errors };
}

async function loadOnce(browser, profile, path) {
  const { context, page } = await open(browser, profile);
  await page.goto(ORIGIN + path, { waitUntil: 'load' });
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

const settled = (page) =>
  page.waitForFunction(() => window.__pcb.scene()?.stats.settled === true, null, { timeout: 60000 });
const warmed = (page) =>
  page.waitForFunction(() => performance.getEntriesByName('scene-warm').length > 0, null, { timeout: 60000 });
const nextFrame = (page, read) => page.evaluate((source) => new Promise((resolve) => {
  requestAnimationFrame(() => requestAnimationFrame(() => resolve(new Function(`return (${source})`)()())));
}), read.toString());
const inputLatency = (page) => nextFrame(page, () => window.__pcb.scene().stats.inputLatency);
const installed = (page, id) => page.evaluate((part) => window.__pcb.store.isInstalled(part), id);

/**
 * Presses a control with plain mouse events, the way a hand does: move, pause,
 * press and release. (Playwright's own click() and scroll helpers run extra
 * checks inside the page on first use, which would be counted as the page's
 * latency.) `pause` is how long the pointer rests on it first.
 */
async function press(page, selector, pause = 80) {
  const box = await page.evaluate((query) => {
    const element = document.querySelector(query);
    if (!element) return null;
    element.scrollIntoView({ block: 'nearest' });
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }, selector);
  if (!box) throw new Error(`nothing matches ${selector}`);
  await page.mouse.move(box.x + Math.min(60, box.width / 2), box.y + Math.min(18, box.height / 2));
  if (pause) await page.waitForTimeout(pause);
  await page.mouse.down();
  await page.mouse.up();
}

/** Follows a catalog link and returns the time from click to the new page being on screen. */
async function follow(page, selector, expect, pause = 80) {
  await page.evaluate(() => { window.__pcb.router.lastSwap = null; });
  await press(page, selector, pause);
  await page.waitForSelector(expect, { timeout: 30000 });
  await page.waitForFunction(() => window.__pcb.router.lastSwap !== null, null, { timeout: 30000 });
  return page.evaluate(() => window.__pcb.router.lastSwap);
}

/**
 * How often this browser draws a frame when the page does nothing costly.
 * Normally 16.7 ms; on battery in Low Power Mode Chrome halves it to 33.3 ms,
 * and then no page can be shown to be smoother than that.
 */
async function frameInterval(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto('data:text/html,<body><i id=a style="display:block;width:9px;height:9px;background:%23000"></i></body>');
  const interval = await page.evaluate(() => new Promise((resolve) => {
    const times = [];
    let last = 0;
    let count = 0;
    const tick = (now) => {
      if (last) times.push(now - last);
      last = now;
      document.getElementById('a').style.marginLeft = `${count % 40}px`;
      if (++count < 90) requestAnimationFrame(tick);
      else resolve(times.sort((a, b) => a - b)[Math.floor(times.length / 2)]);
    };
    requestAnimationFrame(tick);
  }));
  await context.close();
  return interval;
}

async function interact(browser, profile) {
  const { context, page, errors } = await open(browser, profile);
  const failures = [];
  const expect = (condition, label) => { if (!condition) failures.push(label); };
  let shot = 0;
  const snap = async (label) => {
    if (SHOTS) await page.screenshot({ path: join(SHOTS, `${String(shot++).padStart(2, '0')}-${label}.png`) });
  };

  await page.goto(ORIGIN, { waitUntil: 'load' });
  await warmed(page);
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

  // Browse to each part and click it in.
  await page.evaluate(() => { window.__pcb.scene().stats.frames.length = 0; });
  const swaps = [];
  const clicks = [];
  for (const [category, id] of BUILD) {
    swaps.push(await follow(page, `.catlink[data-cat="${category}"]`, `.card[data-id="${id}"]`));
    await page.waitForFunction((part) => window.__pcb.resolve(part) != null, id);
    await page.waitForTimeout(350); // let the category's parts warm up, as they would while a person reads
    await press(page, `.card[data-id="${id}"] .pick`);
    clicks.push(await inputLatency(page));
    if (SHOTS) {
      await page.waitForTimeout(700);
      await snap(id);
    }
    await settled(page);
    expect(await installed(page, id), `click installs ${id}`);
    swaps.push(await follow(page, '.crumbs a[href="/"]', '.catlink'));
  }
  const buildFrames = await page.evaluate(() => [...window.__pcb.scene().stats.frames]);
  const slowFrames = await page.evaluate(() => window.__pcb.scene().stats.slow.splice(0));

  // A part page clicked with no pause on its link: the fetch starts with the click.
  await follow(page, '.catlink[data-cat="gpu"]', '.card[data-id="asus-dual-rtx-4070"]');
  const coldSwap = await follow(page, '.card[data-id="sapphire-pulse-rx-7800-xt-16gb"] .more', '.detail[data-id="sapphire-pulse-rx-7800-xt-16gb"]', 0);
  await follow(page, '.crumbs a[href="/parts/gpu/"]', '.card[data-id="asus-dual-rtx-4070"]');

  // Filters: "only what fits" hides the card that is too long for this case.
  const before = await page.locator('.rows .card:not([hidden])').count();
  await press(page, '#fits');
  const after = await page.locator('.rows .card:not([hidden])').count();
  expect(after < before && after > 0, `fits filter narrows the list (${before} -> ${after})`);
  expect(await page.isHidden('.card[data-id="asus-rog-strix-rtx-4090"]'), 'the too-long card is filtered out');
  await press(page, '.facet button[data-v="Radeon"]');
  expect(await page.isHidden(`.card[data-id="${GPU}"]`), 'chip filter hides GeForce cards');
  await press(page, '.facet button[data-v="Radeon"]');
  await press(page, '#fits');

  // A part that does not fit is refused, with the reason shown.
  await press(page, '.card[data-id="asus-rog-strix-rtx-4090"] .pick');
  await page.waitForTimeout(250);
  expect(!(await installed(page, 'asus-rog-strix-rtx-4090')), 'the too-long card is refused');
  expect(await page.isVisible('#notice'), 'refusal shows a notice');
  await snap('rejected');
  await settled(page);

  // Drag the graphics card from the list to its slot.
  const card = await page.evaluate((id) => {
    const element = document.querySelector(`.card[data-id="${id}"] .pick`);
    element.scrollIntoView({ block: 'nearest' });
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y };
  }, GPU);
  await page.mouse.move(card.x + 40, card.y + 20);
  await page.mouse.down();
  await page.mouse.move(card.x + 80, card.y + 30, { steps: 4 });
  const slot = await page.evaluate(() => window.__pcb.scene().ghostScreen());
  await page.mouse.move(slot.x, slot.y + 40, { steps: 24 });
  await snap('dragging');
  await page.mouse.up();
  const dropLatency = await inputLatency(page);
  expect(await installed(page, GPU), 'drag and drop installs the graphics card');
  await settled(page);

  // Wiring: plug everything in.
  const wires = await page.locator('.wire').count();
  expect(wires === 6, `six cables are listed (got ${wires})`);
  expect(!(await page.isEnabled('#power')), 'power stays off until the cables are in');
  await press(page, '#plugall');
  await page.waitForTimeout(600);
  await snap('wiring');
  await settled(page);
  expect((await page.locator('.wire.in').count()) === wires, 'all cables plug in');
  await snap('built');

  // Pointing at a part in the drawing names it; clicking it opens its page.
  const spot = await page.evaluate((id) => {
    const scene = window.__pcb.scene();
    const rect = document.getElementById('view').getBoundingClientRect();
    for (let y = rect.top + 80; y < rect.bottom - 120; y += 12) {
      for (let x = rect.left + 420; x < rect.right - 380; x += 12) {
        if (scene.hoverAt(x, y) === id) return { x, y };
      }
    }
    return null;
  }, GPU);
  expect(spot !== null, 'the graphics card can be found under the pointer');
  if (spot) {
    await page.mouse.move(spot.x - 3, spot.y - 3);
    await page.mouse.move(spot.x, spot.y);
    await page.waitForTimeout(250);
    expect((await page.textContent('#chip')) === 'Dual GeForce RTX 4070' && await page.isVisible('#chip'), 'pointing at a part names it');
    await snap('pointing');
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForSelector(`.detail[data-id="${GPU}"]`, { timeout: 5000 }).catch(() => {});
    expect(await page.evaluate(() => location.pathname) === `/parts/gpu/asus-dual-rtx-4070/`, 'clicking a part opens its page');
    await page.mouse.move(700, 880);
    await follow(page, '.crumbs a[href="/parts/gpu/"]', `.card[data-id="${GPU}"]`);
    await settled(page);
  }

  // Undo, redo, and a part that something depends on.
  await press(page, '#undo');
  await settled(page);
  expect(!(await installed(page, 'cable-front')), 'undo takes the last step out');
  await press(page, '#redo');
  await settled(page);
  expect(await installed(page, 'cable-front'), 'redo puts it back');
  await press(page, '.slots [data-remove="amd-ryzen-7-7800x3d"]');
  expect(await installed(page, 'amd-ryzen-7-7800x3d'), 'a CPU under a cooler cannot be removed');

  // Search.
  await page.click('#search');
  await page.keyboard.type('990');
  await page.waitForSelector('.hit');
  expect((await page.locator('.hit').count()) === 1, 'search finds the 990 Pro');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.detail[data-id="samsung-990-pro-1tb"]');
  expect(await page.evaluate(() => location.pathname) === '/parts/storage/samsung-990-pro-1tb/', 'search opens the part page');
  await page.goBack();
  await page.waitForSelector('.card[data-id="asus-dual-rtx-4070"]');

  // The build survives a reload and comes back without replaying.
  const steps = await page.evaluate(() => window.__pcb.store.cursor);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__pcb?.scene() != null);
  await settled(page);
  expect(await page.evaluate(() => window.__pcb.store.cursor) === steps, `reload restores ${steps} steps`);
  expect(await page.isEnabled('#power'), 'power button is enabled for a complete, wired build');

  // Power on and watch the frame rate with fans spinning.
  await page.evaluate(() => { window.__pcb.scene().stats.frames.length = 0; });
  await press(page, '#power');
  await page.waitForTimeout(3000);
  const poweredFrames = await page.evaluate(() => [...window.__pcb.scene().stats.frames]);
  await snap('powered');
  const scene = await page.evaluate(() => {
    const { drawCalls, triangles } = window.__pcb.scene().stats;
    return { drawCalls, triangles };
  });
  await context.close();

  // A different case, a small board and a liquid cooler, in a fresh window.
  const second = await open(browser, profile);
  await second.page.goto(`${ORIGIN}/parts/case/`, { waitUntil: 'load' });
  await warmed(second.page);
  await press(second.page, '.card[data-id="lian-li-lancool-216"] .pick');
  expect(await second.page.evaluate(() => window.__pcb.store.pcCase.id) === 'lian-li-lancool-216', 'the case can be changed');
  for (const [category, id] of [
    ['motherboard', 'asus-rog-strix-b650e-i-gaming-wifi'],
    ['cpu', 'amd-ryzen-5-7600'],
    ['cooler', 'arctic-liquid-freezer-iii-360'],
  ]) {
    await follow(second.page, '.crumbs a[href="/"]', '.catlink');
    await follow(second.page, `.catlink[data-cat="${category}"]`, `.card[data-id="${id}"]`);
    await second.page.waitForFunction((part) => window.__pcb.resolve(part) != null, id);
    await press(second.page, `.card[data-id="${id}"] .pick`);
    await settled(second.page);
    expect(await installed(second.page, id), `second build installs ${id}`);
  }
  if (SHOTS) await second.page.screenshot({ path: join(SHOTS, `${String(shot++).padStart(2, '0')}-second-build.png`) });
  await second.context.close();

  expect(errors.length + second.errors.length === 0, `no console errors (${[...errors, ...second.errors].slice(0, 3).join(' | ')})`);
  return { renderer, idle, swaps, coldSwap, clicks, dropLatency, buildFrames, slowFrames, poweredFrames, scene, failures, warmAt };
}

// ---- run -------------------------------------------------------------------

if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch({
  channel: 'chrome',
  headless: !HEADED,
  args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'],
});

const size = (file) => {
  const raw = readFileSync(join(DIST, file));
  return `${String(raw.length).padStart(7)} ${String(gzipSync(raw).length).padStart(7)} ${String(brotliCompressSync(raw).length).padStart(7)}`;
};
console.log('\nFiles (bytes on disk / gzip / Brotli)');
for (const file of [
  'index.html',
  ...readdirSync(join(DIST, 'assets')).map((name) => `assets/${name}`),
  'parts/gpu/index.html',
  'parts/gpu/panel.html',
  'data/gpu.json',
  'data/index.json',
]) {
  console.log(`  ${file.padEnd(34)} ${size(file)}`);
}
const countFiles = (dir) => readdirSync(dir, { withFileTypes: true })
  .reduce((sum, entry) => sum + (entry.isDirectory() ? countFiles(join(dir, entry.name)) : entry.name === 'index.html' ? 1 : 0), 0);
console.log(`  ${countFiles(DIST)} pre-rendered pages`);

const beat = await frameInterval(browser);
console.log(`\nBrowser frame interval: ${round(beat, 1)} ms${beat > 20 ? '  (capped: the machine is saving power, so frame figures below cannot show 60 fps)' : ''}`);
const late = beat * 1.25;

let failed = false;
for (const profile of PROFILES) {
  const home = [];
  const deep = [];
  for (let i = 0; i < RUNS; i++) {
    home.push(await loadOnce(browser, profile, '/'));
    deep.push(await loadOnce(browser, profile, DEEP_LINK));
  }
  const pick = (loads, key) => median(loads.map((load) => load[key]));
  const run = await interact(browser, profile);
  const frames = (values) =>
    `p50 ${round(quantile(values, 0.5), 1)} ms, p95 ${round(quantile(values, 0.95), 1)} ms, worst ${round(Math.max(0, ...values), 1)} ms, ${values.filter((ms) => ms > late).length} of ${values.length} late`;

  console.log(`\n${profile.name}  (median of ${RUNS} cold loads)`);
  console.log(`  WebGL renderer            ${run.renderer}`);
  console.log(`  home: first byte          ${round(pick(home, 'ttfb'))} ms`);
  console.log(`  home: first paint         ${round(pick(home, 'fcp'))} ms`);
  console.log(`  home: largest paint       ${round(pick(home, 'lcp'))} ms`);
  console.log(`  home: first 3D frame      ${round(pick(home, 'firstFrame'))} ms`);
  console.log(`  home: transferred         ${round(pick(home, 'bytes') / 1024, 1)} KB in ${pick(home, 'requests')} requests`);
  console.log(`  home: long tasks          ${pick(home, 'longTasks')} (longest ${round(pick(home, 'longest'))} ms)`);
  console.log(`  part page: first paint    ${round(pick(deep, 'fcp'))} ms`);
  console.log(`  part page: first 3D frame ${round(pick(deep, 'firstFrame'))} ms`);
  console.log(`  part page: transferred    ${round(pick(deep, 'bytes') / 1024, 1)} KB in ${pick(deep, 'requests')} requests`);
  console.log(`  category page swap        ${spread(run.swaps)} (${run.swaps.length} links)`);
  console.log(`  part page swap, unhovered ${round(run.coldSwap, 1)} ms`);
  console.log(`  click to first frame      ${spread(run.clicks)} (${run.clicks.length} clicks)`);
  if (VERBOSE) {
    console.log(`    swaps:  ${run.swaps.map((ms) => round(ms, 1)).join(', ')}`);
    console.log(`    clicks: ${run.clicks.map((ms) => round(ms, 1)).join(', ')}`);
    console.log(`    slow frames while building (timeline position: ms): ${run.slowFrames.map((item) => `${item.at}: ${item.ms}`).join(', ') || 'none'}`);
  }
  console.log(`  drop to first frame       ${round(run.dropLatency, 1)} ms`);
  console.log(`  frames while building     ${frames(run.buildFrames)}`);
  console.log(`  frames while powered on   ${frames(run.poweredFrames)}`);
  console.log(`  frames drawn while idle   ${run.idle} in 1.5 s`);
  console.log(`  scene, fully built        ${run.scene.drawCalls} draw calls, ${run.scene.triangles} triangles`);
  if (run.failures.length) {
    failed = true;
    console.log(`  FAILED CHECKS:\n    ${run.failures.join('\n    ')}`);
  } else {
    console.log('  interaction checks        all passed');
  }
}

await browser.close();
server.close();
process.exit(failed ? 1 : 0);
