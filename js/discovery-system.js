(function exposeDiscoverySystem(global) {
    const SITES = Object.freeze([
        { id: 'journal', title: 'The drifting journal', position: [8, -2.7, 43], color: [0.64, 0.44, 0.21],
            text: 'The last entry ends mid-sentence: “The compass lies near the stones. Keep the pale beacon ahead. If the eyes open, the lantern can bear witness.”' },
        { id: 'stone', title: 'The tide-marked stone', position: [-9, -1.4, 17], color: [0.29, 0.28, 0.24], collisionRadius: 1.25,
            text: 'A weathered inscription: “Three pillars keep the threshold. The sea remembers every visitor. What you choose to illuminate will remember you.”' }
    ]);

    class DiscoverySystem {
        constructor(collisionSystem = null) {
            // Collision geometry lives only in collision-system.js, which must be loaded first.
            this.collision = collisionSystem || new global.CollisionSystem();
            this.reset();
        }

        reset() {
            this.found = new Set();
        }

        get sites() {
            return SITES;
        }

        moveShip(position, movement) {
            return this.collision.moveShip(position, movement);
        }

        isAvailable(site, position, front = null) {
            const dx = site.position[0] - position[0];
            const dz = site.position[2] - position[2];
            const distance = Math.hypot(dx, dz);
            if (distance > 18) return false;

            if (front) {
                const frontLen = Math.hypot(front[0], front[2]);
                if (frontLen > 1e-4 && distance > 1e-4) {
                    const dot = (front[0] * dx + front[2] * dz) / (frontLen * distance);
                    if (dot < 0.2) return false;
                }
            }

            if (this.collision && typeof this.collision.lineOfSight === 'function') {
                if (!this.collision.lineOfSight(position, site.position, site.id)) {
                    return false;
                }
            }

            return true;
        }

        nearby(position, front = null) {
            return SITES.filter((site) => this.isAvailable(site, position, front));
        }

        inspect(id, position, front = null) {
            const site = this.nearby(position, front).find((item) => item.id === id);
            if (site) this.found.add(id);
            return site || null;
        }

        static aligned(front, toTarget) {
            const length = Math.hypot(...front) * Math.hypot(...toTarget);
            return length > 0 && (front[0] * toTarget[0] + front[1] * toTarget[1] + front[2] * toTarget[2]) / length > 0.965;
        }
    }

    global.DiscoverySystem = DiscoverySystem;
}(window));
