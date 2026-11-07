// ==========================================
// CTHULHU AWAKENING - MAIN ENTRY POINT
// ==========================================

const { loadOBJWithMTL, loadTexture, loadShaderSource, compileShader, createProgram, makeIndexArray } = window.AssetLoader || {};

const gameConfig = window.GameConfig || {};
const qualityPresets = gameConfig.qualityPresets;
const defaultQuality = gameConfig.defaultQuality || 'medium';
const cameraConfig = gameConfig.camera || { fov: Math.PI / 4, near: 0.1, far: 500 };
const awakeningConfig = gameConfig.awakening || { duration: 42, pillars: { start: 5, duration: 10, distance: 25 }, cthulhu: { start: 12, duration: 28, distance: 80 } };
const torchConfig = gameConfig.torch || { defaultIntensity: 5, automaticIntensity: 6, manualMax: 12 };
const oceanConfig = gameConfig.ocean || { waveHeight: 0.72, waveSpeed: 0.82, foamThreshold: 0.48 };
const worldConfig = gameConfig.world;

const sceneControls = new window.SceneControls();
const sceneEvents = new window.SceneRuntime.EventBus();
const voyageArchive = new window.VoyageArchive();
const comfortSettings = new window.ComfortSettings();
const ritualAudio = new window.RitualAudioSystem();
const ritualPresentation = new window.RitualPresentation(sceneEvents, comfortSettings);
const collisionSystem = new window.CollisionSystem();
const discoveries = new window.DiscoverySystem(collisionSystem);
const navigation = new window.VoyageNavigation();
const narrator = new window.NarrationSystem(ritualAudio, window.NarrationCatalog, {
    status: (copy) => {
        const el = document.getElementById('narration-status');
        if (el) el.textContent = copy;
    },
    caption: (id, copy, duration) => {
        if (!id.startsWith('discovery.') && !id.startsWith('ending.')) ritualPresentation.show(copy, duration * 1000 + 250, true);
    }
});

for (const [id, entry] of Object.entries(window.NarrationCatalog.languages.en)) {
    if (entry.event) sceneEvents.on(entry.event, () => { void narrator.play(id); });
}

const ritualCycle = new window.RitualCycle(sceneEvents);
const omenSystem = new window.OmenSystem(sceneEvents, comfortSettings.values.seed);
const initialOmen = omenSystem.beginCycle(ritualCycle.cycle);
ritualCycle.setOmen(initialOmen.label);
ritualAudio.setOmen(initialOmen.id);

const awakeningTimeline = new window.SceneRuntime.SceneTimeline({
    duration: awakeningConfig.duration,
    events: sceneEvents,
    tracks: {
        pillars: { ...awakeningConfig.pillars, to: awakeningConfig.pillars.distance },
        cthulhu: { ...awakeningConfig.cthulhu, to: awakeningConfig.cthulhu.distance }
    },
    cues: [
        { at: 0.1, name: 'awakening:rumble' },
        { at: 2.0, name: 'awakening:compass' },
        { at: 5.0, name: 'awakening:surge' },
        { at: 7.0, name: 'awakening:pillars' },
        { at: 14.0, name: 'awakening:presence' },
        { at: 19.0, name: 'awakening:silhouette' },
        { at: 24.0, name: 'awakening:flash' },
        { at: 29.0, name: 'awakening:eyes' },
        { at: 36.0, name: 'awakening:reveal' }
    ]
});

// ===============
// GLMATRIX STATE (preserved)
// ===============
const STATE = {
    gl: null,
    mat4: glMatrix.mat4,
    vec3: glMatrix.vec3,
    vec4: glMatrix.vec4,
    canvas: null,
    shipPosition: glMatrix.vec3.fromValues(worldConfig.initialShipPosition[0], worldConfig.initialShipPosition[1], worldConfig.initialShipPosition[2]),
    shipVAO: null,
    shipIndexCount: 0,
    cameraFront: glMatrix.vec3.fromValues(0, 0, -1),
    cameraUp: glMatrix.vec3.fromValues(0, 1, 0),
    cameraSpeed: 9,
    yaw: -90,
    pitch: 0,
    firstMouse: true,
    sensitivity: 0.1,
    ambientLight: glMatrix.vec3.fromValues(1.0, 1.0, 1.0),
    torchLit: false,
    torchMatrix: glMatrix.mat4.create(),
    torchVAO: null,
    torchClicked: false,
    torchHovered: false,
    torchLightIntensity: 0.0,
    maxTorchLight: torchConfig.automaticIntensity,
    awakeningStarted: false,
    maxRiseY: awakeningConfig.cthulhu.distance,
    uModelLoc: null,
    uViewLoc: null,
    uProjectionLoc: null,
    cthulhuRiseY: 0,
    uAmbientLightLoc: null,
    uTorchLitLoc: null,
    uIsTorchLoc: null,
    uTorchLightPosLoc: null,
    uTorchLightIntensityLoc: null,
    uTorchHoveredLoc: null,
    program: null,
    torchControlMode: false,
    minTorch: 1.0,
    maxTorch: torchConfig.manualMax,
    uTorchLightColorLoc: null,
    uTorchDirectionLoc: null,
    compassInspectMode: false,
    compassYaw: 0,
    compassPitch: 0,
    compassHovered: false,
    uCompassHoveredLoc: null,
    uIsCompassLoc: null,
    pillarsTexture: null,
    shipTexture: null,
    compassTexture: null,
    cthulhuTexture: null,
    waterTexture: null,
    waterVAO: null,
    waterIndexCount: 0,
    lastFrameTime: 0,
    paused: false,
    quality: defaultQuality,
    effects: {
        lighting: true, pbr: true, animation: true,
        fog: true, particles: true, post: true,
        water: true, boatMotion: true, lightning: true
    },
    awakeningTimeline,
    performanceMonitor: null,
    elapsedTime: 0,
    boatMotion: { bob: 0, roll: 0, pitch: 0 },
    lightning: new window.WeatherSystem.LightningSystem(),
    omen: initialOmen,
    cinematic: { compassSpin: false, surge: false, eyes: false, shake: 0, torchShock: 0 },
    witness: { active: false, focus: 0, complete: false }
};

STATE.lightning.setProfile({ intervalScale: STATE.omen.lightningInterval });

sceneEvents.on('awakening:rumble', () => { STATE.cinematic.shake = 0.18; });
sceneEvents.on('awakening:compass', () => { STATE.cinematic.compassSpin = true; });
sceneEvents.on('awakening:surge', () => { STATE.cinematic.surge = true; });
sceneEvents.on('awakening:presence', () => { STATE.cinematic.shake = 0.34; });
sceneEvents.on('awakening:flash', () => {
    STATE.lightning.strike(1.7);
    STATE.cinematic.shake = 0.5;
});
sceneEvents.on('awakening:eyes', () => { STATE.cinematic.eyes = true; });
sceneEvents.on('awakening:reveal', () => {
    STATE.lightning.strike(2.15);
    STATE.cinematic.shake = 0.72;
    STATE.cinematic.torchShock = 1;
});
[
    'awakening:rumble', 'awakening:presence', 'awakening:flash',
    'awakening:eyes', 'awakening:reveal'
].forEach((name) => sceneEvents.on(name, () => ritualAudio.cue(name)));
sceneEvents.on('timeline:update', ({ progress }) => ritualAudio.setAwakening(progress));
sceneEvents.on('weather:lightning', ({ intensity }) => ritualAudio.distantThunder(intensity, STATE.lightning.direction));
sceneEvents.on('timeline:complete', () => { STATE.witness.active = true; });
['interaction:compass', 'interaction:torch'].forEach((name) => sceneEvents.on(name, () => ritualAudio.cue(name)));
sceneEvents.on('awakening:started', () => {
    voyageArchive.record('omens', STATE.omen.id);
    sceneLifecycle.updateArchiveSummary();
    ritualAudio.cue('awakening:omen');
    const copy = {
        'black-tide': 'The black tide carries no reflection.',
        'red-wake': 'A red wake follows where no boat has passed.',
        'drowned-star': 'Something green burns beneath the waves.',
        'hollow-calm': 'Even the wind is holding its breath.'
    };
    ritualPresentation.show(copy[STATE.omen.id], 4000);
});
sceneEvents.on('discovery:found', ({ id }) => {
    voyageArchive.record('notes', id);
    sceneLifecycle.updateArchiveSummary();
});
sceneEvents.on('ending:shown', () => {
    sceneLifecycle.setPaused(true, false);
    void narrator.play(STATE.witness.outcome === 'refused' ? 'ending.refused' : 'ending.witnessed', { modal: true });
});

let pillarsRiseY = 0;
collisionSystem.setPillarsActive(false);
const pillarsMaxRiseY = awakeningConfig.pillars.distance;
const CTHULHU_SCALE = worldConfig.cthulhuScale;
let compassInspectedOnce = false;
const pillarPositions = worldConfig.pillarPositions;

