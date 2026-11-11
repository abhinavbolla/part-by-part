// Markup for the catalog pages and the build panel, as plain strings. The
// same functions run at build time (so every page arrives already rendered)
// and in the browser (to update the build panel).

import type { CablePart, CatalogItem, Category, Part, SlotCategory } from '../catalog/types.ts';
import { CATEGORY_LABEL, CATEGORY_ORDER, CATEGORY_PLURAL, SLOT_ORDER } from '../catalog/types.ts';
import { estimatedLoad, evaluate, powerCheck, type Slots } from '../rules/compat.ts';

export const SITE = 'PC Builder';

const esc = (text: string): string =>
  text.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);

const tb = (gb: number): string => (gb >= 1000 ? `${Math.round(gb / 100) / 10} TB` : `${gb} GB`);
const m2Size = (length: number): string => (length === 80 ? '2280' : length === 110 ? '22110' : String(length));

/** One line of the specs that matter most when choosing. */
export function specLine(item: CatalogItem): string {
  switch (item.category) {
    case 'case':
      return `${item.dims.length} × ${item.dims.width} × ${item.dims.height} mm · GPU ${item.maxGpuLength} mm`;
    case 'motherboard':
      return `${item.socket} · ${item.formFactor} · ${item.ramType}`;
    case 'cpu':
      return `${item.socket} · ${item.cores} cores · ${item.tdp} W`;
    case 'cooler':
      return item.kind === 'aio'
        ? `Liquid · ${item.radiator.size} mm radiator`
        : `Air · ${item.height} mm · ${item.fans} × ${item.fanSize}`;
    case 'ram':
      return `${item.ramType} · ${item.modules} × ${item.gbPerModule} GB · ${item.speed}`;
    case 'storage':
      return item.formFactor === 'M.2'
        ? `M.2 ${m2Size(item.length)} · ${item.interface === 'nvme' ? 'NVMe' : 'SATA'} · ${tb(item.capacityGb)}`
        : `2.5" · SATA · ${tb(item.capacityGb)}`;
    case 'gpu':
      return `${item.length} mm · ${item.slots} slot · ${item.power} W`;
    case 'psu':
      return `${item.wattage} W · ${item.formFactor} · ${item.length} mm`;
  }
}

