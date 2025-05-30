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

// VARYING
out vec3 vColor;
out vec3 vNormal;
out vec3 vFragPos;
out vec2 vTexCoord;

void main() {
    // World pos
    vec4 worldPosition = uModel * vec4(aPosition, 1.0);
    vFragPos = worldPosition.xyz;

    // Normal (model matrisinin üst sol 3x3'ü)
    vNormal = mat3(uModel) * aNormal;

    // Vertex color (obj/mtl yoksa [1,1,1] gelir)
    vColor = aColor;

    // Texture UV (her zaman ilet, obj'de yoksa [0,0] olur)
    vTexCoord = aTexCoord;

    // Kamera projeksiyonu
    gl_Position = uProjection * uView * worldPosition;
}
