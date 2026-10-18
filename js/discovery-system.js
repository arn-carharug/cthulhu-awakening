(function exposeDiscoverySystem(global) {
    const SITES = Object.freeze([
        { id: 'journal', title: 'The drifting journal', position: [8, -2.7, 43], color: [0.64, 0.44, 0.21],
            text: 'The last entry ends mid-sentence: “The compass lies near the stones. Keep the pale beacon ahead. If the eyes open, the lantern can bear witness.”' },
        { id: 'stone', title: 'The tide-marked stone', position: [-9, -1.4, 17], color: [0.29, 0.28, 0.24], collisionRadius: 1.25,
            text: 'A weathered inscription: “Three pillars keep the threshold. The sea remembers every visitor. What you choose to illuminate will remember you.”' }
    ]);
    class DiscoverySystem {
        constructor() { this.reset(); }
        reset() { this.found = new Set(); }
        get sites() { return SITES; }
        moveShip(position, movement) {
            const result = [...position];
            let remaining = [...movement];
            for (const site of SITES) {
                if (!site.collisionRadius) continue;
                // The hull stays aligned with world axes; include its width and length.
                const rx = site.collisionRadius + 2;
                const rz = site.collisionRadius + 4.7;
                let x = (result[0] - site.position[0]) / rx;
                let z = (result[2] - site.position[2]) / rz;
                const distance = Math.hypot(x, z);
                if (distance < 1) {
                    // Recover cleanly if an older scene starts inside the obstacle.
                    x = distance > 1e-8 ? x / distance * 1.0001 : 0;
                    z = distance > 1e-8 ? z / distance * 1.0001 : 1.0001;
                }
                let dx = remaining[0] / rx;
                let dz = remaining[2] / rz;
                const a = dx * dx + dz * dz;
                const b = x * dx + z * dz;
                const discriminant = b * b - a * (x * x + z * z - 1);
                if (a > 0 && b < 0 && discriminant >= 0) {
                    const hit = (-b - Math.sqrt(discriminant)) / a;
                    if (hit >= 0 && hit <= 1) {
                        x += dx * hit; z += dz * hit;
                        const length = Math.hypot(x, z);
                        const nx = x / length, nz = z / length;
                        dx *= 1 - hit; dz *= 1 - hit;
                        const inward = Math.min(0, dx * nx + dz * nz);
                        dx -= inward * nx; dz -= inward * nz;
                        x = nx * 1.0001; z = nz * 1.0001;
                    }
                }
                result[0] = site.position[0] + x * rx;
                result[2] = site.position[2] + z * rz;
                remaining = [dx * rx, remaining[1], dz * rz];
            }
            return [result[0] + remaining[0], result[1] + remaining[1], result[2] + remaining[2]];
        }
        nearby(position) {
            return SITES.filter((site) => Math.hypot(position[0] - site.position[0], position[2] - site.position[2]) <= 18);
        }
        inspect(id, position) {
            const site = this.nearby(position).find((item) => item.id === id);
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