/** The full spec table for a part's own page. */
export function specRows(item: CatalogItem): [string, string][] {
  const list = (values: (string | number)[]): string => (values.length ? values.join(', ') : 'none');
  switch (item.category) {
    case 'case':
      return [
        ['Size', `${item.dims.length} × ${item.dims.width} × ${item.dims.height} mm`],
        ['Motherboards', list(item.moboFormFactors)],
        ['Graphics card', `up to ${item.maxGpuLength} mm`],
        ['CPU cooler', `up to ${item.maxCoolerHeight} mm tall`],
        ['Power supply', `${list(item.psuFormFactors)}, up to ${item.maxPsuLength} mm`],
        ['Expansion slots', String(item.expansionSlots)],
        ['Fans included', list([
          ...item.includedFans.front.map((size) => `front ${size} mm`),
          ...item.includedFans.top.map((size) => `top ${size} mm`),
          ...item.includedFans.rear.map((size) => `rear ${size} mm`),
        ])],
        ['Radiators', `front ${list(item.radiators.front)} · top ${list(item.radiators.top)} mm`],
        ['Drive mounts', `${item.bays.ssd25} × 2.5", ${item.bays.hdd35} × 3.5"`],
      ];
    case 'motherboard':
      return [
        ['Socket', item.socket],
        ['Chipset', item.chipset],
        ['Size', item.formFactor],
        ['Memory', `${item.ramSlots} × ${item.ramType}, up to ${item.maxRamGb} GB`],
        ['M.2 slots', item.m2Slots.map((slot) =>
          `${m2Size(slot.maxLength)}${slot.interfaces.includes('sata') ? ' NVMe/SATA' : ''}`).join(', ')],
        ['SATA ports', String(item.sataPorts)],
        ['x16 slots', String(item.pcieX16Slots)],
        ['CPU power', `${item.epsConnectors} × 8-pin`],
        ['Fan headers', String(item.fanHeaders)],
      ];
    case 'cpu':
      return [
        ['Socket', item.socket],
        ['Cores / threads', `${item.cores} / ${item.threads}`],
        ['Rated power', `${item.tdp} W`],
        ['Peak power', `${item.peakPower} W`],
        ['Integrated graphics', item.igpu ? 'yes' : 'no'],
      ];
    case 'cooler':
      return item.kind === 'aio'
        ? [
          ['Type', 'Liquid, all-in-one'],
          ['Radiator', `${item.radiator.size} mm (${item.radiator.length} × ${item.radiator.width} × ${item.radiator.thickness} mm)`],
          ['Fans', `${item.fans} × ${item.fanSize} mm`],
          ['Sockets', list(item.sockets)],
        ]
        : [
          ['Type', item.towers > 1 ? 'Air, twin tower' : 'Air, single tower'],
          ['Height', `${item.height} mm`],
          ['Width × depth', `${item.width} × ${item.depth} mm`],
          ['Fans', `${item.fans} × ${item.fanSize} mm`],
          ['Sockets', list(item.sockets)],
        ];
    case 'ram':
      return [
        ['Type', item.ramType],
        ['Kit', `${item.modules} × ${item.gbPerModule} GB`],
        ['Speed', String(item.speed)],
        ['Module height', `${item.height} mm`],
      ];
    case 'storage':
      return [
        ['Form factor', item.formFactor === 'M.2' ? `M.2 ${m2Size(item.length)}` : '2.5-inch'],
        ['Interface', item.interface === 'nvme' ? 'NVMe (PCIe)' : 'SATA'],
        ['Capacity', tb(item.capacityGb)],
      ];
    case 'gpu':
      return [
        ['Chip', item.chip],
        ['Size', `${item.length} × ${item.height} × ${item.thickness} mm`],
        ['Slot width', String(item.slots)],
        ['Power draw', `${item.power} W`],
        ['Power plugs', [
          item.connectors.pcie8 ? `${item.connectors.pcie8} × 8-pin` : '',
          item.connectors.hpwr16 ? `${item.connectors.hpwr16} × 16-pin` : '',
        ].filter(Boolean).join(', ') || 'none'],
        ['Recommended supply', `${item.recommendedPsu} W`],
        ['Fans', String(item.fans)],
      ];
    case 'psu':
      return [
        ['Output', `${item.wattage} W`],
        ['Size', `${item.formFactor}, ${item.length} mm long`],
        ['Cables', item.modular === 'full' ? 'fully modular' : item.modular === 'semi' ? 'semi-modular' : 'fixed'],
        ['CPU power', `${item.connectors.eps8} × 8-pin`],
        ['PCIe', `${item.connectors.pcie8} × 8-pin${item.connectors.hpwr16 ? `, ${item.connectors.hpwr16} × 16-pin` : ''}`],
        ['SATA power', String(item.connectors.sata)],
      ];
  }
}

export interface Facet {
  key: string;
  label: string;
  of(item: CatalogItem): string;
}

