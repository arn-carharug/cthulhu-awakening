// =====================
// OBJ + MTL Loader
// =====================
async function loadText(url) {
    const res = await fetch(url);
    return await res.text();
}

// Simple MTL parser (only reads Kd - diffuse color)
function parseMTL(mtlText) {
    const materials = {};
    let curMat = null;
    mtlText.split('\n').forEach(line => {
        line = line.trim();
        if (line.startsWith('newmtl ')) {
            curMat = line.split(' ')[1];
            materials[curMat] = { Kd: [0.8, 0.8, 0.8], map_Kd: null };
        } else if (line.startsWith('Kd ') && curMat) {
            const [, r, g, b] = line.split(/\s+/);
            materials[curMat].Kd = [parseFloat(r), parseFloat(g), parseFloat(b)];
        } else if (line.startsWith('map_Kd ') && curMat) {
            materials[curMat].map_Kd = line.split(' ')[1];
        }
    });
    return materials;
}

// OBJ loader: position, normal, material color
async function loadOBJWithMTL(objUrl, mtlUrl, useUV = true) {
    const objText = await loadText(objUrl);
    const mtlText = mtlUrl ? await loadText(mtlUrl) : '';
    const materials = parseMTL(mtlText);

    const positions = [], normals = [], uvs = [];
    let curMaterial = null;
    const uniqueVerts = {};
    let vertices = [];
    let finalIndices = [];
    let materialForFace = []; // Material index per face
    let materialList = [];    // Ordered material names

    objText.split('\n').forEach(line => {
        line = line.trim();
        if (line.startsWith('v ')) {
            const [, x, y, z] = line.split(/\s+/);
            positions.push([parseFloat(x), parseFloat(y), parseFloat(z)]);
        } else if (line.startsWith('vn ')) {
            const [, x, y, z] = line.split(/\s+/);
            normals.push([parseFloat(x), parseFloat(y), parseFloat(z)]);
        } else if (line.startsWith('vt ')) {
            const [, u, v] = line.split(/\s+/);
            uvs.push([parseFloat(u), parseFloat(v)]);
        } else if (line.startsWith('usemtl ')) {
            curMaterial = line.split(' ')[1];
            if (!materialList.includes(curMaterial)) materialList.push(curMaterial);
        } else if (line.startsWith('f ')) {
            const verts = line.substr(2).trim().split(/\s+/);
            for (let i = 1; i < verts.length - 1; ++i) {
                const face = [0, i, i + 1];
                for (let j = 0; j < 3; ++j) {
                    const tokens = verts[face[j]].split('/');
                    const vi = parseInt(tokens[0]) || 1;
                    const vti = tokens[1] ? parseInt(tokens[1]) : 1;
                    const vni = tokens[2] ? parseInt(tokens[2]) : 1;
                    const key = `${vi}/${vti}/${vni}/${curMaterial}`;
                    if (uniqueVerts[key] === undefined) {
                        const pos = positions[vi - 1];
                        const nor = normals[vni - 1] || [0, 1, 0];
                        const col = (materials[curMaterial] || { Kd: [0.7, 0.7, 0.7] }).Kd;
                        if (useUV) {
                            const uv = uvs[vti - 1] || [0, 0];
                            vertices.push(...pos, ...nor, ...col, ...uv); // 11 floats
                            uniqueVerts[key] = (vertices.length / 11) - 1;
                        } else {
                            vertices.push(...pos, ...nor, ...col); // 9 floats
                            uniqueVerts[key] = (vertices.length / 9) - 1;
                        }
                    }
                    finalIndices.push(uniqueVerts[key]);
                    materialForFace.push(curMaterial); // Material per face
                }
            }
        }
    });

    return {
        vertices: new Float32Array(vertices),
        indices: new Uint16Array(finalIndices),
        materials,
        materialForFace,
        materialList
    };
}


// ===============
// GLMATRIX STATE (preserved)
// ===============
const STATE = {
    gl: null,
    mat4: glMatrix.mat4,
    vec3: glMatrix.vec3,
    vec4: glMatrix.vec4,
    canvas: null,
    shipPosition: glMatrix.vec3.fromValues(10, 0, 60),
    shipVAO: null,
    shipIndexCount: 0,
    cameraFront: glMatrix.vec3.fromValues(0, 0, -1),
    cameraUp: glMatrix.vec3.fromValues(0, 1, 0),
    cameraSpeed: 0.3,
    yaw: -90,
    pitch: 0,
    lastX: window.innerWidth / 2,
    lastY: window.innerHeight / 2,
    firstMouse: true,
    sensitivity: 0.1,
    ambientLight: glMatrix.vec3.fromValues(1.0, 1.0, 1.0),
    torchLit: false,
    torchMatrix: glMatrix.mat4.create(),
    torchVAO: null,
    torchClicked: false,
    torchHovered: false,
    torchLightIntensity: 0.0,
    maxTorchLight: 1.0,
    awakeningStarted: false,
    maxRiseY: 80.0,
    riseSpeed: 0.01,
    rlyehCenter: glMatrix.vec3.fromValues(-3, 0, -2),
    uModelLoc: null,
    uViewLoc: null,
    uProjectionLoc: null,
    cthulhuRiseY: 0,
    uAmbientLightLoc: null,
    uTorchLitLoc: null,
    uIsTorchLoc: null,
    uTorchLightPosLoc: null,
    uTorchLightIntensityLoc: null,
    uTorchHoveredLoc: null,
    program: null,
    torchYaw: 0,
    torchPitch: 0,
    torchControlMode: false,
    minAmbient: 0.01,
    minTorch: 0.1,
    maxTorch: 2.0,
    uTorchLightColorLoc: null,
    uTorchDirectionLoc: null,
    compassInspectMode: false,
    compassYaw: 0,     // Yaw (left/right)
    compassPitch: 0,   // Pitch (up/down)
    compassRestoreMatrix: null, // Previous matrix (if needed)
    compassHovered: false,
    uCompassHoveredLoc: null,
    uIsCompassLoc: null,
    pillarsTexture: null,
    shipTexture: null,
    compassTexture: null,
    cthulhuTexture: null,
    waterTexture: null,
    waterVAO: null,
    waterIndexCount: 0,
};
// Add right after STATE:
let pillarsRiseY = 0;
// Water Plane (2D Quad) - Position, Normal, Color, UV
const WATER_SIZE = 60000;
const HALF = WATER_SIZE / 2;
const waterVertices = new Float32Array([
    -HALF, 0, -HALF, 0, 1, 0, 1, 1, 1, 0, 0,   // Back-left
    HALF, 0, -HALF, 0, 1, 0, 1, 1, 1, 1, 0,   // Back-right
    HALF, 0, HALF, 0, 1, 0, 1, 1, 1, 1, 1,   // Front-right
    -HALF, 0, HALF, 0, 1, 0, 1, 1, 1, 0, 1    // Front-left
]);
const waterIndices = new Uint16Array([
    0, 1, 2, 0, 2, 3
]);


//-------------------------------------------------------------------------------------------------------//
const pillarsMaxRiseY = 25.0; // Max rise distance (editable)
const pillarsRiseSpeed = 0.05; // Rise speed (per frame)
const CTHULHU_SCALE = 25;
let compassInspectedOnce = false;

// Pillar positions (parallel and passable by the boat)
const pillarPositions = [
    [-50, 0, -30],
    [0, 0, -30],
    [50, 0, -30]
    // (Adjust spacing and count as needed)
];

