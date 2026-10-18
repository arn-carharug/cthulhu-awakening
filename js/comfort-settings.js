(function exposeComfortSettings(global) {
    class ComfortSettings {
        constructor() {
            this.values = { followSystem: true, reduceBoat: false, reduceShake: false,
                reduceLightning: false, seed: 20261018 };
            this.media = global.matchMedia?.('(prefers-reduced-motion: reduce)');
            try {
                const saved = JSON.parse(global.localStorage.getItem('ritual-comfort') || 'null');
                for (const key of ['followSystem', 'reduceBoat', 'reduceShake', 'reduceLightning']) {
                    if (typeof saved?.[key] === 'boolean') this.values[key] = saved[key];
                }
                if (Number.isInteger(saved?.seed) && saved.seed >= 0 && saved.seed <= 4294967295) this.values.seed = saved.seed;
            } catch { /* Storage is optional. */ }
        }

        set(key, value) {
            if (key === 'seed') {
                if (!Number.isInteger(value) || value < 0 || value > 4294967295) return false;
            } else if (!['followSystem', 'reduceBoat', 'reduceShake', 'reduceLightning'].includes(key) || typeof value !== 'boolean') {
                return false;
            }
            this.values[key] = value;
            try { global.localStorage.setItem('ritual-comfort', JSON.stringify(this.values)); } catch { /* Keep session values. */ }
            return true;
        }

        reduced(key) {
            return this.values[key] || (this.values.followSystem && Boolean(this.media?.matches));
        }

        get boatMotionEnabled() { return !this.reduced('reduceBoat'); }
        get cameraShakeEnabled() { return !this.reduced('reduceShake'); }
        get lightningScale() { return this.reduced('reduceLightning') ? 0.12 : 1; }

        lightningIntensity(value) {
            return Math.max(0, Math.min(value * this.lightningScale, this.lightningScale < 1 ? 0.22 : 10));
        }
    }

    global.ComfortSettings = ComfortSettings;
}(window));
