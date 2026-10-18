const { loadOBJWithMTL, loadTexture, loadShaderSource, compileShader, createProgram, makeIndexArray } = window.AssetLoader;
const {
    defaultQuality, qualityPresets, camera: cameraConfig,
    awakening: awakeningConfig, torch: torchConfig, ocean: oceanConfig
} = window.GameConfig;
const sceneEvents = new window.SceneRuntime.EventBus();
const sceneControls = new window.SceneControls();
const comfortSettings = new window.ComfortSettings();
const navigation = new window.VoyageNavigation();
const ritualAudio = new window.RitualAudioSystem();
const ritualPresentation = new window.RitualPresentation(sceneEvents);
const ritualCycle = new window.RitualCycle(sceneEvents);
const omenSystem = new window.OmenSystem(sceneEvents, comfortSettings.values.seed);
const initialOmen = omenSystem.beginCycle(ritualCycle.cycle);
ritualCycle.setOmen(initialOmen.label);
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
    shipPosition: glMatrix.vec3.fromValues(10, 0, 60),
    shipVAO: null,
    shipIndexCount: 0,
    cameraFront: glMatrix.vec3.fromValues(0, 0, -1),
    cameraUp: glMatrix.vec3.fromValues(0, 1, 0),
    cameraSpeed: 9, // World units per active second.
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
    compassYaw: 0,     // Yaw (left/right)
    compassPitch: 0,   // Pitch (up/down)
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
    witness: { active: false, focus: 0, complete: false },
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
sceneEvents.on('timeline:complete', () => { STATE.witness.active = true; });

const soundToggle = document.getElementById('sound-toggle');
const volumeControl = document.getElementById('volume-control');
const volumeValue = document.getElementById('volume-value');
let initialVolume = 70;
try {
    const savedVolumeRaw = localStorage.getItem('ritual-volume');
    const savedVolume = Number(savedVolumeRaw);
    if (savedVolumeRaw !== null && Number.isFinite(savedVolume) && savedVolume >= 0 && savedVolume <= 100) initialVolume = savedVolume;
} catch {
    // Storage is optional; audio controls still work for the current session.
}
volumeControl.value = String(initialVolume);
volumeValue.textContent = String(initialVolume);
ritualAudio.setVolume(initialVolume / 100);
ritualAudio.onStateChange = ({ enabled, muted, volume }) => {
    const percentage = Math.round(volume * 100);
    soundToggle.textContent = percentage === 0 ? 'Sound: silent' : enabled && !muted ? 'Sound: awake' : 'Sound: dormant';
    soundToggle.setAttribute('aria-pressed', String(enabled && !muted && percentage > 0));
    volumeValue.textContent = String(percentage);
};
soundToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    ritualAudio.toggle();
});
volumeControl.addEventListener('input', () => {
    const percentage = Number(volumeControl.value);
    ritualAudio.setVolume(percentage / 100);
    try { localStorage.setItem('ritual-volume', String(percentage)); } catch { /* optional */ }
});
document.getElementById('ending-restart').addEventListener('click', () => {
    resetScene(true);
    requestScenePointerLock();
});
document.getElementById('ending-continue').addEventListener('click', () => {
    ritualPresentation.dismissEnding();
    setScenePaused(false);
    requestScenePointerLock();
});
document.getElementById('pause-toggle').addEventListener('click', () => setScenePaused(true));
document.getElementById('pause-resume').addEventListener('click', () => {
    setScenePaused(false);
    requestScenePointerLock();
});
sceneEvents.on('ending:shown', () => setScenePaused(true, false));

function isInterfaceTarget(target) {
    return Boolean(target?.closest?.('button, input, select, textarea, summary, a, [contenteditable="true"], [role="dialog"]'));
}

function releaseScenePointerLock() {
    if (document.pointerLockElement === STATE.canvas) document.exitPointerLock();
}

function reportPointerLockError() {
    const status = document.getElementById('input-status');
    status.textContent = 'Mouse capture was unavailable. Click the scene to try again.';
    status.hidden = false;
}

function requestScenePointerLock() {
    if (!STATE.canvas || STATE.paused) return;
    STATE.canvas.focus();
    if (document.pointerLockElement === STATE.canvas) return;
    try {
        if (!STATE.canvas.requestPointerLock) return reportPointerLockError();
        const request = STATE.canvas.requestPointerLock();
        request?.catch(reportPointerLockError);
    } catch {
        reportPointerLockError();
    }
}

function setScenePaused(paused, showScreen = true) {
    if (!paused && (document.hidden || !ritualPresentation.ending.hidden)) return;
    STATE.paused = paused;
    sceneControls.clear();
    STATE.firstMouse = true;
    ritualAudio.setPaused(paused);
    document.getElementById('pause-screen').hidden = !paused || !showScreen;
    if (paused) {
        document.getElementById('debug-panel').hidden = true;
        releaseScenePointerLock();
        if (showScreen) document.getElementById('pause-resume').focus();
    }
}

window.addEventListener('blur', () => {
    if (STATE.canvas && ritualPresentation.ending.hidden) setScenePaused(true);
    else sceneControls.clear();
});
document.addEventListener('visibilitychange', () => {
    if (document.hidden) setScenePaused(true, ritualPresentation.ending.hidden);
});
document.addEventListener('focusin', (event) => {
    if (isInterfaceTarget(event.target)) sceneControls.keys.clear();
});
window.addEventListener('keyup', (event) => sceneControls.keys.delete(event.key.toLowerCase()));
document.addEventListener('pointerlockerror', reportPointerLockError);
document.getElementById('inspect-compass').addEventListener('click', () => {
    toggleCompassInspection();
    STATE.canvas?.focus();
});

function toggleCompassInspection() {
    if (STATE.paused || STATE.awakeningStarted) return;
    sceneControls.keys.clear();
    STATE.compassInspectMode = !STATE.compassInspectMode;
    STATE.compassYaw = 0;
    STATE.compassPitch = 0;
    if (STATE.compassInspectMode) {
        window.hideCompassWarning?.();
        sceneEvents.emit('interaction:compass');
    } else compassInspectedOnce = true;
}

function rotateCamera(yawDelta, pitchDelta) {
    STATE.yaw += yawDelta;
    STATE.pitch = Math.max(-89, Math.min(89, STATE.pitch + pitchDelta));
    const yaw = toRadians(STATE.yaw), pitch = toRadians(STATE.pitch);
    STATE.cameraFront = STATE.vec3.fromValues(Math.cos(yaw) * Math.cos(pitch), Math.sin(pitch), Math.sin(yaw) * Math.cos(pitch));
    const right = STATE.vec3.fromValues(-Math.sin(yaw), 0, Math.cos(yaw));
    STATE.cameraUp = STATE.vec3.fromValues(-right[2] * STATE.cameraFront[1], Math.cos(pitch), right[0] * STATE.cameraFront[1]);
}

function updateNavigation() {
    const sample = navigation.sample(STATE.shipPosition, STATE.cameraFront, STATE.elapsedTime);
    const degrees = (sample.heading * 180 / Math.PI + 360) % 360;
    document.getElementById('compass-readout').textContent = `Heading ${degrees.toFixed(0).padStart(3, '0')}° · Ruins ${sample.distance.toFixed(0)}m${sample.disturbed ? ' · Needle unstable' : ''}`;
    const hint = navigation.guidance(sample, compassInspectedOnce, STATE.compassInspectMode, STATE.awakeningStarted, STATE.torchLit, STATE.witness.complete);
    const hintElement = document.getElementById('voyage-hint');
    if (hintElement.textContent !== hint) hintElement.textContent = hint;
    const beacon = document.getElementById('bearing-beacon');
    beacon.hidden = STATE.awakeningStarted || Math.abs(sample.relative) > Math.PI / 3;
    beacon.style.left = `${50 + Math.max(-43, Math.min(43, sample.relative * 75))}%`;
    beacon.style.top = `${Math.max(8, Math.min(90, 47 + STATE.pitch * 1.5))}%`;
    document.getElementById('inspect-compass').hidden = STATE.awakeningStarted;
    document.getElementById('inspect-compass').textContent = STATE.compassInspectMode ? 'Lower compass · E / C' : 'Inspect compass · E';
    return sample;
}
for (const [id, key] of Object.entries({ 'comfort-system': 'followSystem', 'comfort-boat': 'reduceBoat',
    'comfort-shake': 'reduceShake', 'comfort-lightning': 'reduceLightning' })) {
    const input = document.getElementById(id);
    input.checked = comfortSettings.values[key];
    input.addEventListener('change', () => comfortSettings.set(key, input.checked));
}
const seedInput = document.getElementById('omen-seed');
seedInput.value = String(comfortSettings.values.seed);
document.getElementById('omen-seed-apply').addEventListener('click', () => {
    if (seedInput.value.trim() === '' || !comfortSettings.set('seed', Number(seedInput.value))) {
        seedInput.setCustomValidity('Enter a whole number between 0 and 4294967295.');
        seedInput.reportValidity();
        return;
    }
    seedInput.setCustomValidity('');
    omenSystem.setSeed(comfortSettings.values.seed);
    document.getElementById('comfort-controls').open = false;
    resetScene();
});
document.getElementById('comfort-controls').addEventListener('toggle', (event) => {
    sceneControls.keys.clear();
    if (event.target.open) releaseScenePointerLock();
});
// Add right after STATE:
let pillarsRiseY = 0;
// Water Plane (2D Quad) - Position, Normal, Color, UV
//-------------------------------------------------------------------------------------------------------//
const pillarsMaxRiseY = awakeningConfig.pillars.distance;
const CTHULHU_SCALE = 25;
let compassInspectedOnce = false;

