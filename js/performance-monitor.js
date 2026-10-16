(function exposePerformanceMonitor(global) {
    class PerformanceMonitor {
        constructor(element) {
            this.element = element;
            this.frames = 0;
            this.accumulated = 0;
            this.fps = 0;
            this.frameTime = 0;
        }

        update(deltaSeconds) {
            if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
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
    }

    global.PerformanceMonitor = PerformanceMonitor;
}(window));
