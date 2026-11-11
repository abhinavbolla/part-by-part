# pc-builder

A website for building a PC part by part, as if assembling it for real: browse
real components, seat them in the case, plug in the cables, and watch the build
come together.

`pc-builder` is a working name.

## What works

- **A catalog of 59 real parts** in the left panel: 4 cases, 8 motherboards,
  11 processors, 8 coolers, 7 memory kits, 6 drives, 9 graphics cards and
  6 power supplies. Each category is a list with filters, each part has its own
  page with full specs and a link to the manufacturer, and there is a search box.
- **"Only what fits my build"** filters a list with the same compatibility rules
  the case uses.
- **Seating parts:** drag a part from a list to its slot, or click it. Valid
  slots show a green outline; a part that does not fit shows red with the
  reason, shakes and backs out.
- **A seating animation per part:** the socket frame opens for the CPU, memory
  clips snap shut, an M.2 drive goes in at an angle and is pressed flat, cooler
  fans clip on last, a radiator slides in and its hoses run to the pump, the
  graphics card latches.
- **Cables:** once both ends are in the case the build panel lists the cable
  (24-pin, CPU power, graphics power, SATA, cooler, front panel). Each is a
  step like any part: it plugs in, then runs along its route. The machine will
  not power on until the required ones are in.
- **Variety:** ATX, microATX and Mini-ITX boards; single- and twin-tower air
  coolers; 240 and 360 mm liquid coolers mounted top or front; M.2 and 2.5-inch
  drives, several per build; a choice of case.
- **Timeline:** undo, redo, scrub, replay, and removing any part nothing else
  depends on (its cables come out with it).
- **Compatibility rules:** socket, board size, memory type and slots, graphics
  card length (less a front radiator) and slot width, cooler height and socket,
  radiator mounts, M.2 slot count, length and SATA support, drive mounts, power
  supply size, connectors and wattage, and a display output.
- **Two looks:** the build is drawn as an isometric line drawing by default,
  and a switch on the timeline shows it shaded instead. Every part in the
  catalog gets its own small drawing, made in the browser from the same model.
- **Your build is kept** in the browser and comes back after a reload.
- **Power on** once it is complete and wired: fans spin, lights come on.

Not modelled: one memory kit per build; 3.5-inch drives; case fans as separate
parts; cooler-to-memory clearance; M.2 and PCIe lane sharing; moving a finished
build to another case (the case can change only while empty).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # rules, build state and page rendering
npm run build
npm run measure    # speed and interaction checks against the build
```

Add `?hud` to the address, or press `H`, for a live speed readout.

## How it is built

- **No model files.** Every part is generated in code from its catalog
  dimensions (`src/scene/models`). Parts are the right size and shape for their
  specs; they carry no logos and do not copy any product's styling.
- **One number per step.** Seating a part or plugging a cable is a progress
  value from 0 to 1 and every pose is a pure function of it
  (`src/scene/anim.ts`). Undo, replay and scrubbing are the same mechanism.
- **Rules are separate from the view.** `src/rules/compat.ts` is plain functions
  over catalog data with no DOM or 3D.
- **Every page arrives rendered.** The build writes each catalog page as real
  HTML with the stylesheet inlined, so a link to any part paints at once. There
  are no web fonts and icons are one inline sprite.
- **The 3D view never reloads.** Catalog links swap only the panel's content.
  A page is fetched when the pointer reaches its link, and the eight category
  pages are fetched in the background after load.
- **Part data is not in the script.** Each category is a small JSON file loaded
  when the category is opened, so the script stays the same size as the catalog
  grows.
- **Idle means idle.** The scene draws a frame only when something moves, and
  shaders and parts are prepared while the page is idle.
- **The lines are real geometry.** Every edge of every shape is a thin strip
  that always faces the screen at a fixed width and fades over its last pixel,
  so lines stay smooth and stay put while the view turns. Each edge knows the
  two faces it joins; per frame it is an outline (one face toward you, one
  away: dark), a crease (both toward you: light) or hidden. Curved shapes get
  their outline wherever it falls (`src/scene/edges.ts`). The style takes its
  cue from [hairline](https://github.com/lucasmarkes/hairline) by Lucas Markes;
  none of its code is used.
- **Nothing shifts.** The box for a part's drawing is sized in the HTML before
  the drawing exists, so lists do not move when drawings arrive.

Dependencies: `three` at runtime; Vite, TypeScript and `playwright-core` (for
`npm run measure`, using the installed Chrome) for development.

## Measured

`npm run measure`, 11 November 2026 (after the redesign), Apple M4 on mains
power, Chrome, production build served with Brotli. Medians of five cold
loads; interaction figures from a scripted build of 14 steps driven with real
mouse events.

| | This machine | 4x slower CPU, Fast 4G |
|---|---|---|
| Home: first paint | 40 ms | 268 ms |
| Home: first 3D frame | 71 ms | 629 ms |
| A part's page opened directly: first paint | 40 ms | 268 ms |
| Category page swap (median / worst) | 16.5 / 18.7 ms | 19.2 / 103.2 ms |
| Part page swap, link not hovered first | 21.1 ms | 214.4 ms |
| Click to first animation frame (median / worst) | 11.9 / 13.4 ms | 15.6 / 18.9 ms |
| Late frames while building (60 fps) | 0 of 918 | 0 of 918 |
| Frames drawn while idle | 0 | 0 |
| Transferred on first load | 143 KB, 3 requests | 143 KB, 3 requests |

One frame of a fully built machine costs 8.9 ms as a line drawing and 11.6 ms
shaded (CPU and GPU together, at 2880 x 1800, timed by forcing the GPU to
finish). The script reports when the display is capped by power saving, since
no page can be shown to be smoother than the browser's own frame interval.

The throttled column slows the CPU and network only; the GPU is still this
machine's. Nothing has been measured on a phone or a low-end laptop, and only
Chrome has been run.

## Parts data

Specs in `src/catalog/data` were entered by hand from each manufacturer's own
product page on 11 November 2026, and every part records the page it came from.
Where a maker does not print a value it is marked in the data file: for example
AMD peak power is derived from TDP, one memory kit's height comes from reseller
sheets, and one liquid cooler's pump height is not published. Brand and model
names are used only to identify the parts; this project is not affiliated with
any of the manufacturers.

## License

[MIT](LICENSE), © 2026 Abhinav Bolla. That covers this project's code and the
parts data as entered here.

- **three.js** is the one third-party library that ships with the site. It is
  MIT licensed, © three.js authors; the build writes its notice to
  `THIRD-PARTY-LICENSES.txt`.
- **Product and company names** belong to their owners. The license does not
  grant any right to those names or marks.
- There are no third-party fonts, icons, images or 3D models in this
  repository: icons and parts are drawn in code.
