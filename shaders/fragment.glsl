precision mediump float;

uniform vec3 uAmbientLight;
uniform int uTorchLit;
uniform int uIsTorch;
uniform int uTorchHovered;

uniform vec3 uTorchLightPos;
uniform float uTorchLightIntensity;

varying vec3 vPosition;

void main() {
    vec3 baseColor = vec3(0.4, 0.8, 0.9);

    if (uIsTorch == 1) {
        if (uTorchLit == 1) {
            baseColor = vec3(1.0, 0.6, 0.1); // Lit torch color
            if (uTorchHovered == 1) {
                baseColor = mix(baseColor, vec3(1.0, 0.85, 0.3), 0.5); // Lit + hovered: brighter yellowish
            }
        } else {
            baseColor = vec3(0.3, 0.3, 0.3); // Unlit torch color
            if (uTorchHovered == 1) {
                baseColor = vec3(1.0, 1.0, 0.7); // Only hovered: bright pale yellow
            }
        }
    }

    // Apply torchEffect only when torch is lit:
    vec3 torchEffect = vec3(0.0);
    if (uIsTorch == 1 && uTorchLit == 1) {
        vec3 lightColor = vec3(1.0, 0.8, 0.4);
        vec3 lightDir = normalize(uTorchLightPos - vPosition);
        float diff = max(abs(dot(normalize(vec3(0.0, 1.0, 0.0)), lightDir)), 0.25); // minimum contribution
        torchEffect = lightColor * diff * uTorchLightIntensity;
    }

    vec3 finalColor = baseColor * uAmbientLight + torchEffect;
    gl_FragColor = vec4(finalColor, 1.0);
}