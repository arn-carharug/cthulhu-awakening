(function exposeTimeline(global) {
    const clamp01 = (value) => Math.max(0, Math.min(1, value));
    const easeInOut = (value) => value * value * (3 - 2 * value);

    class EventBus {
        constructor() {
            this.listeners = new Map();
        }

        on(name, listener) {
            if (!this.listeners.has(name)) this.listeners.set(name, new Set());
            this.listeners.get(name).add(listener);
            return () => this.listeners.get(name)?.delete(listener);
        }

        emit(name, detail = {}) {
            this.listeners.get(name)?.forEach((listener) => listener(detail));
        }
    }

    class SceneTimeline {
        constructor({ duration, tracks = {}, cues = [], events = new EventBus() }) {
            this.duration = duration;
            this.tracks = tracks;
            this.cues = [...cues].sort((a, b) => a.at - b.at);
            this.events = events;
            this.reset();
        }

        start() {
            if (this.running || this.complete) return;
            this.running = true;
            this.events.emit('timeline:start');
        }

        update(deltaSeconds) {
            if (!this.running) return;
            const previous = this.elapsed;
            this.elapsed = Math.min(this.duration, this.elapsed + deltaSeconds);
            for (const cue of this.cues) {
                if (previous < cue.at && this.elapsed >= cue.at) this.events.emit(cue.name, cue);
            }
            this.events.emit('timeline:update', { elapsed: this.elapsed, progress: this.progress });
            if (this.elapsed >= this.duration) {
                this.running = false;
                this.complete = true;
                this.events.emit('timeline:complete');
            }
        }

        value(trackName) {
            const track = this.tracks[trackName];
            if (!track) return 0;
            const progress = easeInOut(clamp01((this.elapsed - track.start) / track.duration));
            return progress * track.to;
        }

        get progress() {
            return clamp01(this.elapsed / this.duration);
        }

        reset() {
            this.elapsed = 0;
            this.running = false;
            this.complete = false;
            this.events?.emit('timeline:reset');
        }
    }

    global.SceneRuntime = { EventBus, SceneTimeline };
}(window));