// ==========================================
// PRE-ALLOCATED FRAME BUFFERS (RITUAL XXV)
// ==========================================
const FRAME_BUFFERS = {
    viewMatrix: glMatrix.mat4.create(),
    waterModelMatrix: glMatrix.mat4.create(),
    compassMatrix: glMatrix.mat4.create(),
    needleMatrix: glMatrix.mat4.create(),
    shipModelMatrix: glMatrix.mat4.create(),
    pillarsMatrix: glMatrix.mat4.create(),
    cthulhuMatrix: glMatrix.mat4.create(),
    particleMatrix: glMatrix.mat4.create(),
    cameraTarget: glMatrix.vec3.create(),
    headWorld: glMatrix.vec4.create(),
    headLocal: glMatrix.vec4.fromValues(0, 1.55, 1.39, 1),
    toHead: glMatrix.vec3.create(),
    modelOrigin: glMatrix.vec4.fromValues(0, 0, 0, 1),
    transformedOrigin: glMatrix.vec4.create(),
    emitter: glMatrix.vec3.create(),
    identityMatrix: glMatrix.mat4.create(),
    translation: glMatrix.vec3.create(),
    inspectPosition: glMatrix.vec3.create(),
    fogColor: glMatrix.vec3.create()
};

// Constant per-frame operands, allocated once instead of as literals inside drawScene.
const FRAME_CONSTANTS = Object.freeze({
    calmFog: Object.freeze([0.028, 0.055, 0.07]),
    torchLightColor: Object.freeze([1.0, 0.7, 0.2]),
    idleTorchScale: Object.freeze([0.3, 0.3, 0.3]),
    compassScale: Object.freeze([0.1, 0.1, 0.1]),
    inspectCompassScale: Object.freeze([0.2, 0.2, 0.2]),
    pillarScale: Object.freeze([500.2, 500.2, 500.2]),
    omenMoments: Object.freeze({
        'black-tide': Object.freeze([10, 'The tide pulls against the wind.']),
        'red-wake': Object.freeze([17, 'A second wake crosses your own.']),
        'drowned-star': Object.freeze([22, 'A drowned star flickers below the keel.']),
        'hollow-calm': Object.freeze([31, 'For a moment, the sea becomes perfectly still.'])
    })
});

// Writes x, y, z into the shared translation scratch vector and returns it.
function frameTranslation(x, y, z) {
    const out = FRAME_BUFFERS.translation;
    out[0] = x; out[1] = y; out[2] = z;
    return out;
}

// Throttled DOM cache to eliminate layout thrashing
const DOM_CACHE = {
    torchBrightness: null,
    compassReadout: null,
    voyageHint: null,
    beaconLeft: null,
    beaconTop: null,
    beaconHidden: null,
    inspectHidden: null,
    inspectText: null,
    lanternHidden: null,
    endingHidden: null
};

window.FRAME_BUFFERS = FRAME_BUFFERS;
window.DOM_CACHE = DOM_CACHE;

// ==========================================
// SCENE CONTEXT & MODULAR SUBSYSTEMS
// ==========================================
const sceneContext = {
    STATE,
    sceneControls,
    sceneEvents,
    voyageArchive,
    comfortSettings,
    ritualAudio,
    ritualPresentation,
    collisionSystem,
    discoveries,
    navigation,
    narrator,
    ritualCycle,
    omenSystem,
    awakeningTimeline,
    get compassInspectedOnce() { return compassInspectedOnce; },
    set compassInspectedOnce(val) { compassInspectedOnce = val; },
    get pillarsRiseY() { return pillarsRiseY; },
    set pillarsRiseY(val) { pillarsRiseY = val; },
    requestScenePointerLock: () => sceneInteraction.requestPointerLock(),
    releaseScenePointerLock: () => sceneInteraction.releasePointerLock()
};

const sceneLifecycle = new window.SceneLifecycle(sceneContext);
const sceneRenderer = new window.SceneRenderer(sceneContext);
const sceneInteraction = new window.SceneInteraction(sceneContext);

sceneContext.sceneLifecycle = sceneLifecycle;
sceneContext.sceneRenderer = sceneRenderer;
sceneContext.sceneInteraction = sceneInteraction;

window.sceneLifecycle = sceneLifecycle;
window.sceneRenderer = sceneRenderer;
window.sceneInteraction = sceneInteraction;

sceneInteraction.bind();
sceneLifecycle.updateArchiveSummary();

// Audio initial volume setup
let initialVolume = 70;
try {
    const savedVolumeRaw = localStorage.getItem('ritual-volume');
    const savedVolume = Number(savedVolumeRaw);
    if (savedVolumeRaw !== null && Number.isFinite(savedVolume) && savedVolume >= 0 && savedVolume <= 100) initialVolume = savedVolume;
} catch {}
const volumeControl = document.getElementById('volume-control');
const volumeValue = document.getElementById('volume-value');
if (volumeControl) volumeControl.value = String(initialVolume);
if (volumeValue) volumeValue.textContent = String(initialVolume);
ritualAudio.setVolume(initialVolume / 100);

// ==========================================
// FORWARDING COMPATIBILITY FUNCTIONS
// ==========================================
function setScenePaused(paused, showScreen = true) { sceneLifecycle.setPaused(paused, showScreen); }
function resetScene(advanceCycle = false) { sceneLifecycle.reset(advanceCycle); }
function startAwakening() { sceneLifecycle.startAwakening(); }
function openEndingChoice() { sceneLifecycle.openEndingChoice(); }
function resolveEnding(outcome) { sceneLifecycle.resolveEnding(outcome); }
function inspectDiscovery(id) { sceneLifecycle.inspectDiscovery(id); }
function lightLantern() { sceneLifecycle.lightLantern(); }
function toggleCompassInspection() { sceneLifecycle.toggleCompassInspection(); }
function requestScenePointerLock() { sceneInteraction.requestPointerLock(); }
function releaseScenePointerLock() { sceneInteraction.releasePointerLock(); }
function reportPointerLockError() { sceneInteraction.reportPointerLockError(); }
function isInterfaceTarget(target) { return Boolean(target?.closest?.('button, input, select, textarea, summary, a, [contenteditable="true"], [role="dialog"]')); }

function toRadians(degrees) { return degrees * (Math.PI / 180); }
function rotateCamera(yawDelta, pitchDelta) { sceneRenderer.rotateCamera(yawDelta, pitchDelta); }
function updateBoatMotion() { sceneRenderer.updateBoatMotion(); }
function getWaveSettings() { return sceneRenderer.getWaveSettings(); }
function getCameraPosition() { return sceneRenderer.getCameraPosition(); }
function getTorchPosition() { return sceneRenderer.getTorchPosition(); }
function getCompassPosition() { return sceneRenderer.getCompassPosition(); }
function getFPSTorchMatrix(out) { return sceneRenderer.getFPSTorchMatrix(out); }
function getTorchLightWorldPosition() {
    STATE.vec4.transformMat4(FRAME_BUFFERS.transformedOrigin, FRAME_BUFFERS.modelOrigin, STATE.torchMatrix);
    FRAME_BUFFERS.emitter[0] = FRAME_BUFFERS.transformedOrigin[0];
    FRAME_BUFFERS.emitter[1] = FRAME_BUFFERS.transformedOrigin[1];
    FRAME_BUFFERS.emitter[2] = FRAME_BUFFERS.transformedOrigin[2];
    STATE.vec3.scaleAndAdd(FRAME_BUFFERS.emitter, FRAME_BUFFERS.emitter, STATE.cameraFront, 0.22);
    return FRAME_BUFFERS.emitter;
}
function createWaterGrid(cols, rows, size = 1) { return sceneRenderer.createWaterGrid(cols, rows, size); }
function rebuildWaterMesh(segments) { sceneRenderer.rebuildWaterMesh(segments); }
function createEffectsVAO(vertices) { return sceneRenderer.createEffectsVAO(vertices); }
function rebuildAtmosphere(particleCount) { sceneRenderer.rebuildAtmosphere(particleCount); }
function refreshTextures(quality) { return sceneRenderer.refreshTextures(quality); }
function resizeCanvas(force = false) { sceneRenderer.resizeCanvas(force); }
function getRayFromMouse(mouseX, mouseY, viewMatrix, projectionMatrix) { return sceneRenderer.getRayFromMouse(mouseX, mouseY, viewMatrix, projectionMatrix); }
function rayIntersectsSphere(rayOrigin, rayDir, sphereCenter, radius) { return sceneRenderer.rayIntersectsSphere(rayOrigin, rayDir, sphereCenter, radius); }

function isLookingAtRlyeh() {
    if (!compassInspectedOnce || STATE.compassInspectMode) return false;
    return navigation.sample(STATE.shipPosition, STATE.cameraFront, STATE.elapsedTime).canAwaken;
}