// Model matrices
const pillar1Matrix = STATE.mat4.create();
STATE.mat4.translate(pillar1Matrix, pillar1Matrix, [-3, 0, -2]);
const pillar2Matrix = STATE.mat4.create();
STATE.mat4.translate(pillar2Matrix, pillar2Matrix, [2, 0, -4]);
const cthulhuHeadMatrix = STATE.mat4.create();
STATE.mat4.translate(cthulhuHeadMatrix, cthulhuHeadMatrix, [0, 1.5, -6]);
const cthulhuBodyMatrix = STATE.mat4.create();
STATE.mat4.translate(cthulhuBodyMatrix, cthulhuBodyMatrix, [0, 0, -6]);

function createWaterGrid(cols, rows, size = 1) {
    // cols, rows: number of segments (e.g. 200, 200)
    // size: square size (e.g. 2)
    const positions = [];
    const normals = [];
    const colors = [];
    const uvs = [];
    const indices = [];
    const HALF_X = (cols * size) / 2;
    const HALF_Z = (rows * size) / 2;
    for (let i = 0; i <= rows; i++) {
        for (let j = 0; j <= cols; j++) {
            const x = j * size - HALF_X; // X centered
            const z = i * size - HALF_Z; // Z centered
            positions.push(x, 0, z);
            normals.push(0, 1, 0);
            colors.push(0.15, 0.23, 0.35);
            uvs.push(j / cols, i / rows);
        }
    }
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            const a = i * (cols + 1) + j;
            const b = a + 1;
            const c = a + (cols + 1);
            const d = c + 1;
            indices.push(a, c, b);
            indices.push(b, c, d);
        }
    }
    const vertices = [];
    for (let i = 0; i < positions.length / 3; i++) {
        vertices.push(
            positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2],
            normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2],
            colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2],
            uvs[i * 2], uvs[i * 2 + 1]
        );
    }
    return {
        vertices: new Float32Array(vertices),
        indices: new Uint32Array(indices)
    };
}

function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

// FPS torch: small torch with fixed offset relative to camera
function getTorchPosition() {
    if (STATE.torchLit) {
        // FPS torch: offset from camera (right-bottom/middle)
        const forwardDist = 1.2;
        const rightDist = 0.5;
        const downDist = -0.4;

        const cameraPos = STATE.vec3.clone(STATE.shipPosition);
        cameraPos[1] += 1.2;
        cameraPos[2] += 0.3;

        const front = STATE.vec3.clone(STATE.cameraFront);
        STATE.vec3.normalize(front, front);

        const worldUp = [0, 1, 0];
        const right = STATE.vec3.create();
        STATE.vec3.cross(right, front, worldUp);
        STATE.vec3.normalize(right, right);

        const up = STATE.vec3.create();
        STATE.vec3.cross(up, right, front);
        STATE.vec3.normalize(up, up);

        let torchPos = STATE.vec3.clone(cameraPos);
        STATE.vec3.scaleAndAdd(torchPos, torchPos, front, forwardDist);
        STATE.vec3.scaleAndAdd(torchPos, torchPos, right, rightDist);
        STATE.vec3.scaleAndAdd(torchPos, torchPos, up, downDist);

        return torchPos;
    } else {
        // Static torch: standing upright on the boat (same as in drawScene)
        return [
            STATE.shipPosition[0] + 0.8, // X
            STATE.shipPosition[1],      // Y
            STATE.shipPosition[2] - 1.2 // Z
        ];
    }
}

// Mouse/keyboard events: camera and torch hover
window.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement !== STATE.canvas) return;

    // Skip first mouse move after pointer lock (avoid camera jump)
    if (STATE.firstMouse) {
        STATE.firstMouse = false;
        return;
    }

    // Camera rotation
    let offsetX = event.movementX * STATE.sensitivity;
    let offsetY = -event.movementY * STATE.sensitivity;

    STATE.yaw += offsetX;
    STATE.pitch += offsetY;
    if (STATE.pitch > 89.0) STATE.pitch = 89.0;
    if (STATE.pitch < -89.0) STATE.pitch = -89.0;

    const front = STATE.vec3.create();
    front[0] = Math.cos(toRadians(STATE.yaw)) * Math.cos(toRadians(STATE.pitch));
    front[1] = Math.sin(toRadians(STATE.pitch));
    front[2] = Math.sin(toRadians(STATE.yaw)) * Math.cos(toRadians(STATE.pitch));
    STATE.vec3.normalize(STATE.cameraFront, front);

    // Update right and up vectors for FPS camera
    const right = STATE.vec3.create();
    STATE.vec3.cross(right, STATE.cameraFront, [0, 1, 0]);
    STATE.vec3.normalize(right, right);

    const up = STATE.vec3.create();
    STATE.vec3.cross(up, right, STATE.cameraFront);
    STATE.vec3.normalize(up, up);
    STATE.cameraUp = up;

    // --- Compass Hover ---
    if (!STATE.compassInspectMode) {
        const rect = STATE.canvas.getBoundingClientRect();
        const mouseX = ((event.clientX - rect.left) / STATE.canvas.width) * 2 - 1;
        const mouseY = -((event.clientY - rect.top) / STATE.canvas.height) * 2 + 1;

        // Camera setup
        const viewMatrix = STATE.mat4.create();
        const cameraPosition = STATE.vec3.clone(STATE.shipPosition);
        cameraPosition[1] += 1.2;
        cameraPosition[2] += 0.3;
        const target = STATE.vec3.create();
        STATE.vec3.add(target, cameraPosition, STATE.cameraFront);
        STATE.mat4.lookAt(viewMatrix, cameraPosition, target, STATE.cameraUp);

        const projectionMatrix = STATE.mat4.create();
        STATE.mat4.perspective(projectionMatrix, Math.PI / 4, STATE.canvas.width / STATE.canvas.height, 0.1, 300);

        const ray = getRayFromMouse(mouseX, mouseY, viewMatrix, projectionMatrix);

        // Compute compass center position
        const compassPos = getCompassPosition();
        STATE.compassHovered = rayIntersectsSphere(ray.origin, ray.direction, compassPos, 0.22);
    } else {
        STATE.compassHovered = false;
    }

    // --- Torch Hover (only if awakening started and torch is off) ---
    if (STATE.awakeningStarted && !STATE.torchLit) {
        const rect = STATE.canvas.getBoundingClientRect();
        const mouseX = ((event.clientX - rect.left) / STATE.canvas.width) * 2 - 1;
        const mouseY = -((event.clientY - rect.top) / STATE.canvas.height) * 2 + 1;

        const viewMatrix = STATE.mat4.create();
        const cameraPosition = STATE.vec3.clone(STATE.shipPosition);
        cameraPosition[1] += 1.2;
        cameraPosition[2] += 1.5;
        const target = STATE.vec3.create();
        STATE.vec3.add(target, cameraPosition, STATE.cameraFront);
        STATE.mat4.lookAt(viewMatrix, cameraPosition, target, STATE.cameraUp);

        const projectionMatrix = STATE.mat4.create();
        STATE.mat4.perspective(projectionMatrix, Math.PI / 4, STATE.canvas.width / STATE.canvas.height, 0.1, 500);

        const ray = getRayFromMouse(mouseX, mouseY, viewMatrix, projectionMatrix);
        const pickPos = [
            STATE.shipPosition[0] + 0.8,
            STATE.shipPosition[1],
            STATE.shipPosition[2] - 1.2
        ];
        STATE.torchHovered = rayIntersectsSphere(ray.origin, ray.direction, pickPos, 0.6);
    } else {
        STATE.torchHovered = false;
    }
});

