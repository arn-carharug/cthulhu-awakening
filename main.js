// =====================
// OBJ + MTL Loader
// =====================
async function loadText(url) {
    const res = await fetch(url);
    return await res.text();
}

// Sadece Kd (diffuse renk) okuyan basit mtl parser
function parseMTL(mtlText) {
    const materials = {};
    let curMat = null;
    mtlText.split('\n').forEach(line => {
        line = line.trim();
        if (line.startsWith('newmtl ')) {
            curMat = line.split(' ')[1];
            materials[curMat] = { Kd: [0.8, 0.8, 0.8] };
        } else if (line.startsWith('Kd ') && curMat) {
            const [, r, g, b] = line.split(/\s+/);
            materials[curMat].Kd = [parseFloat(r), parseFloat(g), parseFloat(b)];
        }
    });
    return materials;
}

// OBJ loader: pozisyon, normal, materyal rengi
async function loadOBJWithMTL(objUrl, mtlUrl) {
    const objText = await loadText(objUrl);
    const mtlText = await loadText(mtlUrl);
    const materials = parseMTL(mtlText);

    const positions = [], normals = [];
    let curMaterial = null;
    const uniqueVerts = {};
    let vertices = [];
    let finalIndices = [];

    objText.split('\n').forEach(line => {
        line = line.trim();
        if (line.startsWith('v ')) {
            const [, x, y, z] = line.split(/\s+/);
            positions.push([parseFloat(x), parseFloat(y), parseFloat(z)]);
        } else if (line.startsWith('vn ')) {
            const [, x, y, z] = line.split(/\s+/);
            normals.push([parseFloat(x), parseFloat(y), parseFloat(z)]);
        } else if (line.startsWith('usemtl ')) {
            curMaterial = line.split(' ')[1];
        } else if (line.startsWith('f ')) {
            const verts = line.substr(2).trim().split(/\s+/);
            for (let i = 0; i < 3; ++i) {
                const [vi, vti, vni] = verts[i].split('/').map(x => parseInt(x) || 1);
                const key = `${vi}/${vni}/${curMaterial}`;
                if (uniqueVerts[key] === undefined) {
                    const pos = positions[vi - 1];
                    const nor = normals[vni - 1];
                    const col = (materials[curMaterial] || { Kd: [0.7, 0.7, 0.7] }).Kd;
                    vertices.push(...pos, ...nor, ...col);
                    uniqueVerts[key] = (vertices.length / 9) - 1;
                }
                finalIndices.push(uniqueVerts[key]);
            }
        }
    });
    return {
        vertices: new Float32Array(vertices),
        indices: new Uint16Array(finalIndices)
    };
}

// ===============
// GLMATRİX STATE (aynen korunuyor)
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
    cthulhuRiseY: 0,
    maxRiseY: 3.0,
    riseSpeed: 0.01,
    rlyehCenter: glMatrix.vec3.fromValues(-3, 0, -2),
    uModelLoc: null,
    uViewLoc: null,
    uProjectionLoc: null,
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
};
// STATE'in hemen altına ekle:
let pillarsRiseY = 0;
const pillarsMaxRiseY = 25.0; // Kaç birim yükselecek? (Ayarlayabilirsin)
const pillarsRiseSpeed = 0.2; // Hız (frame başına artış)

// Paralel ve aralarından botun geçebileceği sütun pozisyonları
const pillarPositions = [
    [-50, 0, -30],
    [0,   0, -30],
    [50,  0, -30]
    // (Aradaki mesafeyi ve sayıyı istediğin gibi ayarlayabilirsin)
];


const sphereVertices = new Float32Array([
    0.0, 1.0, 0.0, 0.7, 0.7, 0.0, 1.0, 0.0, 0.0, 0.7, -0.7, 0.0,
    0.0, -1.0, 0.0, -0.7, -0.7, 0.0, -1.0, 0.0, 0.0, -0.7, 0.7, 0.0
]);
const sphereIndices = new Uint16Array([
    0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5, 0, 5, 6, 0, 6, 7, 0, 7, 1,
    4, 3, 2, 4, 2, 1, 4, 1, 7, 4, 7, 6, 4, 6, 5
]);
const coneVertices = new Float32Array([
    0.0, 1.0, 0.0,   // tip
    1.0, 0.0, 0.0,
    0.7, 0.0, 0.7,
    0.0, 0.0, 1.0,
    -0.7, 0.0, 0.7,
    -1.0, 0.0, 0.0,
    -0.7, 0.0, -0.7,
    0.0, 0.0, -1.0,
    0.7, 0.0, -0.7
]);
const coneIndices = new Uint16Array([
    0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5,
    0, 5, 6, 0, 6, 7, 0, 7, 8, 0, 8, 1
]);