function updateNavigation() {
    const sample = navigation.sample(STATE.shipPosition, STATE.cameraFront, STATE.elapsedTime);
    const degrees = (sample.heading * 180 / Math.PI + 360) % 360;
    const readoutText = `Heading ${degrees.toFixed(0).padStart(3, '0')}° · Ruins ${sample.distance.toFixed(0)}m${sample.disturbed ? ' · Needle unstable' : ''}`;
    if (DOM_CACHE.compassReadout !== readoutText) {
        DOM_CACHE.compassReadout = readoutText;
        const readout = document.getElementById('compass-readout');
        if (readout) readout.textContent = readoutText;
    }

    const hint = navigation.guidance(sample, compassInspectedOnce, STATE.compassInspectMode, STATE.awakeningStarted, STATE.torchLit, STATE.witness.complete);
    if (DOM_CACHE.voyageHint !== hint) {
        DOM_CACHE.voyageHint = hint;
        const hintElement = document.getElementById('voyage-hint');
        if (hintElement) hintElement.textContent = hint;
    }

    const beaconHidden = STATE.awakeningStarted || Math.abs(sample.relative) > Math.PI / 3;
    const beaconLeft = `${50 + Math.max(-43, Math.min(43, sample.relative * 75))}%`;
    const beaconTop = `${Math.max(8, Math.min(90, 47 + STATE.pitch * 1.5))}%`;
    const beacon = document.getElementById('bearing-beacon');
    if (beacon) {
        if (DOM_CACHE.beaconHidden !== beaconHidden) {
            DOM_CACHE.beaconHidden = beaconHidden;
            beacon.hidden = beaconHidden;
        }
        if (!beaconHidden) {
            if (DOM_CACHE.beaconLeft !== beaconLeft) {
                DOM_CACHE.beaconLeft = beaconLeft;
                beacon.style.left = beaconLeft;
            }
            if (DOM_CACHE.beaconTop !== beaconTop) {
                DOM_CACHE.beaconTop = beaconTop;
                beacon.style.top = beaconTop;
            }
        }
    }

    const inspectHidden = STATE.awakeningStarted;
    const inspectText = STATE.compassInspectMode ? 'Lower compass · E / C' : 'Inspect compass · E';
    const inspectBtn = document.getElementById('inspect-compass');
    if (inspectBtn) {
        if (DOM_CACHE.inspectHidden !== inspectHidden) {
            DOM_CACHE.inspectHidden = inspectHidden;
            inspectBtn.hidden = inspectHidden;
        }
        if (DOM_CACHE.inspectText !== inspectText) {
            DOM_CACHE.inspectText = inspectText;
            inspectBtn.textContent = inspectText;
        }
    }

    const nearby = discoveries.nearby(STATE.shipPosition, STATE.cameraFront);
    for (const site of discoveries.sites) {
        const btn = document.getElementById(`discover-${site.id}`);
        const siteHidden = STATE.awakeningStarted || !compassInspectedOnce || !nearby.includes(site);
        if (btn && btn.hidden !== siteHidden) btn.hidden = siteHidden;
    }

    const lanternHidden = !STATE.awakeningStarted || STATE.torchLit;
    const lanternBtn = document.getElementById('light-lantern');
    if (lanternBtn && DOM_CACHE.lanternHidden !== lanternHidden) {
        DOM_CACHE.lanternHidden = lanternHidden;
        lanternBtn.hidden = lanternHidden;
    }

    const endingHidden = !STATE.awakeningTimeline.complete || STATE.witness.complete;
    const endingChoice = document.getElementById('ending-choice');
    if (endingChoice && DOM_CACHE.endingHidden !== endingHidden) {
        DOM_CACHE.endingHidden = endingHidden;
        endingChoice.hidden = endingHidden;
    }
    return sample;
}

function updateWitnessPhase(deltaSeconds, cthulhuMatrix) {
    if (!STATE.awakeningTimeline.complete || STATE.witness.complete) return;
    STATE.witness.active = true;

    STATE.vec4.transformMat4(FRAME_BUFFERS.headWorld, FRAME_BUFFERS.headLocal, cthulhuMatrix);
    const cameraPosition = getCameraPosition();
    FRAME_BUFFERS.toHead[0] = FRAME_BUFFERS.headWorld[0] - cameraPosition[0];
    FRAME_BUFFERS.toHead[1] = FRAME_BUFFERS.headWorld[1] - cameraPosition[1];
    FRAME_BUFFERS.toHead[2] = FRAME_BUFFERS.headWorld[2] - cameraPosition[2];
    STATE.vec3.normalize(FRAME_BUFFERS.toHead, FRAME_BUFFERS.toHead);

    const locked = STATE.torchLit && STATE.effects.lighting && STATE.torchLightIntensity > 0
        && window.DiscoverySystem.aligned(STATE.cameraFront, FRAME_BUFFERS.toHead);
    if (locked && !STATE.witness.locked) ritualAudio.cue('witness:locked');
    STATE.witness.locked = locked;
    if (locked) {
        STATE.witness.focus = Math.min(1, STATE.witness.focus + deltaSeconds / 4);
    } else {
        STATE.witness.focus = Math.max(0, STATE.witness.focus - deltaSeconds * 0.12);
    }

    const status = !STATE.torchLit ? 'unlit' : locked ? 'locked' : 'searching';
    ritualCycle.updateWitness(deltaSeconds, locked, STATE.torchLit);
    ritualPresentation.updateWitness(STATE.witness.focus, status);

    if (STATE.witness.focus >= 1) {
        resolveEnding('witness');
    }
}

function advanceScene(timestamp) {
    const { rawSeconds, deltaSeconds } = sceneControls.tick(timestamp, STATE.paused);
    STATE.lastFrameTime = timestamp;
    if (STATE.paused) return 0;
    STATE.elapsedTime += deltaSeconds;
    STATE.performanceMonitor?.update(rawSeconds);
    ritualCycle.update(deltaSeconds);
    ritualPresentation.update(deltaSeconds);
    updateNavigation();
    if (!compassInspectedOnce || STATE.awakeningStarted || STATE.compassInspectMode || document.getElementById('comfort-controls')?.open || isInterfaceTarget(document.activeElement)) {
        sceneControls.keys.clear();
    } else {
        const movement = sceneControls.movement(STATE.cameraFront, STATE.cameraSpeed, deltaSeconds);
        const nextPosition = discoveries.moveShip(STATE.shipPosition, movement);
        for (let axis = 0; axis < 3; axis++) STATE.shipPosition[axis] = nextPosition[axis];
    }
    return deltaSeconds;
}

window.getSceneDiagnostics = () => ({
    browser: navigator.userAgent,
    viewport: { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio },
    renderSize: { width: STATE.canvas?.width, height: STATE.canvas?.height },
    quality: STATE.quality,
    omenSeed: comfortSettings.values.seed,
    initialLoadMs: STATE.initialLoadMs ?? null,
    paused: STATE.paused,
    performance: STATE.performanceMonitor?.snapshot() ?? null,
    resources: (performance.getEntriesByType?.('resource') || [])
        .filter((entry) => entry.name.includes('/optimized/')).map((entry) => ({
            file: entry.name.split('/').slice(-2).join('/'), transferBytes: entry.transferSize, decodedBytes: entry.decodedBodySize
        }))
});