//--------------------------------------------------------------------------------------------------------------------------------//
// 4. MOUSE SCROLL: Adjust torch brightness
window.addEventListener('wheel', (e) => {
    if (STATE.torchLit && STATE.torchControlMode) {
        STATE.torchLightIntensity += (e.deltaY < 0 ? 0.05 : -0.05);
        STATE.torchLightIntensity = Math.max(STATE.minTorch, Math.min(STATE.maxTorch, STATE.torchLightIntensity));
        document.getElementById("torch-brightness").textContent = STATE.torchLightIntensity.toFixed(2);
    }
});

window.addEventListener("keydown", (e) => {

    if (e.key.toLowerCase() === 'r') {
        resetScene();
        return;
    }

    if (STATE.compassInspectMode) {
        // Rotate with WASD or arrow keys
        if (e.key === "ArrowLeft" || e.key === "a") {
            STATE.compassYaw -= 0.08;
        } else if (e.key === "ArrowRight" || e.key === "d") {
            STATE.compassYaw += 0.08;
        } else if (e.key === "ArrowUp" || e.key === "w") {
            STATE.compassPitch = Math.max(-Math.PI / 2, STATE.compassPitch - 0.08);
        } else if (e.key === "ArrowDown" || e.key === "s") {
            STATE.compassPitch = Math.min(Math.PI / 2, STATE.compassPitch + 0.08);
        } else if (e.key === "c" || e.key === "C") {
            STATE.compassInspectMode = false;
            STATE.compassYaw = 0;
            STATE.compassPitch = 0;
            compassInspectedOnce = true;
        }
        // Block other keys
        e.preventDefault();
        return;
    }

    // Toggle FPS torch mode with "M"
    if (e.key.toLowerCase() === "m" && STATE.torchLit) {
        STATE.torchControlMode = !STATE.torchControlMode;
        document.getElementById("torch-mode").textContent = STATE.torchControlMode ? "ON" : "OFF";
        return;
    }

    if (e.key.toLowerCase() === 'h') {
        const panel = document.getElementById("help-panel");
        if (panel.style.display === "none" || panel.style.opacity === "0") {
            window.showHelpPanel();
        } else {
            window.hideHelpPanel();
        }
    }

    if (!compassInspectedOnce || STATE.awakeningStarted) return;
    const direction = STATE.vec3.create();
    switch (e.key.toLowerCase()) {
        case "w": {
            // Zero cameraFront Y, normalize
            const forward = STATE.vec3.clone(STATE.cameraFront);
            forward[1] = 0;
            STATE.vec3.normalize(forward, forward);
            STATE.vec3.scale(direction, forward, STATE.cameraSpeed);
            STATE.vec3.add(STATE.shipPosition, STATE.shipPosition, direction);
            break;
        }
        case "s": {
            const forward = STATE.vec3.clone(STATE.cameraFront);
            forward[1] = 0;
            STATE.vec3.normalize(forward, forward);
            STATE.vec3.scale(direction, forward, STATE.cameraSpeed);
            STATE.vec3.sub(STATE.shipPosition, STATE.shipPosition, direction);
            break;
        }
        case "a": {
            const right = STATE.vec3.create();
            // Use [0,1,0] as up for surface-right vector
            STATE.vec3.cross(right, STATE.cameraFront, [0, 1, 0]);
            STATE.vec3.normalize(right, right);
            STATE.vec3.scale(right, right, STATE.cameraSpeed);
            STATE.vec3.sub(STATE.shipPosition, STATE.shipPosition, right);
            break;
        }
        case "d": {
            const right = STATE.vec3.create();
            STATE.vec3.cross(right, STATE.cameraFront, [0, 1, 0]);
            STATE.vec3.normalize(right, right);
            STATE.vec3.scale(right, right, STATE.cameraSpeed);
            STATE.vec3.add(STATE.shipPosition, STATE.shipPosition, right);
            break;
        }
    }

    if (e.key.toLowerCase() === 'r') {
        if (STATE.awakeningStarted && STATE.cthulhuRiseY >= STATE.maxRiseY) {
            resetScene();
        }
    }
});

document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement !== STATE.canvas) STATE.firstMouse = true;
});

if (compassInspectedOnce) {
    window.hideCompassWarning();
}