// Model matrices
const pillar1Matrix = STATE.mat4.create();
STATE.mat4.translate(pillar1Matrix, pillar1Matrix, [-3, 0, -2]);
const pillar2Matrix = STATE.mat4.create();
STATE.mat4.translate(pillar2Matrix, pillar2Matrix, [2, 0, -4]);
const cthulhuHeadMatrix = STATE.mat4.create();
STATE.mat4.translate(cthulhuHeadMatrix, cthulhuHeadMatrix, [0, 1.5, -6]);
const cthulhuBodyMatrix = STATE.mat4.create();
STATE.mat4.translate(cthulhuBodyMatrix, cthulhuBodyMatrix, [0, 0, -6]);

function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

// FPS torch: kamera açısına göre sabit offsetli küçük torch
function getTorchPosition() {
    if (STATE.torchControlMode && STATE.torchLit) {
        // FPS torch: kameranın sağ üstte sabit ofseti
        const forwardDist = 0.7;   // İleriye uzaklık
        const rightDist = 0.4;     // Sağa uzaklık (ekran sağ üstü için artır)
        const upDist = 0.1;       // Hafif aşağı

        const cameraPos = STATE.vec3.clone(STATE.shipPosition);
        cameraPos[1] += 1.2;
        cameraPos[2] += 1.5;

        const front = STATE.vec3.clone(STATE.cameraFront);
        STATE.vec3.normalize(front, front);

        // FPS mantığı: up vektörü dünyadan alınmalı!
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
        STATE.vec3.scaleAndAdd(torchPos, torchPos, up, upDist);

        return torchPos;
    } else {
        // Sabit torch
        if (!STATE.torchOffset) {
            STATE.torchOffset = [0.6, 1.2, -1.8];
        }
        return [
            STATE.shipPosition[0] + STATE.torchOffset[0],
            STATE.shipPosition[1] + STATE.torchOffset[1],
            STATE.shipPosition[2] + STATE.torchOffset[2]
        ];
    }
}

// Mouse/keyboard events: camera and torch hover
window.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement !== STATE.canvas) return;

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

    // FPS kamera için sağ ve yukarı vektörlerini de güncelle:
    const right = STATE.vec3.create();
    STATE.vec3.cross(right, STATE.cameraFront, [0, 1, 0]);
    STATE.vec3.normalize(right, right);

    const up = STATE.vec3.create();
    STATE.vec3.cross(up, right, STATE.cameraFront);
    STATE.vec3.normalize(up, up);
    STATE.cameraUp = up;



    // Meşale hover logic (sadece torch yanmadan çalışır)
    if (STATE.awakeningStarted && STATE.cthulhuRiseY >= STATE.maxRiseY && !STATE.torchLit) {
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
        STATE.mat4.perspective(projectionMatrix, Math.PI / 4, STATE.canvas.width / STATE.canvas.height, 0.1, 100);

        const ray = getRayFromMouse(mouseX, mouseY, viewMatrix, projectionMatrix);
        const torchPos = getTorchPosition();

        STATE.torchHovered = rayIntersectsSphere(ray.origin, ray.direction, torchPos, 0.5);
    } else {
        STATE.torchHovered = false;
    }
});

// 4. MOUSE SCROLL: Torch parlaklığını ayarla
window.addEventListener('wheel', (e) => {
    if (STATE.torchLit && STATE.torchControlMode) {
        STATE.torchLightIntensity += (e.deltaY < 0 ? 0.05 : -0.05);
        STATE.torchLightIntensity = Math.max(STATE.minTorch, Math.min(STATE.maxTorch, STATE.torchLightIntensity));
        document.getElementById("torch-brightness").textContent = STATE.torchLightIntensity.toFixed(2);
    }
});

