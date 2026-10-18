(function exposeEnvironmentEffects(global) {
    function pushVertex(target, position, normal, color, uv) {
        target.push(...position, ...normal, ...color, ...uv);
    }

    function createDustField(count, seed = 1337) {
        let state = seed >>> 0;
        const random = () => {
            state = (1664525 * state + 1013904223) >>> 0;
            return state / 4294967296;
        };
        const vertices = [];
        for (let index = 0; index < count; index += 1) {
            const position = [(random() - 0.5) * 34, random() * 11 - 4, (random() - 0.5) * 34];
            const brightness = 0.55 + random() * 0.45;
            pushVertex(vertices, position, [0, 1, 0], [brightness, brightness * 0.92, brightness * 0.72], [random(), random()]);
        }
        return new Float32Array(vertices);
    }

    function createEyePoints() {
        const vertices = [];
        const ember = [1.0, 0.055, 0.012];
        pushVertex(vertices, [-0.34, 1.55, 1.39], [0, 0, 1], ember, [0, 0]);
        pushVertex(vertices, [0.34, 1.55, 1.39], [0, 0, 1], ember, [1, 0]);
        return new Float32Array(vertices);
    }

    function createDiscoveryMesh(sites) {
        const vertices = [];
        for (const site of sites) {
            if (site.id === 'stone') {
                appendWeatheredStone(vertices, site);
                continue;
            }
            const [x, y, z] = site.position;
            const half = site.id === 'journal' ? [0.8, 0.12, 0.55] : [0.55, 1.5, 0.55];
            const corners = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
            for (const face of [[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]]) {
                for (const index of [face[0],face[1],face[2],face[0],face[2],face[3]]) {
                    const corner = corners[index];
                    pushVertex(vertices, [x + corner[0]*half[0], y + corner[1]*half[1], z + corner[2]*half[2]], [0,1,0], site.color, [0,0]);
                }
            }
        }
        return new Float32Array(vertices);
    }

    function appendWeatheredStone(vertices, site) {
        // Uneven, leaning strata; the base extends below the mean waterline.
        const strata = [
            { y: -2.8, radius: 1.04, x: 0.08, z: 0.04 },
            { y: -1.9, radius: 0.95, x: -0.03, z: 0 },
            { y: -0.9, radius: 0.77, x: -0.13, z: 0.03 },
            { y: 0.15, radius: 0.72, x: -0.06, z: -0.07 },
            { y: 1.15, radius: 0.57, x: -0.19, z: -0.04 },
            { y: 1.58, radius: 0.38, x: -0.08, z: 0.02 }
        ];
        const sides = 11;
        const rings = strata.map((stratum, level) => Array.from({ length: sides }, (_, index) => {
            const angle = index * Math.PI * 2 / sides + 0.13;
            const fracture = 1 + Math.sin(index * 7.13 + level * 2.1) * 0.13 + Math.cos(index * 3.7) * 0.07;
            const chippedHeight = Math.sin(index * 4.9 + level) * (level === strata.length - 1 ? 0.19 : 0.09);
            return [site.position[0] + stratum.x + Math.cos(angle) * stratum.radius * fracture,
                site.position[1] + stratum.y + chippedHeight,
                site.position[2] + stratum.z + Math.sin(angle) * stratum.radius * fracture * 0.76];
        }));
        const triangle = (a, b, c) => {
            const ab = b.map((v, i) => v - a[i]);
            const ac = c.map((v, i) => v - a[i]);
            const normal = [ab[1]*ac[2]-ab[2]*ac[1], ab[2]*ac[0]-ab[0]*ac[2], ab[0]*ac[1]-ab[1]*ac[0]];
            const length = Math.hypot(...normal);
            for (let i = 0; i < 3; i++) normal[i] /= length;
            const shade = 0.9 + Math.sin(a[0]*4.3 + a[1]*6.7 + a[2]*2.9) * 0.1;
            const color = site.color.map((value) => value * shade);
            for (const point of [a, b, c]) pushVertex(vertices, point, normal, color, [-1, 0]);
        };
        for (let level = 0; level < rings.length - 1; level++) {
            for (let index = 0; index < sides; index++) {
                const next = (index + 1) % sides;
                triangle(rings[level][index], rings[level+1][index], rings[level+1][next]);
                triangle(rings[level][index], rings[level+1][next], rings[level][next]);
            }
        }
        for (let index = 1; index < sides - 1; index++) {
            triangle(rings[0][0], rings[0][index], rings[0][index+1]);
            const top = rings.at(-1);
            triangle(top[0], top[index+1], top[index]);
        }
    }
    global.EnvironmentEffects = { createDustField, createEyePoints, createDiscoveryMesh };
}(window));
