# The Awakening of Cthulhu

A framework-free WebGL 2 scene inspired by cosmic horror. Explore the sea from a small boat, inspect the compass, approach the ruins, and witness Cthulhu's awakening.

## Requirements

- A current browser with WebGL 2 support
- A local HTTP server (the application loads shaders and models with `fetch`)
- Internet access on first load for the `gl-matrix` CDN dependency

Opening `index.html` directly with a `file://` URL is not supported.

## Run locally

From the project directory, start the included dependency-free server:

```powershell
node scripts/serve.js
```

Set a different port when needed:

```powershell
$env:PORT=9000; node scripts/serve.js
```

Then open [http://localhost:8000](http://localhost:8000).

## Controls

| Input | Action |
| --- | --- |
| Mouse | Look around |
| Click compass | Inspect the compass and unlock movement |
| WASD | Move the boat; rotate the compass while inspecting it |
| Arrow keys | Rotate the compass |
| C | Finish compass inspection |
| Click torch | Light it after the awakening completes |
| M | Toggle FPS torch mode |
| Mouse wheel | Adjust brightness in FPS torch mode |
| H | Toggle the controls guide |
| F2 | Toggle developer diagnostics |
| R | Reset the complete scene |
| Escape | Release pointer lock |

## Project structure

```text
index.html                 Page shell, HUD, controls, loading/error UI
css/style.css              Shared presentation styles
main.js                    Scene state, input, animation, and rendering
js/asset-loader.js         OBJ/MTL, texture, and shader loading utilities
js/config.js               Quality presets and scene tuning values
js/timeline.js             Event bus and deterministic scene timeline
js/performance-monitor.js  FPS and frame-time diagnostics
js/debug-panel.js          F2 developer controls
shaders/vertex.glsl        World transforms and normal handling
shaders/fragment.glsl      Material and torch lighting
assets/models/             OBJ and MTL scene models
assets/textures/           Textures used by the active scene
```

## Rendering notes

- WebGL 2, VAOs, VBOs, and indexed drawing are used directly.
- OBJ polygons are triangulated during loading.
- Index buffers automatically use 16- or 32-bit indices.
- Only Cthulhu uses the AO/metallic/roughness material path.
- Animation uses elapsed time and is independent of display refresh rate.
- Canvas resolution follows viewport size and device pixel ratio, capped at 2x.
- F2 opens a diagnostics panel with quality and effect controls.
- Models and textures are loaded in parallel.
- Load failures stop startup with a visible error.

## Deployment

The repository is static and can be hosted on GitHub Pages or any static HTTP server. Keep the existing relative directory structure. If external CDN access is undesirable, download `gl-matrix-min.js`, serve it locally, and update its script URL in `index.html`.

## Development checks

There is no build step. Before publishing, run syntax checks and serve the project over HTTP:

```powershell
node --check main.js
node --check js/asset-loader.js
node --check scripts/serve.js
node scripts/validate.js
node scripts/serve.js
```
