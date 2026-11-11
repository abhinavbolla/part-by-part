import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CATALOG, DEFAULT_CASE } from '../catalog/parts.ts';
import { CATEGORY_ORDER } from '../catalog/types.ts';
import { cablesFor, slotsFrom } from '../rules/compat.ts';
import { allPages, categoryPage, facetsFor, itemPage, searchIndex, specLine, specRows, statusHtml } from './html.ts';

test('one page per route: home, each category, each part', () => {
  const pages = allPages(CATALOG);
  assert.equal(pages.length, 1 + CATEGORY_ORDER.length + CATALOG.length);
  assert.equal(new Set(pages.map((page) => page.path)).size, pages.length);
  for (const page of pages) {
    assert.match(page.path, /^\/(parts\/[a-z]+\/([a-z0-9-]+\/)?)?$/);
    assert.match(page.panel, /^<div class="page" data-title="/);
  }
});

test('a category page lists every part in it, with its filter values', () => {
  for (const category of CATEGORY_ORDER) {
    const page = categoryPage(category, CATALOG);
    for (const item of CATALOG.filter((entry) => entry.category === category)) {
      assert.ok(page.panel.includes(`data-id="${item.id}"`), item.id);
      for (const facet of facetsFor(category)) {
        assert.ok(page.panel.includes(`data-f-${facet.key}="${facet.of(item).replace(/"/g, '&quot;')}"`), `${item.id} ${facet.key}`);
      }
    }
  }
});

test('a part page carries its specs and links to the manufacturer', () => {
  for (const item of CATALOG) {
    const page = itemPage(item);
    assert.ok(page.panel.includes(item.source.replace(/&/g, '&amp;')), item.id);
    assert.ok(specRows(item).length >= 3, item.id);
    assert.ok(specLine(item).length > 5, item.id);
    assert.ok(!/undefined|NaN/.test(page.panel), item.id);
  }
});

test('the search index covers the whole catalog', () => {
  assert.equal(searchIndex(CATALOG).length, CATALOG.length);
});

test('the empty build panel names the case and keeps power off', () => {
  const slots = slotsFrom(DEFAULT_CASE, []);
  const html = statusHtml(slots, cablesFor(slots).map((cable) => ({ cable, plugged: false })), false);
  assert.ok(html.includes(DEFAULT_CASE.name));
  assert.match(html, /id="power"[^>]* disabled/);
  assert.ok(html.includes('Still needs: motherboard'));
});
