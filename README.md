# Part by Part

A website for building a PC part by part, as if assembling it for real: browse
real components, add them to the case, plug in the cables, and watch the build
come together.

## What works

- **A catalog of 125 real parts**: 11 cases, 18 motherboards, 19 processors,
  22 coolers, 13 memory kits, 12 drives, 18 graphics cards and 12 power
  supplies. Each category is a list with filters, each part has its own
  page with full specs and a link to the manufacturer, and there is a search box.
- **"Only what fits my build"** filters a list with the same compatibility rules
  the case uses.
- **Adding parts:** every row has one button, always in the same place: Add,
  or Remove once the part is in. The row itself opens the part's page. With a
  mouse a part can also be dragged from a list into the case: valid slots show
  a green outline; a part that does not fit shows red with the reason, shakes
  and backs out.
- **The build as a numbered list**, in the order a machine is put together,
  with the next step marked and a link to choose it; cables each have a Plug in
  button, and the power button says what is still missing.
- **Any screen, mouse or touch:** on a wide window the parts are at the left,
  the machine in the middle and the build at the right. On a landscape phone
  or a small window the machine keeps the left and one panel at the right
  switches between Parts and Build. On a portrait tablet both panels sit side
  by side under the machine; on a portrait phone one panel sits under it with
  the same two tabs and can be made taller. Nothing is hidden on a small
  screen. One finger turns the case, two pinch to zoom, and buttons are 44 px
  under a finger.
- **A seating animation per part:** the socket frame opens for the CPU, memory
  clips snap shut, the heatsink over an M.2 socket swings up, the drive goes in
  at an angle and is pressed flat and the heatsink comes back down, cooler fans
  clip on last (and a cooler with a lid gets it after them), a radiator slides
  in and its hoses run to the pump, the graphics card latches.
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
  and a switch on the timeline shows it shaded instead. Lines rest light; the
  part under the pointer, or the one going in, is drawn dark and named, and a
  click on it opens its page. Every part in the catalog gets its own small
  drawing, made in the browser from the same model.
- **Parts drawn from what they are:** processor lids differ by socket and
  memory shows its heat-spreader outline.
- **Graphics cards modelled on the real ones:** each card has its own
  fans (size, blade count, whether a ring joins the blade tips), shroud outline
  and face, backplate (the opening past the end of the board, the window round
  the bracket behind the chip), the edge you see in the case (where the fins
  show, where the name plate and light strip sit), power sockets where the card
  has them, usually in a notch, and its own tail and bracket vents. A card's
  own drawing shows it fans first.
- **Coolers modelled on the real ones:** heat pipes bend up out of the base
  into the fins in the pattern each cooler has; towers are as deep as the real
  ones (one twin tower has a slimmer front tower and sits off-centre); tops are
  bare pipe ends, capped ends, a plate, a gridded cover or one lid over both
  towers; fins are cut back at the foot where the real ones clear memory; fans
  carry their blade counts and wire clips. Liquid coolers have their own pump
  blocks, round or a rounded square, with a disc on top or a ring of vanes.
- **Boards modelled on the real ones:** each board has its own port
  cover, power-stage heatsinks, chipset plate and M.2 heatsinks where they sit
  on the real board, its own expansion slots on the slot grid, its M.2 sockets
  facing the way they really do, its CPU socket, CPU power sockets, SATA ports
  and coin cell in their places. One board leaves three M.2 sockets bare, one
  covers three with a single plate, and the Mini-ITX board carries a drive on
  a raised deck over its chipset.
- **Cases modelled on the real ones:** each case has its own front (wooden
  slats in a frame, a stood-off panel of triangular holes, round perforation,
  fine mesh with the fans showing through), its own roof, port row, feet,
  shroud and closed sections, taken from its maker's photos.
- **The back of the machine:** drag to turn the case all the way round. The
  rear panel has its real openings; the board's port block shows every port in
  the columns that board has them; a graphics card takes out the slot covers
  it replaces and shows its own display outputs; the power supply shows its
  inlet, switch and grille.