function drawScene(timestamp) {
    const gl = STATE.gl;
    resizeCanvas();
    const deltaSeconds = advanceScene(timestamp);
    if (STATE.paused) {
        requestAnimationFrame(drawScene);
        return;
    }
    STATE.cinematic.shake = Math.max(0, STATE.cinematic.shake - deltaSeconds * 0.22);
    STATE.cinematic.torchShock = Math.max(0, STATE.cinematic.torchShock - deltaSeconds * 0.38);
    if (STATE.effects.animation) STATE.awakeningTimeline.update(deltaSeconds);
    const omenMoment = FRAME_CONSTANTS.omenMoments[STATE.omen.id];
    if (!STATE.omenEventPlayed && STATE.awakeningTimeline.elapsed >= omenMoment[0]) {
        STATE.omenEventPlayed = true;
        ritualPresentation.show(omenMoment[1], 3200);
        ritualAudio.cue('awakening:omen');
        if (STATE.omen.id === 'red-wake') STATE.lightning.strike(0.7);
        if (STATE.omen.id === 'black-tide') STATE.cinematic.shake = 0.18;
    }
    if (STATE.effects.lightning) {
        const struck = STATE.lightning.update(deltaSeconds, STATE.awakeningStarted);
        if (struck) sceneEvents.emit('weather:lightning', { intensity: STATE.lightning.intensity });
    }

    // 1. Ambient & torch intensity logic
    if (STATE.torchLit && !STATE.torchControlMode) {
        STATE.ambientLight[0] = Math.max(0.025, STATE.ambientLight[0] - 0.8 * deltaSeconds);
        STATE.ambientLight[1] = Math.max(0.03, STATE.ambientLight[1] - 0.8 * deltaSeconds);
        STATE.ambientLight[2] = Math.max(0.04, STATE.ambientLight[2] - 0.8 * deltaSeconds);
        if (STATE.torchLightIntensity < STATE.maxTorchLight) {
            STATE.torchLightIntensity = Math.min(
                STATE.torchLightIntensity + 3.0 * deltaSeconds,
                STATE.maxTorchLight
            );
        }
    } else if (STATE.torchLit && STATE.torchControlMode) {
    } else if (STATE.awakeningStarted) {
        STATE.ambientLight[0] = Math.max(STATE.ambientLight[0] - 3.0 * deltaSeconds, 0.0);
        STATE.ambientLight[1] = Math.max(STATE.ambientLight[1] - 0.6 * deltaSeconds, 0.0);
        STATE.ambientLight[2] = Math.max(STATE.ambientLight[2] - 0.36 * deltaSeconds, 0.0);
    }

    // Throttled brightness DOM update
    const formattedBrightness = STATE.torchLightIntensity.toFixed(2);
    if (DOM_CACHE.torchBrightness !== formattedBrightness) {
        DOM_CACHE.torchBrightness = formattedBrightness;
        const tb = document.getElementById("torch-brightness");
        if (tb) tb.textContent = formattedBrightness;
    }

    // 2. View & camera (reusing FRAME_BUFFERS)
    updateBoatMotion();
    const cameraPosition = getCameraPosition();
    STATE.vec3.add(FRAME_BUFFERS.cameraTarget, cameraPosition, STATE.cameraFront);
    STATE.mat4.lookAt(FRAME_BUFFERS.viewMatrix, cameraPosition, FRAME_BUFFERS.cameraTarget, STATE.cameraUp);
    gl.uniformMatrix4fv(STATE.uViewLoc, false, FRAME_BUFFERS.viewMatrix);
    gl.uniform1f(STATE.uTimeLoc, STATE.elapsedTime);
    gl.uniform3fv(STATE.uCameraPosLoc, cameraPosition);
    ritualAudio.updateListener(cameraPosition, STATE.cameraFront, STATE.cameraUp);
    gl.uniform2f(STATE.uResolutionLoc, STATE.canvas.width, STATE.canvas.height);
    gl.uniform1i(STATE.uFogEnabledLoc, STATE.effects.fog ? 1 : 0);
    const omenFog = STATE.omen.fogColor;
    let fogColor = omenFog;
    if (!STATE.awakeningStarted) {
        fogColor = FRAME_BUFFERS.fogColor;
        for (let i = 0; i < 3; i++) fogColor[i] = FRAME_CONSTANTS.calmFog[i] * 0.72 + omenFog[i] * 0.28;
    }
    gl.uniform1f(STATE.uFogDensityLoc, (STATE.awakeningStarted ? 0.021 : 0.012) * STATE.omen.fogDensity);
    gl.uniform3fv(STATE.uFogColorLoc, fogColor);
    gl.uniform1i(STATE.uPostEnabledLoc, STATE.effects.post ? 1 : 0);
    gl.uniform1i(STATE.uIsParticleLoc, 0);
    gl.uniform1i(STATE.uIsEyeLoc, 0);
    gl.uniform1f(STATE.uEyeIntensityLoc, 0);
    gl.uniform1i(STATE.uIsCthulhuLoc, 0);
    gl.uniform1i(STATE.uIsShipLoc, 0);
    gl.uniform1f(STATE.uCthulhuRevealLoc, 0);
    gl.uniform1i(STATE.uIsDiscoveryLoc, 0);
    gl.uniform1i(STATE.uIsWaterLoc, 0);
    const waves = getWaveSettings();
    gl.uniform1f(STATE.uWaveHeightLoc, waves.height);
    gl.uniform1f(STATE.uWaveSpeedLoc, waves.speed);
    gl.uniform1f(STATE.uFoamThresholdLoc, oceanConfig.foamThreshold);
    const lightningIntensity = STATE.effects.lightning
        ? comfortSettings.lightningIntensity(STATE.lightning.intensity * STATE.omen.lightningGain) : 0;
    gl.uniform1f(STATE.uLightningIntensityLoc, lightningIntensity);
    gl.uniform3fv(STATE.uLightningColorLoc, STATE.omen.lightningColor);

    if (STATE.torchLit) {
        getFPSTorchMatrix(STATE.torchMatrix);
    } else {
        STATE.mat4.identity(STATE.torchMatrix);
        STATE.mat4.translate(STATE.torchMatrix, STATE.torchMatrix, frameTranslation(
            STATE.shipPosition[0] + 0.8,
            STATE.shipPosition[1] + STATE.boatMotion.bob,
            STATE.shipPosition[2] - 1.1
        ));
        STATE.mat4.rotateX(STATE.torchMatrix, STATE.torchMatrix, -Math.PI / 8);
        STATE.mat4.scale(STATE.torchMatrix, STATE.torchMatrix, FRAME_CONSTANTS.idleTorchScale);
    }

    // 4. Uniforms and clear
    gl.clearColor(
        0.0 + lightningIntensity * STATE.omen.lightningColor[0] * 0.2,
        0.035 + lightningIntensity * STATE.omen.lightningColor[1] * 0.24,
        0.075 + lightningIntensity * STATE.omen.lightningColor[2] * 0.3,
        1.0
    );
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Water (reusing FRAME_BUFFERS.waterModelMatrix)
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, STATE.waterTexture);
    gl.uniform1i(STATE.uTextureLoc, 4);
    gl.uniform1i(STATE.uUseTextureLoc, 1);
    gl.uniform1i(STATE.uUsePBRLoc, 0);
    gl.uniform1i(STATE.uIsWaterLoc, 1);
    gl.bindVertexArray(STATE.waterVAO);
    STATE.mat4.identity(FRAME_BUFFERS.waterModelMatrix);
    STATE.mat4.translate(FRAME_BUFFERS.waterModelMatrix, FRAME_BUFFERS.waterModelMatrix,
        frameTranslation(STATE.shipPosition[0], -3.5, STATE.shipPosition[2]));
    gl.uniformMatrix4fv(STATE.uModelLoc, false, FRAME_BUFFERS.waterModelMatrix);
    gl.drawElements(gl.TRIANGLES, STATE.waterIndexCount, gl.UNSIGNED_INT, 0);
    gl.uniform1i(STATE.uUseTextureLoc, 0);
    gl.uniform1i(STATE.uIsWaterLoc, 0);

    // Torch light
    const torchLightWorldPos = getTorchLightWorldPosition();
    gl.uniform1i(STATE.uTorchLitLoc, STATE.torchLit && STATE.effects.lighting ? 1 : 0);
    gl.uniform3fv(STATE.uAmbientLightLoc, STATE.ambientLight);
    gl.uniform3fv(STATE.uTorchLightPosLoc, torchLightWorldPos);
    const torchFlicker = 0.965
        + Math.sin(STATE.elapsedTime * 17.3) * 0.018
        + Math.sin(STATE.elapsedTime * 31.7) * 0.012
        // The reveal shock makes the lantern gutter once and recover (no ~12 Hz strobe: WCAG 2.3.1).
        - STATE.cinematic.torchShock * (comfortSettings.lightningScale < 1 ? 0 : 0.24);
    gl.uniform1f(
        STATE.uTorchLightIntensityLoc,
        STATE.torchLit && STATE.effects.lighting ? STATE.torchLightIntensity * torchFlicker : 0.0
    );
    gl.uniform3fv(STATE.uTorchLightColorLoc, FRAME_CONSTANTS.torchLightColor);
    gl.uniform3fv(STATE.uTorchDirectionLoc, STATE.cameraFront);

    // Awakening triggers and pillar collision activation
    if (!STATE.awakeningStarted && isLookingAtRlyeh()) {
        startAwakening();
    }
    if (STATE.awakeningStarted) {
        pillarsRiseY = STATE.awakeningTimeline.value('pillars');
        collisionSystem.setPillarsActive(pillarsRiseY > 0);
        STATE.cthulhuRiseY = STATE.awakeningTimeline.value('cthulhu');
    }

    // Torch model
    gl.uniform1i(STATE.uIsTorchLoc, 1);
    gl.uniform1i(STATE.uTorchHoveredLoc, STATE.torchHovered ? 1 : 0);
    gl.uniform1i(STATE.uIsCompassLoc, 0);
    gl.uniform1i(STATE.uCompassHoveredLoc, 0);
    gl.bindVertexArray(STATE.torchVAO);
    gl.uniformMatrix4fv(STATE.uModelLoc, false, STATE.torchMatrix);
    gl.drawElements(gl.TRIANGLES, STATE.torchIndexCount, STATE.torchIndexType, 0);
    gl.uniform1i(STATE.uIsTorchLoc, 0);

    // Compass
    if (!STATE.compassInspectMode) {
        STATE.mat4.identity(FRAME_BUFFERS.compassMatrix);
        STATE.mat4.translate(FRAME_BUFFERS.compassMatrix, FRAME_BUFFERS.compassMatrix, getCompassPosition());
        if (STATE.cinematic.compassSpin) {
            const spinAge = Math.max(0, STATE.awakeningTimeline.elapsed - 2);
            STATE.mat4.rotateY(FRAME_BUFFERS.compassMatrix, FRAME_BUFFERS.compassMatrix, spinAge * (2.8 + Math.min(spinAge, 8) * 0.16));
            STATE.mat4.rotateZ(FRAME_BUFFERS.compassMatrix, FRAME_BUFFERS.compassMatrix, Math.sin(spinAge * 4.5) * 0.08);
        }
        STATE.mat4.scale(FRAME_BUFFERS.compassMatrix, FRAME_BUFFERS.compassMatrix, FRAME_CONSTANTS.compassScale);
        gl.bindVertexArray(STATE.compassVAO);
        gl.uniformMatrix4fv(STATE.uModelLoc, false, FRAME_BUFFERS.compassMatrix);
        gl.uniform1i(STATE.uCompassHoveredLoc, STATE.compassHovered ? 1 : 0);
        gl.uniform1i(STATE.uIsCompassLoc, 1);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, STATE.compassTexture);
        gl.uniform1i(STATE.uTextureLoc, 2);
        gl.uniform1i(STATE.uUseTextureLoc, 1);
        gl.uniform1i(STATE.uUsePBRLoc, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, STATE.compassBodyEBO);
        gl.drawElements(gl.TRIANGLES, STATE.compassBodyIndexCount, STATE.compassBodyIndexType, 0);

        gl.uniform1i(STATE.uUseTextureLoc, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, STATE.compassNeedleEBO);
        STATE.mat4.copy(FRAME_BUFFERS.needleMatrix, FRAME_BUFFERS.compassMatrix);
        STATE.mat4.rotateY(FRAME_BUFFERS.needleMatrix, FRAME_BUFFERS.needleMatrix, navigation.sample(STATE.shipPosition, STATE.cameraFront, STATE.elapsedTime).needleAngle);
        gl.uniformMatrix4fv(STATE.uModelLoc, false, FRAME_BUFFERS.needleMatrix);
        gl.drawElements(gl.TRIANGLES, STATE.compassNeedleIndexCount, STATE.compassNeedleIndexType, 0);
        gl.uniform1i(STATE.uIsCompassLoc, 0);
    } else {
        STATE.mat4.identity(FRAME_BUFFERS.compassMatrix);
        const inspectPos = STATE.vec3.scaleAndAdd(FRAME_BUFFERS.inspectPosition, getCameraPosition(), STATE.cameraFront, 1.0);
        STATE.mat4.translate(FRAME_BUFFERS.compassMatrix, FRAME_BUFFERS.compassMatrix, inspectPos);
        STATE.mat4.rotateY(FRAME_BUFFERS.compassMatrix, FRAME_BUFFERS.compassMatrix, STATE.compassYaw);
        STATE.mat4.rotateX(FRAME_BUFFERS.compassMatrix, FRAME_BUFFERS.compassMatrix, -Math.PI / 2 + STATE.compassPitch);
        STATE.mat4.scale(FRAME_BUFFERS.compassMatrix, FRAME_BUFFERS.compassMatrix, FRAME_CONSTANTS.inspectCompassScale);

        gl.bindVertexArray(STATE.compassVAO);
        gl.uniformMatrix4fv(STATE.uModelLoc, false, FRAME_BUFFERS.compassMatrix);
        gl.uniform1i(STATE.uCompassHoveredLoc, 0);
        gl.uniform1i(STATE.uIsCompassLoc, 1);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, STATE.compassTexture);
        gl.uniform1i(STATE.uTextureLoc, 2);
        gl.uniform1i(STATE.uUseTextureLoc, 1);
        gl.uniform1i(STATE.uUsePBRLoc, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, STATE.compassBodyEBO);
        gl.drawElements(gl.TRIANGLES, STATE.compassBodyIndexCount, STATE.compassBodyIndexType, 0);

        gl.uniform1i(STATE.uUseTextureLoc, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, STATE.compassNeedleEBO);
        STATE.mat4.copy(FRAME_BUFFERS.needleMatrix, FRAME_BUFFERS.compassMatrix);
        const needleSample = navigation.sample(STATE.shipPosition, STATE.cameraFront, STATE.elapsedTime);
        STATE.mat4.rotateY(FRAME_BUFFERS.needleMatrix, FRAME_BUFFERS.needleMatrix, -needleSample.heading + needleSample.needleAngle);
        gl.uniformMatrix4fv(STATE.uModelLoc, false, FRAME_BUFFERS.needleMatrix);
        gl.drawElements(gl.TRIANGLES, STATE.compassNeedleIndexCount, STATE.compassNeedleIndexType, 0);
        gl.uniform1i(STATE.uIsCompassLoc, 0);
    }

    // Ship (reusing FRAME_BUFFERS.shipModelMatrix)
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, STATE.shipTexture);
    gl.uniform1i(STATE.uTextureLoc, 0);
    gl.uniform1i(STATE.uUseTextureLoc, 1);
    gl.uniform1i(STATE.uUsePBRLoc, 0);
    gl.uniform1i(STATE.uIsShipLoc, 1);
    gl.bindVertexArray(STATE.shipVAO);
    STATE.mat4.identity(FRAME_BUFFERS.shipModelMatrix);
    STATE.mat4.translate(FRAME_BUFFERS.shipModelMatrix, FRAME_BUFFERS.shipModelMatrix,
        frameTranslation(STATE.shipPosition[0], STATE.shipPosition[1] + STATE.boatMotion.bob, STATE.shipPosition[2]));
    STATE.mat4.rotateZ(FRAME_BUFFERS.shipModelMatrix, FRAME_BUFFERS.shipModelMatrix, STATE.boatMotion.roll);
    STATE.mat4.rotateX(FRAME_BUFFERS.shipModelMatrix, FRAME_BUFFERS.shipModelMatrix, STATE.boatMotion.pitch);
    STATE.mat4.rotateX(FRAME_BUFFERS.shipModelMatrix, FRAME_BUFFERS.shipModelMatrix, Math.PI / 2);
    STATE.mat4.rotateY(FRAME_BUFFERS.shipModelMatrix, FRAME_BUFFERS.shipModelMatrix, Math.PI);
    gl.uniformMatrix4fv(STATE.uModelLoc, false, FRAME_BUFFERS.shipModelMatrix);
    gl.drawElements(gl.TRIANGLES, STATE.shipIndexCount, STATE.shipIndexType, 0);
    gl.uniform1i(STATE.uIsShipLoc, 0);
    gl.uniform1i(STATE.uUseTextureLoc, 0);

    // Discoveries
    gl.bindVertexArray(STATE.discoveryVAO);
    gl.uniform1i(STATE.uIsDiscoveryLoc, 1);
    gl.uniform3fv(STATE.uStoneOriginLoc, worldConfig.stonePosition);
    gl.uniformMatrix4fv(STATE.uModelLoc, false, FRAME_BUFFERS.identityMatrix);
    gl.drawArrays(gl.TRIANGLES, 0, STATE.discoveryCount);
    gl.uniform1i(STATE.uIsDiscoveryLoc, 0);

    // Pillars (reusing FRAME_BUFFERS.pillarsMatrix)
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, STATE.pillarsTexture);
    gl.uniform1i(STATE.uTextureLoc, 1);
    gl.uniform1i(STATE.uUseTextureLoc, 1);
    gl.uniform1i(STATE.uUsePBRLoc, 0);

    for (let i = 0; i < pillarPositions.length; i++) {
        const base = pillarPositions[i];
        STATE.mat4.identity(FRAME_BUFFERS.pillarsMatrix);
        STATE.mat4.translate(FRAME_BUFFERS.pillarsMatrix, FRAME_BUFFERS.pillarsMatrix,
            frameTranslation(base[0], base[1] + pillarsRiseY, base[2]));
        STATE.mat4.scale(FRAME_BUFFERS.pillarsMatrix, FRAME_BUFFERS.pillarsMatrix, FRAME_CONSTANTS.pillarScale);
        STATE.mat4.rotateX(FRAME_BUFFERS.pillarsMatrix, FRAME_BUFFERS.pillarsMatrix, Math.PI / 2);
        STATE.mat4.rotateZ(FRAME_BUFFERS.pillarsMatrix, FRAME_BUFFERS.pillarsMatrix, Math.PI / 2);
        gl.bindVertexArray(STATE.pillarsVAO);
        gl.uniformMatrix4fv(STATE.uModelLoc, false, FRAME_BUFFERS.pillarsMatrix);
        gl.drawElements(gl.TRIANGLES, STATE.pillarsIndexCount, STATE.pillarsIndexType, 0);
    }

    // Cthulhu (reusing FRAME_BUFFERS.cthulhuMatrix)
    const CTHULHU_X = worldConfig.creatureBasePosition[0] + STATE.omen.creatureOffset[0];
    const CTHULHU_Z = worldConfig.creatureBasePosition[2] + STATE.omen.creatureOffset[1];
    const CTHULHU_INITIAL_Y = worldConfig.creatureBasePosition[1];
    STATE.mat4.identity(FRAME_BUFFERS.cthulhuMatrix);
    STATE.mat4.translate(FRAME_BUFFERS.cthulhuMatrix, FRAME_BUFFERS.cthulhuMatrix,
        frameTranslation(CTHULHU_X, STATE.cthulhuRiseY + CTHULHU_INITIAL_Y, CTHULHU_Z));
    STATE.mat4.scale(FRAME_BUFFERS.cthulhuMatrix, FRAME_BUFFERS.cthulhuMatrix,
        frameTranslation(CTHULHU_SCALE, CTHULHU_SCALE, CTHULHU_SCALE));
    // The presence sound comes from the head (model-space height 1.55).
    ritualAudio.setCreaturePosition(CTHULHU_X, STATE.cthulhuRiseY + CTHULHU_INITIAL_Y + 1.55 * CTHULHU_SCALE, CTHULHU_Z);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, STATE.cthulhuTexture);
    gl.uniform1i(STATE.uTextureLoc, 3);
    STATE.gl.activeTexture(STATE.gl.TEXTURE5);
    STATE.gl.bindTexture(STATE.gl.TEXTURE_2D, STATE.cthulhuAOTex);
    STATE.gl.uniform1i(STATE.uAOTexLoc, 5);
    STATE.gl.activeTexture(STATE.gl.TEXTURE6);
    STATE.gl.bindTexture(STATE.gl.TEXTURE_2D, STATE.cthulhuMetallicTex);
    STATE.gl.uniform1i(STATE.uMetallicTexLoc, 6);
    STATE.gl.activeTexture(STATE.gl.TEXTURE7);
    STATE.gl.bindTexture(STATE.gl.TEXTURE_2D, STATE.cthulhuRoughnessTex);
    STATE.gl.uniform1i(STATE.uRoughnessTexLoc, 7);
    gl.uniform1i(STATE.uUseTextureLoc, 1);
    const qualityAllowsPBR = qualityPresets[STATE.quality].usePBR;
    gl.uniform1i(STATE.uUsePBRLoc, STATE.effects.pbr && qualityAllowsPBR ? 1 : 0);
    gl.bindVertexArray(STATE.cthulhuVAO);
    gl.uniformMatrix4fv(STATE.uModelLoc, false, FRAME_BUFFERS.cthulhuMatrix);
    const silhouetteProgress = Math.min(1, Math.max(0, (STATE.awakeningTimeline.elapsed - 19) / 17));
    const revealProgress = Math.min(1, Math.max(0, (STATE.awakeningTimeline.elapsed - 36) / 6));
    gl.uniform1i(STATE.uIsCthulhuLoc, 1);
    gl.uniform1f(STATE.uCthulhuRevealLoc, Math.max(silhouetteProgress * 0.34, revealProgress));
    gl.drawElements(gl.TRIANGLES, STATE.cthulhuIndexCount, STATE.cthulhuIndexType, 0);
    gl.uniform1i(STATE.uIsCthulhuLoc, 0);

    // Eyes
    if (STATE.cinematic.eyes && STATE.eyeVAO) {
        const eyeAge = Math.max(0, STATE.awakeningTimeline.elapsed - 29);
        const eyeIntensity = Math.min(1, eyeAge / 2.5)
            * (0.78 + Math.sin(STATE.elapsedTime * 5.2) * 0.16 + lightningIntensity * 0.35 + STATE.witness.focus * 0.8);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        gl.depthMask(false);
        gl.uniform1i(STATE.uUseTextureLoc, 0);
        gl.uniform1i(STATE.uIsEyeLoc, 1);
        gl.uniform1f(STATE.uEyeIntensityLoc, eyeIntensity);
        gl.uniformMatrix4fv(STATE.uModelLoc, false, FRAME_BUFFERS.cthulhuMatrix);
        gl.bindVertexArray(STATE.eyeVAO);
        gl.drawArrays(gl.POINTS, 0, STATE.eyeCount);
        gl.uniform1i(STATE.uIsEyeLoc, 0);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
    }

    updateWitnessPhase(deltaSeconds, FRAME_BUFFERS.cthulhuMatrix);

    // Dust particles (reusing FRAME_BUFFERS.particleMatrix)
    if (STATE.effects.particles) {
        STATE.mat4.identity(FRAME_BUFFERS.particleMatrix);
        STATE.mat4.translate(FRAME_BUFFERS.particleMatrix, FRAME_BUFFERS.particleMatrix,
            frameTranslation(STATE.shipPosition[0], STATE.shipPosition[1] + 1.2 + STATE.boatMotion.bob, STATE.shipPosition[2]));
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        gl.uniform1i(STATE.uUseTextureLoc, 0);
        gl.uniform1i(STATE.uIsParticleLoc, 1);
        gl.uniformMatrix4fv(STATE.uModelLoc, false, FRAME_BUFFERS.particleMatrix);
        gl.bindVertexArray(STATE.particleVAO);
        gl.drawArrays(gl.POINTS, 0, STATE.particleCount);
        gl.uniform1i(STATE.uIsParticleLoc, 0);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
    }

    requestAnimationFrame(drawScene);
}

