#version 300 es
precision mediump float;

uniform vec3 uAmbientLight;
uniform int uTorchLit;
uniform int uIsTorch;
uniform int uTorchHovered;
uniform vec3 uTorchLightPos;
uniform vec3 uTorchLightColor;
uniform float uTorchLightIntensity;
uniform vec3 uTorchDirection;

in vec3 vPosition;
in vec3 vNormal;

out vec4 outColor;

void main() {
    vec3 baseColor = vec3(0.4, 0.8, 0.9);

    if (uIsTorch == 1) {
        if (uTorchLit == 1) {
            baseColor = vec3(1.0, 0.6, 0.1); // Meşale yanıyorsa
        } else if (uTorchHovered == 1) {
            baseColor = vec3(1.0, 0.8, 0.2); // Hover efekti
        } else {
            baseColor = vec3(0.3, 0.3, 0.3); // Sönük meşale
        }
    }

    vec3 light = uAmbientLight * baseColor;

    if (uTorchLit == 1 && uIsTorch == 0) {
        vec3 lightDir = normalize(uTorchLightPos - vPosition);
        float diff = max(dot(normalize(vNormal), lightDir), 0.0);

        float spotEffect = dot(-lightDir, normalize(uTorchDirection));
        float spotCutoff = 0.85; // cos(30deg)
        float spotOuterCutoff = 0.65; // cos(50deg)
        float intensity = 0.0;

        if (spotEffect > spotCutoff) {
            intensity = 1.0;
        } else if (spotEffect > spotOuterCutoff) {
            float t = (spotEffect - spotOuterCutoff) / (spotCutoff - spotOuterCutoff);
            intensity = t;
        }
        intensity = pow(intensity, 1.8); // Yumuşak düşüş

        vec3 torchLight = uTorchLightColor * diff * intensity * uTorchLightIntensity;
        light += torchLight * baseColor;
    }

    outColor = vec4(light, 1.0);
}