- **Your build is kept** in the browser and comes back after a reload.
- **Power on** once it is complete and wired: fans spin, lights come on.

Not modelled: one memory kit per build; 3.5-inch drives; case fans as separate
parts; cooler-to-memory clearance; M.2 and PCIe lane sharing; moving a finished
build to another case (the case can change only while empty).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # rules, build state, page rendering, catalog drawing data
npm run build
npm run measure    # speed and interaction checks against the build
npm run check:ui   # only the interaction checks, as CI runs them
```

Add `?hud` to the address, or press `H`, for a live speed readout.

## How it is built

- **No model files.** Every part is generated in code from its catalog
  dimensions and features recorded from its maker's photos
  (`src/scene/models`). Parts are the right size and carry their real
  structure, openings and connectors; they carry no logos or brand artwork,
  and stop short of circuit-level detail.
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
  shaders and parts are prepared while the page is idle and nothing is moving.
  A prepared part waits outside the scene until it is shown, so the size of
  the catalog does not weigh on a frame.
- **The lines are real geometry.** Every edge of every shape is a thin strip
  that always faces the screen at a fixed width and fades over its last pixel,
  so lines stay smooth and stay put while the view turns. Each edge knows the
  two faces it joins; per frame it is an outline (one face toward you, one
  away), a crease (both toward you, drawn fainter) or hidden. Curved shapes get
  their outline wherever it falls (`src/scene/edges.ts`). The style takes its
  cue from [hairline](https://github.com/lucasmarkes/hairline) by Lucas Markes;
  none of its code is used.
- **Nothing shifts.** The box for a part's drawing is sized in the HTML before
  the drawing exists, so lists do not move when drawings arrive.

The interface was designed following the `frontend-design` guidance in
[anthropics/skills](https://github.com/anthropics/skills) (Apache-2.0): a
drawing sheet with the panels docked as its margins, lettered in the DIN family
that engineering drawings use, taken from fonts the device already has (DIN
Alternate, Bahnschrift) so that no font is downloaded. None of that project's
text or code is included here.

Dependencies: `three` at runtime; Vite, TypeScript and `playwright-core` (for
`npm run measure`, using the installed Chrome) for development.

## Measured

`npm run measure`, 11 November 2026 (after the redesign), Apple M4 on mains
power, Chrome, production build served with Brotli. Medians of five cold
loads; interaction figures from a scripted build of 14 steps driven with real
mouse events.

| | This machine | 4x slower CPU, Fast 4G |
|---|---|---|
| Home: first paint | 32 ms | 252 ms |
| Home: first 3D frame | 74 ms | 662 ms |
| A part's page opened directly: first paint | 36 ms | 252 ms |
| Category page swap (median / worst) | 17.5 / 31 ms | 18.3 / 106 ms |
| Part page swap, link not hovered first | 25.7 ms | 202.6 ms |
| Click to first animation frame (median / worst) | 8.9 / 17.4 ms | 17.5 / 21.9 ms |
| Late frames while building (60 fps) | 0 of 1030 | 0 of 1030 |
| Frames drawn while idle | 0 | 0 |
| Transferred on first load | 147 KB, 4 requests | 147 KB, 4 requests |

One frame of a fully built machine costs 6.1 ms as a line drawing and 7.5 ms
shaded (CPU and GPU together, at 2880 x 1800, timed by forcing the GPU to
finish). The script reports when the display is capped by power saving, since
no page can be shown to be smoother than the browser's own frame interval.

The table predates the modelled cases, rear panel, cards, coolers and boards.
Those changes were each timed back to back with the version before them, on
the same machine while it was busy with other work. For the cases and rear
panel a line-drawing frame cost 8.1 ms after and 8.8 ms before, and a shaded
frame 9.6 ms after and 8.8 ms before. For the cards, coolers and boards, five
alternating runs of the same full build gave 7.0 to 10.9 ms per line-drawing
frame after (median 10.1) and 8.1 to 9.5 ms before (median 8.8), and 8.3 to
11.2 ms shaded after against 9.2 to 10.5 before: the two overlap, and that
machine could not tell them apart more finely. The same build takes 967 draw
calls where it took 1019, because a fan's blades are now one shape. A run of
`npm run measure` on that busy machine still showed no late frames in 1030 and
none drawn while idle; first paint was 40 ms and the first load 155 KB.

Doubling the catalog to 118 parts showed up only on the throttled profile:
parts prepared ahead of a click were kept hidden inside the scene, where every
frame still walked them, and twice the parts meant about 160 late frames in
850 where the smaller catalog had 40 in 990 (same machine, same busy hour).
Hidden parts now wait outside the scene and nothing is prepared while
something is moving; the same run then gave 1 late frame in 1028 throttled and
none unthrottled. First load was unchanged at 155 KB, since part data is loaded
per category.

The redesigned interface (one button per row, the numbered build list, the
layouts for small screens) added 2 KB: first load is 157 KB in 4 requests. A
run at a calmer moment gave first paint 48 ms and a first 3D frame at 129 ms,
no late frames in 1020 unthrottled and 10 in 1015 with the CPU slowed four
times. The whole table has not been re-run on a quiet machine since.

The throttled column slows the CPU and network only; the GPU is still this
machine's. Nothing has been measured on a phone or a low-end laptop, and only
Chrome has been run.

## Parts data

Specs in `src/catalog/data` were entered by hand from each manufacturer's own
product page on 11 and 12 November 2026, and every part records the page it
came from. The 66 parts added on the second day were each read a second time,
independently, against the maker's page before they went in: sizes, clearances,
connector counts, slot and socket counts, part numbers. That second reading
found no wrong figure. It found two part numbers that were not the maker's own
(a shop's code, and one missing its suffix) and two comments that claimed more
than the maker's page says, all corrected, and two places where a maker's
manual disagrees with its own product page, which the data files note. One
card is entered 30 mm lower than its maker's printed height on purpose,
because that figure appears to include the bracket; the data file says so.

Every category but processors and drives also carries a `look` entry, read
from the same pages' text and photos: what a case's front panel is and how it
is perforated, the shape of a heat spreader's top, a card's fans, shroud,
backplate and edges, a cooler's pipes, stacks and top, and where each heatsink,
slot and socket sits on a board. Boards also record their rear ports column by
column and graphics cards their display outputs. These are used only to draw
the parts. Two power supplies have three-armed exhaust cut-outs that are drawn
as triangles.

What a photo gives is not a measurement. Board positions were read off each
maker's top-down photo and its manual's layout drawing, to within a few
millimetres, and laid on this project's slot grid; heatsink heights are
estimates, since a photo from above does not show them. Card fan sizes and
board lengths are estimates from photos except where the data file says
otherwise, and one card's blade count could not be counted from its maker's
photos. Three coolers' maker sites would not load, so those were read from
their data sheets and from reviews' photos of the same model. The Mini-ITX
board's second M.2 socket is on its back; it is drawn on the front so the
drive can be seen going in. A cover over an M.2 socket swings up on a hinge
here; the real ones unscrew and lift off. Small parts on a board that the
catalog does not record (chokes, headers, the memory and 24-pin sockets) are in
a usual arrangement for the board's size, not that board's own.

Some real parts are left out because the drawing cannot do them justice yet:
cases whose power supply is not under a shroud at the bottom rear (the NZXT
H7 Flow of 2024 stands it upright behind the tray), coolers that blow down at
the board, and cards with fans on both faces. Three were left out because
their makers no longer show what the catalog records: a drive whose product
page is gone and whose length the maker prints nowhere, a power supply whose
rear face is in no photo, and a card whose maker's site sits behind a bot
check. A screen or mirror on a pump block is drawn as a plain disc, and a
power supply's fan grille is the same rings and spokes on every unit.
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

## Contributing

Changes are welcome: see [CONTRIBUTING.md](CONTRIBUTING.md) for how to run the
checks and what a pull request needs, and the
[code of conduct](CODE_OF_CONDUCT.md). `main` is protected, so every change
lands through a pull request with passing CI. Report security problems
privately, as [SECURITY.md](SECURITY.md) describes.