// ==========================================
// MAIN WEBGL INITIALIZATION
// ==========================================
async function main() {
    STATE.canvas = document.getElementById("glCanvas");
    STATE.canvas.addEventListener('webglcontextlost', (event) => {
        event.preventDefault();
        sceneContext.textureRequest = (sceneContext.textureRequest || 0) + 1;
        setScenePaused(true, false);
        showFatalError(new Error('The graphics context was lost. Reload to rebuild the scene.'));
    });
    STATE.gl = STATE.canvas.getContext("webgl2");
    if (!STATE.gl) throw new Error("WebGL 2 is not supported by this browser or GPU.");
    resizeCanvas();
    STATE.gl.viewport(0, 0, STATE.canvas.width, STATE.canvas.height);
    STATE.gl.clearColor(0.0, 0.1, 0.2, 1.0);
    STATE.gl.enable(STATE.gl.DEPTH_TEST);

    const [vertexSrc, fragmentSrc] = await Promise.all([
        loadShaderSource("shaders/vertex.glsl"),
        loadShaderSource("shaders/fragment.glsl")
    ]);
    const vertexShader = compileShader(STATE.gl, vertexSrc, STATE.gl.VERTEX_SHADER);
    const fragmentShader = compileShader(STATE.gl, fragmentSrc, STATE.gl.FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) return;
    STATE.program = createProgram(STATE.gl, vertexShader, fragmentShader);
    if (!STATE.program) return;
    STATE.gl.useProgram(STATE.program);

    // Attribute & Uniform locations
    STATE.aPositionLoc = STATE.gl.getAttribLocation(STATE.program, "aPosition");
    STATE.aNormalLoc = STATE.gl.getAttribLocation(STATE.program, "aNormal");
    STATE.aColorLoc = STATE.gl.getAttribLocation(STATE.program, "aColor");
    STATE.uModelLoc = STATE.gl.getUniformLocation(STATE.program, "uModel");
    STATE.uViewLoc = STATE.gl.getUniformLocation(STATE.program, "uView");
    STATE.uProjectionLoc = STATE.gl.getUniformLocation(STATE.program, "uProjection");
    // Static Gerstner chop table; WaveField also drives the boat, so drawing and motion agree.
    STATE.gl.uniform4fv(STATE.gl.getUniformLocation(STATE.program, "uChop"), window.WaveField.uniforms.chop);
    STATE.gl.uniform4fv(STATE.gl.getUniformLocation(STATE.program, "uChopShape"), window.WaveField.uniforms.shape);
    // The first resizeCanvas() ran before the program existed, so its projection upload went to a
    // null location. Upload it now; otherwise nothing is visible until the window is resized.
    resizeCanvas(true);
    STATE.uAmbientLightLoc = STATE.gl.getUniformLocation(STATE.program, "uAmbientLight");
    STATE.uTorchLitLoc = STATE.gl.getUniformLocation(STATE.program, "uTorchLit");
    STATE.uIsTorchLoc = STATE.gl.getUniformLocation(STATE.program, "uIsTorch");
    STATE.uTorchLightPosLoc = STATE.gl.getUniformLocation(STATE.program, "uTorchLightPos");
    STATE.uTorchLightIntensityLoc = STATE.gl.getUniformLocation(STATE.program, "uTorchLightIntensity");
    STATE.uTorchHoveredLoc = STATE.gl.getUniformLocation(STATE.program, "uTorchHovered");
    STATE.uTorchLightColorLoc = STATE.gl.getUniformLocation(STATE.program, "uTorchLightColor");
    STATE.uTorchDirectionLoc = STATE.gl.getUniformLocation(STATE.program, "uTorchDirection");
    STATE.uCompassHoveredLoc = STATE.gl.getUniformLocation(STATE.program, "uCompassHovered");
    STATE.uIsCompassLoc = STATE.gl.getUniformLocation(STATE.program, "uIsCompass");
    STATE.uIsShipLoc = STATE.gl.getUniformLocation(STATE.program, "uIsShip");
    STATE.uTextureLoc = STATE.gl.getUniformLocation(STATE.program, "uTexture");
    STATE.uUseTextureLoc = STATE.gl.getUniformLocation(STATE.program, "uUseTexture");
    STATE.uUsePBRLoc = STATE.gl.getUniformLocation(STATE.program, "uUsePBR");
    STATE.uAOTexLoc = STATE.gl.getUniformLocation(STATE.program, "uAOTex");
    STATE.uMetallicTexLoc = STATE.gl.getUniformLocation(STATE.program, "uMetallicTex");
    STATE.uRoughnessTexLoc = STATE.gl.getUniformLocation(STATE.program, "uRoughnessTex");
    STATE.uFogEnabledLoc = STATE.gl.getUniformLocation(STATE.program, "uFogEnabled");
    STATE.uFogDensityLoc = STATE.gl.getUniformLocation(STATE.program, "uFogDensity");
    STATE.uFogColorLoc = STATE.gl.getUniformLocation(STATE.program, "uFogColor");
    STATE.uCameraPosLoc = STATE.gl.getUniformLocation(STATE.program, "uCameraPos");
    STATE.uPostEnabledLoc = STATE.gl.getUniformLocation(STATE.program, "uPostEnabled");
    STATE.uResolutionLoc = STATE.gl.getUniformLocation(STATE.program, "uResolution");
    STATE.uTimeLoc = STATE.gl.getUniformLocation(STATE.program, "uTime");
    STATE.uIsParticleLoc = STATE.gl.getUniformLocation(STATE.program, "uIsParticle");
    STATE.uIsEyeLoc = STATE.gl.getUniformLocation(STATE.program, "uIsEye");
    STATE.uEyeIntensityLoc = STATE.gl.getUniformLocation(STATE.program, "uEyeIntensity");
    STATE.uIsWaterLoc = STATE.gl.getUniformLocation(STATE.program, "uIsWater");
    STATE.uWaveHeightLoc = STATE.gl.getUniformLocation(STATE.program, "uWaveHeight");
    STATE.uWaveSpeedLoc = STATE.gl.getUniformLocation(STATE.program, "uWaveSpeed");
    STATE.uFoamThresholdLoc = STATE.gl.getUniformLocation(STATE.program, "uFoamThreshold");
    STATE.uLightningIntensityLoc = STATE.gl.getUniformLocation(STATE.program, "uLightningIntensity");
    STATE.uLightningColorLoc = STATE.gl.getUniformLocation(STATE.program, "uLightningColor");
    STATE.uIsCthulhuLoc = STATE.gl.getUniformLocation(STATE.program, "uIsCthulhu");
    STATE.uIsDiscoveryLoc = STATE.gl.getUniformLocation(STATE.program, "uIsDiscovery");
    STATE.uStoneOriginLoc = STATE.gl.getUniformLocation(STATE.program, "uStoneOrigin");
    STATE.uCthulhuRevealLoc = STATE.gl.getUniformLocation(STATE.program, "uCthulhuReveal");

    const loadingStatus = document.getElementById("loading-status");
    if (loadingStatus) loadingStatus.textContent = "Loading models and textures in parallel";

    const [
        shipTexture, botModel, torchModel, compassTexture, compassModel,
        pillarsTexture, pillarsModel, cthulhuTexture, cthulhuAOTex,
        cthulhuMetallicTex, cthulhuRoughnessTex, cthulhuModel, waterTexture
    ] = await Promise.all([
        loadTexture(STATE.gl, window.TextureCatalog.url(STATE.quality, 'boat_wood_wet_v2.png')),
        loadOBJWithMTL('assets/models/woodBoat.obj', 'assets/models/woodBoat.mtl', true),
        loadOBJWithMTL('assets/models/torch.obj', 'assets/models/torch.mtl', false),
        loadTexture(STATE.gl, window.TextureCatalog.url(STATE.quality, 'compass_brass_v2.png')),
        loadOBJWithMTL('assets/models/compass.obj', 'assets/models/compass.mtl', true),
        loadTexture(STATE.gl, window.TextureCatalog.url(STATE.quality, 'germany010.jpg')),
        loadOBJWithMTL('assets/models/pillars.obj', 'assets/models/pillars.mtl', true),
        loadTexture(STATE.gl, window.TextureCatalog.url(STATE.quality, 'Cthulhu_2k_Base_Color.png')),
        loadTexture(STATE.gl, window.TextureCatalog.url(STATE.quality, 'Cthulhu_2k_AO.png')),
        loadTexture(STATE.gl, window.TextureCatalog.url(STATE.quality, 'Cthulhu_2k_Metallic.png')),
        loadTexture(STATE.gl, window.TextureCatalog.url(STATE.quality, 'Cthulhu_2k_Roughness.png')),
        loadOBJWithMTL('assets/models/Horror_low_subd.obj', null, true),
        loadTexture(STATE.gl, window.TextureCatalog.url(STATE.quality, 'beautiful-photo-sea-waves.jpg'))
    ]);

    Object.assign(STATE, {
        shipTexture, compassTexture, pillarsTexture, cthulhuTexture,
        cthulhuAOTex, cthulhuMetallicTex, cthulhuRoughnessTex, waterTexture
    });

    // 1) Boat
    const shipVAO = STATE.gl.createVertexArray();
    STATE.gl.bindVertexArray(shipVAO);
    const vbo = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ARRAY_BUFFER, vbo);
    STATE.gl.bufferData(STATE.gl.ARRAY_BUFFER, botModel.vertices, STATE.gl.STATIC_DRAW);
    const ebo = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ELEMENT_ARRAY_BUFFER, ebo);
    STATE.gl.bufferData(STATE.gl.ELEMENT_ARRAY_BUFFER, botModel.indices, STATE.gl.STATIC_DRAW);
    const stride = 11 * Float32Array.BYTES_PER_ELEMENT;
    STATE.gl.vertexAttribPointer(STATE.aPositionLoc, 3, STATE.gl.FLOAT, false, stride, 0);
    STATE.gl.enableVertexAttribArray(STATE.aPositionLoc);
    STATE.gl.vertexAttribPointer(STATE.aNormalLoc, 3, STATE.gl.FLOAT, false, stride, 3 * Float32Array.BYTES_PER_ELEMENT);
    STATE.gl.enableVertexAttribArray(STATE.aNormalLoc);
    STATE.gl.vertexAttribPointer(STATE.aColorLoc, 3, STATE.gl.FLOAT, false, stride, 6 * Float32Array.BYTES_PER_ELEMENT);
    STATE.gl.enableVertexAttribArray(STATE.aColorLoc);
    const texCoordLoc = STATE.gl.getAttribLocation(STATE.program, "aTexCoord");
    STATE.gl.vertexAttribPointer(texCoordLoc, 2, STATE.gl.FLOAT, false, stride, 9 * Float32Array.BYTES_PER_ELEMENT);
    STATE.gl.enableVertexAttribArray(texCoordLoc);
    STATE.shipVAO = shipVAO;
    STATE.shipIndexCount = botModel.indices.length;
    STATE.shipIndexType = botModel.indexType === 'uint32' ? STATE.gl.UNSIGNED_INT : STATE.gl.UNSIGNED_SHORT;

    // 2) Torch
    const torchVAO = STATE.gl.createVertexArray();
    STATE.gl.bindVertexArray(torchVAO);
    const torchVBO = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ARRAY_BUFFER, torchVBO);
    STATE.gl.bufferData(STATE.gl.ARRAY_BUFFER, torchModel.vertices, STATE.gl.STATIC_DRAW);
    const torchEBO = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ELEMENT_ARRAY_BUFFER, torchEBO);
    STATE.gl.bufferData(STATE.gl.ELEMENT_ARRAY_BUFFER, torchModel.indices, STATE.gl.STATIC_DRAW);
    const torchStride = 9 * Float32Array.BYTES_PER_ELEMENT;
    STATE.gl.vertexAttribPointer(STATE.aPositionLoc, 3, STATE.gl.FLOAT, false, torchStride, 0);
    STATE.gl.enableVertexAttribArray(STATE.aPositionLoc);
    STATE.gl.vertexAttribPointer(STATE.aNormalLoc, 3, STATE.gl.FLOAT, false, torchStride, 3 * Float32Array.BYTES_PER_ELEMENT);
    STATE.gl.enableVertexAttribArray(STATE.aNormalLoc);
    STATE.gl.vertexAttribPointer(STATE.aColorLoc, 3, STATE.gl.FLOAT, false, torchStride, 6 * Float32Array.BYTES_PER_ELEMENT);
    STATE.gl.enableVertexAttribArray(STATE.aColorLoc);
    STATE.torchVAO = torchVAO;
    STATE.torchIndexCount = torchModel.indices.length;
    STATE.torchIndexType = torchModel.indexType === 'uint32' ? STATE.gl.UNSIGNED_INT : STATE.gl.UNSIGNED_SHORT;

    // 3) Compass
    const compassBodyIndices = [];
    const compassNeedleIndices = [];
    for (let i = 0; i < compassModel.indices.length; i += 3) {
        const mat = compassModel.materialForFace[i];
        if (mat === "bodyMat") {
            compassBodyIndices.push(
                compassModel.indices[i],
                compassModel.indices[i + 1],
                compassModel.indices[i + 2]
            );
        } else if (mat === "needleMat") {
            compassNeedleIndices.push(
                compassModel.indices[i],
                compassModel.indices[i + 1],
                compassModel.indices[i + 2]
            );
        }
    }
    STATE.compassBodyIndices = makeIndexArray(compassBodyIndices);
    STATE.compassNeedleIndices = makeIndexArray(compassNeedleIndices);

    const compassVAO = STATE.gl.createVertexArray();
    STATE.gl.bindVertexArray(compassVAO);
    const compassVBO = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ARRAY_BUFFER, compassVBO);
    STATE.gl.bufferData(STATE.gl.ARRAY_BUFFER, compassModel.vertices, STATE.gl.STATIC_DRAW);

    const compassBodyEBO = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ELEMENT_ARRAY_BUFFER, compassBodyEBO);
    STATE.gl.bufferData(STATE.gl.ELEMENT_ARRAY_BUFFER, STATE.compassBodyIndices, STATE.gl.STATIC_DRAW);

    const compassNeedleEBO = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ELEMENT_ARRAY_BUFFER, compassNeedleEBO);
    STATE.gl.bufferData(STATE.gl.ELEMENT_ARRAY_BUFFER, STATE.compassNeedleIndices, STATE.gl.STATIC_DRAW);

    const compassStride = 11 * Float32Array.BYTES_PER_ELEMENT;
    STATE.gl.vertexAttribPointer(STATE.aPositionLoc, 3, STATE.gl.FLOAT, false, compassStride, 0);
    STATE.gl.enableVertexAttribArray(STATE.aPositionLoc);
    STATE.gl.vertexAttribPointer(STATE.aNormalLoc, 3, STATE.gl.FLOAT, false, compassStride, 3 * Float32Array.BYTES_PER_ELEMENT);
    STATE.gl.enableVertexAttribArray(STATE.aNormalLoc);
    STATE.gl.vertexAttribPointer(STATE.aColorLoc, 3, STATE.gl.FLOAT, false, compassStride, 6 * Float32Array.BYTES_PER_ELEMENT);
    STATE.gl.enableVertexAttribArray(STATE.aColorLoc);
    STATE.gl.vertexAttribPointer(texCoordLoc, 2, STATE.gl.FLOAT, false, compassStride, 9 * Float32Array.BYTES_PER_ELEMENT);
    STATE.gl.enableVertexAttribArray(texCoordLoc);

    STATE.compassVAO = compassVAO;
    STATE.compassBodyEBO = compassBodyEBO;
    STATE.compassNeedleEBO = compassNeedleEBO;
    STATE.compassBodyIndexCount = STATE.compassBodyIndices.length;
    STATE.compassNeedleIndexCount = STATE.compassNeedleIndices.length;
    STATE.compassBodyIndexType = STATE.compassBodyIndices instanceof Uint32Array ? STATE.gl.UNSIGNED_INT : STATE.gl.UNSIGNED_SHORT;
    STATE.compassNeedleIndexType = STATE.compassNeedleIndices instanceof Uint32Array ? STATE.gl.UNSIGNED_INT : STATE.gl.UNSIGNED_SHORT;

    // 4) Pillars
    const pillarsVAO = STATE.gl.createVertexArray();
    STATE.gl.bindVertexArray(pillarsVAO);
    const pillarsVBO = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ARRAY_BUFFER, pillarsVBO);
    STATE.gl.bufferData(STATE.gl.ARRAY_BUFFER, pillarsModel.vertices, STATE.gl.STATIC_DRAW);
    const pillarsEBO = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ELEMENT_ARRAY_BUFFER, pillarsEBO);
    STATE.gl.bufferData(STATE.gl.ELEMENT_ARRAY_BUFFER, pillarsModel.indices, STATE.gl.STATIC_DRAW);
    const pillarsStride = 11 * Float32Array.BYTES_PER_ELEMENT;
    STATE.gl.vertexAttribPointer(STATE.aPositionLoc, 3, STATE.gl.FLOAT, false, pillarsStride, 0);
    STATE.gl.enableVertexAttribArray(STATE.aPositionLoc);
    STATE.gl.vertexAttribPointer(STATE.aNormalLoc, 3, STATE.gl.FLOAT, false, pillarsStride, 3 * Float32Array.BYTES_PER_ELEMENT);
    STATE.gl.enableVertexAttribArray(STATE.aNormalLoc);
    STATE.gl.vertexAttribPointer(STATE.aColorLoc, 3, STATE.gl.FLOAT, false, pillarsStride, 6 * Float32Array.BYTES_PER_ELEMENT);
    STATE.gl.enableVertexAttribArray(STATE.aColorLoc);
    STATE.gl.vertexAttribPointer(texCoordLoc, 2, STATE.gl.FLOAT, false, pillarsStride, 9 * Float32Array.BYTES_PER_ELEMENT);
    STATE.gl.enableVertexAttribArray(texCoordLoc);
    STATE.pillarsVAO = pillarsVAO;
    STATE.pillarsIndexCount = pillarsModel.indices.length;
    STATE.pillarsIndexType = pillarsModel.indexType === 'uint32' ? STATE.gl.UNSIGNED_INT : STATE.gl.UNSIGNED_SHORT;

    // 5) Cthulhu
    const cthulhuVAO = STATE.gl.createVertexArray();
    STATE.gl.bindVertexArray(cthulhuVAO);
    const cthulhuVBO = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ARRAY_BUFFER, cthulhuVBO);
    STATE.gl.bufferData(STATE.gl.ARRAY_BUFFER, cthulhuModel.vertices, STATE.gl.STATIC_DRAW);
    const cthulhuEBO = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ELEMENT_ARRAY_BUFFER, cthulhuEBO);
    STATE.gl.bufferData(STATE.gl.ELEMENT_ARRAY_BUFFER, cthulhuModel.indices, STATE.gl.STATIC_DRAW);
    const cthulhuStride = 11 * Float32Array.BYTES_PER_ELEMENT;
    STATE.gl.vertexAttribPointer(STATE.aPositionLoc, 3, STATE.gl.FLOAT, false, cthulhuStride, 0);
    STATE.gl.enableVertexAttribArray(STATE.aPositionLoc);
    STATE.gl.vertexAttribPointer(STATE.aNormalLoc, 3, STATE.gl.FLOAT, false, cthulhuStride, 3 * Float32Array.BYTES_PER_ELEMENT);
    STATE.gl.enableVertexAttribArray(STATE.aNormalLoc);
    STATE.gl.vertexAttribPointer(STATE.aColorLoc, 3, STATE.gl.FLOAT, false, cthulhuStride, 6 * Float32Array.BYTES_PER_ELEMENT);
    STATE.gl.enableVertexAttribArray(STATE.aColorLoc);
    STATE.gl.vertexAttribPointer(texCoordLoc, 2, STATE.gl.FLOAT, false, cthulhuStride, 9 * Float32Array.BYTES_PER_ELEMENT);
    STATE.gl.enableVertexAttribArray(texCoordLoc);
    STATE.cthulhuVAO = cthulhuVAO;
    STATE.cthulhuIndexCount = cthulhuModel.indices.length;
    STATE.cthulhuIndexType = cthulhuModel.indexType === 'uint32' ? STATE.gl.UNSIGNED_INT : STATE.gl.UNSIGNED_SHORT;

    // Water & atmosphere
    const currentPreset = qualityPresets[STATE.quality];
    rebuildWaterMesh(currentPreset.waterSegments);
    rebuildAtmosphere(currentPreset.particles);

    const eyeEffect = createEffectsVAO(window.EnvironmentEffects.createEyePoints());
    STATE.eyeVAO = eyeEffect.vao;
    STATE.eyeVBO = eyeEffect.buffer;
    STATE.eyeCount = eyeEffect.count;

    const discoveryEffect = createEffectsVAO(window.EnvironmentEffects.createDiscoveryMesh(discoveries.sites));
    STATE.discoveryVAO = discoveryEffect.vao;
    STATE.discoveryVBO = discoveryEffect.buffer;
    STATE.discoveryCount = discoveryEffect.count;

    STATE.performanceMonitor = new window.PerformanceMonitor(document.getElementById("performance-stats"));
    document.getElementById("loading-screen").hidden = true;
    requestAnimationFrame(drawScene);
}

