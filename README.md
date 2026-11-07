# The Awakening of Cthulhu

A framework-free WebGL 2 scene inspired by cosmic horror. Explore the sea from a small boat, inspect the compass, approach the ruins, and witness Cthulhu's awakening.

## Requirements

- A current browser with WebGL 2 support
- A local HTTP server (the application loads shaders, textures, audio, and models with `fetch`)
- Node.js 20+ (Node.js 22 recommended) for the included dependency-free server and test suite

The runtime is self-contained: `gl-matrix` 3.4.3 and its MIT license are included in `js/vendor/`. No build step or remote CDN dependencies are required. All assets operate 100% offline.

Opening `index.html` directly with a `file://` URL is not supported due to browser security restrictions on WebGL and fetch requests.

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
Choose visual quality (Medium is selected by default to protect low-power hardware while preserving PBR water aesthetics) and click **Begin voyage**. Low downloads smaller textures; Medium and High use the full delivery textures.

## Controls

| Input | Action |
| --- | --- |
| Mouse | Look around |
| Click compass | Inspect the compass and unlock movement |
| WASD | Move the boat; rotate the compass while inspecting it |
| Arrow keys | Look around; rotate the compass while inspecting |
| E / Inspect compass button | Raise or lower the compass |
| C | Lower/finish compass inspection |
| Click torch / L / Raise lantern button | Light the lantern during awakening |
| F / nearby discovery button | Read an optional journal or marked stone |
| B / Turn away button | Choose the refusal ending after awakening; confirmation required |
| M | Toggle FPS torch mode |
| Mouse wheel | Adjust brightness in FPS torch mode |
| N | Toggle procedural ritual sound |
| Volume control | Adjust the complete sound mix from 0–100 |
| H | Toggle the controls guide |
| F2 | Toggle developer diagnostics panel |
| P / Pause button | Pause the scene; P or Resume continues |
| R | Retry the current cycle without advancing its number |
| Tab / Shift+Tab | Navigate interactive buttons within modal dialogs |
| Escape | Release pointer lock |

## Comfort and Accessibility Settings

The collapsible **Comfort & replay** panel allows players to customize their experience:

- **Subtitles / Captions:** Toggle subtitle captions on/off (`captionsEnabled`), and adjust caption font size (`small`, `medium`, `large`). Disabling subtitles suppresses narrative voice captions while preserving vital voyage navigation hints and objective status.
- **Motion Reduction:** Supports automatic detection of operating system `prefers-reduced-motion`, with manual toggles for 3D boat motion and camera tremors.
- **Lightning Flash Suppression:** Reduces intense lightning flashes for photosensitive players.
- **Deterministic Replay Seed:** Controls the four-omen progression sequence without adjacent repeats.
- **Independent Narration Control:** Dedicated toggle and volume slider for voice narration.

## Project Structure

```text
index.html                     Page shell, layered non-overlapping HUD, modal cards, loading/error UI
css/style.css                  Shared presentation styles, focus-visible outlines, layout layers
main.js                        Scene orchestrator, frame buffer pooling, and DOM write cache
js/asset-loader.js             OBJ/MTL, WebP texture, and GLSL shader loading utilities
js/config.js                   Quality presets, camera, awakening timeline, and shared GameConfig.world definition
js/scene-lifecycle.js          Unified state machine for pause, reset, awakening, endings, and discovery cards
js/scene-interaction.js        Input listeners, pointer-lock handling, and leak-safe event bindings
js/scene-renderer.js           WebGL 2 VAO/VBO creation, dynamic water grid, particle buffers, camera math
js/collision-system.js         Swept hull collision (rx=2.0, rz=4.7), sliding resolution, submerged pillar gating
js/timeline.js                 Event bus and deterministic scene timeline
js/scene-controls.js           Held-key movement and active frame clock
js/comfort-settings.js         Persistent motion/flash preferences, caption settings, and replay seed
js/navigation.js               Compass bearings, anomaly drift and next-action hints
js/discovery-system.js         Line-of-sight raycasting, 78.5° view-cone gating, and discovery sites
js/wave-field.js               World-space wave sampling matching the vertex water shader
js/voyage-archive.js           Persistent notes, omens, and endings storage
js/texture-catalog.js          Low/high delivery WebP texture selection
js/performance-monitor.js      FPS and frame-time diagnostics (sample window, mean, p95)
js/debug-panel.js              F2 developer controls and diagnostics
js/environment-effects.js      Procedural atmospheric particles, eye points, and discovery mesh
js/weather-system.js           Deterministic lightning and storm timing
js/omen-system.js              Cycle-specific sea, fog, storm, and horizon omens
js/audio-system.js             Procedural wind, rumble, thunder, and heartbeat audio
js/narration-catalog.js        Multi-language narration catalogs, timeline events, and Turkish fallback
js/narration-system.js         Single-voice narration playback, TTL expiration, and pause duration exclusion
js/ritual-presentation.js      Cinematic captions, progress, and ending state
js/game-loop.js                Ritual objectives, cycle tracking, and run statistics
shaders/vertex.glsl            World transforms, normal handling, and multi-directional waves
shaders/fragment.glsl          PBR material, fog, and dual-lobe lantern lighting
assets/models/                 OBJ and MTL scene models
assets/textures/               Textures and WebP optimized delivery variants
assets/audio/narration/        Narration audio clips (MP3), clean sources (WAV), and attribution
```