window.addEventListener("keydown", (e) => {
    if (STATE.awakeningStarted || STATE.torchControlMode) {
        if (e.key.toLowerCase() === "m" && STATE.torchLit) {
            STATE.torchControlMode = !STATE.torchControlMode;
            document.getElementById("torch-mode").textContent = STATE.torchControlMode ? "CONTROL" : "ON";
        }
        return;
    }
    const direction = STATE.vec3.create();
    switch (e.key.toLowerCase()) {
        case "w": {
            // cameraFront'ın Y'sini sıfırla, normalize et!
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
            // Yüzeydeki right vektörü için, up olarak [0,1,0] kullan!
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
    console.log('Ship Position:', STATE.shipPosition);
});

document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement !== STATE.canvas) STATE.firstMouse = true;
});

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

    // ====================
    // 1) BOT (OBJ) MODELİNİ YÜKLE
    // ====================
    // Dikkat: Yoluna göre düzenle!
    const botModel = await loadOBJWithMTL('assets/models/woodBoat.obj', 'assets/models/woodBoat.mtl');
    const shipVAO = STATE.gl.createVertexArray();
    STATE.gl.bindVertexArray(shipVAO);

    const vbo = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ARRAY_BUFFER, vbo);
    STATE.gl.bufferData(STATE.gl.ARRAY_BUFFER, botModel.vertices, STATE.gl.STATIC_DRAW);

    const ebo = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ELEMENT_ARRAY_BUFFER, ebo);
    STATE.gl.bufferData(STATE.gl.ELEMENT_ARRAY_BUFFER, botModel.indices, STATE.gl.STATIC_DRAW);

    // Pozisyon: 0-2, Normal: 3-5, Renk: 6-8 (toplam 9 float)
    const aPositionLoc = STATE.gl.getAttribLocation(STATE.program, "aPosition");
    const aNormalLoc = STATE.gl.getAttribLocation(STATE.program, "aNormal");
    const aColorLoc = STATE.gl.getAttribLocation(STATE.program, "aColor");

    STATE.gl.enableVertexAttribArray(aPositionLoc);
    STATE.gl.vertexAttribPointer(aPositionLoc, 3, STATE.gl.FLOAT, false, 9 * 4, 0);
    STATE.gl.enableVertexAttribArray(aNormalLoc);
    STATE.gl.vertexAttribPointer(aNormalLoc, 3, STATE.gl.FLOAT, false, 9 * 4, 3 * 4);
    STATE.gl.enableVertexAttribArray(aColorLoc);
    STATE.gl.vertexAttribPointer(aColorLoc, 3, STATE.gl.FLOAT, false, 9 * 4, 6 * 4);

    STATE.shipVAO = shipVAO;
    STATE.shipIndexCount = botModel.indices.length;

    const viewMatrix = STATE.mat4.create();
    const projectionMatrix = STATE.mat4.create();
    STATE.mat4.lookAt(viewMatrix, STATE.vec3.fromValues(0, 2, 8), STATE.vec3.fromValues(0, 0, 0), STATE.vec3.fromValues(0, 1, 0));
    STATE.mat4.perspective(projectionMatrix, Math.PI / 4, STATE.canvas.width / STATE.canvas.height, 0.1, 100);
    STATE.gl.uniformMatrix4fv(STATE.uViewLoc, false, viewMatrix);
    STATE.gl.uniformMatrix4fv(STATE.uProjectionLoc, false, projectionMatrix);

    // Torch VAO/VBO/EBO
    // Meşale (OBJ+MTL) Modelini yükle
    const torchModel = await loadOBJWithMTL('assets/models/torch.obj', 'assets/models/torch.mtl');
    const torchVAO = STATE.gl.createVertexArray();
    STATE.gl.bindVertexArray(torchVAO);

    const torchVBO = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ARRAY_BUFFER, torchVBO);
    STATE.gl.bufferData(STATE.gl.ARRAY_BUFFER, torchModel.vertices, STATE.gl.STATIC_DRAW);

    const torchEBO = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ELEMENT_ARRAY_BUFFER, torchEBO);
    STATE.gl.bufferData(STATE.gl.ELEMENT_ARRAY_BUFFER, torchModel.indices, STATE.gl.STATIC_DRAW);

    // Pozisyon: 0-2, Normal: 3-5, Renk: 6-8 (toplam 9 float)
    STATE.gl.enableVertexAttribArray(aPositionLoc);
    STATE.gl.vertexAttribPointer(aPositionLoc, 3, STATE.gl.FLOAT, false, 9 * 4, 0);
    STATE.gl.enableVertexAttribArray(aNormalLoc);
    STATE.gl.vertexAttribPointer(aNormalLoc, 3, STATE.gl.FLOAT, false, 9 * 4, 3 * 4);
    STATE.gl.enableVertexAttribArray(aColorLoc);
    STATE.gl.vertexAttribPointer(aColorLoc, 3, STATE.gl.FLOAT, false, 9 * 4, 6 * 4);

    STATE.torchVAO = torchVAO;
    STATE.torchIndexCount = torchModel.indices.length;

    // main.js -> main() fonksiyonunda ship/torch gibi yükle
    const pillarsModel = await loadOBJWithMTL('assets/models/pillars.obj', 'assets/models/pillars.mtl');
    const pillarsVAO = STATE.gl.createVertexArray();
    STATE.gl.bindVertexArray(pillarsVAO);

    const pillarsVBO = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ARRAY_BUFFER, pillarsVBO);
    STATE.gl.bufferData(STATE.gl.ARRAY_BUFFER, pillarsModel.vertices, STATE.gl.STATIC_DRAW);

    const pillarsEBO = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ELEMENT_ARRAY_BUFFER, pillarsEBO);
    STATE.gl.bufferData(STATE.gl.ELEMENT_ARRAY_BUFFER, pillarsModel.indices, STATE.gl.STATIC_DRAW);

    STATE.gl.enableVertexAttribArray(aPositionLoc);
    STATE.gl.vertexAttribPointer(aPositionLoc, 3, STATE.gl.FLOAT, false, 9 * 4, 0);
    STATE.gl.enableVertexAttribArray(aNormalLoc);
    STATE.gl.vertexAttribPointer(aNormalLoc, 3, STATE.gl.FLOAT, false, 9 * 4, 3 * 4);
    STATE.gl.enableVertexAttribArray(aColorLoc);
    STATE.gl.vertexAttribPointer(aColorLoc, 3, STATE.gl.FLOAT, false, 9 * 4, 6 * 4);

    STATE.pillarsVAO = pillarsVAO;
    STATE.pillarsIndexCount = pillarsModel.indices.length;




    STATE.canvas.addEventListener("click", (event) => {
        STATE.canvas.requestPointerLock();
        const awakeningComplete = STATE.awakeningStarted && STATE.cthulhuRiseY >= STATE.maxRiseY;
        if (!awakeningComplete || STATE.torchLit || STATE.torchClicked) return;

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
        STATE.mat4.perspective(projectionMatrix, Math.PI / 4, STATE.canvas.width / STATE.canvas.height, 0.1, 100);

        const ray = getRayFromMouse(mouseX, mouseY, viewMatrix, projectionMatrix);

        const torchPos = getTorchPosition();
        if (rayIntersectsSphere(ray.origin, ray.direction, torchPos, 0.5)) {
            STATE.torchClicked = true;
            STATE.torchLit = true;
            console.log("Torch lit!");
        }
    });
    drawScene();

}