// Pillar positions (parallel and passable by the boat)
const pillarPositions = [
    [-50, 0, -30],
    [0, 0, -30],
    [50, 0, -30]
    // (Adjust spacing and count as needed)
];

function createWaterGrid(cols, rows, size = 1) {
    // cols, rows: number of segments (e.g. 200, 200)
    // size: square size (e.g. 2)
    const positions = [];
    const normals = [];
    const colors = [];
    const uvs = [];
    const indices = [];
    const HALF_X = (cols * size) / 2;
    const HALF_Z = (rows * size) / 2;
    for (let i = 0; i <= rows; i++) {
        for (let j = 0; j <= cols; j++) {
            const x = j * size - HALF_X; // X centered
            const z = i * size - HALF_Z; // Z centered
            positions.push(x, 0, z);
            normals.push(0, 1, 0);
            colors.push(0.15, 0.23, 0.35);
            uvs.push(j / cols, i / rows);
        }
    }
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            const a = i * (cols + 1) + j;
            const b = a + 1;
            const c = a + (cols + 1);
            const d = c + 1;
            indices.push(a, c, b);
            indices.push(b, c, d);
        }
    }
    const vertices = [];
    for (let i = 0; i < positions.length / 3; i++) {
        vertices.push(
            positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2],
            normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2],
            colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2],
            uvs[i * 2], uvs[i * 2 + 1]
        );
    }
    return {
        vertices: new Float32Array(vertices),
        indices: new Uint32Array(indices)
    };
}

function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

function updateBoatMotion() {
    if (!STATE.effects.boatMotion || !STATE.effects.water || !comfortSettings.boatMotionEnabled) {
        STATE.boatMotion = { bob: 0, roll: 0, pitch: 0 };
        return;
    }
    const time = STATE.elapsedTime * oceanConfig.waveSpeed * STATE.omen.waveSpeed;
    const wave = Math.sin(time) * 0.48
        + Math.sin(-time * 0.73) * 0.32
        + Math.sin(time * 0.46) * 0.20;
    STATE.boatMotion.bob = wave * oceanConfig.waveHeight * STATE.omen.waveHeight;
    STATE.boatMotion.roll = Math.sin(time * 0.73 + 0.8) * 0.035;
    STATE.boatMotion.pitch = Math.sin(time * 0.91) * 0.022;
}

function getCameraPosition() {
    const cameraPosition = STATE.vec3.clone(STATE.shipPosition);
    cameraPosition[1] += 1.2 + STATE.boatMotion.bob * 0.62;
    cameraPosition[2] += 0.3;
    if (comfortSettings.cameraShakeEnabled && STATE.cinematic.shake > 0.001) {
        const shake = STATE.cinematic.shake;
        cameraPosition[0] += Math.sin(STATE.elapsedTime * 31.0) * shake * 0.09;
        cameraPosition[1] += Math.sin(STATE.elapsedTime * 43.0 + 0.7) * shake * 0.055;
        cameraPosition[2] += Math.cos(STATE.elapsedTime * 37.0) * shake * 0.045;
    }
    return cameraPosition;
}

// FPS torch: small torch with fixed offset relative to camera
function getTorchPosition() {
    if (STATE.torchLit) {
        // FPS torch: offset from camera (right-bottom/middle)
        const forwardDist = 1.2;
        const rightDist = 0.5;
        const downDist = -0.4;

        const cameraPos = getCameraPosition();

        const front = STATE.vec3.clone(STATE.cameraFront);
        STATE.vec3.normalize(front, front);

        const worldUp = [0, 1, 0];
        const right = STATE.vec3.create();
        STATE.vec3.cross(right, front, worldUp);
        STATE.vec3.normalize(right, right);

        const up = STATE.vec3.create();
        STATE.vec3.cross(up, right, front);
        STATE.vec3.normalize(up, up);

        let torchPos = STATE.vec3.clone(cameraPos);
        STATE.vec3.scaleAndAdd(torchPos, torchPos, front, forwardDist);
        STATE.vec3.scaleAndAdd(torchPos, torchPos, right, rightDist);
        STATE.vec3.scaleAndAdd(torchPos, torchPos, up, downDist);

        return torchPos;
    } else {
        // Static torch: standing upright on the boat (same as in drawScene)
        return [
            STATE.shipPosition[0] + 0.8, // X
            STATE.shipPosition[1] + STATE.boatMotion.bob,
            STATE.shipPosition[2] - 1.2 // Z
        ];
    }
}

// Mouse/keyboard events: camera and torch hover
window.addEventListener("mousemove", (event) => {
    if (STATE.paused || document.getElementById('comfort-controls').open || document.pointerLockElement !== STATE.canvas) return;

    // Skip first mouse move after pointer lock (avoid camera jump)
    if (STATE.firstMouse) {
        STATE.firstMouse = false;
        return;
    }

    // Camera rotation
    let offsetX = event.movementX * STATE.sensitivity;
    let offsetY = -event.movementY * STATE.sensitivity;

    STATE.yaw += offsetX;
    STATE.pitch += offsetY;
    if (STATE.pitch > 89.0) STATE.pitch = 89.0;
    if (STATE.pitch < -89.0) STATE.pitch = -89.0;

    const front = STATE.vec3.create();
    front[0] = Math.cos(toRadians(STATE.yaw)) * Math.cos(toRadians(STATE.pitch));
    front[1] = Math.sin(toRadians(STATE.pitch));
    front[2] = Math.sin(toRadians(STATE.yaw)) * Math.cos(toRadians(STATE.pitch));
    STATE.vec3.normalize(STATE.cameraFront, front);

    // Update right and up vectors for FPS camera
    const right = STATE.vec3.create();
    STATE.vec3.cross(right, STATE.cameraFront, [0, 1, 0]);
    STATE.vec3.normalize(right, right);

    const up = STATE.vec3.create();
    STATE.vec3.cross(up, right, STATE.cameraFront);
    STATE.vec3.normalize(up, up);
    STATE.cameraUp = up;

    // --- Compass Hover ---
    if (!STATE.compassInspectMode) {
        const rect = STATE.canvas.getBoundingClientRect();
        const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Camera setup
        const viewMatrix = STATE.mat4.create();
        const cameraPosition = getCameraPosition();
        const target = STATE.vec3.create();
        STATE.vec3.add(target, cameraPosition, STATE.cameraFront);
        STATE.mat4.lookAt(viewMatrix, cameraPosition, target, STATE.cameraUp);

        const projectionMatrix = STATE.mat4.create();
        STATE.mat4.perspective(projectionMatrix, cameraConfig.fov, STATE.canvas.width / STATE.canvas.height, cameraConfig.near, cameraConfig.far);

        const ray = getRayFromMouse(mouseX, mouseY, viewMatrix, projectionMatrix);

        // Compute compass center position
        const compassPos = getCompassPosition();
        STATE.compassHovered = rayIntersectsSphere(ray.origin, ray.direction, compassPos, 0.22);
    } else {
        STATE.compassHovered = false;
    }

    // --- Torch Hover (a highlighted object must always be actionable) ---
    if (STATE.awakeningStarted && !STATE.torchLit) {
        const rect = STATE.canvas.getBoundingClientRect();
        const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        const viewMatrix = STATE.mat4.create();
        const cameraPosition = getCameraPosition();
        cameraPosition[2] += 1.2;
        const target = STATE.vec3.create();
        STATE.vec3.add(target, cameraPosition, STATE.cameraFront);
        STATE.mat4.lookAt(viewMatrix, cameraPosition, target, STATE.cameraUp);

        const projectionMatrix = STATE.mat4.create();
        STATE.mat4.perspective(projectionMatrix, cameraConfig.fov, STATE.canvas.width / STATE.canvas.height, cameraConfig.near, cameraConfig.far);

        const ray = getRayFromMouse(mouseX, mouseY, viewMatrix, projectionMatrix);
        const pickPos = [
            STATE.shipPosition[0] + 0.8,
            STATE.shipPosition[1] + STATE.boatMotion.bob,
            STATE.shipPosition[2] - 1.2
        ];
        STATE.torchHovered = rayIntersectsSphere(ray.origin, ray.direction, pickPos, 0.6);
    } else {
        STATE.torchHovered = false;
    }
});

//--------------------------------------------------------------------------------------------------------------------------------//
// 4. MOUSE SCROLL: Adjust torch brightness
window.addEventListener('wheel', (e) => {
    if (STATE.paused || isInterfaceTarget(e.target)) return;
    if (STATE.torchLit && STATE.torchControlMode) {
        STATE.torchLightIntensity += (e.deltaY < 0 ? 0.25 : -0.25);
        STATE.torchLightIntensity = Math.max(STATE.minTorch, Math.min(STATE.maxTorch, STATE.torchLightIntensity));
        document.getElementById("torch-brightness").textContent = STATE.torchLightIntensity.toFixed(2);
    }
});