// =====================
// MAIN
// =====================
async function main() {
    STATE.canvas = document.getElementById("glCanvas");
    STATE.gl = STATE.canvas.getContext("webgl2");
    STATE.canvas.width = window.innerWidth;
    STATE.canvas.height = window.innerHeight;
    STATE.gl.viewport(0, 0, STATE.canvas.width, STATE.canvas.height);
    STATE.gl.clearColor(0.0, 0.1, 0.2, 1.0);
    STATE.gl.enable(STATE.gl.DEPTH_TEST);

    // Shader kaynaklarını yükle
    const vertexSrc = await loadShaderSource("shaders/vertex.glsl");
    const fragmentSrc = await loadShaderSource("shaders/fragment.glsl");
    const vertexShader = compileShader(STATE.gl, vertexSrc, STATE.gl.VERTEX_SHADER);
    const fragmentShader = compileShader(STATE.gl, fragmentSrc, STATE.gl.FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) return;
    STATE.program = createProgram(STATE.gl, vertexShader, fragmentShader);
    if (!STATE.program) return;
    STATE.gl.useProgram(STATE.program);

    // Uniform locations
    STATE.aPositionLoc = STATE.gl.getAttribLocation(STATE.program, "aPosition");
    STATE.aNormalLoc = STATE.gl.getAttribLocation(STATE.program, "aNormal");
    STATE.aColorLoc = STATE.gl.getAttribLocation(STATE.program, "aColor");
    STATE.uModelLoc = STATE.gl.getUniformLocation(STATE.program, "uModel");
    STATE.uViewLoc = STATE.gl.getUniformLocation(STATE.program, "uView");
    STATE.uProjectionLoc = STATE.gl.getUniformLocation(STATE.program, "uProjection");
    STATE.uAmbientLightLoc = STATE.gl.getUniformLocation(STATE.program, "uAmbientLight");
    STATE.uTorchLitLoc = STATE.gl.getUniformLocation(STATE.program, "uTorchLit");
    STATE.uIsTorchLoc = STATE.gl.getUniformLocation(STATE.program, "uIsTorch");
    STATE.uTorchLightPosLoc = STATE.gl.getUniformLocation(STATE.program, "uTorchLightPos");
    STATE.uTorchLightIntensityLoc = STATE.gl.getUniformLocation(STATE.program, "uTorchLightIntensity");
    STATE.uTorchHoveredLoc = STATE.gl.getUniformLocation(STATE.program, "uTorchHovered");
    STATE.uTorchLightColorLoc = STATE.gl.getUniformLocation(STATE.program, "uTorchLightColor");
    STATE.uTorchDirectionLoc = STATE.gl.getUniformLocation(STATE.program, "uTorchDirection");
    STATE.uCompassHoveredLoc = STATE.gl.getUniformLocation(STATE.program, "uCompassHovered");
    STATE.uIsCompassLoc = STATE.gl.getUniformLocation(STATE.program, "uIsCompass");

    // 1) BOT (OBJ) MODELİNİ YÜKLE
    STATE.shipTexture = loadTexture(STATE.gl, 'assets/textures/WeatheredWood2_S.jpg');
    const botModel = await loadOBJWithMTL('assets/models/woodBoat.obj', 'assets/models/woodBoat.mtl', true);
    const shipVAO = STATE.gl.createVertexArray();
    STATE.gl.bindVertexArray(shipVAO);

    const vbo = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ARRAY_BUFFER, vbo);
    STATE.gl.bufferData(STATE.gl.ARRAY_BUFFER, botModel.vertices, STATE.gl.STATIC_DRAW);

    const ebo = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ELEMENT_ARRAY_BUFFER, ebo);
    STATE.gl.bufferData(STATE.gl.ELEMENT_ARRAY_BUFFER, botModel.indices, STATE.gl.STATIC_DRAW);

    const aPositionLoc = STATE.gl.getAttribLocation(STATE.program, "aPosition");
    const aNormalLoc = STATE.gl.getAttribLocation(STATE.program, "aNormal");
    const aColorLoc = STATE.gl.getAttribLocation(STATE.program, "aColor");
    const aTexCoordLoc = STATE.gl.getAttribLocation(STATE.program, "aTexCoord");

    STATE.gl.enableVertexAttribArray(aPositionLoc);
    STATE.gl.vertexAttribPointer(aPositionLoc, 3, STATE.gl.FLOAT, false, 11 * 4, 0);
    STATE.gl.enableVertexAttribArray(aNormalLoc);
    STATE.gl.vertexAttribPointer(aNormalLoc, 3, STATE.gl.FLOAT, false, 11 * 4, 3 * 4);
    STATE.gl.enableVertexAttribArray(aColorLoc);
    STATE.gl.vertexAttribPointer(aColorLoc, 3, STATE.gl.FLOAT, false, 11 * 4, 6 * 4);
    STATE.gl.enableVertexAttribArray(aTexCoordLoc);
    STATE.gl.vertexAttribPointer(aTexCoordLoc, 2, STATE.gl.FLOAT, false, 11 * 4, 9 * 4);

    STATE.shipVAO = shipVAO;
    STATE.shipIndexCount = botModel.indices.length;

    const viewMatrix = STATE.mat4.create();
    const projectionMatrix = STATE.mat4.create();
    STATE.mat4.lookAt(viewMatrix, STATE.vec3.fromValues(0, 2, 8), STATE.vec3.fromValues(0, 0, 0), STATE.vec3.fromValues(0, 1, 0));
    STATE.mat4.perspective(projectionMatrix, Math.PI / 4, STATE.canvas.width / STATE.canvas.height, 0.1, 300);
    STATE.gl.uniformMatrix4fv(STATE.uViewLoc, false, viewMatrix);
    STATE.gl.uniformMatrix4fv(STATE.uProjectionLoc, false, projectionMatrix);

    // Torch VAO/VBO/EBO
    const torchModel = await loadOBJWithMTL('assets/models/torch.obj', 'assets/models/torch.mtl', false);
    STATE.torchMetallicTex = loadTexture(STATE.gl, 'assets/textures/lantern_Metallic.jpg');
    const torchVAO = STATE.gl.createVertexArray();
    STATE.gl.bindVertexArray(torchVAO);

    const torchVBO = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ARRAY_BUFFER, torchVBO);
    STATE.gl.bufferData(STATE.gl.ARRAY_BUFFER, torchModel.vertices, STATE.gl.STATIC_DRAW);

    const torchEBO = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ELEMENT_ARRAY_BUFFER, torchEBO);
    STATE.gl.bufferData(STATE.gl.ELEMENT_ARRAY_BUFFER, torchModel.indices, STATE.gl.STATIC_DRAW);

    STATE.gl.enableVertexAttribArray(aPositionLoc);
    STATE.gl.vertexAttribPointer(aPositionLoc, 3, STATE.gl.FLOAT, false, 9 * 4, 0);
    STATE.gl.enableVertexAttribArray(aNormalLoc);
    STATE.gl.vertexAttribPointer(aNormalLoc, 3, STATE.gl.FLOAT, false, 9 * 4, 3 * 4);
    STATE.gl.enableVertexAttribArray(aColorLoc);
    STATE.gl.vertexAttribPointer(aColorLoc, 3, STATE.gl.FLOAT, false, 9 * 4, 6 * 4);

    STATE.torchVAO = torchVAO;
    STATE.torchIndexCount = torchModel.indices.length;

    // PUSULA VAO, BODY/NEEDLE İÇİN AYRI EBO'LAR
    STATE.compassTexture = loadTexture(STATE.gl, 'assets/textures/OC1KI90.jpg');
    const compassModel = await loadOBJWithMTL('assets/models/compass.obj', 'assets/models/compass.mtl', false);

    // Body/needle indexlerini ayır
    const compassBodyIndices = [];
    const compassNeedleIndices = [];
    for (let i = 0; i < compassModel.indices.length; i += 3) {
        const mat = compassModel.materialForFace[i];
        if (mat === "bodyMat") {
            compassBodyIndices.push(
                compassModel.indices[i],
                compassModel.indices[i + 1],
                compassModel.indices[i + 2]
            );
        } else if (mat === "needleMat") {
            compassNeedleIndices.push(
                compassModel.indices[i],
                compassModel.indices[i + 1],
                compassModel.indices[i + 2]
            );
        }
    }
    STATE.compassBodyIndices = new Uint16Array(compassBodyIndices);
    STATE.compassNeedleIndices = new Uint16Array(compassNeedleIndices);

    const compassVAO = STATE.gl.createVertexArray();
    STATE.gl.bindVertexArray(compassVAO);

    const compassVBO = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ARRAY_BUFFER, compassVBO);
    STATE.gl.bufferData(STATE.gl.ARRAY_BUFFER, compassModel.vertices, STATE.gl.STATIC_DRAW);

    // iki EBO oluştur
    const compassBodyEBO = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ELEMENT_ARRAY_BUFFER, compassBodyEBO);
    STATE.gl.bufferData(STATE.gl.ELEMENT_ARRAY_BUFFER, STATE.compassBodyIndices, STATE.gl.STATIC_DRAW);

    const compassNeedleEBO = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ELEMENT_ARRAY_BUFFER, compassNeedleEBO);
    STATE.gl.bufferData(STATE.gl.ELEMENT_ARRAY_BUFFER, STATE.compassNeedleIndices, STATE.gl.STATIC_DRAW);

    STATE.gl.enableVertexAttribArray(aPositionLoc);
    STATE.gl.vertexAttribPointer(aPositionLoc, 3, STATE.gl.FLOAT, false, 9 * 4, 0);
    STATE.gl.enableVertexAttribArray(aNormalLoc);
    STATE.gl.vertexAttribPointer(aNormalLoc, 3, STATE.gl.FLOAT, false, 9 * 4, 3 * 4);
    STATE.gl.enableVertexAttribArray(aColorLoc);
    STATE.gl.vertexAttribPointer(aColorLoc, 3, STATE.gl.FLOAT, false, 9 * 4, 6 * 4);

    STATE.compassVAO = compassVAO;
    STATE.compassBodyEBO = compassBodyEBO;
    STATE.compassNeedleEBO = compassNeedleEBO;
    STATE.compassBodyIndexCount = STATE.compassBodyIndices.length;
    STATE.compassNeedleIndexCount = STATE.compassNeedleIndices.length;

    // Diğer modeller...
    STATE.pillarsTexture = loadTexture(STATE.gl, 'assets/textures/germany010.jpg');
    const pillarsModel = await loadOBJWithMTL('assets/models/pillars.obj', 'assets/models/pillars.mtl', true);
    const pillarsVAO = STATE.gl.createVertexArray();
    STATE.gl.bindVertexArray(pillarsVAO);

    const pillarsVBO = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ARRAY_BUFFER, pillarsVBO);
    STATE.gl.bufferData(STATE.gl.ARRAY_BUFFER, pillarsModel.vertices, STATE.gl.STATIC_DRAW);

    const pillarsEBO = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ELEMENT_ARRAY_BUFFER, pillarsEBO);
    STATE.gl.bufferData(STATE.gl.ELEMENT_ARRAY_BUFFER, pillarsModel.indices, STATE.gl.STATIC_DRAW);

    STATE.gl.enableVertexAttribArray(aPositionLoc);
    STATE.gl.vertexAttribPointer(aPositionLoc, 3, STATE.gl.FLOAT, false, 11 * 4, 0);
    STATE.gl.enableVertexAttribArray(aNormalLoc);
    STATE.gl.vertexAttribPointer(aNormalLoc, 3, STATE.gl.FLOAT, false, 11 * 4, 3 * 4);
    STATE.gl.enableVertexAttribArray(aColorLoc);
    STATE.gl.vertexAttribPointer(aColorLoc, 3, STATE.gl.FLOAT, false, 11 * 4, 6 * 4);
    STATE.gl.enableVertexAttribArray(aTexCoordLoc);
    STATE.gl.vertexAttribPointer(aTexCoordLoc, 2, STATE.gl.FLOAT, false, 11 * 4, 9 * 4);

    STATE.pillarsVAO = pillarsVAO;
    STATE.pillarsIndexCount = pillarsModel.indices.length;

    // CTHULHU OBJECT
    STATE.cthulhuTexture = loadTexture(STATE.gl, 'assets/textures/Cthulhu_2k_Base_Color.png');
    // AO (Ambient Occlusion) Texture
    STATE.cthulhuAOTex = loadTexture(STATE.gl, 'assets/textures/Cthulhu_2k_AO.png');
    // Metallic Texture
    STATE.cthulhuMetallicTex = loadTexture(STATE.gl, 'assets/textures/Cthulhu_2k_Metallic.png');
    // Roughness Texture
    STATE.cthulhuRoughnessTex = loadTexture(STATE.gl, 'assets/textures/Cthulhu_2k_Roughness.png');
    const cthulhuModel = await loadOBJWithMTL('assets/models/Horror_low_subd.obj', null, true);
    const cthulhuVAO = STATE.gl.createVertexArray();
    STATE.gl.bindVertexArray(cthulhuVAO);

    const cthulhuVBO = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ARRAY_BUFFER, cthulhuVBO);
    STATE.gl.bufferData(STATE.gl.ARRAY_BUFFER, cthulhuModel.vertices, STATE.gl.STATIC_DRAW);

    const cthulhuEBO = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ELEMENT_ARRAY_BUFFER, cthulhuEBO);
    STATE.gl.bufferData(STATE.gl.ELEMENT_ARRAY_BUFFER, cthulhuModel.indices, STATE.gl.STATIC_DRAW);

    // Her vertex için: [x,y,z, nx,ny,nz, r,g,b, u,v] toplam 11 float
    STATE.gl.enableVertexAttribArray(aPositionLoc);
    STATE.gl.vertexAttribPointer(aPositionLoc, 3, STATE.gl.FLOAT, false, 11 * 4, 0);

    STATE.gl.enableVertexAttribArray(aNormalLoc);
    STATE.gl.vertexAttribPointer(aNormalLoc, 3, STATE.gl.FLOAT, false, 11 * 4, 3 * 4);

    STATE.gl.enableVertexAttribArray(aColorLoc);
    STATE.gl.vertexAttribPointer(aColorLoc, 3, STATE.gl.FLOAT, false, 11 * 4, 6 * 4);

    STATE.gl.enableVertexAttribArray(aTexCoordLoc);
    STATE.gl.vertexAttribPointer(aTexCoordLoc, 2, STATE.gl.FLOAT, false, 11 * 4, 9 * 4);

    STATE.cthulhuVAO = cthulhuVAO;
    STATE.cthulhuIndexCount = cthulhuModel.indices.length;

    STATE.waterTexture = loadTexture(STATE.gl, 'assets/textures/beautiful-photo-sea-waves.jpg');
    // 1. Su gridini oluştur (örnek: 200x200 grid, kare başına 2 birim)
    const waterMesh = createWaterGrid(200, 200, 2);

    // 2. VAO/VBO/EBO oluştur ve ata
    const waterVAO = STATE.gl.createVertexArray();
    STATE.gl.bindVertexArray(waterVAO);

    const waterVBO = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ARRAY_BUFFER, waterVBO);
    STATE.gl.bufferData(STATE.gl.ARRAY_BUFFER, waterMesh.vertices, STATE.gl.STATIC_DRAW);

    const waterEBO = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ELEMENT_ARRAY_BUFFER, waterEBO);
    STATE.gl.bufferData(STATE.gl.ELEMENT_ARRAY_BUFFER, waterMesh.indices, STATE.gl.STATIC_DRAW);

    STATE.gl.enableVertexAttribArray(aPositionLoc);
    STATE.gl.vertexAttribPointer(aPositionLoc, 3, STATE.gl.FLOAT, false, 11 * 4, 0);

    STATE.gl.enableVertexAttribArray(aNormalLoc);
    STATE.gl.vertexAttribPointer(aNormalLoc, 3, STATE.gl.FLOAT, false, 11 * 4, 3 * 4);

    STATE.gl.enableVertexAttribArray(aColorLoc);
    STATE.gl.vertexAttribPointer(aColorLoc, 3, STATE.gl.FLOAT, false, 11 * 4, 6 * 4);

    STATE.gl.enableVertexAttribArray(aTexCoordLoc);
    STATE.gl.vertexAttribPointer(aTexCoordLoc, 2, STATE.gl.FLOAT, false, 11 * 4, 9 * 4);

    // 4. STATE'e kaydet
    STATE.waterVAO = waterVAO;
    STATE.waterIndexCount = waterMesh.indices.length;

    // Canvas eventleri vs. aynı kalacak...
    STATE.canvas.addEventListener("click", (event) => {
        STATE.canvas.requestPointerLock();

        // 1. Önce compass'a tıklama kontrolü (ve return!)
        if (!STATE.compassInspectMode) {
            const rect = STATE.canvas.getBoundingClientRect();
            const mouseX = ((event.clientX - rect.left) / STATE.canvas.width) * 2 - 1;
            const mouseY = -((event.clientY - rect.top) / STATE.canvas.height) * 2 + 1;

            // Kamera bilgisi
            const viewMatrix = STATE.mat4.create();
            const cameraPosition = STATE.vec3.clone(STATE.shipPosition);
            cameraPosition[1] += 1.2;
            cameraPosition[2] += 0.3;
            const target = STATE.vec3.create();
            STATE.vec3.add(target, cameraPosition, STATE.cameraFront);
            STATE.mat4.lookAt(viewMatrix, cameraPosition, target, STATE.cameraUp);

            const projectionMatrix = STATE.mat4.create();
            STATE.mat4.perspective(projectionMatrix, Math.PI / 4, STATE.canvas.width / STATE.canvas.height, 0.1, 300);

            const ray = getRayFromMouse(mouseX, mouseY, viewMatrix, projectionMatrix);

            // --- Önce pusulaya tıklanmış mı?
            const compassPos = getCompassPosition();
            if (rayIntersectsSphere(ray.origin, ray.direction, compassPos, 0.22)) {
                STATE.compassInspectMode = true;
                window.hideCompassWarning && window.hideCompassWarning();
                return; // Pusulaya tıklandıysa, torch'u kontrol etme!
            }

            // --- Sonra torch tıklama mantığı ---
            const awakeningComplete = STATE.awakeningStarted && STATE.cthulhuRiseY >= STATE.maxRiseY;
            if (!awakeningComplete || STATE.torchLit || STATE.torchClicked) return;

            // Aynı mouse koordinatları ve view/projection matrix kullanabilirsin!
            const torchPos = getTorchPosition();
            if (rayIntersectsSphere(ray.origin, ray.direction, torchPos, 0.3)) {
                STATE.torchClicked = true;
                STATE.torchLit = true;
                return;
            }
        }
    });



    drawScene();
}
//--------------------------------------------------------------------------------------------------------------------------------
// Yardım panelini göster/gizle fonksiyonları (global)
window.hideHelpPanel = function () {
    const panel = document.getElementById("help-panel");
    if (panel) {
        panel.style.opacity = "0";
        panel.style.pointerEvents = "none";
        setTimeout(() => { panel.style.display = "none"; }, 250);
    }
};
window.showHelpPanel = function () {
    const panel = document.getElementById("help-panel");
    if (panel) {
        panel.style.display = "block";
        setTimeout(() => {
            panel.style.opacity = "1";
            panel.style.pointerEvents = "auto";
        }, 10);
    }
};

