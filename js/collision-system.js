(function exposeCollisionSystem(global) {
    const world = () => {
        const config = global.GameConfig?.world;
        if (!config) throw new Error('CollisionSystem requires GameConfig.world (load js/config.js first).');
        return config;
    };
    const SKIN = 1.0001;
    const FALLBACK_SKIN = 1.0002;
    const FALLBACK_SAMPLES = 128;
    const RESOLVE_PASSES = 8;

    class CollisionSystem {
        constructor(worldConfig = world()) {
            this.pillarsActive = false;
            this.hull = { rx: worldConfig.boatHull.rx, rz: worldConfig.boatHull.rz };
            const pillarIds = ['pillar_left', 'pillar_center', 'pillar_right'];
            this.obstacles = [
                {
                    id: 'stone',
                    position: [...worldConfig.stonePosition],
                    radius: worldConfig.stoneRadius,
                    isActive: () => true
                },
                ...worldConfig.pillarPositions.map((position, index) => ({
                    id: pillarIds[index] || `pillar_${index}`,
                    position: [...position],
                    radius: worldConfig.pillarRadius,
                    isActive: () => this.pillarsActive
                }))
            ];
        }

        setPillarsActive(active) {
            this.pillarsActive = Boolean(active);
        }

        addObstacle(obstacle) {
            this.obstacles.push(obstacle);
        }

        // Normalized ellipse distance between the hull centre and an obstacle; < 1 means overlap.
        clearance(obs, position) {
            const rx = obs.radius + this.hull.rx;
            const rz = obs.radius + this.hull.rz;
            return Math.hypot((position[0] - obs.position[0]) / rx, (position[2] - obs.position[2]) / rz);
        }

        activeObstacles() {
            return this.obstacles.filter((obs) => obs.isActive());
        }

        isClear(position, obstacles = this.activeObstacles()) {
            return obstacles.every((obs) => this.clearance(obs, position) >= 1.0);
        }

        // Pushes `position` (mutated in place) out of every active obstacle so the result is valid for
        // all of them at once. Sequential push-out is retried for a few passes; when neighbouring
        // obstacles keep pushing the hull back into each other, the nearest point on any obstacle
        // boundary that is clear of all obstacles is used instead. Returns false if no clear point exists.
        resolveOverlaps(position) {
            const obstacles = this.activeObstacles();
            for (let pass = 0; pass < RESOLVE_PASSES; pass++) {
                let moved = false;
                for (const obs of obstacles) {
                    const rx = obs.radius + this.hull.rx;
                    const rz = obs.radius + this.hull.rz;
                    const x = (position[0] - obs.position[0]) / rx;
                    const z = (position[2] - obs.position[2]) / rz;
                    const dist = Math.hypot(x, z);
                    if (dist >= 1.0) continue;
                    const nx = dist > 1e-8 ? x / dist : 0;
                    const nz = dist > 1e-8 ? z / dist : 1;
                    position[0] = obs.position[0] + nx * SKIN * rx;
                    position[2] = obs.position[2] + nz * SKIN * rz;
                    moved = true;
                }
                if (!moved) return true;
            }
            if (this.isClear(position, obstacles)) return true;

            let best = null;
            let bestDistSq = Infinity;
            for (const obs of obstacles) {
                const rx = (obs.radius + this.hull.rx) * FALLBACK_SKIN;
                const rz = (obs.radius + this.hull.rz) * FALLBACK_SKIN;
                for (let k = 0; k < FALLBACK_SAMPLES; k++) {
                    const angle = (k / FALLBACK_SAMPLES) * Math.PI * 2;
                    const candidate = [obs.position[0] + Math.sin(angle) * rx, position[1], obs.position[2] + Math.cos(angle) * rz];
                    const distSq = (candidate[0] - position[0]) ** 2 + (candidate[2] - position[2]) ** 2;
                    if (distSq < bestDistSq && this.isClear(candidate, obstacles)) {
                        best = candidate;
                        bestDistSq = distSq;
                    }
                }
            }
            if (!best) return false;
            position[0] = best[0];
            position[2] = best[2];
            return true;
        }

        moveShip(startPosition, movement, maxIterations = 4) {
            const startClear = this.isClear(startPosition);
            const current = [startPosition[0], startPosition[1], startPosition[2]];
            let remaining = [movement[0], movement[1], movement[2]];
            this.resolveOverlaps(current);

            for (let iter = 0; iter < maxIterations; iter++) {
                if (remaining[0] === 0 && remaining[2] === 0) break;

                let earliestHit = 1.0;
                let hitObstacle = null;
                let hitNormal = null;

                for (const obs of this.obstacles) {
                    if (!obs.isActive()) continue;
                    const rx = obs.radius + this.hull.rx;
                    const rz = obs.radius + this.hull.rz;
                    const x = (current[0] - obs.position[0]) / rx;
                    const z = (current[2] - obs.position[2]) / rz;

                    const dx = remaining[0] / rx;
                    const dz = remaining[2] / rz;
                    const a = dx * dx + dz * dz;
                    const b = x * dx + z * dz;
                    const discriminant = b * b - a * (x * x + z * z - 1.0);

                    if (a > 1e-12 && b < 0 && discriminant >= 0) {
                        const hit = Math.max(0, (-b - Math.sqrt(discriminant)) / a);
                        if (hit < earliestHit) {
                            earliestHit = hit;
                            hitObstacle = obs;
                            const hx = x + dx * hit;
                            const hz = z + dz * hit;
                            const hlen = Math.hypot(hx, hz) || 1;
                            hitNormal = [hx / hlen, hz / hlen];
                        }
                    }
                }

                if (hitObstacle && hitNormal) {
                    const rx = hitObstacle.radius + this.hull.rx;
                    const rz = hitObstacle.radius + this.hull.rz;

                    current[0] += remaining[0] * earliestHit;
                    current[2] += remaining[2] * earliestHit;

                    let remDx = remaining[0] * (1.0 - earliestHit) / rx;
                    let remDz = remaining[2] * (1.0 - earliestHit) / rz;

                    const inward = Math.min(0, remDx * hitNormal[0] + remDz * hitNormal[1]);
                    remDx -= inward * hitNormal[0];
                    remDz -= inward * hitNormal[1];

                    remaining[0] = remDx * rx;
                    remaining[2] = remDz * rz;

                    const curX = (current[0] - hitObstacle.position[0]) / rx;
                    const curZ = (current[2] - hitObstacle.position[2]) / rz;
                    const curDist = Math.hypot(curX, curZ);
                    if (curDist < SKIN) {
                        const len = curDist > 1e-8 ? curDist : 1.0;
                        current[0] = hitObstacle.position[0] + (curX / len) * SKIN * rx;
                        current[2] = hitObstacle.position[2] + (curZ / len) * SKIN * rz;
                    }
                } else {
                    current[0] += remaining[0];
                    current[2] += remaining[2];
                    remaining = [0, 0, 0];
                    break;
                }
            }

            // Final joint resolution: the result must be clear of every active obstacle, not only the last one.
            if (!this.resolveOverlaps(current) && startClear) {
                current[0] = startPosition[0];
                current[2] = startPosition[2];
            }

            return [current[0], startPosition[1] + movement[1], current[2]];
        }

        lineOfSight(from, to, ignoredId = null) {
            const rx = to[0] - from[0];
            const rz = to[2] - from[2];
            const rayLen = Math.hypot(rx, rz);
            if (rayLen < 1e-5) return true;

            const dirX = rx / rayLen;
            const dirZ = rz / rayLen;

            for (const obs of this.obstacles) {
                if (!obs.isActive() || obs.id === ignoredId) continue;
                const ocX = obs.position[0] - from[0];
                const ocZ = obs.position[2] - from[2];
                const proj = ocX * dirX + ocZ * dirZ;

                if (proj > 0 && proj < rayLen) {
                    const perpDistSq = (ocX * ocX + ocZ * ocZ) - (proj * proj);
                    if (perpDistSq < obs.radius * obs.radius) {
                        return false;
                    }
                }
            }
            return true;
        }
    }

    global.CollisionSystem = CollisionSystem;
}(window));
