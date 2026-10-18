(function exposeSceneControls(global) {
    class SceneControls {
        constructor() {
            this.keys = new Set();
            this.lastTimestamp = null;
        }

        clear() {
            this.keys.clear();
            this.lastTimestamp = null;
        }

        tick(timestamp, paused) {
            const rawSeconds = this.lastTimestamp === null ? 0
                : Math.max(0, (timestamp - this.lastTimestamp) / 1000);
            this.lastTimestamp = timestamp;
            return { rawSeconds, deltaSeconds: paused ? 0 : Math.min(rawSeconds, 0.1) };
        }

        movement(front, speed, deltaSeconds) {
            const forward = Number(this.keys.has('w')) - Number(this.keys.has('s'));
            const sideways = Number(this.keys.has('d')) - Number(this.keys.has('a'));
            const horizontalLength = Math.hypot(front[0], front[2]);
            if (!horizontalLength || (!forward && !sideways)) return [0, 0, 0];
            const x = (front[0] * forward - front[2] * sideways) / horizontalLength;
            const z = (front[2] * forward + front[0] * sideways) / horizontalLength;
            const scale = speed * deltaSeconds / Math.hypot(x, z);
            return [x * scale, 0, z * scale];
        }
    }

    global.SceneControls = SceneControls;
}(window));
