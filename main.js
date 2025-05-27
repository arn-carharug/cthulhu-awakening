// Global State
const STATE = {
    gl: null,
    mat4: glMatrix.mat4,
    vec3: glMatrix.vec3,
    vec4: glMatrix.vec4,
    canvas: null,
    shipPosition: glMatrix.vec3.fromValues(0, 0, 10),
    cubeVAO: null,
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
    maxTorchLight: 1.0, // tweak for effect
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
    program: null
};

// Geometry Data
const cubeVertices = new Float32Array([
    -1, -1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1,
    -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1,
    -1, 1, 1, -1, 1, -1, -1, -1, -1, -1, -1, 1,
    1, 1, 1, 1, 1, -1, 1, -1, -1, 1, -1, 1,
    -1, 1, -1, 1, 1, -1, 1, 1, 1, -1, 1, 1,
    -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1
]);
const cubeIndices = new Uint16Array([
    0, 1, 2, 0, 2, 3,
    4, 5, 6, 4, 6, 7,
    8, 9, 10, 8, 10, 11,
    12, 13, 14, 12, 14, 15,
    16, 17, 18, 16, 18, 19,
    20, 21, 22, 20, 22, 23
]);
const torchVertices = new Float32Array([
    // bottom
    -0.1, 0, -0.1, 0.1, 0, -0.1, 0.1, 0, 0.1, -0.1, 0, 0.1,
    // top
    -0.1, 0.4, -0.1, 0.1, 0.4, -0.1, 0.1, 0.4, 0.1, -0.1, 0.4, 0.1
]);
const torchIndices = new Uint16Array([
    0, 1, 2, 0, 2, 3,
    4, 5, 6, 4, 6, 7,
    0, 1, 5, 0, 5, 4,
    1, 2, 6, 1, 6, 5,
    2, 3, 7, 2, 7, 6,
    3, 0, 4, 3, 4, 7
]);
const pillarVertices = new Float32Array([
    -0.5, 0, -0.5, 0.5, 0, -0.5, 0.5, 0, 0.5, -0.5, 0, 0.5,
    -0.5, 2, -0.5, 0.5, 2, -0.5, 0.5, 2, 0.5, -0.5, 2, 0.5
]);
const pillarIndices = new Uint16Array([
    0, 1, 2, 0, 2, 3,
    4, 5, 6, 4, 6, 7,
    0, 1, 5, 0, 5, 4,
    1, 2, 6, 1, 6, 5,
    2, 3, 7, 2, 7, 6,
    3, 0, 4, 3, 4, 7
]);
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

function getTorchPosition() {
    // Torch position relative to ship
    return STATE.vec3.fromValues(
        STATE.shipPosition[0] + 0.6,
        STATE.shipPosition[1] + 1.2,
        STATE.shipPosition[2] - 1.8
    );
}

function toRadians(degrees) {
    return degrees * (Math.PI / 180);
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

    // Torch hover detection
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
});

window.addEventListener("keydown", (e) => {
    if (STATE.awakeningStarted) return;
    const direction = STATE.vec3.create();
    switch (e.key.toLowerCase()) {
        case "w":
            STATE.vec3.scale(direction, STATE.cameraFront, STATE.cameraSpeed);
            STATE.vec3.add(STATE.shipPosition, STATE.shipPosition, direction);
            break;
        case "s":
            STATE.vec3.scale(direction, STATE.cameraFront, STATE.cameraSpeed);
            STATE.vec3.sub(STATE.shipPosition, STATE.shipPosition, direction);
            break;
        case "a": {
            const right = STATE.vec3.create();
            STATE.vec3.cross(right, STATE.cameraFront, STATE.cameraUp);
            STATE.vec3.normalize(right, right);
            STATE.vec3.scale(right, right, STATE.cameraSpeed);
            STATE.vec3.sub(STATE.shipPosition, STATE.shipPosition, right);
            break;
        }
        case "d": {
            const right = STATE.vec3.create();
            STATE.vec3.cross(right, STATE.cameraFront, STATE.cameraUp);
            STATE.vec3.normalize(right, right);
            STATE.vec3.scale(right, right, STATE.cameraSpeed);
            STATE.vec3.add(STATE.shipPosition, STATE.shipPosition, right);
            break;
        }
    }
});

document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement !== STATE.canvas) STATE.firstMouse = true;
});