/** What each category can be filtered by. */
export function facetsFor(category: Category): Facet[] {
  const pick = <T extends CatalogItem>(key: string, label: string, of: (item: T) => string): Facet =>
    ({ key, label, of: (item) => of(item as T) });
  switch (category) {
    case 'motherboard':
      return [
        pick<Part & { category: 'motherboard' }>('socket', 'Socket', (item) => item.socket),
        pick<Part & { category: 'motherboard' }>('size', 'Size', (item) => item.formFactor),
        pick<Part & { category: 'motherboard' }>('memory', 'Memory', (item) => item.ramType),
      ];
    case 'cpu':
      return [pick<Part & { category: 'cpu' }>('socket', 'Socket', (item) => item.socket)];
    case 'cooler':
      return [pick<Part & { category: 'cooler' }>('type', 'Type', (item) => (item.kind === 'aio' ? 'Liquid' : 'Air'))];
    case 'ram':
      return [pick<Part & { category: 'ram' }>('type', 'Type', (item) => item.ramType)];
    case 'storage':
      return [pick<Part & { category: 'storage' }>('type', 'Type', (item) =>
        item.formFactor === 'M.2' ? (item.interface === 'nvme' ? 'M.2 NVMe' : 'M.2 SATA') : '2.5" SATA')];
    case 'gpu':
      return [pick<Part & { category: 'gpu' }>('chip', 'Chip', (item) => item.chip.split(' ')[0])];
    case 'psu':
      return [pick<Part & { category: 'psu' }>('size', 'Size', (item) => item.formFactor)];
    default:
      return [];
  }
}

/** One drawing per category, referenced with <use>, so the icons ship once. */
export const ICON_SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<symbol id="i-case" viewBox="0 0 24 24"><rect x="6" y="2.5" width="12" height="19" rx="1.5"/><path d="M9 6h6M9 9h6"/><circle cx="12" cy="16" r="2"/></symbol>
<symbol id="i-motherboard" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="1.5"/><rect x="7" y="6" width="6" height="6"/><path d="M16 6v7M18.5 6v7M6 16h9M6 18.5h6"/></symbol>
<symbol id="i-cpu" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1.5"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/></symbol>
<symbol id="i-cooler" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2"/><path d="M12 10c0-3 1-5 3-5.5M14 12c3 0 5 1 5.5 3M12 14c0 3-1 5-3 5.5M10 12c-3 0-5-1-5.5-3"/></symbol>
<symbol id="i-ram" viewBox="0 0 24 24"><rect x="2.5" y="7" width="19" height="8" rx="1"/><path d="M6 10v2M10 10v2M14 10v2M18 10v2M5 15v2.5M9 15v2.5M15 15v2.5M19 15v2.5"/></symbol>
<symbol id="i-storage" viewBox="0 0 24 24"><rect x="2.5" y="8" width="19" height="8" rx="1"/><rect x="6" y="10.5" width="4" height="3"/><rect x="12" y="10.5" width="4" height="3"/><circle cx="19" cy="12" r=".9"/></symbol>
<symbol id="i-gpu" viewBox="0 0 24 24"><path d="M2.5 5v14"/><rect x="4.5" y="7" width="17" height="9" rx="1.2"/><circle cx="10" cy="11.5" r="2.6"/><circle cx="16.5" cy="11.5" r="2.6"/><path d="M7 16v2.5h6V16"/></symbol>
<symbol id="i-psu" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="1.5"/><circle cx="10" cy="12" r="4"/><path d="M17 9v2M17 14v1.5"/></symbol>
<symbol id="i-cable" viewBox="0 0 24 24"><rect x="3" y="4" width="6" height="5" rx="1"/><rect x="15" y="15" width="6" height="5" rx="1"/><path d="M6 9v3c0 3 2 3 6 3s6 0 6 3"/></symbol>
</defs></svg>`;

const icon = (name: string): string => `<svg class="ico"><use href="#i-${name}"/></svg>`;

export const categoryPath = (category: Category): string => `/parts/${category}/`;
export const itemPath = (item: CatalogItem): string => `/parts/${item.category}/${item.id}/`;

const facetAttrs = (item: CatalogItem): string =>
  facetsFor(item.category).map((facet) => ` data-f-${facet.key}="${esc(facet.of(item))}"`).join('');

/** A catalog row: the part itself (drag or click), a link to its page, and a remove button. */
function row(item: CatalogItem): string {
  return `<div class="card" data-id="${item.id}"${facetAttrs(item)}>
