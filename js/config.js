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
            duration: 34,
            pillars: Object.freeze({ start: 0, duration: 8.4, distance: 25 }),
            cthulhu: Object.freeze({ start: 0.6, duration: 33.4, distance: 80 })
        }),
        torch: Object.freeze({ defaultIntensity: 5, automaticIntensity: 6, manualMax: 12 })
    });
}(window));
