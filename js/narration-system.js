(function exposeNarrationSystem(global) {
    const DEFAULT_EVENT_TTL = {
        'awakening.rumble': 10.0,
        'awakening.presence': 4.8,
        'awakening.silhouette': 9.8,
        'awakening.eyes': 6.8,
        'awakening.reveal': 5.8,
        'witness.begin': 8.0
    };
    // Wall-clock limit for fetch + decode. Separate from the pause-aware TTL, which decides
    // whether a loaded line is still relevant; this one decides that loading has failed.
    const DEFAULT_LOAD_TIMEOUT_SECONDS = 15.0;
    const UNAVAILABLE = 'Narration unavailable. The written text remains available.';

    class NarrationSystem {
        constructor(audio, catalog = global.NarrationCatalog, options = {}) {
            this.audio = audio;
            this.catalog = catalog;
            this.fetch = options.fetch || global.fetch?.bind(global);
            this.status = options.status || (() => {});
            this.onCaption = options.caption || (() => {});
            this.now = options.now || (() => (typeof this.audio?.context?.currentTime === 'number' ? this.audio.context.currentTime : (typeof performance !== 'undefined' ? performance.now() / 1000 : Date.now() / 1000)));
            // Browser timers throw "Illegal invocation" when called with another receiver
            // (this.setTimeout(...)), so the window versions must be bound to the global.
            this.setTimeout = options.setTimeout || global.setTimeout?.bind(global) || null;
            this.clearTimeout = options.clearTimeout || global.clearTimeout?.bind(global) || null;
            this.loadTimeoutSeconds = options.loadTimeoutSeconds ?? DEFAULT_LOAD_TIMEOUT_SECONDS;
            this.language = catalog.defaultLanguage;
            this.enabled = true;
            this.volume = 0.8;
            this.hidden = false;
            this.current = null;
            this.serial = 0;
            this.cache = new Map();
            this.seen = new Set();
            this.pausedAt = null;
            this.totalPausedDuration = 0;

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

        updatePauseTracking() {
            const isPaused = Boolean(this.audio?.paused);
            const now = this.now();
            if (isPaused) {
                if (this.pausedAt === null) {
                    this.pausedAt = now;
                }
            } else {
                if (this.pausedAt !== null) {
                    this.totalPausedDuration += Math.max(0, now - this.pausedAt);
                    this.pausedAt = null;
                }
            }
        }

        getActiveTime() {
            this.updatePauseTracking();
            const now = this.now();
            let pausedTime = this.totalPausedDuration;
            if (this.pausedAt !== null) {
                pausedTime += Math.max(0, now - this.pausedAt);
            }
            return Math.max(0, now - pausedTime);
        }

        isStale(clip) {
            if (!clip || !Number.isFinite(clip.ttl)) return false;
            const elapsedActive = this.getActiveTime() - clip.requestedActiveTime;
            return elapsedActive > clip.ttl;
        }

        sync() {
            this.updatePauseTracking();
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

        async play(id, { modal = false, repeat = false, maxStaleSeconds } = {}) {
            const entry = this.entry(id);
            if (!entry || !this.canPlay({ modal }) || (!repeat && this.seen.has(id))) return false;
            if (this.current && this.current.entry.priority > entry.priority) return false;
            this.stop();

            let ttl;
            if (maxStaleSeconds !== undefined) {
                ttl = maxStaleSeconds;
            } else if (entry.maxSeconds !== undefined) {
                ttl = entry.maxSeconds;
            } else if (entry.validitySeconds !== undefined) {
                ttl = entry.validitySeconds;
            } else if (DEFAULT_EVENT_TTL[id] !== undefined) {
                ttl = DEFAULT_EVENT_TTL[id];
            } else if (modal || entry.priority >= 2) {
                ttl = Infinity;
            } else {
                ttl = 10.0;
            }

            const clip = {
                id,
                entry,
                modal,
                ttl,
                requestedActiveTime: this.getActiveTime(),
                token: ++this.serial,
                offset: 0,
                source: null,
                controller: new AbortController()
            };
            this.current = clip;
            this.status('Loading narrator…');

            if (this.setTimeout) {
                const timeoutId = this.setTimeout(() => {
                    if (this.current !== clip || clip.buffer) return;
                    // decodeAudioData ignores AbortSignal, so aborting alone cannot end the request.
                    // Invalidate it here: clear Loading, release the slot, and let any late result be dropped.
                    clip.timedOut = true;
                    this.stop();
                    this.status(UNAVAILABLE);
                }, this.loadTimeoutSeconds * 1000);
                if (timeoutId?.unref) timeoutId.unref();
                clip.timeoutId = timeoutId;
            }

            // Re-checked after every await: a newer line, stop(), reset() or the load timeout may have
            // invalidated this request while it was suspended.
            const valid = () => {
                if (this.current !== clip || clip.timedOut || clip.controller.signal.aborted) return false;
                if (this.isStale(clip)) {
                    this.stop();
                    return false;
                }
                return true;
            };
            const finish = (result) => {
                if (clip.timeoutId && this.clearTimeout) this.clearTimeout(clip.timeoutId);
                return result;
            };

            try {
                if (!this.cache.has(entry.file)) {
                    const response = await this.fetch(entry.file, { signal: clip.controller.signal });
                    if (!response.ok) throw new Error('Missing narration');
                    const bytes = await response.arrayBuffer();
                    if (!valid()) return finish(false);
                    const buffer = await this.audio.context.decodeAudioData(bytes);
                    if (!valid()) return finish(false);
                    this.cache.set(entry.file, buffer);
                }
                if (!valid()) return finish(false);
                finish();
                clip.buffer = this.cache.get(entry.file);
                this.sync();
                return true;
            } catch {
                finish();
                if (this.current === clip) {
                    const isAbort = clip.controller.signal.aborted || clip.timedOut;
                    this.stop();
                    if (!isAbort) this.status(UNAVAILABLE);
                }
                return false;
            }
        }

        start(clip) {
            if (this.isStale(clip)) {
                this.stop();
                return;
            }
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
            if (clip?.timeoutId && this.clearTimeout) this.clearTimeout(clip.timeoutId);
            clip?.controller.abort();
            if (clip) this.disconnect(clip);
            this.audio.setNarrationDucking?.(false);
            this.status('');
        }

        reset() {
            this.stop();
            this.seen.clear();
            this.pausedAt = null;
            this.totalPausedDuration = 0;
        }
    }

    global.NarrationSystem = NarrationSystem;
}(window));
