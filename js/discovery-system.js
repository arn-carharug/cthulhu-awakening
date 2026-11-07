(function exposeDiscoverySystem(global) {
    // Copy and colours live here; positions come from GameConfig.world at construction time.
    const SITE_COPY = Object.freeze([
        { id: 'journal', title: 'The drifting journal', positionKey: 'journalPosition', color: [0.64, 0.44, 0.21],
            text: 'The last entry ends mid-sentence: “The compass lies near the stones. Keep the pale beacon ahead. If the eyes open, the lantern can bear witness.”' },
        { id: 'stone', title: 'The tide-marked stone', positionKey: 'stonePosition', radiusKey: 'stoneRadius', color: [0.29, 0.28, 0.24],
            text: 'A weathered inscription: “Three pillars keep the threshold. The sea remembers every visitor. What you choose to illuminate will remember you.”' }
    ]);

    class DiscoverySystem {
        constructor(collisionSystem = null, worldConfig = global.GameConfig?.world) {
            if (!worldConfig) throw new Error('DiscoverySystem requires GameConfig.world (load js/config.js first).');
            this.siteList = Object.freeze(SITE_COPY.map(({ positionKey, radiusKey, ...site }) => Object.freeze({
                ...site,
                position: Object.freeze([...worldConfig[positionKey]]),
                ...(radiusKey ? { collisionRadius: worldConfig[radiusKey] } : {})
            })));
            // Collision geometry lives only in collision-system.js, which must be loaded first.
            this.collision = collisionSystem || new global.CollisionSystem(worldConfig);
            this.reset();
        }

        reset() {
            this.found = new Set();
        }

        get sites() {
            return this.siteList;
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
            return this.siteList.filter((site) => this.isAvailable(site, position, front));
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
