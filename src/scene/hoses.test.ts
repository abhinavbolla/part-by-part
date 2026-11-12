// A liquid cooler's hoses run from the pump to the radiator. These checks walk
// each hose in every case that can take each cooler, and fail if it passes
// through one of the radiator's fans, the case's own fans, or a wall.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CatmullRomCurve3, Vector3 } from 'three';

import { CASES, PARTS } from '../catalog/parts.ts';
import type { LiquidCoolerPart } from '../catalog/types.ts';
import { radiatorMount } from '../rules/compat.ts';
import { PANEL, boardLayout, caseLayout } from './layout.ts';
import { hosePaths, radiatorPlace } from './models/components.ts';

const coolers = PARTS.filter((part): part is LiquidCoolerPart => part.category === 'cooler' && part.kind === 'aio');

test('no hose passes through a fan or a wall', () => {
  let walked = 0;
  for (const pcCase of CASES) {
    const lay = caseLayout(pcCase);
    for (const cooler of coolers) {
      const mount = radiatorMount(pcCase, cooler);
      if (!mount) continue;
      const where = `${cooler.id} in ${pcCase.id} (${mount})`;
      const place = radiatorPlace(cooler, lay, mount);
      const radius = (cooler.look?.hose ?? 11) / 2;
      // Each radiator fan as a box: its square frame, 25 mm deep
      const half = cooler.fanSize / 2;
      const fans = Array.from({ length: cooler.fans }, (_, i) => {
        const [x, y, z] = place.fanCentre(i);
        return place.along === 'x'
          ? { min: [x - half, y - 12.5, z - half], max: [x + half, y + 12.5, z + half] }
          : { min: [x - 12.5, y - half, z - half], max: [x + 12.5, y + half, z + half] };
      });
      // The fans fill the middle of the radiator and leave both tanks bare
      const span = cooler.fans * cooler.fanSize;
      assert.ok(span <= cooler.radiator.length - 16, `${where}: fans leave room for the tanks`);
      for (const points of hosePaths(cooler, lay, boardLayout('ATX'), mount)) {
        const curve = new CatmullRomCurve3(points.map((point) => new Vector3(...point)), false, 'centripetal');
        for (const at of curve.getSpacedPoints(240)) {
          const spot = [at.x, at.y, at.z];
          for (const fan of fans) {
            const inside = spot.every((value, axis) => value > fan.min[axis] - radius && value < fan.max[axis] + radius);
            assert.ok(!inside, `${where}: a hose crosses a radiator fan at ${spot.map(Math.round)}`);
          }
          // The intake fans stand just inside the front; nothing may reach into them
          if (lay.frontFans && mount === 'top') {
            assert.ok(at.x + radius < lay.frontInner - lay.frontFans + 0.5, `${where}: a hose reaches the front fans`);
          }
          assert.ok(at.z + radius < lay.W / 2 - PANEL, `${where}: a hose comes through the open side`);
          assert.ok(at.y + radius < lay.H - PANEL, `${where}: a hose comes through the roof`);
          walked++;
        }
      }
    }
  }
  assert.ok(walked > 0);
});
