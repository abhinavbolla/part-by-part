# Security policy

Part by Part is a static website: it has no server of its own, no accounts and
no payments, and a build is kept only in your own browser. Security reports are
still welcome and are taken seriously.

## Reporting a vulnerability

**Please don't open a public issue.** Report it privately through GitHub:
[Report a vulnerability](https://github.com/abhinavbolla/part-by-part/security/advisories/new)
(Security tab → "Report a vulnerability").

Please include:
- what someone could do with it, and under which conditions;
- steps to reproduce, or a proof of concept;
- the commit you tested, and the browser.

You'll get an acknowledgement within 7 days and updates while it is being
fixed. You'll be credited in the advisory unless you'd rather not be.

## Scope

Especially relevant:
- **Script injection through content:** anything in the catalog, a saved build,
  a link or the search box that makes the page run code it should not.
- **The supply chain:** a dependency, the build, or a workflow in `.github/`
  that could put something into the published site or leak a credential.
- **Links out of the site** that lead somewhere other than the maker's page
  they claim to.

Out of scope: wrong part data. A wrong figure is a bug, and a public issue is
the right place for it.

There are no released versions yet; fixes land on `main`.
