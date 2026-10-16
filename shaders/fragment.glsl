#version 300 es
precision mediump float;

in vec3 vColor;
in vec3 vNormal;
in vec3 vFragPos;
in vec2 vTexCoord;

uniform bool uCompassHovered;
uniform bool uIsCompass;
uniform bool uTorchHovered;
uniform bool uIsTorch;
uniform vec3 uAmbientLight;

uniform bool uTorchLit;
uniform vec3 uTorchLightPos;
uniform float uTorchLightIntensity;
uniform vec3 uTorchLightColor;
uniform vec3 uTorchDirection;

uniform sampler2D uTexture;
uniform bool uUseTexture;
uniform bool uUsePBR;
uniform sampler2D uAOTex;
uniform sampler2D uMetallicTex;
uniform sampler2D uRoughnessTex;

out vec4 fragColor;

vec3 calculateTorchLight(vec3 baseColor, float metallic) {
    if (!uTorchLit) return vec3(0.0);

    vec3 fromLight = vFragPos - uTorchLightPos;
    float distanceToLight = length(fromLight);
    vec3 beamDirection = normalize(uTorchDirection);
    vec3 lightToFragment = normalize(fromLight);
    vec3 fragmentToLight = -lightToFragment;

    // A flashlight cone with a bright core and a soft outer edge.
    float coneAlignment = dot(lightToFragment, beamDirection);
    float outerCone = smoothstep(0.72, 0.84, coneAlignment);
    float innerCone = smoothstep(0.90, 0.975, coneAlignment);
    float cone = outerCone * mix(0.62, 1.0, innerCone);

    // Tuned for the large world-space scale used by this scene.
    float attenuation = 1.0 / (1.0 + 0.018 * distanceToLight + 0.0012 * distanceToLight * distanceToLight);
    float diffuse = max(dot(normalize(vNormal), fragmentToLight), 0.0);

    // The small fill term suggests bounced light and keeps the beam readable on water.
    float surfaceLight = diffuse * 1.35 + 0.16;
    vec3 warmCore = mix(uTorchLightColor, vec3(1.0, 0.9, 0.68), innerCone * 0.45);
    return warmCore * baseColor * surfaceLight * attenuation * cone
        * uTorchLightIntensity * (1.0 + metallic * 0.35);
}

void main() {
    vec3 baseColor = vColor;
    if (uUseTexture) {
        baseColor = texture(uTexture, vTexCoord).rgb;
        vec3 ao = uUsePBR ? texture(uAOTex, vTexCoord).rgb : vec3(1.0);
        float metallic = uUsePBR ? texture(uMetallicTex, vTexCoord).r : 0.0;
        float roughness = uUsePBR ? texture(uRoughnessTex, vTexCoord).r : 0.35;
        baseColor *= ao;
        float rough = 1.0 - roughness;
        float metal = metallic;
        float light = max(dot(normalize(vNormal), normalize(vec3(0.3, 0.8, 0.4))), 0.0);
        vec3 ambient = uAmbientLight * baseColor * 0.4;
        vec3 diffuse = baseColor * light * 0.7 * rough;
        vec3 color = ambient + diffuse;
        color += calculateTorchLight(baseColor, metal);
        if (uIsCompass && uCompassHovered) {
            color = mix(color, vec3(1.0, 0.9, 0.5), 0.7);
        }
        if (uIsTorch && uTorchHovered) {
            color = mix(color, vec3(1.0, 0.8, 0.2), 0.7);
        }
        fragColor = vec4(color, 1.0);
        return;
    }
    float light = max(dot(normalize(vNormal), normalize(vec3(0.3, 0.8, 0.4))), 0.0);
    vec3 ambient = uAmbientLight * baseColor * 0.4;
    vec3 diffuse = baseColor * light * 0.7;
    vec3 color = ambient + diffuse;
    color += calculateTorchLight(baseColor, 0.0);
    if (uIsCompass && uCompassHovered) {
        color = mix(color, vec3(1.0, 0.9, 0.5), 0.7);
    }
    if (uIsTorch && uTorchHovered) {
        color = mix(color, vec3(1.0, 0.8, 0.2), 0.7);
    }
    fragColor = vec4(color, 1.0);
}
