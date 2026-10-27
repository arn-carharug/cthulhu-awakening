(function exposeCollisionSystem(global) {
    const HULL_HALF_WIDTH = 2.0;
    const HULL_HALF_LENGTH = 4.7;

    class CollisionSystem {
        constructor() {
            this.pillarsActive = false;
            this.obstacles = [
                {
                    id: 'stone',
                    position: [-9, -1.4, 17],
                    radius: 1.25,
                    isActive: () => true
                },
                {
                    id: 'pillar_left',
                    position: [-50, 0, -30],
                    radius: 3.2,
                    isActive: () => this.pillarsActive
                },
                {
                    id: 'pillar_center',
                    position: [0, 0, -30],
                    radius: 3.2,
                    isActive: () => this.pillarsActive
                },
                {
                    id: 'pillar_right',
                    position: [50, 0, -30],
                    radius: 3.2,
                    isActive: () => this.pillarsActive
                }
            ];
        }

        setPillarsActive(active) {
            this.pillarsActive = Boolean(active);
        }

        addObstacle(obstacle) {
            this.obstacles.push(obstacle);
        }

        moveShip(startPosition, movement, maxIterations = 4) {
            const current = [startPosition[0], startPosition[1], startPosition[2]];
            let remaining = [movement[0], movement[1], movement[2]];

            for (let iter = 0; iter < maxIterations; iter++) {
                if (remaining[0] === 0 && remaining[2] === 0) break;

                let earliestHit = 1.0;
                let hitObstacle = null;
                let hitNormal = null;

                for (const obs of this.obstacles) {
                    if (!obs.isActive()) continue;
                    const rx = obs.radius + HULL_HALF_WIDTH;
                    const rz = obs.radius + HULL_HALF_LENGTH;

                    let x = (current[0] - obs.position[0]) / rx;
                    let z = (current[2] - obs.position[2]) / rz;
                    const dist = Math.hypot(x, z);

                    if (dist < 1.0) {
                        const nx = dist > 1e-8 ? x / dist : 0;
                        const nz = dist > 1e-8 ? z / dist : 1.0001;
                        x = nx * 1.0001;
                        z = nz * 1.0001;
                        current[0] = obs.position[0] + x * rx;
                        current[2] = obs.position[2] + z * rz;
                    }

                    const dx = remaining[0] / rx;
                    const dz = remaining[2] / rz;
                    const a = dx * dx + dz * dz;
                    const b = x * dx + z * dz;
                    const discriminant = b * b - a * (x * x + z * z - 1.0);

                    if (a > 1e-12 && b < 0 && discriminant >= 0) {
                        const hit = (-b - Math.sqrt(discriminant)) / a;
                        if (hit >= 0 && hit < earliestHit) {
                            earliestHit = hit;
                            hitObstacle = obs;
                            const hx = x + dx * hit;
                            const hz = z + dz * hit;
                            const hlen = Math.hypot(hx, hz);
                            hitNormal = [hx / hlen, hz / hlen];
                        }
                    }
                }

                if (hitObstacle && hitNormal) {
                    const rx = hitObstacle.radius + HULL_HALF_WIDTH;
                    const rz = hitObstacle.radius + HULL_HALF_LENGTH;

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
                    if (curDist < 1.0001) {
                        const len = curDist > 1e-8 ? curDist : 1.0;
                        current[0] = hitObstacle.position[0] + (curX / len) * 1.0001 * rx;
                        current[2] = hitObstacle.position[2] + (curZ / len) * 1.0001 * rz;
                    }
                } else {
                    current[0] += remaining[0];
                    current[2] += remaining[2];
                    remaining = [0, 0, 0];
                    break;
                }
            }

            for (const obs of this.obstacles) {
                if (!obs.isActive()) continue;
                const rx = obs.radius + HULL_HALF_WIDTH;
                const rz = obs.radius + HULL_HALF_LENGTH;
                const x = (current[0] - obs.position[0]) / rx;
                const z = (current[2] - obs.position[2]) / rz;
                const dist = Math.hypot(x, z);
                if (dist < 1.0) {
                    const nx = dist > 1e-8 ? x / dist : 0;
                    const nz = dist > 1e-8 ? z / dist : 1.0001;
                    current[0] = obs.position[0] + nx * 1.0001 * rx;
                    current[2] = obs.position[2] + nz * 1.0001 * rz;
                }
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
