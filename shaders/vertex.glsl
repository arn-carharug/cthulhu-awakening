#version 300 es
precision mediump float;

in vec3 aPosition;
in vec3 aNormal;
in vec3 aColor;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;

out vec3 vPosition;
out vec3 vNormal;
out vec3 vColor;

void main() {
    vec4 worldPos = uModel * vec4(aPosition, 1.0);
    vPosition = worldPos.xyz;
    vNormal = normalize(mat3(uModel) * aNormal);
    vColor = aColor;
    gl_Position = uProjection * uView * worldPos;
}