window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    const modal = !document.getElementById('pause-screen').hidden
        ? document.getElementById('pause-screen') : !ritualPresentation.ending.hidden ? ritualPresentation.ending : null;
    if (modal && key === 'tab') {
        const buttons = [...modal.querySelectorAll('button')];
        const index = buttons.indexOf(document.activeElement);
        buttons[(index + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
        e.preventDefault();
        return;
    }
    if (key === 'p' && !e.repeat && (!isInterfaceTarget(e.target) || e.target.id === 'pause-resume')) {
        setScenePaused(!STATE.paused);
        if (!STATE.paused) requestScenePointerLock();
        return;
    }
    if (isInterfaceTarget(e.target) && !(STATE.paused && key === 'r' && e.target.id === 'pause-resume')) return;
    if (e.key.toLowerCase() === 'r') {
        if (!e.repeat) resetScene();
        return;
    }
    if (STATE.paused) return;

    if (key === 'e' && !e.repeat) { toggleCompassInspection(); return; }
    if (!STATE.compassInspectMode && key.startsWith('arrow')) {
        rotateCamera(key === 'arrowleft' ? -4 : key === 'arrowright' ? 4 : 0,
            key === 'arrowup' ? 3 : key === 'arrowdown' ? -3 : 0);
        e.preventDefault();
        return;
    }

    if (e.key.toLowerCase() === 'n') {
        if (!e.repeat) ritualAudio.toggle();
        return;
    }

    if (STATE.compassInspectMode) {
        // Rotate with WASD or arrow keys
        if (e.key === "ArrowLeft" || e.key === "a") {
            STATE.compassYaw -= 0.08;
        } else if (e.key === "ArrowRight" || e.key === "d") {
            STATE.compassYaw += 0.08;
        } else if (e.key === "ArrowUp" || e.key === "w") {
            STATE.compassPitch = Math.max(-Math.PI / 2, STATE.compassPitch - 0.08);
        } else if (e.key === "ArrowDown" || e.key === "s") {
            STATE.compassPitch = Math.min(Math.PI / 2, STATE.compassPitch + 0.08);
        } else if (e.key === "c" || e.key === "C") {
            STATE.compassInspectMode = false;
            STATE.compassYaw = 0;
            STATE.compassPitch = 0;
            compassInspectedOnce = true;
        }
        // Block other keys
        e.preventDefault();
        return;
    }

    // Toggle FPS torch mode with "M"
    if (e.key.toLowerCase() === "m" && STATE.torchLit && !e.repeat) {
        STATE.torchControlMode = !STATE.torchControlMode;
        document.getElementById("torch-mode").textContent = STATE.torchControlMode ? "ON" : "OFF";
        return;
    }

    if (e.key.toLowerCase() === 'h') {
        // The controls guide is owned by index.html's single H-key handler.
        return;
    }

    if (!compassInspectedOnce || STATE.awakeningStarted) return;
    if (['w', 'a', 's', 'd'].includes(key)) {
        sceneControls.keys.add(key);
        e.preventDefault();
    }

});

document.addEventListener("pointerlockchange", () => {
    sceneControls.keys.clear();
    STATE.firstMouse = true;
    if (document.pointerLockElement === STATE.canvas) document.getElementById('input-status').hidden = true;
});

window.addEventListener('scene:reset', () => resetScene());
window.addEventListener('scene:awaken', startAwakening);
window.addEventListener('scene:quality', (event) => {
    const quality = event.detail.quality;
    if (!qualityPresets[quality]) return;
    STATE.quality = quality;
    if (STATE.gl) {
        rebuildWaterMesh(qualityPresets[quality].waterSegments);
        rebuildAtmosphere(qualityPresets[quality].particles);
    }
    resizeCanvas(true);
    sceneEvents.emit('quality:changed', { quality, preset: qualityPresets[quality] });
});
window.addEventListener('scene:effect', (event) => {
    if (event.detail.effect in STATE.effects) {
        STATE.effects[event.detail.effect] = event.detail.enabled;
        if (event.detail.effect === 'post') {
            document.body.classList.toggle('post-disabled', !event.detail.enabled);
        }
        sceneEvents.emit('effect:changed', event.detail);
    }
});

