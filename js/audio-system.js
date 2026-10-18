(function exposeAudioSystem(global) {
    class RitualAudioSystem {
        constructor() {
            this.context = null;
            this.master = null;
            this.compressor = null;
            this.rumble = null;
            this.rumbleGain = null;
            this.windGain = null;
            this.enabled = false;
            this.muted = false;
            this.paused = false;
            this.transients = new Set();
            this.volume = 0.7;
            this.onStateChange = null;
        }

        async enable() {
            if (!this.context) this.buildGraph();
            if (!this.context) return false;
            await this.context.resume();
            this.enabled = true;
            this.muted = false;
            this.master.gain.cancelScheduledValues(this.context.currentTime);
            this.master.gain.setTargetAtTime(this.paused ? 0 : this.outputGain(), this.context.currentTime, 0.35);
            this.emitState();
            return true;
        }

        buildGraph() {
            const AudioContext = global.AudioContext || global.webkitAudioContext;
            if (!AudioContext) return;
            this.context = new AudioContext();
            const now = this.context.currentTime;
            this.master = this.context.createGain();
            this.compressor = this.context.createDynamicsCompressor();
            this.master.gain.setValueAtTime(0, now);
            this.compressor.threshold.setValueAtTime(-20, now);
            this.compressor.knee.setValueAtTime(18, now);
            this.compressor.ratio.setValueAtTime(6, now);
            this.compressor.attack.setValueAtTime(0.004, now);
            this.compressor.release.setValueAtTime(0.28, now);
            this.master.connect(this.compressor).connect(this.context.destination);

            const wind = this.context.createBufferSource();
            const windFilter = this.context.createBiquadFilter();
            this.windGain = this.context.createGain();
            wind.buffer = this.createNoiseBuffer(3.5);
            wind.loop = true;
            windFilter.type = 'lowpass';
            windFilter.frequency.value = 880;
            this.windGain.gain.value = 0.24;
            wind.connect(windFilter).connect(this.windGain).connect(this.master);
            wind.start();

            this.rumble = this.context.createOscillator();
            this.rumbleGain = this.context.createGain();
            const rumbleFilter = this.context.createBiquadFilter();
            this.rumble.type = 'sine';
            this.rumble.frequency.value = 52;
            this.rumbleGain.gain.value = 0.035;
            rumbleFilter.type = 'lowpass';
            rumbleFilter.frequency.value = 105;
            this.rumble.connect(rumbleFilter).connect(this.rumbleGain).connect(this.master);
            this.rumble.start();
        }

        createNoiseBuffer(seconds) {
            const length = Math.floor(this.context.sampleRate * seconds);
            const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
            const data = buffer.getChannelData(0);
            let previous = 0;
            for (let index = 0; index < length; index += 1) {
                const white = Math.random() * 2 - 1;
                previous = previous * 0.985 + white * 0.015;
                data[index] = previous * 2.2;
            }
            return buffer;
        }

        setAwakening(progress) {
            if (!this.enabled || this.muted || this.paused) return;
            const now = this.context.currentTime;
            this.rumble.frequency.setTargetAtTime(52 + progress * 26, now, 0.8);
            this.rumbleGain.gain.setTargetAtTime(0.035 + progress * 0.22, now, 0.6);
            this.windGain.gain.setTargetAtTime(0.24 + progress * 0.28, now, 1.2);
        }

        cue(name) {
            if (!this.enabled || this.muted || this.paused) return;
            if (name === 'awakening:rumble' || name === 'awakening:presence') this.pulseRumble(name === 'awakening:presence' ? 0.5 : 0.28);
            if (name === 'awakening:flash' || name === 'awakening:reveal') this.thunder(name === 'awakening:reveal' ? 0.7 : 0.46);
            if (name === 'awakening:eyes') this.heartbeat();
        }

        pulseRumble(amount) {
            const now = this.context.currentTime;
            const current = Math.max(0.001, this.rumbleGain.gain.value);
            this.rumbleGain.gain.cancelScheduledValues(now);
            this.rumbleGain.gain.setValueAtTime(current, now);
            this.rumbleGain.gain.linearRampToValueAtTime(amount, now + 0.2);
            this.rumbleGain.gain.exponentialRampToValueAtTime(0.055, now + 2.6);
        }

        thunder(amount) {
            const now = this.context.currentTime;
            const source = this.context.createBufferSource();
            const filter = this.context.createBiquadFilter();
            const gain = this.context.createGain();
            source.buffer = this.createNoiseBuffer(2.8);
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(420, now);
            filter.frequency.exponentialRampToValueAtTime(75, now + 2.4);
            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(amount, now + 0.035);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 2.7);
            source.connect(filter).connect(gain).connect(this.master);
            this.trackTransient(source, [filter, gain]);
            source.start(now);
            source.stop(now + 2.8);
        }

        heartbeat() {
            const now = this.context.currentTime;
            [0, 0.28, 1.05, 1.33].forEach((offset, index) => {
                const oscillator = this.context.createOscillator();
                const gain = this.context.createGain();
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(index % 2 ? 48 : 57, now + offset);
                gain.gain.setValueAtTime(0.001, now + offset);
                gain.gain.linearRampToValueAtTime(index % 2 ? 0.11 : 0.19, now + offset + 0.035);
                gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.24);
                oscillator.connect(gain).connect(this.master);
                this.trackTransient(oscillator, [gain]);
                oscillator.start(now + offset);
                oscillator.stop(now + offset + 0.25);
            });
        }

        toggle() {
            if (!this.context || !this.enabled) return this.enable();
            this.muted = !this.muted;
            this.master.gain.setTargetAtTime(this.muted || this.paused ? 0 : this.outputGain(), this.context.currentTime, 0.08);
            this.emitState();
            return Promise.resolve(!this.muted);
        }

        setVolume(value) {
            this.volume = Math.max(0, Math.min(1, Number(value) || 0));
            if (this.context && this.master && !this.muted && !this.paused) {
                this.master.gain.setTargetAtTime(this.outputGain(), this.context.currentTime, 0.05);
            }
            this.emitState();
        }

        outputGain() {
            // A slight curve preserves useful control at low values while allowing
            // the upper range to be substantially louder than the original mix.
            return Math.pow(this.volume, 1.2) * 2.0;
        }

        reset() {
            if (!this.context) return;
            this.stopTransients();
            const now = this.context.currentTime;
            [this.rumble.frequency, this.rumbleGain.gain, this.windGain.gain]
                .forEach((parameter) => parameter.cancelScheduledValues(now));
            this.rumble.frequency.setTargetAtTime(52, now, 0.2);
            this.rumbleGain.gain.setTargetAtTime(0.035, now, 0.25);
            this.windGain.gain.setTargetAtTime(0.24, now, 0.4);
        }

        trackTransient(source, nodes) {
            this.transients.add(source);
            source.onended = () => {
                this.transients.delete(source);
                source.disconnect();
                nodes.forEach((node) => node.disconnect());
            };
        }

        stopTransients() {
            for (const source of this.transients) {
                try { source.stop(); } catch (error) {
                    if (error.name !== 'InvalidStateError') throw error;
                }
            }
            this.transients.clear();
        }

        setPaused(paused) {
            this.paused = paused;
            if (!this.context) return;
            if (paused) this.stopTransients();
            const now = this.context.currentTime;
            this.master.gain.cancelScheduledValues(now);
            this.master.gain.setTargetAtTime(paused || this.muted ? 0 : this.outputGain(), now, 0.03);
        }

        emitState() {
            this.onStateChange?.({ enabled: this.enabled, muted: this.muted, volume: this.volume });
        }
    }

    global.RitualAudioSystem = RitualAudioSystem;
}(window));
