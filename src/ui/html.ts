// Markup for the parts tray and the build panel, as plain strings. The same
// functions run at build time (so the page arrives already rendered) and in
// the browser (to update it).

import type { Part, SlotCategory } from '../catalog/types.ts';
import { CATEGORY_LABEL, SLOT_ORDER } from '../catalog/types.ts';
import { estimatedLoad, evaluate, powerCheck, type Slots } from '../rules/compat.ts';

const esc = (text: string): string =>
  text.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);

export function specLine(part: Part): string {
  switch (part.category) {
    case 'motherboard':
      return `${part.socket} · ${part.formFactor} · ${part.ramType}`;
    case 'cpu':
      return `${part.socket} · ${part.cores} cores · ${part.tdp} W`;
    case 'cooler':
      return `${part.height} mm · ${part.fanSize} mm fan`;
    case 'ram':
      return `${part.ramType} · ${part.modules} × ${part.gbPerModule} GB · ${part.speed}`;
    case 'storage':
      return `M.2 ${part.length === 80 ? '2280' : part.length} · NVMe · ${part.capacityGb / 1000} TB`;
    case 'gpu':
      return `${part.length} mm · ${part.slots} slot · ${part.power} W`;
    case 'psu':
      return `${part.wattage} W · ${part.formFactor} · ${part.length} mm`;
  }
}

/** One drawing per category, referenced with <use>, so the icons ship once. */
export const ICON_SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<symbol id="i-motherboard" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="1.5"/><rect x="7" y="6" width="6" height="6"/><path d="M16 6v7M18.5 6v7M6 16h9M6 18.5h6"/></symbol>
<symbol id="i-cpu" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1.5"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/></symbol>
<symbol id="i-cooler" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2"/><path d="M12 10c0-3 1-5 3-5.5M14 12c3 0 5 1 5.5 3M12 14c0 3-1 5-3 5.5M10 12c-3 0-5-1-5.5-3"/></symbol>
<symbol id="i-ram" viewBox="0 0 24 24"><rect x="2.5" y="7" width="19" height="8" rx="1"/><path d="M6 10v2M10 10v2M14 10v2M18 10v2M5 15v2.5M9 15v2.5M15 15v2.5M19 15v2.5"/></symbol>
<symbol id="i-storage" viewBox="0 0 24 24"><rect x="2.5" y="8" width="19" height="8" rx="1"/><rect x="6" y="10.5" width="4" height="3"/><rect x="12" y="10.5" width="4" height="3"/><circle cx="19" cy="12" r=".9"/></symbol>
<symbol id="i-gpu" viewBox="0 0 24 24"><path d="M2.5 5v14"/><rect x="4.5" y="7" width="17" height="9" rx="1.2"/><circle cx="10" cy="11.5" r="2.6"/><circle cx="16.5" cy="11.5" r="2.6"/><path d="M7 16v2.5h6V16"/></symbol>
<symbol id="i-psu" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="1.5"/><circle cx="10" cy="12" r="4"/><path d="M17 9v2M17 14v1.5"/></symbol>
</defs></svg>`;

export function trayHtml(parts: Part[]): string {
  const sections = SLOT_ORDER.map((category) => {
    const cards = parts
      .filter((part) => part.category === category)
      .map((part) => `<div class="card" data-id="${part.id}">
<button class="pick" type="button"><svg class="ico"><use href="#i-${category}"/></svg><span class="txt"><b>${esc(part.name)}</b><i>${esc(part.brand)}</i><span class="spec">${esc(specLine(part))}</span><span class="why"></span></span></button>
<button class="rm" type="button" data-remove="${part.id}" aria-label="Remove ${esc(part.name)}" hidden>Remove</button>
</div>`)
      .join('');
    return `<section class="cat"><h2>${CATEGORY_LABEL[category]}</h2>${cards}</section>`;
  });
  return sections.join('');
}

const slotRow = (category: SlotCategory, part: Part | undefined): string =>
  `<li${part ? ' class="on"' : ''}><span class="k">${CATEGORY_LABEL[category]}</span><span class="v">${part ? esc(part.name) : '—'}</span>${
    part ? `<button class="x" type="button" data-remove="${part.id}" aria-label="Remove ${esc(part.name)}">×</button>` : ''
  }</li>`;

export function statusHtml(slots: Slots, powered: boolean): string {
  const rows = SLOT_ORDER.map((category) => slotRow(category, slots[category])).join('');
  const load = estimatedLoad(slots);
  const supply = slots.psu?.wattage ?? 0;
  const share = supply ? Math.min(100, Math.round((load / supply) * 100)) : 0;
  const warnings = evaluate(slots).filter((issue) => issue.level === 'warn');
  const check = powerCheck(slots);
  const loadText = supply ? `${load} W of ${supply} W` : load ? `${load} W, no supply yet` : '—';
  return `<h2>Build</h2><ul class="slots">${rows}</ul>
<div class="load"><span class="k">Estimated load</span><span class="v">${loadText}</span><div class="meter"><i style="width:${share}%"${share > 85 ? ' class="hot"' : ''}></i></div></div>
${warnings.length ? `<ul class="warn">${warnings.map((issue) => `<li>${esc(issue.message)}</li>`).join('')}</ul>` : ''}
<button id="power" type="button" class="power${powered ? ' on' : ''}"${check.ready ? '' : ' disabled'}>${powered ? 'Power off' : 'Power on'}</button>
${check.ready ? '' : `<p class="need">${esc(needText(check.reasons))}</p>`}`;
}

function needText(reasons: string[]): string {
  const missing = reasons.filter((reason) => reason.startsWith('No ')).map((reason) => reason.slice(3));
  const other = reasons.filter((reason) => !reason.startsWith('No '));
  const parts: string[] = [];
  if (missing.length) parts.push(`Still needs: ${missing.join(', ')}.`);
  parts.push(...other);
  return parts.join(' ');
}
