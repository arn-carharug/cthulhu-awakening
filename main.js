// Global constants and variables
const mat4 = glMatrix.mat4;
const vec3 = glMatrix.vec3;
const shipPosition = vec3.fromValues(0, 0, 0); // initial ship position
let cubeVAO;
let cameraPosition = vec3.fromValues(0, 2, 8);
let cameraFront = vec3.fromValues(0, 0, -1);
let cameraUp = vec3.fromValues(0, 1, 0);
const cameraSpeed = 0.3;
let yaw = -90;        // horizontal rotation, -90 so we look down -Z
let pitch = 0;        // vertical rotation
let lastX = window.innerWidth / 2;
let lastY = window.innerHeight / 2;
let firstMouse = true;
const sensitivity = 0.1;
let canvas;


// Cube Geometry
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

window.addEventListener("keydown", (e) => {
    const direction = vec3.create();
    switch (e.key.toLowerCase()) {
        case "w":
            vec3.scale(direction, cameraFront, cameraSpeed);
            vec3.add(cameraPosition, cameraPosition, direction);
            break;
        case "s":
            vec3.scale(direction, cameraFront, cameraSpeed);
            vec3.sub(cameraPosition, cameraPosition, direction);
            break;
        case "a": {
            const right = vec3.create();
            vec3.cross(right, cameraFront, cameraUp);
            vec3.normalize(right, right);
            vec3.scale(right, right, cameraSpeed);
            vec3.sub(cameraPosition, cameraPosition, right);
            break;
        }
        case "d": {
            const right = vec3.create();
            vec3.cross(right, cameraFront, cameraUp);
            vec3.normalize(right, right);
            vec3.scale(right, right, cameraSpeed);
            vec3.add(cameraPosition, cameraPosition, right);
            break;
        }
    }
});

function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

window.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement !== canvas) return;
    let offsetX = event.movementX * sensitivity;
    let offsetY = -event.movementY * sensitivity;

    yaw += offsetX;
    pitch += offsetY;

    // Limit vertical angle
    if (pitch > 89.0) pitch = 89.0;
    if (pitch < -89.0) pitch = -89.0;

    // Update cameraFront vector
    const front = vec3.create();
    front[0] = Math.cos(toRadians(yaw)) * Math.cos(toRadians(pitch));
    front[1] = Math.sin(toRadians(pitch));
    front[2] = Math.sin(toRadians(yaw)) * Math.cos(toRadians(pitch));
    vec3.normalize(cameraFront, front);
});



// R’lyeh Pillar Geometry
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

// Positions of the two pillars
const pillar1Matrix = mat4.create();
mat4.translate(pillar1Matrix, pillar1Matrix, [-3, 0, -2]);

const pillar2Matrix = mat4.create();
mat4.translate(pillar2Matrix, pillar2Matrix, [2, 0, -4]);

// Cthulhu Head (Sphere) - simplified octagon-based sphere
const sphereVertices = new Float32Array([
    0.0, 1.0, 0.0, 0.7, 0.7, 0.0, 1.0, 0.0, 0.0, 0.7, -0.7, 0.0,
    0.0, -1.0, 0.0, -0.7, -0.7, 0.0, -1.0, 0.0, 0.0, -0.7, 0.7, 0.0
]);

const sphereIndices = new Uint16Array([
    0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5, 0, 5, 6, 0, 6, 7, 0, 7, 1,
    4, 3, 2, 4, 2, 1, 4, 1, 7, 4, 7, 6, 4, 6, 5
]);

// Cthulhu Body (Cone)
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
const cthulhuHeadMatrix = mat4.create();
mat4.translate(cthulhuHeadMatrix, cthulhuHeadMatrix, [0, 1.5, -6]);

const cthulhuBodyMatrix = mat4.create();
mat4.translate(cthulhuBodyMatrix, cthulhuBodyMatrix, [0, 0, -6]);

document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement !== canvas) {
        firstMouse = true;
    }
});

// Main function
async function main() {
    canvas = document.getElementById("glCanvas");
    const gl = canvas.getContext("webgl2");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.1, 0.2, 1.0);
    gl.enable(gl.DEPTH_TEST);

    const vertexSrc = await loadShaderSource("shaders/vertex.glsl");
    const fragmentSrc = await loadShaderSource("shaders/fragment.glsl");
    const vertexShader = compileShader(gl, vertexSrc, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(gl, fragmentSrc, gl.FRAGMENT_SHADER);
    const program = createProgram(gl, vertexShader, fragmentShader);
    gl.useProgram(program);

    const viewMatrix = mat4.create();
    const projectionMatrix = mat4.create();
    mat4.lookAt(viewMatrix, vec3.fromValues(0, 2, 8), vec3.fromValues(0, 0, 0), vec3.fromValues(0, 1, 0));
    mat4.perspective(projectionMatrix, Math.PI / 4, canvas.width / canvas.height, 0.1, 100);

    const uModelLoc = gl.getUniformLocation(program, "uModel");
    const uViewLoc = gl.getUniformLocation(program, "uView");
    const uProjectionLoc = gl.getUniformLocation(program, "uProjection");
    gl.uniformMatrix4fv(uViewLoc, false, viewMatrix);
    gl.uniformMatrix4fv(uProjectionLoc, false, projectionMatrix);

    // Setup cube (ship)
    cubeVAO = gl.createVertexArray();
    gl.bindVertexArray(cubeVAO);
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, cubeVertices, gl.STATIC_DRAW);
    const ebo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cubeIndices, gl.STATIC_DRAW);
    const aPositionLoc = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(aPositionLoc);
    gl.vertexAttribPointer(aPositionLoc, 3, gl.FLOAT, false, 0, 0);

    requestAnimationFrame(() => drawScene(gl, program, uModelLoc));
    canvas.addEventListener("click", () => {
    canvas.requestPointerLock();
});
}

function createAndDrawObject(gl, program, vertices, indices, modelMatrix, uModelLoc) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const ebo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    const aPositionLoc = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(aPositionLoc);
    gl.vertexAttribPointer(aPositionLoc, 3, gl.FLOAT, false, 0, 0);

    gl.uniformMatrix4fv(uModelLoc, false, modelMatrix);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
}


function drawScene(gl, program, uModelLoc) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const viewMatrix = mat4.create();
    const target = vec3.create();
    vec3.add(target, cameraPosition, cameraFront);
    mat4.lookAt(viewMatrix, cameraPosition, target, cameraUp);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "uView"), false, viewMatrix);

     //Draw Boat
    gl.bindVertexArray(cubeVAO);
    const modelMatrix = mat4.create();
    mat4.translate(modelMatrix, modelMatrix, shipPosition);
    gl.uniformMatrix4fv(uModelLoc, false, modelMatrix);
    gl.drawElements(gl.TRIANGLES, cubeIndices.length, gl.UNSIGNED_SHORT, 0);
    // Draw Piller
    createAndDrawObject(gl, program, pillarVertices, pillarIndices, pillar1Matrix, uModelLoc);
    createAndDrawObject(gl, program, pillarVertices, pillarIndices, pillar2Matrix, uModelLoc);
    // Draw Cthulhu
    createAndDrawObject(gl, program, sphereVertices, sphereIndices, cthulhuHeadMatrix, uModelLoc);
    createAndDrawObject(gl, program, coneVertices, coneIndices, cthulhuBodyMatrix, uModelLoc);



    requestAnimationFrame(() => drawScene(gl, program, uModelLoc));
}

main();

// Helper functions (unchanged from your code)
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