function showFatalError(error) {
    document.getElementById('launch-screen').hidden = true;
    document.getElementById("loading-screen").hidden = true;
    const panel = document.getElementById("fatal-error");
    if (panel) panel.hidden = false;
    const msg = document.getElementById('fatal-message');
    if (msg) msg.textContent = `The scene could not be started.\n${error.stack || error.message}`;
}

// Clean test access
window.STATE = STATE;
window.createSceneRuntime = () => sceneContext;

// BOOTSTRAP
let starting = false;
document.getElementById('start-scene')?.addEventListener('click', () => {
    if (starting) return;
    starting = true;
    STATE.paused = false;
    sceneControls.clear();
    ritualAudio.setPaused(false);
    const pauseScreen = document.getElementById('pause-screen');
    if (pauseScreen) pauseScreen.hidden = true;
    const quality = document.getElementById('launch-quality')?.value || defaultQuality;
    STATE.quality = qualityPresets[quality] ? quality : defaultQuality;
    const debugQuality = document.getElementById('debug-quality');
    if (debugQuality) debugQuality.value = STATE.quality;
    document.getElementById('launch-screen').hidden = true;
    document.getElementById('loading-screen').hidden = false;
    STATE.loadStartedAt = performance.now();
    main().then(() => {
        STATE.initialLoadMs = performance.now() - STATE.loadStartedAt;
        STATE.canvas?.focus();
    }).catch(showFatalError);
});
