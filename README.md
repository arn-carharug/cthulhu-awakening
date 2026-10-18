# The Awakening of Cthulhu

A framework-free WebGL 2 scene inspired by cosmic horror. Explore the sea from a small boat, inspect the compass, approach the ruins, and witness Cthulhu's awakening.

## Requirements

- A current browser with WebGL 2 support
- A local HTTP server (the application loads shaders and models with `fetch`)
- Node.js 22+ for the included server and tests

The runtime is self-contained: `gl-matrix` 3.4.3 and its MIT license are included in `js/vendor/`. Python and Pillow are only needed to regenerate delivery textures.

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
Choose visual quality and click **Begin voyage**. Low downloads smaller textures; Medium and High use the full delivery textures.

## Controls

| Input | Action |
| --- | --- |
| Mouse | Look around |
| Click compass | Inspect the compass and unlock movement |
| WASD | Move the boat; rotate the compass while inspecting it |
| Arrow keys | Look around; rotate the compass while inspecting |
| E / Inspect compass button | Raise or lower the compass |
| C | Finish compass inspection |
| Click torch / L / Raise lantern button | Light the lantern during awakening |
| F / nearby discovery button | Read an optional journal or marked stone |
| B / Turn away button | Choose the refusal ending after awakening; confirmation required |
| M | Toggle FPS torch mode |
| Mouse wheel | Adjust brightness in FPS torch mode |
| N | Toggle procedural ritual sound |
| Volume control | Adjust the complete sound mix from 0–100 |
| H | Toggle the controls guide |
| F2 | Toggle developer diagnostics |
| P / Pause button | Pause the scene; P or Resume continues |
| R | Retry the current cycle without advancing its number |
| Escape | Release pointer lock |

## Project structure

