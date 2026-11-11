// The browser's view of the catalog. Part data is not bundled with the script:
// each category is a small JSON file fetched when that category is opened (or
// hovered), so the page stays light however large the catalog grows.

import type { CatalogItem, Category } from './types.ts';

const loads = new Map<Category, Promise<CatalogItem[]>>();
const byId = new Map<string, CatalogItem>();
const lists = new Map<Category, CatalogItem[]>();

export function loadCategory(category: Category): Promise<CatalogItem[]> {
  let load = loads.get(category);
  if (!load) {
    load = fetch(`/data/${category}.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`catalog ${category}: ${response.status}`);
        return response.json() as Promise<CatalogItem[]>;
      })
      .then((items) => {
        remember(items);
        lists.set(category, items);
        return items;
      });
    load.catch(() => loads.delete(category));
    loads.set(category, load);
  }
  return load;
}

/** A category's items, if its data has already arrived. */
export function itemsOf(category: Category): CatalogItem[] | undefined {
  return lists.get(category);
}

/** An item whose data has already arrived, if it has. */
export function peek(id: string): CatalogItem | undefined {
  return byId.get(id);
}

/** Makes items known without a fetch, e.g. the parts of a saved build. */
export function remember(items: CatalogItem[]): void {
  for (const item of items) byId.set(item.id, item);
}

export interface SearchEntry {
  id: string;
  c: Category;
  n: string;
  b: string;
  s: string;
}

let index: Promise<SearchEntry[]> | undefined;

export function searchIndex(): Promise<SearchEntry[]> {
  index ??= fetch('/data/index.json').then((response) => response.json() as Promise<SearchEntry[]>);
  return index;
}