// =====================
// MAIN
// =====================
async function main() {
    STATE.canvas = document.getElementById("glCanvas");
    STATE.gl = STATE.canvas.getContext("webgl2");
    if (!STATE.gl) throw new Error("WebGL 2 is not supported by this browser or GPU.");
    resizeCanvas();
    STATE.gl.viewport(0, 0, STATE.canvas.width, STATE.canvas.height);
    STATE.gl.clearColor(0.0, 0.1, 0.2, 1.0);
    STATE.gl.enable(STATE.gl.DEPTH_TEST);

    // Shader kaynaklarını yükle
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

    // Uniform locations
    STATE.aPositionLoc = STATE.gl.getAttribLocation(STATE.program, "aPosition");
    STATE.aNormalLoc = STATE.gl.getAttribLocation(STATE.program, "aNormal");
    STATE.aColorLoc = STATE.gl.getAttribLocation(STATE.program, "aColor");
    STATE.uModelLoc = STATE.gl.getUniformLocation(STATE.program, "uModel");
    STATE.uViewLoc = STATE.gl.getUniformLocation(STATE.program, "uView");
    STATE.uProjectionLoc = STATE.gl.getUniformLocation(STATE.program, "uProjection");
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
    STATE.uCthulhuRevealLoc = STATE.gl.getUniformLocation(STATE.program, "uCthulhuReveal");

    document.getElementById("loading-status").textContent = "Loading models and textures in parallel";
    const [
        shipTexture, botModel, torchModel, compassTexture, compassModel,
        pillarsTexture, pillarsModel, cthulhuTexture, cthulhuAOTex,
        cthulhuMetallicTex, cthulhuRoughnessTex, cthulhuModel, waterTexture
    ] = await Promise.all([
        loadTexture(STATE.gl, 'assets/textures/boat_wood_wet_v2.png'),
        loadOBJWithMTL('assets/models/woodBoat.obj', 'assets/models/woodBoat.mtl', true),
        loadOBJWithMTL('assets/models/torch.obj', 'assets/models/torch.mtl', false),
        loadTexture(STATE.gl, 'assets/textures/compass_brass_v2.png'),
        loadOBJWithMTL('assets/models/compass.obj', 'assets/models/compass.mtl', true),
        loadTexture(STATE.gl, 'assets/textures/germany010.jpg'),
        loadOBJWithMTL('assets/models/pillars.obj', 'assets/models/pillars.mtl', true),
        loadTexture(STATE.gl, 'assets/textures/Cthulhu_2k_Base_Color.png'),
        loadTexture(STATE.gl, 'assets/textures/Cthulhu_2k_AO.png'),
        loadTexture(STATE.gl, 'assets/textures/Cthulhu_2k_Metallic.png'),
        loadTexture(STATE.gl, 'assets/textures/Cthulhu_2k_Roughness.png'),
        loadOBJWithMTL('assets/models/Horror_low_subd.obj', null, true),
        loadTexture(STATE.gl, 'assets/textures/beautiful-photo-sea-waves.jpg')
    ]);
    Object.assign(STATE, {
        shipTexture, compassTexture, pillarsTexture, cthulhuTexture,
        cthulhuAOTex, cthulhuMetallicTex, cthulhuRoughnessTex, waterTexture
    });

    // 1) BOT (OBJ) MODELİNİ YÜKLE
    const shipVAO = STATE.gl.createVertexArray();
    STATE.gl.bindVertexArray(shipVAO);

    const vbo = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ARRAY_BUFFER, vbo);
    STATE.gl.bufferData(STATE.gl.ARRAY_BUFFER, botModel.vertices, STATE.gl.STATIC_DRAW);

    const ebo = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ELEMENT_ARRAY_BUFFER, ebo);
    STATE.gl.bufferData(STATE.gl.ELEMENT_ARRAY_BUFFER, botModel.indices, STATE.gl.STATIC_DRAW);

    const aPositionLoc = STATE.gl.getAttribLocation(STATE.program, "aPosition");
    const aNormalLoc = STATE.gl.getAttribLocation(STATE.program, "aNormal");
    const aColorLoc = STATE.gl.getAttribLocation(STATE.program, "aColor");
    const aTexCoordLoc = STATE.gl.getAttribLocation(STATE.program, "aTexCoord");

    STATE.gl.enableVertexAttribArray(aPositionLoc);
    STATE.gl.vertexAttribPointer(aPositionLoc, 3, STATE.gl.FLOAT, false, 11 * 4, 0);
    STATE.gl.enableVertexAttribArray(aNormalLoc);
    STATE.gl.vertexAttribPointer(aNormalLoc, 3, STATE.gl.FLOAT, false, 11 * 4, 3 * 4);
    STATE.gl.enableVertexAttribArray(aColorLoc);
    STATE.gl.vertexAttribPointer(aColorLoc, 3, STATE.gl.FLOAT, false, 11 * 4, 6 * 4);
    STATE.gl.enableVertexAttribArray(aTexCoordLoc);
    STATE.gl.vertexAttribPointer(aTexCoordLoc, 2, STATE.gl.FLOAT, false, 11 * 4, 9 * 4);

    STATE.shipVAO = shipVAO;
    STATE.shipIndexCount = botModel.indices.length;
    STATE.shipIndexType = botModel.indices instanceof Uint32Array ? STATE.gl.UNSIGNED_INT : STATE.gl.UNSIGNED_SHORT;

    const viewMatrix = STATE.mat4.create();
    const projectionMatrix = STATE.mat4.create();
    STATE.mat4.lookAt(viewMatrix, STATE.vec3.fromValues(0, 2, 8), STATE.vec3.fromValues(0, 0, 0), STATE.vec3.fromValues(0, 1, 0));
    STATE.mat4.perspective(projectionMatrix, cameraConfig.fov, STATE.canvas.width / STATE.canvas.height, cameraConfig.near, cameraConfig.far);
    STATE.gl.uniformMatrix4fv(STATE.uViewLoc, false, viewMatrix);
    STATE.gl.uniformMatrix4fv(STATE.uProjectionLoc, false, projectionMatrix);

    // Torch VAO/VBO/EBO
    const torchVAO = STATE.gl.createVertexArray();
    STATE.gl.bindVertexArray(torchVAO);

    const torchVBO = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ARRAY_BUFFER, torchVBO);
    STATE.gl.bufferData(STATE.gl.ARRAY_BUFFER, torchModel.vertices, STATE.gl.STATIC_DRAW);

    const torchEBO = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ELEMENT_ARRAY_BUFFER, torchEBO);
    STATE.gl.bufferData(STATE.gl.ELEMENT_ARRAY_BUFFER, torchModel.indices, STATE.gl.STATIC_DRAW);

    STATE.gl.enableVertexAttribArray(aPositionLoc);
    STATE.gl.vertexAttribPointer(aPositionLoc, 3, STATE.gl.FLOAT, false, 9 * 4, 0);
    STATE.gl.enableVertexAttribArray(aNormalLoc);
    STATE.gl.vertexAttribPointer(aNormalLoc, 3, STATE.gl.FLOAT, false, 9 * 4, 3 * 4);
    STATE.gl.enableVertexAttribArray(aColorLoc);
    STATE.gl.vertexAttribPointer(aColorLoc, 3, STATE.gl.FLOAT, false, 9 * 4, 6 * 4);

    STATE.torchVAO = torchVAO;
    STATE.torchIndexCount = torchModel.indices.length;
    STATE.torchIndexType = torchModel.indices instanceof Uint32Array ? STATE.gl.UNSIGNED_INT : STATE.gl.UNSIGNED_SHORT;

    // PUSULA VAO, BODY/NEEDLE İÇİN AYRI EBO'LAR

    // Body/needle indexlerini ayır
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

    // iki EBO oluştur
    const compassBodyEBO = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ELEMENT_ARRAY_BUFFER, compassBodyEBO);
    STATE.gl.bufferData(STATE.gl.ELEMENT_ARRAY_BUFFER, STATE.compassBodyIndices, STATE.gl.STATIC_DRAW);

    const compassNeedleEBO = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ELEMENT_ARRAY_BUFFER, compassNeedleEBO);
    STATE.gl.bufferData(STATE.gl.ELEMENT_ARRAY_BUFFER, STATE.compassNeedleIndices, STATE.gl.STATIC_DRAW);

    STATE.gl.enableVertexAttribArray(aPositionLoc);
    STATE.gl.vertexAttribPointer(aPositionLoc, 3, STATE.gl.FLOAT, false, 11 * 4, 0);
    STATE.gl.enableVertexAttribArray(aNormalLoc);
    STATE.gl.vertexAttribPointer(aNormalLoc, 3, STATE.gl.FLOAT, false, 11 * 4, 3 * 4);
    STATE.gl.enableVertexAttribArray(aColorLoc);
    STATE.gl.vertexAttribPointer(aColorLoc, 3, STATE.gl.FLOAT, false, 11 * 4, 6 * 4);
    STATE.gl.enableVertexAttribArray(aTexCoordLoc);
    STATE.gl.vertexAttribPointer(aTexCoordLoc, 2, STATE.gl.FLOAT, false, 11 * 4, 9 * 4);

    STATE.compassVAO = compassVAO;
    STATE.compassBodyEBO = compassBodyEBO;
    STATE.compassNeedleEBO = compassNeedleEBO;
    STATE.compassBodyIndexCount = STATE.compassBodyIndices.length;
    STATE.compassNeedleIndexCount = STATE.compassNeedleIndices.length;
    STATE.compassBodyIndexType = STATE.compassBodyIndices instanceof Uint32Array ? STATE.gl.UNSIGNED_INT : STATE.gl.UNSIGNED_SHORT;
    STATE.compassNeedleIndexType = STATE.compassNeedleIndices instanceof Uint32Array ? STATE.gl.UNSIGNED_INT : STATE.gl.UNSIGNED_SHORT;

    // Diğer modeller...
    const pillarsVAO = STATE.gl.createVertexArray();
    STATE.gl.bindVertexArray(pillarsVAO);

    const pillarsVBO = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ARRAY_BUFFER, pillarsVBO);
    STATE.gl.bufferData(STATE.gl.ARRAY_BUFFER, pillarsModel.vertices, STATE.gl.STATIC_DRAW);

    const pillarsEBO = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ELEMENT_ARRAY_BUFFER, pillarsEBO);
    STATE.gl.bufferData(STATE.gl.ELEMENT_ARRAY_BUFFER, pillarsModel.indices, STATE.gl.STATIC_DRAW);

    STATE.gl.enableVertexAttribArray(aPositionLoc);
    STATE.gl.vertexAttribPointer(aPositionLoc, 3, STATE.gl.FLOAT, false, 11 * 4, 0);
    STATE.gl.enableVertexAttribArray(aNormalLoc);
    STATE.gl.vertexAttribPointer(aNormalLoc, 3, STATE.gl.FLOAT, false, 11 * 4, 3 * 4);
    STATE.gl.enableVertexAttribArray(aColorLoc);
    STATE.gl.vertexAttribPointer(aColorLoc, 3, STATE.gl.FLOAT, false, 11 * 4, 6 * 4);
    STATE.gl.enableVertexAttribArray(aTexCoordLoc);
    STATE.gl.vertexAttribPointer(aTexCoordLoc, 2, STATE.gl.FLOAT, false, 11 * 4, 9 * 4);

    STATE.pillarsVAO = pillarsVAO;
    STATE.pillarsIndexCount = pillarsModel.indices.length;
    STATE.pillarsIndexType = pillarsModel.indices instanceof Uint32Array ? STATE.gl.UNSIGNED_INT : STATE.gl.UNSIGNED_SHORT;

    // CTHULHU OBJECT
    const cthulhuVAO = STATE.gl.createVertexArray();
    STATE.gl.bindVertexArray(cthulhuVAO);

    const cthulhuVBO = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ARRAY_BUFFER, cthulhuVBO);
    STATE.gl.bufferData(STATE.gl.ARRAY_BUFFER, cthulhuModel.vertices, STATE.gl.STATIC_DRAW);

    const cthulhuEBO = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ELEMENT_ARRAY_BUFFER, cthulhuEBO);
    STATE.gl.bufferData(STATE.gl.ELEMENT_ARRAY_BUFFER, cthulhuModel.indices, STATE.gl.STATIC_DRAW);

    // Her vertex için: [x,y,z, nx,ny,nz, r,g,b, u,v] toplam 11 float
    STATE.gl.enableVertexAttribArray(aPositionLoc);
    STATE.gl.vertexAttribPointer(aPositionLoc, 3, STATE.gl.FLOAT, false, 11 * 4, 0);

    STATE.gl.enableVertexAttribArray(aNormalLoc);
    STATE.gl.vertexAttribPointer(aNormalLoc, 3, STATE.gl.FLOAT, false, 11 * 4, 3 * 4);

    STATE.gl.enableVertexAttribArray(aColorLoc);
    STATE.gl.vertexAttribPointer(aColorLoc, 3, STATE.gl.FLOAT, false, 11 * 4, 6 * 4);

    STATE.gl.enableVertexAttribArray(aTexCoordLoc);
    STATE.gl.vertexAttribPointer(aTexCoordLoc, 2, STATE.gl.FLOAT, false, 11 * 4, 9 * 4);

    STATE.cthulhuVAO = cthulhuVAO;
    STATE.cthulhuIndexCount = cthulhuModel.indices.length;
    STATE.cthulhuIndexType = cthulhuModel.indices instanceof Uint32Array ? STATE.gl.UNSIGNED_INT : STATE.gl.UNSIGNED_SHORT;

    const waterSegments = qualityPresets[STATE.quality].waterSegments;
    const waterMesh = createWaterGrid(waterSegments, waterSegments, 400 / waterSegments);

    // 2. VAO/VBO/EBO oluştur ve ata
    const waterVAO = STATE.gl.createVertexArray();
    STATE.gl.bindVertexArray(waterVAO);

    const waterVBO = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ARRAY_BUFFER, waterVBO);
    STATE.gl.bufferData(STATE.gl.ARRAY_BUFFER, waterMesh.vertices, STATE.gl.STATIC_DRAW);

    const waterEBO = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ELEMENT_ARRAY_BUFFER, waterEBO);
    STATE.gl.bufferData(STATE.gl.ELEMENT_ARRAY_BUFFER, waterMesh.indices, STATE.gl.STATIC_DRAW);

    STATE.gl.enableVertexAttribArray(aPositionLoc);
    STATE.gl.vertexAttribPointer(aPositionLoc, 3, STATE.gl.FLOAT, false, 11 * 4, 0);

    STATE.gl.enableVertexAttribArray(aNormalLoc);
    STATE.gl.vertexAttribPointer(aNormalLoc, 3, STATE.gl.FLOAT, false, 11 * 4, 3 * 4);

    STATE.gl.enableVertexAttribArray(aColorLoc);
    STATE.gl.vertexAttribPointer(aColorLoc, 3, STATE.gl.FLOAT, false, 11 * 4, 6 * 4);

    STATE.gl.enableVertexAttribArray(aTexCoordLoc);
    STATE.gl.vertexAttribPointer(aTexCoordLoc, 2, STATE.gl.FLOAT, false, 11 * 4, 9 * 4);

    // 4. STATE'e kaydet
    STATE.waterVAO = waterVAO;
    STATE.waterVBO = waterVBO;
    STATE.waterEBO = waterEBO;
    STATE.waterIndexCount = waterMesh.indices.length;
    rebuildAtmosphere(qualityPresets[STATE.quality].particles);
    const eyes = createEffectsVAO(window.EnvironmentEffects.createEyePoints());
    STATE.eyeVAO = eyes.vao;
    STATE.eyeVBO = eyes.buffer;
    STATE.eyeCount = eyes.count;

    // Canvas eventleri vs. aynı kalacak...
    STATE.canvas.addEventListener("click", (event) => {
        if (STATE.paused) return;
        STATE.canvas.focus();
        if (!ritualAudio.enabled) ritualAudio.enable();
        let interactionHandled = false;

        // Resolve the interaction before requesting pointer lock. Pointer-lock
        // transitions can change event coordinates in some browsers.
        if (!STATE.compassInspectMode) {
            const rect = STATE.canvas.getBoundingClientRect();
            const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            // Kamera bilgisi
            const viewMatrix = STATE.mat4.create();
            const cameraPosition = getCameraPosition();
            const target = STATE.vec3.create();
            STATE.vec3.add(target, cameraPosition, STATE.cameraFront);
            STATE.mat4.lookAt(viewMatrix, cameraPosition, target, STATE.cameraUp);

            const projectionMatrix = STATE.mat4.create();
            STATE.mat4.perspective(projectionMatrix, cameraConfig.fov, STATE.canvas.width / STATE.canvas.height, cameraConfig.near, cameraConfig.far);

            const ray = getRayFromMouse(mouseX, mouseY, viewMatrix, projectionMatrix);

            // --- Önce pusulaya tıklanmış mı?
            const compassPos = getCompassPosition();
            if (STATE.compassHovered || rayIntersectsSphere(ray.origin, ray.direction, compassPos, 0.28)) {
                STATE.compassInspectMode = true;
                STATE.compassHovered = false;
                window.hideCompassWarning && window.hideCompassWarning();
                sceneEvents.emit('interaction:compass');
                interactionHandled = true;
            }

            if (!interactionHandled && STATE.awakeningStarted && !STATE.torchLit && !STATE.torchClicked) {
                const torchPos = getTorchPosition();
                if (STATE.torchHovered || rayIntersectsSphere(ray.origin, ray.direction, torchPos, 0.55)) {
                    STATE.torchClicked = true;
                    STATE.torchLit = true;
                    STATE.torchHovered = false;
                    STATE.torchLightIntensity = torchConfig.defaultIntensity;
                    sceneEvents.emit('interaction:torch');
                    interactionHandled = true;
                }
            }
        }

        if (!interactionHandled && document.pointerLockElement !== STATE.canvas) {
            requestScenePointerLock();
        }
    });



    STATE.performanceMonitor = new window.PerformanceMonitor(document.getElementById("performance-stats"));
    STATE.initialLoadMs = performance.now();
    document.getElementById("loading-screen").hidden = true;
    drawScene(performance.now());
}
function getCompassPosition() {
    return [
        STATE.shipPosition[0] - 0.6,
        STATE.shipPosition[1] + STATE.boatMotion.bob,
        STATE.shipPosition[2] - 1.4
    ];
}
function getFPSTorchMatrix() {
    // 1. Kamera pozisyonunu al
    const cameraPosition = getCameraPosition();

    // 2. FPS torch için offset uygula (önde ve sağda dursun)
    const forwardDist = 1.0;
    const rightDist = 0.4;
    const downDist = -0.2;

    const front = STATE.vec3.clone(STATE.cameraFront);
    STATE.vec3.normalize(front, front);

    const worldUp = [0, 1, 0];
    const right = STATE.vec3.create();
    STATE.vec3.cross(right, front, worldUp);
    STATE.vec3.normalize(right, right);

    const up = STATE.vec3.create();
    STATE.vec3.cross(up, right, front);
    STATE.vec3.normalize(up, up);

    // Torch pozisyonu (başın önünde, hafif sağda ve aşağıda)
    let torchPos = STATE.vec3.clone(cameraPosition);
    STATE.vec3.scaleAndAdd(torchPos, torchPos, front, forwardDist);
    STATE.vec3.scaleAndAdd(torchPos, torchPos, right, rightDist);
    STATE.vec3.scaleAndAdd(torchPos, torchPos, up, downDist);

    // 3. Torch matrisini oluştur
    const torchMatrix = STATE.mat4.create();

    // Önce pozisyona taşı
    STATE.mat4.translate(torchMatrix, torchMatrix, torchPos);

    let alignMat = STATE.mat4.create();
    STATE.mat4.targetTo(
        alignMat,
        [0, 0, 0],                       // torch modelinin merkezi
        front,                           // hedef yön: kamera yönü
        up                               // yukarı vektörü
    );
    STATE.mat4.multiply(torchMatrix, torchMatrix, alignMat);

    STATE.mat4.rotateX(torchMatrix, torchMatrix, -Math.PI / 6);

    STATE.mat4.scale(torchMatrix, torchMatrix, [0.3, 0.3, 0.3]);

    return torchMatrix;
}