function getCompassPosition() {
    return [
        STATE.shipPosition[0] - 0.6,
        STATE.shipPosition[1],
        STATE.shipPosition[2] - 1.4
    ];
}
function getFPSTorchMatrix() {
    // 1. Kamera pozisyonunu al
    const cameraPosition = STATE.vec3.clone(STATE.shipPosition);
    cameraPosition[1] += 1.2;
    cameraPosition[2] += 0.3;

    // 2. FPS torch için offset uygula (önde ve sağda dursun)
    const forwardDist = 1.0;
    const rightDist = 0.4;
    const downDist = -0.2;

    const front = STATE.vec3.clone(STATE.cameraFront);
    STATE.vec3.normalize(front, front);

    const worldUp = [0, 1, 0];
    const right = STATE.vec3.create();
    STATE.vec3.cross(right, front, worldUp);
    STATE.vec3.normalize(right, right);

    const up = STATE.vec3.create();
    STATE.vec3.cross(up, right, front);
    STATE.vec3.normalize(up, up);

    // Torch pozisyonu (başın önünde, hafif sağda ve aşağıda)
    let torchPos = STATE.vec3.clone(cameraPosition);
    STATE.vec3.scaleAndAdd(torchPos, torchPos, front, forwardDist);
    STATE.vec3.scaleAndAdd(torchPos, torchPos, right, rightDist);
    STATE.vec3.scaleAndAdd(torchPos, torchPos, up, downDist);

    // 3. Torch matrisini oluştur
    const torchMatrix = STATE.mat4.create();

    // Önce pozisyona taşı
    STATE.mat4.translate(torchMatrix, torchMatrix, torchPos);

    let alignMat = STATE.mat4.create();
    STATE.mat4.targetTo(
        alignMat,
        [0, 0, 0],                       // torch modelinin merkezi
        front,                           // hedef yön: kamera yönü
        up                               // yukarı vektörü
    );
    STATE.mat4.multiply(torchMatrix, torchMatrix, alignMat);

    STATE.mat4.rotateX(torchMatrix, torchMatrix, -Math.PI / 6);

    STATE.mat4.scale(torchMatrix, torchMatrix, [0.3, 0.3, 0.3]);

    return torchMatrix;
}



