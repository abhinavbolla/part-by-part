# pc-builder

A website for building a PC part by part, as if assembling it for real: pick
real components, seat them in the case, and watch the build come together.

`pc-builder` is a working name.

## What works (milestone 1)

- One case (Fractal Design North), one motherboard and nine other real parts.
- Drag a part from the tray to its slot, or click it. Valid slots show a green
  outline; a part that does not fit shows red with the reason, shakes and backs out.
- A seating animation per part: the socket frame opens for the CPU, memory clips
  snap shut, the SSD goes in at an angle and is pressed flat, the cooler's fan
  clips on last, the graphics card latches.
- Undo, redo, a scrubbable timeline, replay, and removing any part that nothing
  else depends on.
- Compatibility rules: socket, board form factor, memory type and slots,
  graphics card length and slot width, cooler height and socket, M.2 fit,
  power supply size, connectors and wattage.
- Power on once the build is complete: fans spin, lights come on.

Not yet: cables, a browsable catalog, more than one case, building on the bench
before the board goes in.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # compatibility rules and build state
npm run build
npm run measure    # speed and interaction checks against the build
```

Add `?hud` to the address, or press `H`, for a live speed readout.

## How it is built

- **No model files.** Every part is generated in code from its catalog
  dimensions (`src/scene/models`), so a part costs a few hundred bytes of data.
  Parts are the right size and shape for their specs; they carry no logos and do
  not copy any product's styling.
- **One number per part.** A part's installation is a progress value from 0 to 1
  and every pose is a pure function of it (`src/scene/anim.ts`). Undo, replay and
  scrubbing are the same mechanism.
- **Rules are separate from the view.** `src/rules/compat.ts` is plain functions
  over catalog data with no DOM or 3D, tested with Node's built-in runner.
- **The page arrives rendered.** The parts tray and build panel are written into
  the HTML at build time, the stylesheet is inlined, there are no web fonts, and
  icons are one inline sprite. The 3D code is a separate chunk that starts
  downloading alongside the page and never blocks first paint.
- **Idle means idle.** The scene draws a frame only when something moves.
- **Warm before the first click.** While the page is idle, every part is built
  and drawn once off-screen so shaders and geometry are ready.

Dependencies: `three` at runtime; Vite, TypeScript and `playwright-core` (for
`npm run measure`, using the installed Chrome) for development.

## Measured

`npm run measure`, 11 November 2026, Apple M4, Chrome, production build served
with Brotli. Medians of five cold loads.

| | This machine | 4x slower CPU, Fast 4G |
|---|---|---|
| First contentful paint | 56 ms | 288 ms |
| First 3D frame | 141 ms | 771 ms |
| All parts built and warm | 351 ms | 1002 ms |
| Click to first animation frame (median / worst) | 10.7 / 14.3 ms | 22.7 / 27.9 ms |
| Frame time while building (p95 / worst) | 16.8 / 16.8 ms | 16.7 / 33.3 ms |
| Frames drawn while idle | 0 | 0 |
| Transferred | 132 KB, 3 requests | 132 KB, 3 requests |

The throttled column slows the CPU and network only; the GPU is still this
machine's. Nothing has been measured on a phone or a low-end laptop yet.

## Parts data

Specs in `src/catalog/parts.ts` were entered by hand from each manufacturer's own
product page, and every part records the page it came from. Brand and model names
are used only to identify the parts; this project is not affiliated with any of
the manufacturers.