function isLookingAtRlyeh() {
    for (const pos of pillarPositions) {
        const toPillar = STATE.vec3.create();
        STATE.vec3.sub(toPillar, pos, STATE.shipPosition);
        STATE.vec3.normalize(toPillar, toPillar);

        // Dot product, açı hesaplama
        const dot = STATE.vec3.dot(STATE.cameraFront, toPillar);
        const angle = Math.acos(dot) * 180 / Math.PI; // derece cinsinden

        const distance = STATE.vec3.distance(STATE.shipPosition, pos);

        if (distance < 30.0 && angle < 30) {
            return true; // En az bir sütun için trigger!
        }
    }
    return false;
}

function drawScene() {
    const gl = STATE.gl;

    // 1. Ambient ve torch intensity logic
    if (STATE.torchLit) {
        STATE.ambientLight[0] = Math.min(STATE.ambientLight[0] + 0.01, 0.8);
        STATE.ambientLight[1] = Math.min(STATE.ambientLight[1] + 0.008, 0.55);
        STATE.ambientLight[2] = Math.min(STATE.ambientLight[2] + 0.002, 0.25);
        if (STATE.torchLightIntensity < STATE.maxTorchLight) {
            let inc = Math.max(0.003, 0.012 * (STATE.ambientLight[0]));
            STATE.torchLightIntensity = Math.min(STATE.torchLightIntensity + inc, STATE.maxTorchLight);
        }
    } else if (STATE.awakeningStarted) {
        STATE.ambientLight[0] = Math.max(STATE.ambientLight[0] - 0.022, 0.08);
        STATE.ambientLight[1] = Math.max(STATE.ambientLight[1] - 0.002, 0.08);
        STATE.ambientLight[2] = Math.max(STATE.ambientLight[2] - 0.0015, 0.08);
    }

    // 2. View ve kamera ayarı (her zaman aynı)
    let cameraPosition = STATE.vec3.clone(STATE.shipPosition);
    cameraPosition[1] += 1.2;
    cameraPosition[2] += 0.3;
    let target = STATE.vec3.create();
    STATE.vec3.add(target, cameraPosition, STATE.cameraFront);

    const viewMatrix = STATE.mat4.create();
    STATE.mat4.lookAt(viewMatrix, cameraPosition, target, STATE.cameraUp);
    gl.uniformMatrix4fv(STATE.uViewLoc, false, viewMatrix);

    // 3. Meşale pozisyonunu FPS'e göre hesapla
    const torchPos = getTorchPosition();

    // 4. Torch model matrix (FPS modunda scale uygula)
    STATE.mat4.identity(STATE.torchMatrix);
    // 1. Pozisyon: Botun sağ tarafı (örneğin x = +1.0 yan)
    STATE.mat4.translate(STATE.torchMatrix, STATE.torchMatrix, [
        STATE.shipPosition[0] + 1.0,  // sağda (x artır)
        STATE.shipPosition[1] + 0.6,  // biraz yukarıda
        STATE.shipPosition[2] - 1.1   // botun hemen yanında, biraz arkada (z azalt)
    ]);

    // 2. Döndür: Meşale modelinin ekseni kameraya bakacaksa veya botun eksenine paralel olacaksa
    // Dikeyleştir: Eğer meşale yatay duruyorsa, X veya Z etrafında 90 derece döndürülür
    // NOT: Eğer meşale modeli baştan dikey geliyorsa, bu satırı kaldır.
    STATE.mat4.rotateX(STATE.torchMatrix, STATE.torchMatrix, -Math.PI / 2);

    // 3. İsteğe bağlı: Küçült (model büyükse)
    STATE.mat4.scale(STATE.torchMatrix, STATE.torchMatrix, [0.8, 1.1, 1.2]);


    // 5. Uniform'lar ve temizlik
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.uniform1i(STATE.uTorchLitLoc, STATE.torchLit ? 1 : 0);
    gl.uniform3fv(STATE.uAmbientLightLoc, STATE.ambientLight);
    gl.uniform1i(STATE.uTorchHoveredLoc, STATE.torchHovered ? 1 : 0);
    gl.uniform3fv(STATE.uTorchLightPosLoc, torchPos);
    gl.uniform1f(STATE.uTorchLightIntensityLoc, STATE.torchLightIntensity);

    // FPS torch spotlight: renk ve yön de gönderiliyor!
    gl.uniform3fv(STATE.uTorchLightColorLoc, [1.0, 0.7, 0.2]);
    gl.uniform3fv(STATE.uTorchDirectionLoc, STATE.cameraFront);

    // 6. Awakening: pillar ve cthulhu hareketleri
    if (!STATE.awakeningStarted && isLookingAtRlyeh()) {
    STATE.awakeningStarted = true;
    console.log("The Awakening Begins!");
}
    if (STATE.awakeningStarted && pillarsRiseY  < pillarsMaxRiseY) {
        pillarsRiseY += pillarsRiseSpeed;
    }
    // Torch çizimi
    STATE.gl.bindVertexArray(STATE.torchVAO);
    STATE.gl.uniformMatrix4fv(STATE.uModelLoc, false, STATE.torchMatrix);
    STATE.gl.uniform1i(STATE.uIsTorchLoc, 1); // (Shader'da torch için özel davranış varsa)
    STATE.gl.drawElements(STATE.gl.TRIANGLES, STATE.torchIndexCount, STATE.gl.UNSIGNED_SHORT, 0);
    STATE.gl.uniform1i(STATE.uIsTorchLoc, 0);
    // (7. Ship çizimi)
    // YENİ: Küp yerine shipVAO ve shipIndexCount ile çiz
    STATE.gl.bindVertexArray(STATE.shipVAO);
    const modelMatrix = STATE.mat4.create();
    STATE.mat4.translate(modelMatrix, modelMatrix, STATE.shipPosition);
    STATE.mat4.rotateX(modelMatrix, modelMatrix, Math.PI / 2);
    STATE.mat4.rotateY(modelMatrix, modelMatrix, Math.PI);
    STATE.gl.uniformMatrix4fv(STATE.uModelLoc, false, modelMatrix);
    STATE.gl.drawElements(STATE.gl.TRIANGLES, STATE.shipIndexCount, STATE.gl.UNSIGNED_SHORT, 0);

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

    STATE.gl.bindVertexArray(STATE.pillarsVAO);
    STATE.gl.uniformMatrix4fv(STATE.uModelLoc, false, pillarsMatrix);
    STATE.gl.drawElements(STATE.gl.TRIANGLES, STATE.pillarsIndexCount, STATE.gl.UNSIGNED_SHORT, 0);
}

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
// ========
// Shader Load/Compile helpers, event handlers, diğer fonksiyonlar burada mevcut (aynı kalabilir)
// ========

// Başlat!
main();
