#version 300 es
precision mediump float;

// ATTRIBS
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec3 aColor;
layout(location = 3) in vec2 aTexCoord;   // <-- UV

// UNIFORMS
uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
uniform bool uIsParticle;
uniform float uTime;
uniform bool uIsWater;
uniform float uWaveHeight;
uniform float uWaveSpeed;

// VARYING
out vec3 vColor;
out vec3 vNormal;
out vec3 vFragPos;
out vec2 vTexCoord;
out vec3 vLocalPos;
out float vWaveHeight;

void main() {
    // World pos
    vec3 animatedPosition = aPosition;
    vec3 animatedNormal = aNormal;
    vWaveHeight = 0.0;
    if (uIsWater) {
        float phaseA = aPosition.x * 0.055 + uTime * uWaveSpeed;
        float phaseB = aPosition.z * 0.071 - uTime * uWaveSpeed * 0.73;
        float phaseC = (aPosition.x + aPosition.z) * 0.031 + uTime * uWaveSpeed * 0.46;
        float wave = sin(phaseA) * 0.48 + sin(phaseB) * 0.32 + sin(phaseC) * 0.20;
        animatedPosition.y += wave * uWaveHeight;
        float derivativeX = cos(phaseA) * 0.48 * 0.055 + cos(phaseC) * 0.20 * 0.031;
        float derivativeZ = cos(phaseB) * 0.32 * 0.071 + cos(phaseC) * 0.20 * 0.031;
        animatedNormal = normalize(vec3(-derivativeX * uWaveHeight, 1.0, -derivativeZ * uWaveHeight));
        vWaveHeight = wave;
    }
    if (uIsParticle) {
        animatedPosition.x += sin(uTime * 0.35 + aPosition.z * 0.7) * 0.22;
        animatedPosition.y += sin(uTime * 0.55 + aPosition.x * 0.9) * 0.18;
        animatedPosition.z += cos(uTime * 0.3 + aPosition.y) * 0.16;
        gl_PointSize = 2.2 + 2.4 * fract(aTexCoord.x * 17.0);
    }
    vec4 worldPosition = uModel * vec4(animatedPosition, 1.0);
    vFragPos = worldPosition.xyz;

    // Inverse-transpose keeps normals correct under non-uniform scaling.
    vNormal = transpose(inverse(mat3(uModel))) * animatedNormal;

    // Vertex color (obj/mtl yoksa [1,1,1] gelir)
    vColor = aColor;

    // Texture UV (her zaman ilet, obj'de yoksa [0,0] olur)
    vTexCoord = aTexCoord;
    vLocalPos = aPosition;

    // Kamera projeksiyonu
    gl_Position = uProjection * uView * worldPosition;
}