function isLookingAtRlyeh() {
    if (!compassInspectedOnce || STATE.compassInspectMode) return false;
    return navigation.sample(STATE.shipPosition, STATE.cameraFront, STATE.elapsedTime).canAwaken;
}

function resetScene(advanceCycle = false) {
    sceneControls.clear();
    STATE.awakeningStarted = false;
    STATE.cthulhuRiseY = 0;
    STATE.torchLit = false;
    STATE.torchClicked = false;
    STATE.ambientLight = glMatrix.vec3.fromValues(1.0, 1.0, 1.0);
    STATE.shipPosition = glMatrix.vec3.fromValues(10, 0, 60);
    pillarsRiseY = 0;
    STATE.torchHovered = false;
    STATE.torchLightIntensity = 0.0;
    STATE.torchControlMode = false;
    STATE.compassInspectMode = false;
    compassInspectedOnce = false;
    STATE.compassYaw = 0;
    STATE.compassPitch = 0;
    STATE.compassHovered = false;
    STATE.yaw = -90;
    STATE.pitch = 0;
    STATE.firstMouse = true;
    STATE.cameraFront = glMatrix.vec3.fromValues(0, 0, -1);
    STATE.cameraUp = glMatrix.vec3.fromValues(0, 1, 0);
    STATE.lastFrameTime = performance.now();
    STATE.elapsedTime = 0;
    STATE.boatMotion = { bob: 0, roll: 0, pitch: 0 };
    STATE.lightning.reset();
    STATE.cinematic = { compassSpin: false, surge: false, eyes: false, shake: 0, torchShock: 0 };
    STATE.witness = { active: false, focus: 0, complete: false };
    STATE.awakeningTimeline.reset();
    ritualAudio.reset();
    ritualPresentation.reset();
    ritualCycle.start(advanceCycle);
    STATE.omen = omenSystem.beginCycle(ritualCycle.cycle);
    ritualCycle.setOmen(STATE.omen.label);
    STATE.lightning.setProfile({ intervalScale: STATE.omen.lightningInterval });
    document.getElementById("torch-mode").textContent = "OFF";
    document.getElementById("torch-brightness").textContent = "0.00";
    window.showCompassWarning?.();
    document.getElementById('input-status').hidden = true;
    setScenePaused(document.hidden);
    if (!STATE.paused) STATE.canvas?.focus();
}

function startAwakening() {
    if (STATE.paused || STATE.awakeningStarted) return;
    STATE.awakeningStarted = true;
    STATE.awakeningTimeline.start();
    sceneEvents.emit('awakening:started');
}

