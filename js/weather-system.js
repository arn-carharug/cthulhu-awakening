(function exposeWeatherSystem(global) {
    class LightningSystem {
        constructor(seed = 9417) {
            this.seed = seed >>> 0;
            this.reset();
        }

        random() {
            this.seed = (1664525 * this.seed + 1013904223) >>> 0;
            return this.seed / 4294967296;
        }

        schedule(awakening) {
            const minimum = awakening ? 2.8 : 7.0;
            const spread = awakening ? 5.0 : 10.0;
            this.nextStrike = minimum + this.random() * spread;
        }

        update(deltaSeconds, awakening) {
            this.elapsed += deltaSeconds;
            this.intensity *= Math.exp(-deltaSeconds * 13.0);
            this.aftershock *= Math.exp(-deltaSeconds * 5.0);
            this.nextStrike -= deltaSeconds;
            if (this.nextStrike <= 0) {
                this.intensity = 0.85 + this.random() * 0.7;
                this.aftershock = 0.22 + this.random() * 0.28;
                this.direction = this.random() * 2 - 1;
                this.schedule(awakening);
                return true;
            }
            if (this.aftershock > 0.08 && this.intensity < 0.04 && this.random() < deltaSeconds * 2.5) {
                this.intensity = this.aftershock;
                this.aftershock = 0;
            }
            return false;
        }

        reset() {
            this.elapsed = 0;
            this.intensity = 0;
            this.aftershock = 0;
            this.direction = 0;
            this.schedule(false);
        }
    }

    global.WeatherSystem = { LightningSystem };
}(window));