## Rendering & Performance Notes

- WebGL 2, VAOs, VBOs, and indexed drawing are used directly without external 3D libraries.
- The render loop reuses pre-allocated matrices and vectors (`FRAME_BUFFERS`, `FRAME_CONSTANTS`, and the renderer's scratch buffers). `scripts/ritual-34.test.js` runs the real `drawScene()` with a stubbed WebGL context and verifies that it creates no gl-matrix buffers per frame while sailing, inspecting the compass, during the awakening, or with the lantern lit. Plain JS objects (for example navigation samples) are still created per frame. This is an allocation count, not a browser GC profile: no measured GC pause or FPS gain is claimed from it.
- `DOM_CACHE` throttles HUD text and style writes, preventing browser layout thrashing.
- Baseline measurements on an integrated GPU (`Intel UHD Graphics`, 1080p Medium, DPR 1):
  - Normal voyage: **107.11 FPS**, mean frame time **9.34 ms**, p95 **14.10 ms**.
  - Awakening sequence: **94.00 FPS**, mean frame time **10.64 ms**, p95 **14.20 ms** (comfortably exceeding the 60 FPS target).
- Canvas resolution follows viewport size and device pixel ratio, capped at 2x.
- Exponential distance fog thickens dynamically during awakening.
- Ten pre-generated English neural narration clips accompany discoveries, key awakening moments, and endings.

## Deployment & Subdirectory Hosting

The repository is fully static and ready for hosting on GitHub Pages, itch.io, or any static HTTP server:
- All asset URLs and script/style tags use relative paths, allowing the application to be served from any root or sub-path (e.g. `/cthulhu-awakening/`).
- Required MIME types are configured in `scripts/serve.js`:
  - Shaders & Models: `text/plain` (`.glsl`, `.obj`, `.mtl`)
  - Audio: `audio/mpeg` (`.mp3`), `audio/wav` (`.wav`)
  - Textures: `image/webp` (`.webp`), `image/png` (`.png`), `image/jpeg` (`.jpg`)
  - Data: `application/json` (`.json`)
- Clean distribution package: no model weights, cache directories, `.tools/`, or temporary test artifacts pollute the deployment bundle. Source licenses and attributions are preserved in `assets/audio/narration/ATTRIBUTION.md` and `js/vendor/gl-matrix-LICENSE.md`.

## Automated CI & Development Verification

An automated GitHub Actions workflow is configured in `.github/workflows/ci.yml` running on Node 20 and 22:

Run local development verification checks before committing:

```powershell
# 1. Syntax check across all JavaScript source files
node --check main.js
Get-ChildItem -Path "js/*.js", "scripts/*.js" | ForEach-Object { node --check $_.FullName }

# 2. Static asset and model buffer integrity validation
node scripts/validate.js

# 3. Full automated regression test suite
node --test scripts/ritual-*.test.js

# 4. Start local server
node scripts/serve.js
```