function rebuildWaterMesh(segments) {
    if (!STATE.gl || !STATE.program) return;
    const gl = STATE.gl;
    const waterMesh = createWaterGrid(segments, segments, 400 / segments);
    if (STATE.waterVAO) gl.deleteVertexArray(STATE.waterVAO);
    if (STATE.waterVBO) gl.deleteBuffer(STATE.waterVBO);
    if (STATE.waterEBO) gl.deleteBuffer(STATE.waterEBO);

    STATE.waterVAO = gl.createVertexArray();
    STATE.waterVBO = gl.createBuffer();
    STATE.waterEBO = gl.createBuffer();
    gl.bindVertexArray(STATE.waterVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, STATE.waterVBO);
    gl.bufferData(gl.ARRAY_BUFFER, waterMesh.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, STATE.waterEBO);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, waterMesh.indices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(STATE.aPositionLoc);
    gl.vertexAttribPointer(STATE.aPositionLoc, 3, gl.FLOAT, false, 11 * 4, 0);
    gl.enableVertexAttribArray(STATE.aNormalLoc);
    gl.vertexAttribPointer(STATE.aNormalLoc, 3, gl.FLOAT, false, 11 * 4, 3 * 4);
    gl.enableVertexAttribArray(STATE.aColorLoc);
    gl.vertexAttribPointer(STATE.aColorLoc, 3, gl.FLOAT, false, 11 * 4, 6 * 4);
    const texCoord = gl.getAttribLocation(STATE.program, 'aTexCoord');
    gl.enableVertexAttribArray(texCoord);
    gl.vertexAttribPointer(texCoord, 2, gl.FLOAT, false, 11 * 4, 9 * 4);
    STATE.waterIndexCount = waterMesh.indices.length;
}

function createEffectsVAO(vertices) {
    const gl = STATE.gl;
    const vao = gl.createVertexArray();
    const buffer = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(STATE.aPositionLoc);
    gl.vertexAttribPointer(STATE.aPositionLoc, 3, gl.FLOAT, false, 11 * 4, 0);
    gl.enableVertexAttribArray(STATE.aNormalLoc);
    gl.vertexAttribPointer(STATE.aNormalLoc, 3, gl.FLOAT, false, 11 * 4, 3 * 4);
    gl.enableVertexAttribArray(STATE.aColorLoc);
    gl.vertexAttribPointer(STATE.aColorLoc, 3, gl.FLOAT, false, 11 * 4, 6 * 4);
    const texCoord = gl.getAttribLocation(STATE.program, 'aTexCoord');
    gl.enableVertexAttribArray(texCoord);
    gl.vertexAttribPointer(texCoord, 2, gl.FLOAT, false, 11 * 4, 9 * 4);
    return { vao, buffer, count: vertices.length / 11 };
}

function rebuildAtmosphere(particleCount) {
    if (!STATE.gl || !STATE.program) return;
    const gl = STATE.gl;
    if (STATE.particleVAO) gl.deleteVertexArray(STATE.particleVAO);
    if (STATE.particleVBO) gl.deleteBuffer(STATE.particleVBO);
    const particles = createEffectsVAO(window.EnvironmentEffects.createDustField(particleCount));
    STATE.particleVAO = particles.vao;
    STATE.particleVBO = particles.buffer;
    STATE.particleCount = particles.count;
}

function resizeCanvas(force = false) {
    if (!STATE.canvas || !STATE.gl) return;
    const dpr = Math.min(window.devicePixelRatio || 1, qualityPresets[STATE.quality].dpr);
    const width = Math.max(1, Math.round(STATE.canvas.clientWidth * dpr));
    const height = Math.max(1, Math.round(STATE.canvas.clientHeight * dpr));
    if (!force && STATE.canvas.width === width && STATE.canvas.height === height) return;
    STATE.canvas.width = width;
    STATE.canvas.height = height;
    STATE.gl.viewport(0, 0, width, height);
    if (STATE.uProjectionLoc) {
        const projection = STATE.mat4.create();
        STATE.mat4.perspective(projection, cameraConfig.fov, width / height, cameraConfig.near, cameraConfig.far);
        STATE.gl.uniformMatrix4fv(STATE.uProjectionLoc, false, projection);
    }
}

function getTorchLightWorldPosition() {
    // The OBJ origin sits inside the lantern chamber. Move the emitter just
    // beyond its glass so both local and forward light originate at the flame.
    const modelOrigin = STATE.vec4.fromValues(0, 0, 0, 1);
    const transformedOrigin = STATE.vec4.create();
    STATE.vec4.transformMat4(transformedOrigin, modelOrigin, STATE.torchMatrix);
    const emitter = STATE.vec3.fromValues(transformedOrigin[0], transformedOrigin[1], transformedOrigin[2]);
    STATE.vec3.scaleAndAdd(emitter, emitter, STATE.cameraFront, 0.22);
    return emitter;
}