function isLookingAtRlyeh() {
    for (const pos of pillarPositions) {
        const toPillar = STATE.vec3.create();
        STATE.vec3.sub(toPillar, pos, STATE.shipPosition);
        STATE.vec3.normalize(toPillar, toPillar);

        const dot = STATE.vec3.dot(STATE.cameraFront, toPillar);
        const angle = Math.acos(dot) * 180 / Math.PI; // derece cinsinden

        const distance = STATE.vec3.distance(STATE.shipPosition, pos);

        if (distance < 40.0 && angle < 40) {
            return true; // En az bir sütun için trigger!
        }
    }
    return false;
}

function resetScene() {
    STATE.awakeningStarted = false;
    STATE.cthulhuRiseY = 0;
    STATE.torchLit = false;
    STATE.torchClicked = false;
    STATE.ambientLight = glMatrix.vec3.fromValues(1.0, 1.0, 1.0);
    STATE.shipPosition = glMatrix.vec3.fromValues(10, 0, 60);
    pillarsRiseY = 0;
    STATE.torchHovered = false;
    STATE.torchLightIntensity = 0.0;
    STATE.compassInspectMode = false;
    compassInspectedOnce = false;
    STATE.yaw = -90;
    STATE.pitch = 0;
    STATE.firstMouse = true;
}

function loadTexture(gl, url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([120, 100, 80, 255]));
    const image = new Image();
    image.onload = function () {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
        console.log("Texture loaded: " + url);
    };
    image.onerror = function () {
        console.error("Texture FAILED: " + url);
    };
    image.src = url;
    return texture;
}
function getTorchLightWorldPosition() {
    // FPS torch için torchMatrix torch'un FPS pozisyonunda olmalı!
    // Torch modelinin ucunun model-space pozisyonu (genellikle [0, 1, 0, 1])
    const tip = STATE.vec4.fromValues(0, 1, 0, 1);
    const worldTip = STATE.vec4.create();
    STATE.vec4.transformMat4(worldTip, tip, STATE.torchMatrix);
    return [worldTip[0], worldTip[1], worldTip[2]];
}

