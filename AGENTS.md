# Agent Guidelines

## Architecture: object-oriented programming

Follow the existing OOP architecture: each concern lives in an ES class in `src/`
(e.g. `Player`, `Controls`, `TeaHouse`, `Forest`, `Sky`, `GrassField`, `Terrain`, `MeditationUI`),
and `main.js` stays a slim orchestrator that wires the instances together.
New features should be added as classes (or methods on the relevant existing class),
not as loose top-level functions or procedural code.

## Delivery workflow

All feature work is done on a `vibe/<short-slug>` branch and merged into `main` when complete.
Always push the finished work to `main` (after stamping the build time) so the deployed site stays current.

## Build timestamp

`main.js` contains a `BUILD_TIME` constant shown in the on-screen info bar.
**Always run `./stamp.sh` and include the refreshed `main.js` in the commit before pushing**,
so every deployed change carries a fresh version stamp.

## Tea house: Level 3 style

The tea house (`src/TeaHouse.js`) is built to "Level 3" detail: walk-in standing height,
post-and-beam structure, shoji side panels, tokonoma alcove, engawa, low furniture,
and a wooden plank floor. When modifying the house:

- Keep all dimensions parameterized (`HW`, `HD`, `WALL_H`, `HT`, `doorW`, `doorH`) —
  colliders, roof, gables, and grass exclusion derive from them; do not hardcode sizes.
- Keep the entrance free of obstructions: no post or beam directly behind the doorway.
- Preserve the Level 3 interior elements when resizing or adding features.