function updateWitnessPhase(deltaSeconds, cthulhuMatrix) {
    if (!STATE.awakeningTimeline.complete || STATE.witness.complete) return;
    STATE.witness.active = true;

    const headLocal = STATE.vec4.fromValues(0, 1.55, 1.39, 1);
    const headWorld = STATE.vec4.create();
    STATE.vec4.transformMat4(headWorld, headLocal, cthulhuMatrix);
    const cameraPosition = getCameraPosition();
    const toHead = STATE.vec3.fromValues(
        headWorld[0] - cameraPosition[0],
        headWorld[1] - cameraPosition[1],
        headWorld[2] - cameraPosition[2]
    );
    STATE.vec3.normalize(toHead, toHead);

    const alignment = STATE.vec3.dot(STATE.cameraFront, toHead);
    const locked = STATE.torchLit && alignment > 0.965;
    if (locked) {
        STATE.witness.focus = Math.min(1, STATE.witness.focus + deltaSeconds / 4);
    } else {
        STATE.witness.focus = Math.max(0, STATE.witness.focus - deltaSeconds * 0.12);
    }

    const status = !STATE.torchLit ? 'unlit' : locked ? 'locked' : 'searching';
    ritualCycle.updateWitness(deltaSeconds, locked, STATE.torchLit);
    ritualPresentation.updateWitness(STATE.witness.focus, status);

    if (STATE.witness.focus >= 1) {
        STATE.witness.complete = true;
        STATE.lightning.strike(1.85);
        STATE.cinematic.shake = 0.42;
        STATE.cinematic.torchShock = 0.65;
        ritualAudio.cue('awakening:reveal');
        sceneEvents.emit('witness:complete');
        ritualPresentation.completeWitness();
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
    if (!compassInspectedOnce || STATE.awakeningStarted || STATE.compassInspectMode || document.getElementById('comfort-controls').open || isInterfaceTarget(document.activeElement)) {
        sceneControls.keys.clear();
    } else {
        const movement = sceneControls.movement(STATE.cameraFront, STATE.cameraSpeed, deltaSeconds);
        STATE.vec3.add(STATE.shipPosition, STATE.shipPosition, movement);
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
    performance: STATE.performanceMonitor?.snapshot() ?? null
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
    if (STATE.effects.lightning) {
        const struck = STATE.lightning.update(deltaSeconds, STATE.awakeningStarted);
        if (struck) sceneEvents.emit('weather:lightning', { intensity: STATE.lightning.intensity });
    }

    // 1. Ambient ve torch intensity logic
    if (STATE.torchLit && !STATE.torchControlMode) {
        // Keep the world dark: the lantern should stay local, not become global ambient light.
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
    document.getElementById("torch-brightness").textContent = STATE.torchLightIntensity.toFixed(2);

    // 2. View ve kamera ayarı
    updateBoatMotion();
    let cameraPosition = getCameraPosition();
    let target = STATE.vec3.create();
    STATE.vec3.add(target, cameraPosition, STATE.cameraFront);

    const viewMatrix = STATE.mat4.create();
    STATE.mat4.lookAt(viewMatrix, cameraPosition, target, STATE.cameraUp);
    gl.uniformMatrix4fv(STATE.uViewLoc, false, viewMatrix);
    gl.uniform1f(STATE.uTimeLoc, STATE.elapsedTime);
    gl.uniform3fv(STATE.uCameraPosLoc, cameraPosition);
    gl.uniform2f(STATE.uResolutionLoc, STATE.canvas.width, STATE.canvas.height);
    gl.uniform1i(STATE.uFogEnabledLoc, STATE.effects.fog ? 1 : 0);
    const calmFog = [0.028, 0.055, 0.07];
    const omenFog = STATE.omen.fogColor;
    const fogColor = STATE.awakeningStarted
        ? omenFog
        : calmFog.map((value, index) => value * 0.72 + omenFog[index] * 0.28);
    gl.uniform1f(STATE.uFogDensityLoc, (STATE.awakeningStarted ? 0.021 : 0.012) * STATE.omen.fogDensity);
    gl.uniform3fv(STATE.uFogColorLoc, fogColor);
    gl.uniform1i(STATE.uPostEnabledLoc, STATE.effects.post ? 1 : 0);
    gl.uniform1i(STATE.uIsParticleLoc, 0);
    gl.uniform1i(STATE.uIsEyeLoc, 0);
    gl.uniform1f(STATE.uEyeIntensityLoc, 0);
    gl.uniform1i(STATE.uIsCthulhuLoc, 0);
    gl.uniform1i(STATE.uIsShipLoc, 0);
    gl.uniform1f(STATE.uCthulhuRevealLoc, 0);
    gl.uniform1i(STATE.uIsWaterLoc, 0);
    const surgeProgress = STATE.cinematic.surge
        ? Math.min(1, Math.max(0, (STATE.awakeningTimeline.elapsed - 5) / 12))
        : 0;
    gl.uniform1f(STATE.uWaveHeightLoc, STATE.effects.water ? oceanConfig.waveHeight * STATE.omen.waveHeight * (1 + surgeProgress * 1.05) : 0);
    gl.uniform1f(STATE.uWaveSpeedLoc, oceanConfig.waveSpeed * STATE.omen.waveSpeed);
    gl.uniform1f(STATE.uFoamThresholdLoc, oceanConfig.foamThreshold);
    const lightningIntensity = STATE.effects.lightning
        ? comfortSettings.lightningIntensity(STATE.lightning.intensity * STATE.omen.lightningGain) : 0;
    gl.uniform1f(STATE.uLightningIntensityLoc, lightningIntensity);
    gl.uniform3fv(STATE.uLightningColorLoc, STATE.omen.lightningColor);

    if (STATE.torchLit) {
        STATE.torchMatrix = getFPSTorchMatrix();
    } else {
        STATE.mat4.identity(STATE.torchMatrix);
        STATE.mat4.translate(STATE.torchMatrix, STATE.torchMatrix, [
            STATE.shipPosition[0] + 0.8,
            STATE.shipPosition[1] + STATE.boatMotion.bob,
            STATE.shipPosition[2] - 1.1
        ]);
        STATE.mat4.rotateX(STATE.torchMatrix, STATE.torchMatrix, -Math.PI / 8);
        STATE.mat4.scale(STATE.torchMatrix, STATE.torchMatrix, [0.3, 0.3, 0.3]);
    }

    // 4. Uniform'lar ve temizlik
    gl.clearColor(
        0.0 + lightningIntensity * STATE.omen.lightningColor[0] * 0.2,
        0.035 + lightningIntensity * STATE.omen.lightningColor[1] * 0.24,
        0.075 + lightningIntensity * STATE.omen.lightningColor[2] * 0.3,
        1.0
    );
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // === WATER DRAW ===
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, STATE.waterTexture);
    gl.uniform1i(STATE.uTextureLoc, 4);
    gl.uniform1i(STATE.uUseTextureLoc, 1);
    gl.uniform1i(STATE.uUsePBRLoc, 0);
    gl.uniform1i(STATE.uIsWaterLoc, 1);

    gl.bindVertexArray(STATE.waterVAO);

    const waterModelMatrix = STATE.mat4.create();
    STATE.mat4.translate(
        waterModelMatrix,
        waterModelMatrix,
        [
            STATE.shipPosition[0], // X: bot/kamera pozisyonu
            -3.5,                  // Y: sabit su yüksekliği
            STATE.shipPosition[2]  // Z: bot/kamera pozisyonu
        ]
    );
    gl.uniformMatrix4fv(STATE.uModelLoc, false, waterModelMatrix);
    gl.drawElements(gl.TRIANGLES, STATE.waterIndexCount, gl.UNSIGNED_INT, 0);

    gl.uniform1i(STATE.uUseTextureLoc, 0);
    gl.uniform1i(STATE.uIsWaterLoc, 0);

    // --- Torch ışık pozisyonu ve rengi ---
    const torchLightWorldPos = getTorchLightWorldPosition();
    gl.uniform1i(STATE.uTorchLitLoc, STATE.torchLit && STATE.effects.lighting ? 1 : 0);
    gl.uniform3fv(STATE.uAmbientLightLoc, STATE.ambientLight);
    gl.uniform3fv(STATE.uTorchLightPosLoc, torchLightWorldPos);
    const torchFlicker = 0.965
        + Math.sin(STATE.elapsedTime * 17.3) * 0.018
        + Math.sin(STATE.elapsedTime * 31.7) * 0.012
        + STATE.cinematic.torchShock * Math.sin(STATE.elapsedTime * 74.0) * 0.24;
    gl.uniform1f(
        STATE.uTorchLightIntensityLoc,
        STATE.torchLit && STATE.effects.lighting ? STATE.torchLightIntensity * torchFlicker : 0.0
    );
    gl.uniform3fv(STATE.uTorchLightColorLoc, [1.0, 0.7, 0.2]);
    gl.uniform3fv(STATE.uTorchDirectionLoc, STATE.cameraFront);

    // 5. Awakening: pillar ve cthulhu hareketleri
    if (!STATE.awakeningStarted && isLookingAtRlyeh()) {
        startAwakening();
        console.log("The Awakening Begins!");
    }
    if (STATE.awakeningStarted) {
        pillarsRiseY = STATE.awakeningTimeline.value('pillars');
        STATE.cthulhuRiseY = STATE.awakeningTimeline.value('cthulhu');
    }

    // === TORCH ÇİZİMİ ===
    gl.uniform1i(STATE.uIsTorchLoc, 1);
    gl.uniform1i(STATE.uTorchHoveredLoc, STATE.torchHovered ? 1 : 0);
    gl.uniform1i(STATE.uIsCompassLoc, 0);
    gl.uniform1i(STATE.uCompassHoveredLoc, 0);

    gl.bindVertexArray(STATE.torchVAO);
    gl.uniformMatrix4fv(STATE.uModelLoc, false, STATE.torchMatrix);
    gl.drawElements(gl.TRIANGLES, STATE.torchIndexCount, STATE.torchIndexType, 0);

    gl.uniform1i(STATE.uIsTorchLoc, 0);

    // === PUSULA ÇİZİMİ (gövde ve iğne ayrı) ===
    if (!STATE.compassInspectMode) {
        const compassMatrix = STATE.mat4.create();
        STATE.mat4.identity(compassMatrix);
        STATE.mat4.translate(compassMatrix, compassMatrix, getCompassPosition());
        if (STATE.cinematic.compassSpin) {
            const spinAge = Math.max(0, STATE.awakeningTimeline.elapsed - 2);
            STATE.mat4.rotateY(compassMatrix, compassMatrix, spinAge * (2.8 + Math.min(spinAge, 8) * 0.16));
            STATE.mat4.rotateZ(compassMatrix, compassMatrix, Math.sin(spinAge * 4.5) * 0.08);
        }
        STATE.mat4.scale(compassMatrix, compassMatrix, [0.1, 0.1, 0.1]);

        gl.bindVertexArray(STATE.compassVAO);
        gl.uniformMatrix4fv(STATE.uModelLoc, false, compassMatrix);
        gl.uniform1i(STATE.uCompassHoveredLoc, STATE.compassHovered ? 1 : 0);
        gl.uniform1i(STATE.uIsCompassLoc, 1);

        // Önce gövde (doku aktif)
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, STATE.compassTexture);
        gl.uniform1i(STATE.uTextureLoc, 2);
        gl.uniform1i(STATE.uUseTextureLoc, 1);
        gl.uniform1i(STATE.uUsePBRLoc, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, STATE.compassBodyEBO);
        gl.drawElements(gl.TRIANGLES, STATE.compassBodyIndexCount, STATE.compassBodyIndexType, 0);

        // Sonra iğne (doku kapalı)
        gl.uniform1i(STATE.uUseTextureLoc, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, STATE.compassNeedleEBO);
        const needleMatrix = STATE.mat4.clone(compassMatrix);
        STATE.mat4.rotateY(needleMatrix, needleMatrix, navigation.sample(STATE.shipPosition, STATE.cameraFront, STATE.elapsedTime).needleAngle);
        gl.uniformMatrix4fv(STATE.uModelLoc, false, needleMatrix);
        gl.drawElements(gl.TRIANGLES, STATE.compassNeedleIndexCount, STATE.compassNeedleIndexType, 0);

        gl.uniform1i(STATE.uIsCompassLoc, 0);
    } else {
        const compassMatrix = STATE.mat4.create();
        STATE.mat4.identity(compassMatrix);

        let cameraPos = getCameraPosition();
        let inspectPos = STATE.vec3.create();
        STATE.vec3.scaleAndAdd(inspectPos, cameraPos, STATE.cameraFront, 1.0);
        STATE.mat4.translate(compassMatrix, compassMatrix, inspectPos);

        STATE.mat4.rotateY(compassMatrix, compassMatrix, STATE.compassYaw);
        STATE.mat4.rotateX(compassMatrix, compassMatrix, -Math.PI / 2 + STATE.compassPitch);
        STATE.mat4.scale(compassMatrix, compassMatrix, [0.2, 0.2, 0.2]);

        gl.bindVertexArray(STATE.compassVAO);
        gl.uniformMatrix4fv(STATE.uModelLoc, false, compassMatrix);
        gl.uniform1i(STATE.uCompassHoveredLoc, 0);
        gl.uniform1i(STATE.uIsCompassLoc, 1);

        // Gövde (doku aktif)
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, STATE.compassTexture);
        gl.uniform1i(STATE.uTextureLoc, 2);
        gl.uniform1i(STATE.uUseTextureLoc, 1);
        gl.uniform1i(STATE.uUsePBRLoc, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, STATE.compassBodyEBO);
        gl.drawElements(gl.TRIANGLES, STATE.compassBodyIndexCount, STATE.compassBodyIndexType, 0);

        // İğne (doku kapalı)
        gl.uniform1i(STATE.uUseTextureLoc, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, STATE.compassNeedleEBO);
        const needleMatrix = STATE.mat4.clone(compassMatrix);
        STATE.mat4.rotateY(needleMatrix, needleMatrix, -navigation.sample(STATE.shipPosition, STATE.cameraFront, STATE.elapsedTime).heading + navigation.sample(STATE.shipPosition, STATE.cameraFront, STATE.elapsedTime).needleAngle);
        gl.uniformMatrix4fv(STATE.uModelLoc, false, needleMatrix);
        gl.drawElements(gl.TRIANGLES, STATE.compassNeedleIndexCount, STATE.compassNeedleIndexType, 0);

        gl.uniform1i(STATE.uIsCompassLoc, 0);
    }

    // === SHIP ÇİZİMİ ===
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, STATE.shipTexture);
    gl.uniform1i(STATE.uTextureLoc, 0);
    gl.uniform1i(STATE.uUseTextureLoc, 1);
    gl.uniform1i(STATE.uUsePBRLoc, 0);
    gl.uniform1i(STATE.uIsShipLoc, 1);
    gl.bindVertexArray(STATE.shipVAO);
    const modelMatrix = STATE.mat4.create();
    STATE.mat4.translate(modelMatrix, modelMatrix, [
        STATE.shipPosition[0],
        STATE.shipPosition[1] + STATE.boatMotion.bob,
        STATE.shipPosition[2]
    ]);
    STATE.mat4.rotateZ(modelMatrix, modelMatrix, STATE.boatMotion.roll);
    STATE.mat4.rotateX(modelMatrix, modelMatrix, STATE.boatMotion.pitch);
    STATE.mat4.rotateX(modelMatrix, modelMatrix, Math.PI / 2);
    STATE.mat4.rotateY(modelMatrix, modelMatrix, Math.PI);
    gl.uniformMatrix4fv(STATE.uModelLoc, false, modelMatrix);
    gl.drawElements(gl.TRIANGLES, STATE.shipIndexCount, STATE.shipIndexType, 0);
    gl.uniform1i(STATE.uIsShipLoc, 0);
    gl.uniform1i(STATE.uUseTextureLoc, 0);

    // === PILLARS ÇİZİMİ ===
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, STATE.pillarsTexture);
    gl.uniform1i(STATE.uTextureLoc, 1);
    gl.uniform1i(STATE.uUseTextureLoc, 1);
    gl.uniform1i(STATE.uUsePBRLoc, 0);

    for (let i = 0; i < pillarPositions.length; i++) {
        const base = pillarPositions[i];
        const pillarsMatrix = STATE.mat4.create();
        STATE.mat4.translate(pillarsMatrix, pillarsMatrix, [
            base[0],
            base[1] + pillarsRiseY,
            base[2]
        ]);
        STATE.mat4.scale(pillarsMatrix, pillarsMatrix, [500.2, 500.2, 500.2]);
        STATE.mat4.rotateX(pillarsMatrix, pillarsMatrix, Math.PI / 2);
        STATE.mat4.rotateZ(pillarsMatrix, pillarsMatrix, Math.PI / 2);

        gl.bindVertexArray(STATE.pillarsVAO);
        gl.uniformMatrix4fv(STATE.uModelLoc, false, pillarsMatrix);
        gl.drawElements(gl.TRIANGLES, STATE.pillarsIndexCount, STATE.pillarsIndexType, 0);
    }

    // === CTHULHU ÇİZİMİ ===
    const cthulhuMatrix = STATE.mat4.create();
    const CTHULHU_X = STATE.omen.creatureOffset[0];
    const CTHULHU_Z = -80 + STATE.omen.creatureOffset[1];
    const CTHULHU_INITIAL_Y = -75;
    STATE.mat4.translate(cthulhuMatrix, cthulhuMatrix, [CTHULHU_X, STATE.cthulhuRiseY + CTHULHU_INITIAL_Y, CTHULHU_Z]);
    STATE.mat4.scale(cthulhuMatrix, cthulhuMatrix, [CTHULHU_SCALE, CTHULHU_SCALE, CTHULHU_SCALE]);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, STATE.cthulhuTexture);
    gl.uniform1i(STATE.uTextureLoc, 3);
    // AO haritası - Texture Unit 5
    STATE.gl.activeTexture(STATE.gl.TEXTURE5);
    STATE.gl.bindTexture(STATE.gl.TEXTURE_2D, STATE.cthulhuAOTex);
    STATE.gl.uniform1i(STATE.uAOTexLoc, 5);

    // Metallic haritası - Texture Unit 6
    STATE.gl.activeTexture(STATE.gl.TEXTURE6);
    STATE.gl.bindTexture(STATE.gl.TEXTURE_2D, STATE.cthulhuMetallicTex);
    STATE.gl.uniform1i(STATE.uMetallicTexLoc, 6);

    // Roughness haritası - Texture Unit 7
    STATE.gl.activeTexture(STATE.gl.TEXTURE7);
    STATE.gl.bindTexture(STATE.gl.TEXTURE_2D, STATE.cthulhuRoughnessTex);
    STATE.gl.uniform1i(STATE.uRoughnessTexLoc, 7);
    gl.uniform1i(STATE.uUseTextureLoc, 1);
    const qualityAllowsPBR = qualityPresets[STATE.quality].usePBR;
    gl.uniform1i(STATE.uUsePBRLoc, STATE.effects.pbr && qualityAllowsPBR ? 1 : 0);

    gl.bindVertexArray(STATE.cthulhuVAO);
    gl.uniformMatrix4fv(STATE.uModelLoc, false, cthulhuMatrix);
    const silhouetteProgress = Math.min(1, Math.max(0, (STATE.awakeningTimeline.elapsed - 19) / 17));
    const revealProgress = Math.min(1, Math.max(0, (STATE.awakeningTimeline.elapsed - 36) / 6));
    gl.uniform1i(STATE.uIsCthulhuLoc, 1);
    gl.uniform1f(STATE.uCthulhuRevealLoc, Math.max(silhouetteProgress * 0.34, revealProgress));
    gl.drawElements(gl.TRIANGLES, STATE.cthulhuIndexCount, STATE.cthulhuIndexType, 0);
    gl.uniform1i(STATE.uIsCthulhuLoc, 0);

    // The eyes appear before the full reveal, anchoring the creature in the darkness.
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
        gl.uniformMatrix4fv(STATE.uModelLoc, false, cthulhuMatrix);
        gl.bindVertexArray(STATE.eyeVAO);
        gl.drawArrays(gl.POINTS, 0, STATE.eyeCount);
        gl.uniform1i(STATE.uIsEyeLoc, 0);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
    }

    updateWitnessPhase(deltaSeconds, cthulhuMatrix);

    // === DUST / MOISTURE PARTICLES ===
    if (STATE.effects.particles) {
        const particleMatrix = STATE.mat4.create();
        STATE.mat4.translate(particleMatrix, particleMatrix, [
            STATE.shipPosition[0], STATE.shipPosition[1] + 1.2 + STATE.boatMotion.bob, STATE.shipPosition[2]
        ]);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        gl.uniform1i(STATE.uUseTextureLoc, 0);
        gl.uniform1i(STATE.uIsParticleLoc, 1);
        gl.uniformMatrix4fv(STATE.uModelLoc, false, particleMatrix);
        gl.bindVertexArray(STATE.particleVAO);
        gl.drawArrays(gl.POINTS, 0, STATE.particleCount);
        gl.uniform1i(STATE.uIsParticleLoc, 0);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
    }

    requestAnimationFrame(drawScene);
}