function drawScene() {
    const gl = STATE.gl;

    // 1. Ambient ve torch intensity logic
    if (STATE.torchLit && !STATE.torchControlMode) {
        STATE.ambientLight[0] = Math.min(STATE.ambientLight[0] + 0.01, 0.8);
        STATE.ambientLight[1] = Math.min(STATE.ambientLight[1] + 0.008, 0.55);
        STATE.ambientLight[2] = Math.min(STATE.ambientLight[2] + 0.002, 0.25);
        if (STATE.torchLightIntensity < STATE.maxTorchLight) {
            let inc = Math.max(0.003, 0.012 * (STATE.ambientLight[0]));
            STATE.torchLightIntensity = Math.min(STATE.torchLightIntensity + inc, STATE.maxTorchLight);
        }
    } else if (STATE.torchLit && STATE.torchControlMode) {
    } else if (STATE.awakeningStarted) {
        STATE.ambientLight[0] = Math.max(STATE.ambientLight[0] - 0.05, 0.0);
        STATE.ambientLight[1] = Math.max(STATE.ambientLight[1] - 0.01, 0.0);
        STATE.ambientLight[2] = Math.max(STATE.ambientLight[2] - 0.006, 0.0);
    }

    // 2. View ve kamera ayarı
    let cameraPosition = STATE.vec3.clone(STATE.shipPosition);
    cameraPosition[1] += 1.2;
    cameraPosition[2] += 0.3;
    let target = STATE.vec3.create();
    STATE.vec3.add(target, cameraPosition, STATE.cameraFront);

    const viewMatrix = STATE.mat4.create();
    STATE.mat4.lookAt(viewMatrix, cameraPosition, target, STATE.cameraUp);
    gl.uniformMatrix4fv(STATE.uViewLoc, false, viewMatrix);

    if (STATE.torchLit) {
        STATE.torchMatrix = getFPSTorchMatrix();
    } else {
        STATE.mat4.identity(STATE.torchMatrix);
        STATE.mat4.translate(STATE.torchMatrix, STATE.torchMatrix, [
            STATE.shipPosition[0] + 0.8,
            STATE.shipPosition[1],
            STATE.shipPosition[2] - 1.1
        ]);
        STATE.mat4.rotateX(STATE.torchMatrix, STATE.torchMatrix, -Math.PI / 8);
        STATE.mat4.scale(STATE.torchMatrix, STATE.torchMatrix, [0.3, 0.3, 0.3]);
    }

    // 4. Uniform'lar ve temizlik
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // === WATER DRAW ===
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, STATE.waterTexture);
    gl.uniform1i(gl.getUniformLocation(STATE.program, "uTexture"), 4);
    gl.uniform1i(gl.getUniformLocation(STATE.program, "uUseTexture"), 1);

    gl.bindVertexArray(STATE.waterVAO);

    const waterModelMatrix = STATE.mat4.create();
    const waterY = STATE.shipPosition[1] - 0.8;
    STATE.mat4.translate(
        waterModelMatrix,
        waterModelMatrix,
        [
            STATE.shipPosition[0], // X: bot/kamera pozisyonu
            -3.5,                  // Y: sabit su yüksekliği
            STATE.shipPosition[2]  // Z: bot/kamera pozisyonu
        ]
    );
    gl.uniformMatrix4fv(STATE.uModelLoc, false, waterModelMatrix);
    gl.drawElements(gl.TRIANGLES, STATE.waterIndexCount, gl.UNSIGNED_INT, 0);

    gl.uniform1i(gl.getUniformLocation(STATE.program, "uUseTexture"), 0); // Sonra diğer nesneler için kapat

    // --- Torch ışık pozisyonu ve rengi ---
    const torchLightWorldPos = getTorchLightWorldPosition();
    gl.uniform1i(STATE.uTorchLitLoc, STATE.torchLit ? 1 : 0);
    gl.uniform3fv(STATE.uAmbientLightLoc, STATE.ambientLight);
    gl.uniform3fv(STATE.uTorchLightPosLoc, torchLightWorldPos);
    gl.uniform1f(STATE.uTorchLightIntensityLoc, STATE.torchLit ? STATE.torchLightIntensity : 0.0);
    gl.uniform3fv(STATE.uTorchLightColorLoc, [1.0, 0.7, 0.2]);
    gl.uniform3fv(STATE.uTorchDirectionLoc, STATE.cameraFront);

    // 5. Awakening: pillar ve cthulhu hareketleri
    if (!STATE.awakeningStarted && isLookingAtRlyeh()) {
        STATE.awakeningStarted = true;
        console.log("The Awakening Begins!");
    }
    if (STATE.awakeningStarted && pillarsRiseY < pillarsMaxRiseY) {
        pillarsRiseY += pillarsRiseSpeed;
    }
    if (STATE.awakeningStarted && STATE.cthulhuRiseY < STATE.maxRiseY) {
        STATE.cthulhuRiseY += 0.04;
    }

    // === TORCH ÇİZİMİ ===
    gl.uniform1i(STATE.uIsTorchLoc, 1);
    gl.uniform1i(STATE.uTorchHoveredLoc, STATE.torchHovered ? 1 : 0);
    gl.uniform1i(STATE.uIsCompassLoc, 0);
    gl.uniform1i(STATE.uCompassHoveredLoc, 0);

    gl.activeTexture(gl.TEXTURE8);
    gl.bindTexture(gl.TEXTURE_2D, STATE.torchMetallicTex);
    gl.uniform1i(gl.getUniformLocation(STATE.program, "uTorchMetallicTex"), 9);

    gl.bindVertexArray(STATE.torchVAO);
    gl.uniformMatrix4fv(STATE.uModelLoc, false, STATE.torchMatrix);
    gl.drawElements(gl.TRIANGLES, STATE.torchIndexCount, gl.UNSIGNED_SHORT, 0);

    gl.uniform1i(STATE.uIsTorchLoc, 0);

    // === PUSULA ÇİZİMİ (gövde ve iğne ayrı) ===
    if (!STATE.compassInspectMode) {
        const compassMatrix = STATE.mat4.create();
        STATE.mat4.identity(compassMatrix);
        STATE.mat4.translate(compassMatrix, compassMatrix, getCompassPosition());
        STATE.mat4.scale(compassMatrix, compassMatrix, [0.1, 0.1, 0.1]);

        gl.bindVertexArray(STATE.compassVAO);
        gl.uniformMatrix4fv(STATE.uModelLoc, false, compassMatrix);
        gl.uniform1i(STATE.uCompassHoveredLoc, STATE.compassHovered ? 1 : 0);
        gl.uniform1i(STATE.uIsCompassLoc, 1);

        // Önce gövde (doku aktif)
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, STATE.compassTexture);
        gl.uniform1i(gl.getUniformLocation(STATE.program, "uTexture"), 2);
        gl.uniform1i(gl.getUniformLocation(STATE.program, "uUseTexture"), 1);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, STATE.compassBodyEBO);
        gl.drawElements(gl.TRIANGLES, STATE.compassBodyIndexCount, gl.UNSIGNED_SHORT, 0);

        // Sonra iğne (doku kapalı)
        gl.uniform1i(gl.getUniformLocation(STATE.program, "uUseTexture"), 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, STATE.compassNeedleEBO);
        gl.drawElements(gl.TRIANGLES, STATE.compassNeedleIndexCount, gl.UNSIGNED_SHORT, 0);

        gl.uniform1i(STATE.uIsCompassLoc, 0);
    } else {
        const compassMatrix = STATE.mat4.create();
        STATE.mat4.identity(compassMatrix);

        let cameraPos = STATE.vec3.clone(STATE.shipPosition);
        cameraPos[1] += 1.2;
        cameraPos[2] += 0.3;
        let inspectPos = STATE.vec3.create();
        STATE.vec3.scaleAndAdd(inspectPos, cameraPos, STATE.cameraFront, 1.0);
        STATE.mat4.translate(compassMatrix, compassMatrix, inspectPos);

        STATE.mat4.rotateY(compassMatrix, compassMatrix, STATE.compassYaw);
        STATE.mat4.rotateX(compassMatrix, compassMatrix, -Math.PI / 2 + STATE.compassPitch);
        STATE.mat4.scale(compassMatrix, compassMatrix, [0.2, 0.2, 0.2]);

        gl.bindVertexArray(STATE.compassVAO);
        gl.uniformMatrix4fv(STATE.uModelLoc, false, compassMatrix);
        gl.uniform1i(STATE.uCompassHoveredLoc, 0);
        gl.uniform1i(STATE.uIsCompassLoc, 1);

        // Gövde (doku aktif)
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, STATE.compassTexture);
        gl.uniform1i(gl.getUniformLocation(STATE.program, "uTexture"), 2);
        gl.uniform1i(gl.getUniformLocation(STATE.program, "uUseTexture"), 1);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, STATE.compassBodyEBO);
        gl.drawElements(gl.TRIANGLES, STATE.compassBodyIndexCount, gl.UNSIGNED_SHORT, 0);

        // İğne (doku kapalı)
        gl.uniform1i(gl.getUniformLocation(STATE.program, "uUseTexture"), 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, STATE.compassNeedleEBO);
        gl.drawElements(gl.TRIANGLES, STATE.compassNeedleIndexCount, gl.UNSIGNED_SHORT, 0);

        gl.uniform1i(STATE.uIsCompassLoc, 0);
    }

    // === SHIP ÇİZİMİ ===
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, STATE.shipTexture);
    gl.uniform1i(gl.getUniformLocation(STATE.program, "uTexture"), 0);
    gl.uniform1i(gl.getUniformLocation(STATE.program, "uUseTexture"), 1);
    gl.bindVertexArray(STATE.shipVAO);
    const modelMatrix = STATE.mat4.create();
    STATE.mat4.translate(modelMatrix, modelMatrix, STATE.shipPosition);
    STATE.mat4.rotateX(modelMatrix, modelMatrix, Math.PI / 2);
    STATE.mat4.rotateY(modelMatrix, modelMatrix, Math.PI);
    gl.uniformMatrix4fv(STATE.uModelLoc, false, modelMatrix);
    gl.drawElements(gl.TRIANGLES, STATE.shipIndexCount, gl.UNSIGNED_SHORT, 0);
    gl.uniform1i(gl.getUniformLocation(STATE.program, "uUseTexture"), 0);

    // === PILLARS ÇİZİMİ ===
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, STATE.pillarsTexture);
    gl.uniform1i(gl.getUniformLocation(STATE.program, "uTexture"), 1);
    gl.uniform1i(gl.getUniformLocation(STATE.program, "uUseTexture"), 1);

    for (let i = 0; i < pillarPositions.length; i++) {
        const base = pillarPositions[i];
        const pillarsMatrix = STATE.mat4.create();
        STATE.mat4.translate(pillarsMatrix, pillarsMatrix, [
            base[0],
            base[1] + pillarsRiseY,
            base[2]
        ]);
        STATE.mat4.scale(pillarsMatrix, pillarsMatrix, [500.2, 500.2, 500.2]);
        STATE.mat4.rotateX(pillarsMatrix, pillarsMatrix, Math.PI / 2);
        STATE.mat4.rotateZ(pillarsMatrix, pillarsMatrix, Math.PI / 2);

        gl.bindVertexArray(STATE.pillarsVAO);
        gl.uniformMatrix4fv(STATE.uModelLoc, false, pillarsMatrix);
        gl.drawElements(gl.TRIANGLES, STATE.pillarsIndexCount, gl.UNSIGNED_SHORT, 0);
    }

    // === CTHULHU ÇİZİMİ ===
    const cthulhuMatrix = STATE.mat4.create();
    const CTHULHU_X = 0;
    const CTHULHU_Z = -80;
    const CTHULHU_INITIAL_Y = -75;
    STATE.mat4.translate(cthulhuMatrix, cthulhuMatrix, [CTHULHU_X, STATE.cthulhuRiseY + CTHULHU_INITIAL_Y, CTHULHU_Z]);
    STATE.mat4.scale(cthulhuMatrix, cthulhuMatrix, [CTHULHU_SCALE, CTHULHU_SCALE, CTHULHU_SCALE]);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, STATE.cthulhuTexture);
    gl.uniform1i(gl.getUniformLocation(STATE.program, "uTexture"), 3); // texture sampler index
    // AO haritası - Texture Unit 5
    STATE.gl.activeTexture(STATE.gl.TEXTURE5);
    STATE.gl.bindTexture(STATE.gl.TEXTURE_2D, STATE.cthulhuAOTex);
    STATE.gl.uniform1i(STATE.gl.getUniformLocation(STATE.program, "uAOTex"), 5);

    // Metallic haritası - Texture Unit 6
    STATE.gl.activeTexture(STATE.gl.TEXTURE6);
    STATE.gl.bindTexture(STATE.gl.TEXTURE_2D, STATE.cthulhuMetallicTex);
    STATE.gl.uniform1i(STATE.gl.getUniformLocation(STATE.program, "uMetallicTex"), 6);

    // Roughness haritası - Texture Unit 7
    STATE.gl.activeTexture(STATE.gl.TEXTURE7);
    STATE.gl.bindTexture(STATE.gl.TEXTURE_2D, STATE.cthulhuRoughnessTex);
    STATE.gl.uniform1i(STATE.gl.getUniformLocation(STATE.program, "uRoughnessTex"), 7);
    gl.uniform1i(gl.getUniformLocation(STATE.program, "uUseTexture"), 1); // texture açık

    gl.bindVertexArray(STATE.cthulhuVAO);
    gl.uniformMatrix4fv(STATE.uModelLoc, false, cthulhuMatrix);
    gl.drawElements(gl.TRIANGLES, STATE.cthulhuIndexCount, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(drawScene);
}

