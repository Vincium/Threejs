# Three.js 3D Forest

A small Three.js test project: a procedural 3D forest with pine trees,
instanced grass blades, rocks, gently rolling terrain, soft shadows and fog.

## Run

Serve the folder with any static server, e.g.:

```bash
npx serve .
# or
python3 -m http.server 8000
```

Then open the printed local URL (Three.js is loaded from a CDN import map,
so an internet connection is needed on first load).

## Controls

- **Drag** with the mouse to look around
- **WASD / arrow keys** to move
- **Q / E** to move down / up

## What's in the scene

- 120 procedurally placed pine trees (trunk + 3 foliage tiers)
- 12,000 instanced grass blades with per-blade color variation
- Rolling ground plane, scattered rocks, hemisphere + directional sun light
- Distance fog matching the sky color