function getRayFromMouse(mouseX, mouseY, viewMatrix, projectionMatrix) {
    const invVP = STATE.mat4.create();
    STATE.mat4.multiply(invVP, projectionMatrix, viewMatrix);
    STATE.mat4.invert(invVP, invVP);

    const nearPoint = STATE.vec4.fromValues(mouseX, mouseY, -1.0, 1.0);
    const farPoint = STATE.vec4.fromValues(mouseX, mouseY, 1.0, 1.0);

    STATE.vec4.transformMat4(nearPoint, nearPoint, invVP);
    STATE.vec4.transformMat4(farPoint, farPoint, invVP);

    for (let i = 0; i < 3; i++) {
        nearPoint[i] /= nearPoint[3];
        farPoint[i] /= farPoint[3];
    }

    const origin = STATE.vec3.fromValues(nearPoint[0], nearPoint[1], nearPoint[2]);
    const direction = STATE.vec3.create();
    STATE.vec3.sub(direction, STATE.vec3.fromValues(farPoint[0], farPoint[1], farPoint[2]), origin);
    STATE.vec3.normalize(direction, direction);

    return { origin, direction };
}
function rayIntersectsSphere(rayOrigin, rayDir, sphereCenter, radius) {
    const L = STATE.vec3.create();
    STATE.vec3.sub(L, sphereCenter, rayOrigin);
    const tca = STATE.vec3.dot(L, rayDir);
    if (tca < 0) return false;
    const d2 = STATE.vec3.dot(L, L) - tca * tca;
    return d2 <= radius * radius;
}
main().catch((error) => {
    console.error(error);
    document.getElementById("loading-screen").hidden = true;
    const panel = document.getElementById("fatal-error");
    panel.hidden = false;
    panel.textContent = `The scene could not be started.\n${error.message}`;
});