<button class="pick" type="button"><span class="shot">${icon(item.category)}</span><span class="txt"><b>${esc(item.name)}</b><i>${esc(item.brand)}</i><span class="spec">${esc(specLine(item))}</span><span class="why"></span></span></button>
<a class="more" data-nav href="${itemPath(item)}" aria-label="Details for ${esc(item.name)}">Details</a>
<button class="rm" type="button" data-remove="${item.id}" hidden>Remove</button>
</div>`;
}

export interface Page {
  path: string;
  title: string;
  /** Catalog data this page needs, fetched alongside it. */
  data: Category | null;
  panel: string;
}

export function homePage(catalog: CatalogItem[]): Page {
  const links = CATEGORY_ORDER.map((category) => {
    const count = catalog.filter((item) => item.category === category).length;
    return `<a class="catlink" data-nav data-cat="${category}" href="${categoryPath(category)}"><span class="shot">${icon(category)}</span><span class="txt"><b>${CATEGORY_PLURAL[category]}</b><span class="cur"></span></span><span class="n">${count}</span></a>`;
  }).join('');
  return {
    path: '/',
    title: SITE,
    data: null,
    panel: `<div class="page" data-title="${SITE}" data-kind="home"><h2>Parts</h2><nav class="cats">${links}</nav></div>`,
  };
}

export function categoryPage(category: Category, catalog: CatalogItem[]): Page {
  const items = catalog.filter((item) => item.category === category);
  const facets = facetsFor(category).map((facet) => {
    const values = [...new Set(items.map((item) => facet.of(item)))];
    if (values.length < 2) return '';
    return `<div class="facet" data-key="${facet.key}"><span class="k">${facet.label}</span>${values
      .map((value) => `<button type="button" aria-pressed="false" data-v="${esc(value)}">${esc(value)}</button>`)
      .join('')}</div>`;
  }).join('');
  const fits = category === 'case'
    ? ''
    : `<label class="fits"><input type="checkbox" id="fits"> Only what fits my build</label>`;
  const title = `${CATEGORY_PLURAL[category]} · ${SITE}`;
  return {
    path: categoryPath(category),
    title,
    data: category,
    panel: `<div class="page" data-title="${esc(title)}" data-kind="list" data-cat="${category}">
<p class="crumbs"><a data-nav href="/">Parts</a><span>/</span>${CATEGORY_PLURAL[category]}</p>
<div class="filters">${fits}${facets}</div>
<p class="hint" hidden></p>
<div class="rows">${items.map(row).join('')}</div>
<p class="none" hidden>Nothing matches. Clear a filter to see more.</p>
</div>`,
  };
}

export function itemPage(item: CatalogItem): Page {
  const title = `${item.name} · ${SITE}`;
  const specs = specRows(item)
    .map(([label, value]) => `<dt>${esc(label)}</dt><dd>${esc(value)}</dd>`)
    .join('');
  const action = item.category === 'case' ? 'Use this case' : 'Seat it';
  return {
    path: itemPath(item),
    title,
    data: item.category,
    panel: `<div class="page" data-title="${esc(title)}" data-kind="item" data-cat="${item.category}">
