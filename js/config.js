(function exposeGameConfig(global) {
    const QUALITY_PRESETS = Object.freeze({
        low: Object.freeze({ label: 'Low', dpr: 1, waterSegments: 90, particles: 90, usePBR: false }),
        medium: Object.freeze({ label: 'Medium', dpr: 1.5, waterSegments: 140, particles: 190, usePBR: true }),
        high: Object.freeze({ label: 'High', dpr: 2, waterSegments: 200, particles: 320, usePBR: true })
    });

    // Single source of world geometry. Rendering, discovery, collision and navigation all read
    // from here; no module keeps its own copy of these coordinates.
    const WORLD = Object.freeze({
        initialShipPosition: Object.freeze([10, 0, 60]),
        ruinsPosition: Object.freeze([0, 0, -30]),
        cthulhuScale: 25,
        pillarPositions: Object.freeze([
            Object.freeze([-50, 0, -30]),
            Object.freeze([0, 0, -30]),
            Object.freeze([50, 0, -30])
        ]),
        pillarRadius: 3.2,
        stonePosition: Object.freeze([-9, -1.4, 17]),
        stoneRadius: 1.25,
        journalPosition: Object.freeze([8, -2.7, 43]),
        creatureBasePosition: Object.freeze([0, -75, -80]),
        boatHull: Object.freeze({ rx: 2.0, rz: 4.7 })
    });

    global.GameConfig = Object.freeze({
        defaultQuality: 'medium',
        qualityPresets: QUALITY_PRESETS,
        world: WORLD,
        camera: Object.freeze({ fov: Math.PI / 4, near: 0.1, far: 500 }),
        awakening: Object.freeze({
            duration: 42,
            pillars: Object.freeze({ start: 5, duration: 10, distance: 25 }),
            cthulhu: Object.freeze({ start: 12, duration: 28, distance: 80 })
        }),
        torch: Object.freeze({ defaultIntensity: 5, automaticIntensity: 6, manualMax: 12 }),
        ocean: Object.freeze({ waveHeight: 0.72, waveSpeed: 0.82, foamThreshold: 0.48 })
    });
}(typeof window !== 'undefined' ? window : globalThis));
