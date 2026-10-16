(function exposeOmenSystem(global) {
    const PROFILES = Object.freeze([
        Object.freeze({ id: 'black-tide', label: 'The Black Tide', fogDensity: 1.28, fogColor: [0.01, 0.026, 0.038], waveHeight: 1.28, waveSpeed: 0.92, lightningInterval: 0.86, lightningGain: 1.12, lightningColor: [0.42, 0.62, 0.88], creatureOffset: [0, 0] }),
        Object.freeze({ id: 'red-wake', label: 'The Red Wake', fogDensity: 1.08, fogColor: [0.052, 0.018, 0.016], waveHeight: 1.12, waveSpeed: 1.08, lightningInterval: 0.72, lightningGain: 1.28, lightningColor: [0.92, 0.3, 0.18], creatureOffset: [8, 0] }),
        Object.freeze({ id: 'drowned-star', label: 'The Drowned Star', fogDensity: 1.18, fogColor: [0.012, 0.044, 0.038], waveHeight: 0.86, waveSpeed: 0.74, lightningInterval: 1.18, lightningGain: 0.94, lightningColor: [0.3, 0.82, 0.66], creatureOffset: [-7, -3] }),
        Object.freeze({ id: 'hollow-calm', label: 'The Hollow Calm', fogDensity: 0.9, fogColor: [0.022, 0.025, 0.033], waveHeight: 0.52, waveSpeed: 0.58, lightningInterval: 1.62, lightningGain: 1.5, lightningColor: [0.7, 0.78, 1.0], creatureOffset: [4, 5] })
    ]);

    class OmenSystem {
        constructor(events) {
            this.label = document.getElementById('omen-label');
            this.profile = PROFILES[0];
            events.on('awakening:started', () => this.reveal());
        }

        beginCycle(cycle) {
            let seed = Math.imul(cycle + 17, 2654435761) >>> 0;
            seed ^= seed >>> 16;
            seed = Math.imul(seed, 2246822519) >>> 0;
            this.profile = PROFILES[seed % PROFILES.length];
            this.label.textContent = 'Omen veiled';
            this.label.classList.remove('revealed');
            return this.profile;
        }

        reveal() {
            this.label.textContent = this.profile.label;
            this.label.classList.add('revealed');
        }
    }

    global.OmenSystem = OmenSystem;
}(window));