<p class="crumbs"><a data-nav href="/">Parts</a><span>/</span><a data-nav href="${categoryPath(item.category)}">${CATEGORY_PLURAL[item.category]}</a></p>
<div class="card detail" data-id="${item.id}">
<div class="figure"></div>
<h2 class="name">${esc(item.name)}</h2>
<p class="by">${esc(item.brand)} · ${esc(item.sku)}</p>
<button class="pick act" type="button">${icon(item.category)}<span class="txt"><b>${action}</b><span class="why"></span></span></button>
<button class="rm" type="button" data-remove="${item.id}" hidden>Remove</button>
</div>
<dl class="specs">${specs}</dl>
<p class="src"><a href="${esc(item.source)}" target="_blank" rel="noopener noreferrer">Specs from the manufacturer's page</a></p>
</div>`,
  };
}

export function allPages(catalog: CatalogItem[]): Page[] {
  return [
    homePage(catalog),
    ...CATEGORY_ORDER.map((category) => categoryPage(category, catalog)),
    ...catalog.map(itemPage),
  ];
}

/** Compact entries for the search box. */
export function searchIndex(catalog: CatalogItem[]): { id: string; c: Category; n: string; b: string; s: string }[] {
  return catalog.map((item) => ({ id: item.id, c: item.category, n: item.name, b: item.brand, s: specLine(item) }));
}

// ---- build panel ---------------------------------------------------------------

const slotRow = (category: Category, part: CatalogItem | undefined, removable: boolean): string =>
  `<li${part ? ' class="on"' : ''}><a class="k" data-nav href="${categoryPath(category)}">${CATEGORY_LABEL[category]}</a><span class="v">${
    part ? `<a data-nav href="${itemPath(part)}">${esc(part.name)}</a>` : '—'
  }</span>${
    part && removable
      ? `<button class="x" type="button" data-remove="${part.id}" aria-label="Remove ${esc(part.name)}">×</button>`
      : ''
  }</li>`;

function wireRow(cable: CablePart, plugged: boolean): string {
  return `<li class="card wire${plugged ? ' in' : ''}" data-id="${cable.id}">
<button class="pick" type="button">${icon('cable')}<span class="txt"><b>${esc(cable.name)}</b><span class="spec">${esc(cable.detail)}</span><span class="why"></span></span></button>
<button class="rm" type="button" data-remove="${cable.id}"${plugged ? '' : ' hidden'}>Unplug</button>
</li>`;
}

export function statusHtml(
  slots: Slots,
  wiring: { cable: CablePart; plugged: boolean }[],
  powered: boolean,
): string {
  const single = (category: Exclude<SlotCategory, 'storage'>): string => slotRow(category, slots[category], true);
  const rows = [
    slotRow('case', slots.case, false),
    ...SLOT_ORDER.map((category) =>
      category === 'storage'
        ? (slots.storage.length
          ? slots.storage.map((drive) => slotRow('storage', drive, true)).join('')
          : slotRow('storage', undefined, true))
        : single(category)),
  ].join('');

  const load = estimatedLoad(slots);
  const supply = slots.psu?.wattage ?? 0;
  const share = supply ? Math.min(100, Math.round((load / supply) * 100)) : 0;
  const loadText = supply ? `${load} W of ${supply} W` : load ? `${load} W, no supply yet` : '—';
  const warnings = evaluate(slots).filter((issue) => issue.level === 'warn');
  const check = powerCheck(slots);
  const loose = wiring.filter((item) => !item.plugged).length;

  const need: string[] = [];
  if (check.missing.length) need.push(`Still needs: ${check.missing.join(', ')}.`);
  if (check.unplugged.length) need.push(`Not plugged in: ${check.unplugged.join(', ')}.`);
  need.push(...check.faults);

  return `<h2>Build</h2><ul class="slots">${rows}</ul>
<div class="load"><span class="k">Estimated load</span><span class="v">${loadText}</span><div class="meter"><i style="width:${share}%"${share > 85 ? ' class="hot"' : ''}></i></div></div>
${wiring.length ? `<h2>Wiring${loose > 1 ? `<button id="plugall" type="button">Plug in all ${loose}</button>` : ''}</h2><ul class="wires">${wiring.map((item) => wireRow(item.cable, item.plugged)).join('')}</ul>` : ''}
${warnings.length ? `<ul class="warn">${warnings.map((issue) => `<li>${esc(issue.message)}</li>`).join('')}</ul>` : ''}
<button id="power" type="button" class="power${powered ? ' on' : ''}"${check.ready ? '' : ' disabled'}>${powered ? 'Power off' : 'Power on'}</button>
${check.ready ? '' : `<p class="need">${esc(need.join(' '))}</p>`}`;
}