```text
index.html                 Page shell, HUD, controls, loading/error UI
css/style.css              Shared presentation styles
main.js                    Scene state, input, animation, and rendering
js/asset-loader.js         OBJ/MTL, texture, and shader loading utilities
js/config.js               Quality presets and scene tuning values
js/timeline.js             Event bus and deterministic scene timeline
js/scene-controls.js       Held-key movement and active frame clock
js/comfort-settings.js     Persistent motion/flash preferences and replay seed
js/navigation.js           Compass bearings, anomaly drift and next-action hints
js/discovery-system.js     Optional discovery sites and lantern alignment
js/wave-field.js           World-space wave sampling matching the water shader
js/voyage-archive.js        Persistent notes, omens and endings
js/texture-catalog.js       Low/high delivery texture selection
js/performance-monitor.js  FPS and frame-time diagnostics
js/debug-panel.js          F2 developer controls
js/environment-effects.js Procedural atmospheric particles
js/weather-system.js      Deterministic lightning and storm timing
js/omen-system.js         Cycle-specific sea, fog, storm, and horizon omens
js/audio-system.js        Procedural wind, rumble, thunder, and heartbeat
js/ritual-presentation.js Cinematic captions, progress, and ending state
js/game-loop.js           Ritual objectives, cycle tracking, and run statistics
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
- The compass uses an aged engraved-brass texture with a dedicated metallic response.
- The boat uses salt-weathered wet timber with controlled roughness and Fresnel sheen.
- Animation uses elapsed time and is independent of display refresh rate.
- Canvas resolution follows viewport size and device pixel ratio, capped at 2x.
- F2 opens a diagnostics panel with quality and effect controls.
- Models and textures are loaded in parallel.
- Exponential distance fog thickens during the awakening.
- The lantern combines short-range omnidirectional light with a broad forward lobe.
- Procedural dust and moisture particles drift around the camera.
- Cinematic grading adds tone mapping, vignette, grain, and a cold color bias.
- The ocean uses multi-directional vertex waves, dynamic normals, foam, and Fresnel reflections.
- Boat and camera motion are synchronized with the active wave field.
- Lightning flashes intensify during the awakening and affect both objects and sky color.
- Ritual IV stages the awakening through an erratic compass, rising seas, restrained camera tremors, scripted lightning, a shadow-first Cthulhu reveal, and emissive eyes.
- The final reveal briefly destabilizes the lantern and exposes the creature during a forced storm flash.
- Ritual V adds event-synchronized procedural audio, restrained narrative captions, an awakening progress trace, and a replayable ending card.
- The audio mix uses an audible mid-bass rumble and a dynamics compressor so laptop speakers remain effective at high volume settings.
- The ending now requires the player to hold the lantern on Cthulhu's eyes for four seconds; losing aim gently drains progress instead of blocking exploration.
- The completed ending can be dismissed with “Keep watching” to continue inspecting the scene.
- Ritual VI turns the experience into a four-step loop: read the compass, approach R'lyeh, raise the lantern, and bear witness.
- Each completed cycle reports elapsed time, lantern focus accuracy, and the longest uninterrupted hold before allowing another run.
- Ritual VII assigns each cycle one of four hidden omens—The Black Tide, The Red Wake, The Drowned Star, or The Hollow Calm—which reshapes fog, waves, lightning, and Cthulhu's horizon position.
- Ritual VII deliberately keeps the three pillar positions and their awakening animation unchanged.
- Motion-sensitive visitors inherit their operating system's reduced-motion preference.
- Load failures stop startup with a visible error.

## Ritual roadmap

Development milestones in this project are called **rituals**. The VIII–XV implementation sequence is complete. Acceptance remains open for human playtests, listening checks and the full normal-browser matrix; see the [Ritual XV report](docs/rituals/RITUAL_15_REPORT.md).

See the [ritual roadmap](docs/RITUAL_ROADMAP.md) for scope, dependencies, and completion criteria, the [Ritual VIII report](docs/rituals/RITUAL_08_REPORT.md) for validation and measurements, and the [research notes](docs/RESEARCH_AND_ROADMAP.md) for references and findings.

Ritual VIII adds frame-rate-independent movement, a pause dialog, focus-loss/hidden-tab pausing, safe final-card mouse release, and consistent active scene time. Resume is deliberate after returning to the page. R retries the same cycle and omen; **Witness it again** starts a new cycle. The F2 panel's **Capture measurements** button records browser, resolution, load time, and raw frame timings, including p95. The sample covers up to the most recent 600 active frames; FPS and mean time describe the latest half-second reporting window.

Ritual IX adds **Comfort & replay** settings for system motion preference, boat motion, camera shake, and reduced lightning. The saved replay seed reproduces a sequence of shuffled four-omen sets with no adjacent repeats. See the [Ritual IX report](docs/rituals/RITUAL_09_REPORT.md).

Rituals X–XIII add compass navigation, a northern beacon, two optional discoveries, shared world-space boat/ocean motion, layered audio, and two deliberate endings. The local archive records discovered notes, omens and endings; retrying or starting another cycle preserves it. **Clear discoveries & endings** in Comfort clears only the archive.

Ritual XIV reduces active delivery textures from 34.65 MiB to 5.36 MiB on High and 0.51 MiB on Low, adds startup quality selection and a reload path for loading/context errors. Source images remain unchanged. Regenerate with `python scripts/optimize-textures.py` (Pillow required). The F2 panel also offers **Test graphics recovery**, which intentionally loses the current graphics context and requires a reload.

## Deployment

The repository is static and can be hosted on GitHub Pages or any static HTTP server. Keep the existing relative directory structure, including `js/vendor/` and `assets/textures/optimized/`. No external CDN is required. This work has not been deployed.

## Development checks

There is no build step. Before publishing, run syntax checks and serve the project over HTTP:

```powershell
node --check main.js
node --check js/asset-loader.js
node --check scripts/serve.js
node scripts/validate.js
node --test scripts/ritual-*.test.js
node scripts/serve.js
```
