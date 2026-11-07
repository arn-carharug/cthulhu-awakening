(function exposeWeatherSystem(global) {
    // Photosensitivity guard (WCAG 2.3.1 / Xbox Accessibility Guideline 118: no more than three
    // flashes in any one-second period). Every flash onset, whether scheduled, scripted or an
    // aftershock, is at least this far from the previous one, so any 1 s window holds at most 3.
    const MIN_FLASH_GAP = 0.34;

    class LightningSystem {
        constructor(seed = 9417) {
            this.seed = seed >>> 0;
            this.intervalScale = 1;
            this.reset();
        }

        random() {
            this.seed = (1664525 * this.seed + 1013904223) >>> 0;
            return this.seed / 4294967296;
        }

        schedule(awakening) {
            const minimum = awakening ? 2.8 : 7.0;
            const spread = awakening ? 5.0 : 10.0;
            this.nextStrike = (minimum + this.random() * spread) * this.intervalScale;
        }

        update(deltaSeconds, awakening) {
            this.elapsed += deltaSeconds;
            this.intensity *= Math.exp(-deltaSeconds * 13.0);
            this.aftershock *= Math.exp(-deltaSeconds * 5.0);
            this.nextStrike -= deltaSeconds;
            if (this.pendingStrike !== null && this.canFlash()) {
                // A scripted strike that arrived too soon after the previous flash, delivered late.
                this.flash(this.pendingStrike, this.pendingStrike * 0.28);
                this.pendingStrike = null;
                return false;
            }
            if (this.nextStrike <= 0) {
                if (!this.canFlash()) {
                    this.nextStrike = MIN_FLASH_GAP - (this.elapsed - this.lastFlashAt);
                    return false;
                }
                this.flash(0.85 + this.random() * 0.7, 0.22 + this.random() * 0.28);
                this.direction = this.random() * 2 - 1;
                this.schedule(awakening);
                return true;
            }
            if (this.aftershock > 0.08 && this.intensity < 0.04 && this.canFlash() && this.random() < deltaSeconds * 2.5) {
                this.flash(this.aftershock, 0);
            }
            return false;
        }

        canFlash() {
            return this.elapsed - this.lastFlashAt >= MIN_FLASH_GAP;
        }

        flash(intensity, aftershock) {
            this.intensity = intensity;
            this.aftershock = aftershock;
            this.lastFlashAt = this.elapsed;
        }

        strike(intensity = 1.25) {
            this.nextStrike = 2.5 + this.random() * 3.0;
            if (this.canFlash()) this.flash(intensity, intensity * 0.28);
            else this.pendingStrike = Math.max(this.pendingStrike ?? 0, intensity);
        }

        setProfile({ intervalScale = 1 } = {}) {
            this.intervalScale = Math.max(0.45, Math.min(2, intervalScale));
            this.schedule(false);
        }

        reset() {
            this.elapsed = 0;
            this.intensity = 0;
            this.aftershock = 0;
            this.direction = 0;
            this.lastFlashAt = -Infinity;
            this.pendingStrike = null;
            this.schedule(false);
        }
    }

    global.WeatherSystem = { LightningSystem };
}(window));
