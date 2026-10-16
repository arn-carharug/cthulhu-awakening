(function exposeGameConfig(global) {
    const QUALITY_PRESETS = Object.freeze({
        low: Object.freeze({ label: 'Low', dpr: 1, waterSegments: 90, particles: 90, usePBR: false }),
        medium: Object.freeze({ label: 'Medium', dpr: 1.5, waterSegments: 140, particles: 190, usePBR: true }),
        high: Object.freeze({ label: 'High', dpr: 2, waterSegments: 200, particles: 320, usePBR: true })
    });

    global.GameConfig = Object.freeze({
        defaultQuality: 'high',
        qualityPresets: QUALITY_PRESETS,
        camera: Object.freeze({ fov: Math.PI / 4, near: 0.1, far: 500 }),
        awakening: Object.freeze({
            duration: 42,
            pillars: Object.freeze({ start: 5, duration: 10, distance: 25 }),
            cthulhu: Object.freeze({ start: 12, duration: 28, distance: 80 })
        }),
        torch: Object.freeze({ defaultIntensity: 5, automaticIntensity: 6, manualMax: 12 }),
        ocean: Object.freeze({ waveHeight: 0.72, waveSpeed: 0.82, foamThreshold: 0.48 })
    });
}(window));
