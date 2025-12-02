# PokeDeck Architect
(This app was made with AI since I'm no Dev! So I'm pretty sure it's well optimised!)
PokeDeck Architect is a desktop-first Electron app for building Pokemon TCG Standard decks. The renderer runs on Vite + React, while a separate CLI task keeps a local dump of every Standard-legal card so you can browse, filter, and drag them into decks offline.

## Features

- **Offline card library** - `npm run sync:cards` ingests the `pokemon-tcg-data` dump included in this repo and emits `public/data/standard-cards.json` with *every* English card.
- **Modern deck builder** - drag cards into your list, rename decks inline, and see live validation for 60-card count plus the four-copy rule.
- **Import / export** - paste Pokemon TCG Online text lists and export in the same format.
- **Persistent state** - decks are stored with `zustand` so reloads will not wipe your work.
- **Responsive UI** - filter panel, card grid, and deck rail adapt from laptop widths through ultrawide monitors.

## Prerequisites

- Node.js 18+
- A copy of [`pokemon-tcg-data`](https://github.com/PokemonTCG/pokemon-tcg-data) checked out into `pokemon-tcg-data-master/` at the project root (this repo already includes the folder—update it when you need the latest sets).

## Development Workflow

```bash
npm install
npm run sync:cards   # build the card bundle from pokemon-tcg-data
npm run dev          # launch Electron + Vite with HMR
```

- The sync script walks `pokemon-tcg-data-master/cards/en/*.json`, enriches entries with `sets/en.json`, and writes `public/data/standard-cards.json`. Filtering happens inside the UI.
- When the upstream dataset changes (new sets, rotation, etc.), pull the latest files, rerun `npm run sync:cards`, then click "Reload local bundle" in the filter panel.

## Production Build

```bash
npm run build
npm run preview
```

Packaged artifacts land in `release/` according to `electron-builder.json` targets.

## Project Structure

```
project-root/
  electron/
  public/
    data/            # generated standard-cards.json lives here
  pokemon-tcg-data-master/
  scripts/
  src/
    components/
    hooks/
    services/
    state/
    types/
    utils/
  test/
```

## Notes & Next Steps

- The importer now resolves cards strictly from your local Standard bundle. If sync data is stale, rerun `npm run sync:cards` before importing lists.
- `npm run test` builds the app and executes the Playwright suite headlessly; expect an Electron window to flash briefly while tests run.
- Standard legality is enforced via regulation marks (G, H, I). The UI lets you toggle Standard-only mode or pick any combination of regulation letters so you can browse the full archive.
- Want to add rarity filters, Expanded cards, or pricing? Extend the sync script to pull the extra fields you need and point the UI filters at them.

Happy brewing!
