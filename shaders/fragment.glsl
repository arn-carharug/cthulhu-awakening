#version 300 es
precision mediump float;

in vec3 vColor;
in vec3 vNormal;
in vec3 vFragPos;

out vec4 fragColor;

void main() {
    // Basit gölgelendirme: normal ve renk
    float light = max(dot(normalize(vNormal), normalize(vec3(0.3, 0.8, 0.4))), 0.18);
    fragColor = vec4(vColor * light, 1.0);
}