// Main
async function main() {
    STATE.canvas = document.getElementById("glCanvas");
    STATE.gl = STATE.canvas.getContext("webgl2");
    STATE.canvas.width = window.innerWidth;
    STATE.canvas.height = window.innerHeight;
    STATE.gl.viewport(0, 0, STATE.canvas.width, STATE.canvas.height);
    STATE.gl.clearColor(0.0, 0.1, 0.2, 1.0);
    STATE.gl.enable(STATE.gl.DEPTH_TEST);

    const vertexSrc = await loadShaderSource("shaders/vertex.glsl");
    const fragmentSrc = await loadShaderSource("shaders/fragment.glsl");
    const vertexShader = compileShader(STATE.gl, vertexSrc, STATE.gl.VERTEX_SHADER);
    const fragmentShader = compileShader(STATE.gl, fragmentSrc, STATE.gl.FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) return;
    STATE.program = createProgram(STATE.gl, vertexShader, fragmentShader);
    if (!STATE.program) return;
    STATE.gl.useProgram(STATE.program);

    // Uniform locations
    STATE.uModelLoc = STATE.gl.getUniformLocation(STATE.program, "uModel");
    STATE.uViewLoc = STATE.gl.getUniformLocation(STATE.program, "uView");
    STATE.uProjectionLoc = STATE.gl.getUniformLocation(STATE.program, "uProjection");
    STATE.uAmbientLightLoc = STATE.gl.getUniformLocation(STATE.program, "uAmbientLight");
    STATE.uTorchLitLoc = STATE.gl.getUniformLocation(STATE.program, "uTorchLit");
    STATE.uIsTorchLoc = STATE.gl.getUniformLocation(STATE.program, "uIsTorch");
    STATE.uTorchLightPosLoc = STATE.gl.getUniformLocation(STATE.program, "uTorchLightPos");
    STATE.uTorchLightIntensityLoc = STATE.gl.getUniformLocation(STATE.program, "uTorchLightIntensity");
    STATE.uTorchHoveredLoc = STATE.gl.getUniformLocation(STATE.program, "uTorchHovered");

    // Setup projection and view
    const viewMatrix = STATE.mat4.create();
    const projectionMatrix = STATE.mat4.create();
    STATE.mat4.lookAt(viewMatrix, STATE.vec3.fromValues(0, 2, 8), STATE.vec3.fromValues(0, 0, 0), STATE.vec3.fromValues(0, 1, 0));
    STATE.mat4.perspective(projectionMatrix, Math.PI / 4, STATE.canvas.width / STATE.canvas.height, 0.1, 100);
    STATE.gl.uniformMatrix4fv(STATE.uViewLoc, false, viewMatrix);
    STATE.gl.uniformMatrix4fv(STATE.uProjectionLoc, false, projectionMatrix);

    // Torch VAO/VBO/EBO
    STATE.torchVAO = STATE.gl.createVertexArray();
    STATE.gl.bindVertexArray(STATE.torchVAO);
    const torchVBO = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ARRAY_BUFFER, torchVBO);
    STATE.gl.bufferData(STATE.gl.ARRAY_BUFFER, torchVertices, STATE.gl.STATIC_DRAW);
    const torchEBO = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ELEMENT_ARRAY_BUFFER, torchEBO);
    STATE.gl.bufferData(STATE.gl.ELEMENT_ARRAY_BUFFER, torchIndices, STATE.gl.STATIC_DRAW);
    const aPositionLoc = STATE.gl.getAttribLocation(STATE.program, "aPosition");
    STATE.gl.enableVertexAttribArray(aPositionLoc);
    STATE.gl.vertexAttribPointer(aPositionLoc, 3, STATE.gl.FLOAT, false, 0, 0);

    // Cube (ship) VAO/VBO/EBO
    STATE.cubeVAO = STATE.gl.createVertexArray();
    STATE.gl.bindVertexArray(STATE.cubeVAO);
    const vbo = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ARRAY_BUFFER, vbo);
    STATE.gl.bufferData(STATE.gl.ARRAY_BUFFER, cubeVertices, STATE.gl.STATIC_DRAW);
    const ebo = STATE.gl.createBuffer();
    STATE.gl.bindBuffer(STATE.gl.ELEMENT_ARRAY_BUFFER, ebo);
    STATE.gl.bufferData(STATE.gl.ELEMENT_ARRAY_BUFFER, cubeIndices, STATE.gl.STATIC_DRAW);
    STATE.gl.enableVertexAttribArray(aPositionLoc);
    STATE.gl.vertexAttribPointer(aPositionLoc, 3, STATE.gl.FLOAT, false, 0, 0);

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

