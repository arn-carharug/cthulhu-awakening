(function exposePerformanceMonitor(global) {
    class PerformanceMonitor {
        constructor(element) {
            this.element = element;
            this.frames = 0;
            this.accumulated = 0;
            this.fps = 0;
            this.frameTime = 0;
            this.samples = [];
        }

        update(deltaSeconds) {
            if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
            this.samples.push(deltaSeconds * 1000);
            if (this.samples.length > 600) this.samples.shift();
            this.frames += 1;
            this.accumulated += deltaSeconds;
            if (this.accumulated < 0.5) return;
            this.fps = this.frames / this.accumulated;
            this.frameTime = (this.accumulated / this.frames) * 1000;
            if (this.element) {
                this.element.textContent = `${this.fps.toFixed(0)} FPS · ${this.frameTime.toFixed(1)} ms`;
            }
            this.frames = 0;
            this.accumulated = 0;
        }

        snapshot() {
            const sorted = [...this.samples].sort((a, b) => a - b);
            const initialMean = sorted.length ? sorted.reduce((sum, value) => sum + value, 0) / sorted.length : null;
            return {
                sampleCount: sorted.length,
                fps: this.fps || (initialMean ? 1000 / initialMean : null),
                meanFrameMs: this.frameTime || initialMean,
                p95FrameMs: sorted.length ? sorted[Math.ceil(sorted.length * 0.95) - 1] : null
            };
        }
    }

    global.PerformanceMonitor = PerformanceMonitor;
}(window));
