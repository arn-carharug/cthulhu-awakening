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
    global.EnvironmentEffects = { createDustField, createEyePoints, createDiscoveryMesh };
}(window));