function drawScene() {
    const gl = STATE.gl;
    // Ambient and torch intensity logic
    if (STATE.torchLit) {
        // Gradually increase ambient light
        STATE.ambientLight[0] = Math.min(STATE.ambientLight[0] + 0.01, 0.8);
        STATE.ambientLight[1] = Math.min(STATE.ambientLight[1] + 0.008, 0.55);
        STATE.ambientLight[2] = Math.min(STATE.ambientLight[2] + 0.002, 0.25);
        // Torch light intensity (slower in low ambient)
        if (STATE.torchLightIntensity < STATE.maxTorchLight) {
            let inc = Math.max(0.003, 0.012 * (STATE.ambientLight[0])); 
            STATE.torchLightIntensity = Math.min(STATE.torchLightIntensity + inc, STATE.maxTorchLight);
        }
    } else if (STATE.awakeningStarted) {
        STATE.ambientLight[0] = Math.max(STATE.ambientLight[0] - 0.022, 0.08);
        STATE.ambientLight[1] = Math.max(STATE.ambientLight[1] - 0.002, 0.08);
        STATE.ambientLight[2] = Math.max(STATE.ambientLight[2] - 0.0015, 0.08);
    }

    gl.uniform1i(STATE.uTorchLitLoc, STATE.torchLit ? 1 : 0);
    gl.uniform3fv(STATE.uAmbientLightLoc, STATE.ambientLight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const torchPos = getTorchPosition();
    gl.uniform3fv(STATE.uTorchLightPosLoc, torchPos);
    gl.uniform1f(STATE.uTorchLightIntensityLoc, STATE.torchLightIntensity);

    // Update camera view
    const viewMatrix = STATE.mat4.create();
    const target = STATE.vec3.create();
    const cameraPosition = STATE.vec3.clone(STATE.shipPosition);
    cameraPosition[1] += 1.2;
    cameraPosition[2] += 1.5;
    STATE.vec3.add(target, cameraPosition, STATE.cameraFront);
    STATE.mat4.lookAt(viewMatrix, cameraPosition, target, STATE.cameraUp);
    gl.uniformMatrix4fv(STATE.uViewLoc, false, viewMatrix);

    // Torch model matrix
    STATE.mat4.identity(STATE.torchMatrix);
    STATE.mat4.translate(STATE.torchMatrix, STATE.torchMatrix, torchPos);

    // Awakening logic: rising ruins and Cthulhu
    if (!STATE.awakeningStarted && STATE.vec3.distance(STATE.shipPosition, STATE.rlyehCenter) < 5.0) {
        STATE.awakeningStarted = true;
        console.log("The Awakening Begins!");
    }

    if (STATE.awakeningStarted && STATE.cthulhuRiseY < STATE.maxRiseY) {
        STATE.mat4.translate(pillar1Matrix, pillar1Matrix, [0, STATE.riseSpeed, 0]);
        STATE.mat4.translate(pillar2Matrix, pillar2Matrix, [0, STATE.riseSpeed, 0]);
        STATE.mat4.translate(cthulhuHeadMatrix, cthulhuHeadMatrix, [0, STATE.riseSpeed, 0]);
        STATE.mat4.translate(cthulhuBodyMatrix, cthulhuBodyMatrix, [0, STATE.riseSpeed, 0]);
        STATE.cthulhuRiseY += STATE.riseSpeed;
    }

    // Draw ship
    gl.uniform1i(STATE.uIsTorchLoc, 0);
    gl.uniform1i(STATE.uTorchHoveredLoc, 0);
    gl.bindVertexArray(STATE.cubeVAO);
    const modelMatrix = STATE.mat4.create();
    STATE.mat4.translate(modelMatrix, modelMatrix, STATE.shipPosition);
    gl.uniformMatrix4fv(STATE.uModelLoc, false, modelMatrix);
    gl.drawElements(gl.TRIANGLES, cubeIndices.length, gl.UNSIGNED_SHORT, 0);

    // Draw torch
    gl.uniform1i(STATE.uIsTorchLoc, 1);
    gl.uniform1i(STATE.uTorchHoveredLoc, STATE.torchHovered ? 1 : 0);
    gl.bindVertexArray(STATE.torchVAO);
    gl.uniformMatrix4fv(STATE.uModelLoc, false, STATE.torchMatrix);
    gl.drawElements(gl.TRIANGLES, torchIndices.length, gl.UNSIGNED_SHORT, 0);

    // Draw pillars and Cthulhu
    gl.uniform1i(STATE.uIsTorchLoc, 0);
    gl.uniform1i(STATE.uTorchHoveredLoc, 0);
    createAndDrawObject(pillarVertices, pillarIndices, pillar1Matrix);
    createAndDrawObject(pillarVertices, pillarIndices, pillar2Matrix);
    createAndDrawObject(sphereVertices, sphereIndices, cthulhuHeadMatrix);
    createAndDrawObject(coneVertices, coneIndices, cthulhuBodyMatrix);

    requestAnimationFrame(drawScene);
}

// Helpers
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

// Start
main();