(function exposeNarrationSystem(global) {
    class NarrationSystem {
        constructor(audio, catalog = global.NarrationCatalog, options = {}) {
            this.audio = audio;
            this.catalog = catalog;
            this.fetch = options.fetch || global.fetch?.bind(global);
            this.status = options.status || (() => {});
            this.onCaption = options.caption || (() => {});
            this.language = catalog.defaultLanguage;
            this.enabled = true;
            this.volume = 0.8;
            this.hidden = false;
            this.current = null;
            this.serial = 0;
            this.cache = new Map();
            this.seen = new Set();
            try {
                const saved = JSON.parse(global.localStorage.getItem('ritual-narration') || 'null');
                if (typeof saved?.enabled === 'boolean') this.enabled = saved.enabled;
                if (Number.isFinite(saved?.volume)) this.volume = Math.max(0, Math.min(1, saved.volume));
            } catch { /* Storage is optional. */ }
        }

        entry(id) {
            return this.catalog.languages[this.language]?.[id]
                || this.catalog.languages[this.catalog.defaultLanguage]?.[id];
        }

        save() {
            try { global.localStorage.setItem('ritual-narration', JSON.stringify({ enabled: this.enabled, volume: this.volume })); } catch { /* Optional. */ }
        }

        setEnabled(enabled) {
            this.enabled = Boolean(enabled);
            if (!this.enabled) this.stop();
            this.save(); this.sync();
        }

        setVolume(value) {
            this.volume = Math.max(0, Math.min(1, Number(value) || 0));
            this.save(); this.sync();
        }

        canPlay(clip) {
            return this.enabled && this.volume > 0 && this.audio.enabled && !this.audio.muted
                && this.audio.volume > 0 && !this.hidden
                && (!this.audio.paused || clip?.modal);
        }

        sync() {
            if (!this.enabled || !this.audio.enabled || this.audio.muted || this.audio.volume === 0 || this.volume === 0) {
                if (this.current) this.stop();
                return;
            }
            if (this.gain) this.gain.gain.setTargetAtTime(
                this.volume * this.audio.volume, this.audio.context.currentTime, 0.03);
            const clip = this.current;
            if (!clip) return;
            if (this.canPlay(clip)) {
                if (clip.buffer && !clip.source) this.start(clip);
            } else this.pause(clip);
        }

        setHidden(hidden) { this.hidden = Boolean(hidden); this.sync(); }

        async play(id, { modal = false, repeat = false } = {}) {
            const entry = this.entry(id);
            if (!entry || !this.canPlay({ modal }) || (!repeat && this.seen.has(id))) return false;
            if (this.current && this.current.entry.priority > entry.priority) return false;
            this.stop();
            const clip = { id, entry, modal, token: ++this.serial, offset: 0, source: null, controller: new AbortController() };
            this.current = clip;
            this.status('Loading narrator…');
            try {
                if (!this.cache.has(entry.file)) {
                    const response = await this.fetch(entry.file, { signal: clip.controller.signal });
                    if (!response.ok) throw new Error('Missing narration');
                    const bytes = await response.arrayBuffer();
                    if (this.current !== clip) return false;
                    const buffer = await this.audio.context.decodeAudioData(bytes);
                    if (this.current !== clip) return false;
                    this.cache.set(entry.file, buffer);
                }
                if (this.current !== clip) return false;
                clip.buffer = this.cache.get(entry.file);
                this.sync();
                return true;
            } catch {
                if (this.current === clip) {
                    this.stop();
                    this.status('Narration unavailable. The written text remains available.');
                }
                return false;
            }
        }

        start(clip) {
            const context = this.audio.context;
            if (!this.gain) {
                this.gain = context.createGain();
                // Separate from the world-pause gain so a discovery card can speak.
                this.gain.connect(this.audio.compressor);
            }
            this.gain.gain.setValueAtTime(this.volume * this.audio.volume, context.currentTime);
            const source = context.createBufferSource();
            source.buffer = clip.buffer;
            source.connect(this.gain);
            source.onended = () => {
                if (this.current === clip && clip.source === source) this.stop();
            };
            clip.source = source;
            clip.started = context.currentTime;
            if (!clip.captioned) {
                this.onCaption(clip.id, clip.entry.text, clip.buffer.duration);
                clip.captioned = true;
            }
            this.seen.add(clip.id);
            this.audio.setNarrationDucking?.(true);
            this.status('Narrator speaking');
            source.start(0, Math.min(clip.offset, clip.buffer.duration));
        }

        pause(clip) {
            if (clip.source) {
                clip.offset = Math.min(clip.buffer.duration, clip.offset + Math.max(0, this.audio.context.currentTime - clip.started));
                this.disconnect(clip);
                this.audio.setNarrationDucking?.(false);
                this.status('Narrator paused');
            }
        }

        disconnect(clip) {
            if (!clip.source) return;
            clip.source.onended = null;
            try { clip.source.stop(); } catch { /* Already ended. */ }
            clip.source.disconnect(); clip.source = null;
        }

        stop() {
            this.serial++;
            const clip = this.current;
            this.current = null;
            clip?.controller.abort();
            if (clip) this.disconnect(clip);
            this.audio.setNarrationDucking?.(false);
            this.status('');
        }

        reset() { this.stop(); this.seen.clear(); }
    }
    global.NarrationSystem = NarrationSystem;
}(window));