function createAndDrawObject(vertices, indices, modelMatrix) {
    const gl = STATE.gl;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const ebo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    const aPositionLoc = gl.getAttribLocation(STATE.program, "aPosition");
    gl.enableVertexAttribArray(aPositionLoc);
    gl.vertexAttribPointer(aPositionLoc, 3, gl.FLOAT, false, 0, 0);

    gl.uniformMatrix4fv(STATE.uModelLoc, false, modelMatrix);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
}

async function loadShaderSource(url) {
    const response = await fetch(url);
    return await response.text();
}
function compileShader(gl, source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile failed:", gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}
function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Program link failed:", gl.getProgramInfoLog(program));
        return null;
    }
    return program;
}
function getRayFromMouse(mouseX, mouseY, viewMatrix, projectionMatrix) {
    const invVP = STATE.mat4.create();
    STATE.mat4.multiply(invVP, projectionMatrix, viewMatrix);
    STATE.mat4.invert(invVP, invVP);

    const nearPoint = STATE.vec4.fromValues(mouseX, mouseY, -1.0, 1.0);
    const farPoint = STATE.vec4.fromValues(mouseX, mouseY, 1.0, 1.0);

    STATE.vec4.transformMat4(nearPoint, nearPoint, invVP);
    STATE.vec4.transformMat4(farPoint, farPoint, invVP);

    for (let i = 0; i < 3; i++) {
        nearPoint[i] /= nearPoint[3];
        farPoint[i] /= farPoint[3];
    }

    const origin = STATE.vec3.fromValues(nearPoint[0], nearPoint[1], nearPoint[2]);
    const direction = STATE.vec3.create();
    STATE.vec3.sub(direction, STATE.vec3.fromValues(farPoint[0], farPoint[1], farPoint[2]), origin);
    STATE.vec3.normalize(direction, direction);

    return { origin, direction };
}
function rayIntersectsSphere(rayOrigin, rayDir, sphereCenter, radius) {
    const L = STATE.vec3.create();
    STATE.vec3.sub(L, sphereCenter, rayOrigin);
    const tca = STATE.vec3.dot(L, rayDir);
    const d2 = STATE.vec3.dot(L, L) - tca * tca;
    return d2 <= radius * radius;
}
main();
