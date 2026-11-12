# Contributing to Part by Part

Thanks for helping. Part by Part is a website for building a PC part by part:
real components, drawn by code from their makers' figures and photos, seated in
a case one at a time.

## How to contribute

1. **Pick something.** A wrong or missing part, a part that looks nothing like
   the real one, a screen size where the page breaks, or anything in the issue
   tracker. For anything bigger than a small fix, open an issue first so the
   approach can be agreed before you spend time on it.
2. **Fork** the repository and create a branch in your fork.
3. **Run it and check it:**
   ```bash
   npm install
   npm run dev          # the site, with live reload
   npm run typecheck
   npm test
   npm run build
   npm run check:ui     # drives the built site in your installed Chrome
   ```
4. **Open a pull request** against `main` and fill in the template. CI runs on
   it once a maintainer approves the run (GitHub asks for this on a first
   contribution).

`main` is protected: every change goes through a pull request with passing CI,
and a maintainer merges it.

## Ground rules

1. **Clean room.** Do not copy code, images, 3D models, part data or text from
   other PC-building sites or parts databases, even open ones. Facts come from
   the maker's own product page, photos, drawings and manual.
2. **Part data is entered by hand and says where it came from.** Every part
   records the maker's page in `source`. A value the maker does not print is an
   estimate: mark it with a short comment in the data file, the way the
   existing entries do, and never present a guess as a published figure. The
   README's "Parts data" section describes the rest.
3. **No logos, no brand artwork, no model files.** Parts are drawn by code.
4. **Measure what you change.** If a pull request touches the 3D scene or the
   page, run `npm run measure` before and after and put the numbers in the
   pull request: late frames, frames drawn while idle, first load size. No
   unmeasured speed claims.
5. **New dependencies** need a one-line reason in the pull request and a
   licence compatible with MIT. There is one runtime dependency today, and that
   is on purpose.
6. **Small pull requests**, reviewable in about 15 minutes, with
   [Conventional Commit](https://www.conventionalcommits.org) messages (`feat:`,
   `fix:`, `perf:`, `docs:`, `chore:`).

## Licence

Part by Part is licensed under [MIT](LICENSE). By opening a pull request you
agree that your contribution is offered under the same licence. There is no
separate agreement to sign.

## Security

Please don't report security problems in public issues. See
[SECURITY.md](SECURITY.md).

## Code of conduct

Everyone taking part follows the [code of conduct](CODE_OF_CONDUCT.md).
