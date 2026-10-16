#version 300 es
precision mediump float;

in vec3 vColor;
in vec3 vNormal;
in vec3 vFragPos;
in vec2 vTexCoord;
in vec3 vLocalPos;

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
uniform bool uFogEnabled;
uniform float uFogDensity;
uniform vec3 uFogColor;
uniform vec3 uCameraPos;
uniform bool uPostEnabled;
uniform vec2 uResolution;
uniform float uTime;
uniform bool uIsParticle;

out vec4 fragColor;

vec3 calculateTorchLight(vec3 baseColor, float metallic) {
    if (!uTorchLit) return vec3(0.0);

    vec3 fromLight = vFragPos - uTorchLightPos;
    float distanceToLight = length(fromLight);
    vec3 beamDirection = normalize(uTorchDirection);
    vec3 lightToFragment = normalize(fromLight);
    vec3 fragmentToLight = -lightToFragment;

    vec3 normal = normalize(vNormal);
    float diffuse = max(dot(normal, fragmentToLight), 0.0);

    // Short-range omnidirectional lantern light. The fill component models
    // scattering through the glass and softly lights the boat and metal body.
    float localAttenuation = 1.0 / (1.0 + 0.16 * distanceToLight + 0.055 * distanceToLight * distanceToLight);
    float localSurface = diffuse * 0.82 + 0.20;
    vec3 localLight = uTorchLightColor * baseColor * localSurface * localAttenuation
        * uTorchLightIntensity * 0.72;

    // A broad, soft forward lobe instead of visible cone geometry.
    float coneAlignment = dot(lightToFragment, beamDirection);
    float outerCone = smoothstep(0.62, 0.82, coneAlignment);
    float innerCone = smoothstep(0.87, 0.97, coneAlignment);
    float cone = outerCone * mix(0.48, 1.0, innerCone);

    // Tuned for the large world-space scale used by this scene.
    float attenuation = 1.0 / (1.0 + 0.024 * distanceToLight + 0.0015 * distanceToLight * distanceToLight);

    // The small fill term suggests bounced light and keeps the beam readable on water.
    float surfaceLight = diffuse * 1.35 + 0.16;
    vec3 warmCore = mix(uTorchLightColor, vec3(1.0, 0.9, 0.68), innerCone * 0.45);
    vec3 forwardLight = warmCore * baseColor * surfaceLight * attenuation * cone
        * uTorchLightIntensity * 0.82 * (1.0 + metallic * 0.35);
    return localLight + forwardLight;
}

float randomNoise(vec2 coordinate) {
    return fract(sin(dot(coordinate, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 finishSceneColor(vec3 color) {
    if (uFogEnabled) {
        float distanceFromCamera = length(vFragPos - uCameraPos);
        float fogAmount = 1.0 - exp(-uFogDensity * distanceFromCamera);
        fogAmount = clamp(fogAmount, 0.0, 0.92);
        color = mix(color, uFogColor, fogAmount);
    }
    if (uPostEnabled) {
        color = color / (color + vec3(1.0));
        color = pow(color, vec3(0.92, 0.98, 1.06));
        color *= vec3(0.88, 0.98, 1.06);
        vec2 screenUV = gl_FragCoord.xy / max(uResolution, vec2(1.0));
        float vignette = 1.0 - smoothstep(0.38, 0.78, distance(screenUV, vec2(0.5)));
        color *= mix(0.62, 1.0, vignette);
        float grain = randomNoise(gl_FragCoord.xy + uTime * 71.0) - 0.5;
        color += grain * 0.026;
    }
    return max(color, vec3(0.0));
}

void main() {
    if (uIsParticle) {
        vec2 point = gl_PointCoord * 2.0 - 1.0;
        float radius = dot(point, point);
        if (radius > 1.0) discard;
        float alpha = (1.0 - radius) * 0.42;
        fragColor = vec4(vColor * vec3(1.0, 0.82, 0.52), alpha);
        return;
    }
    vec3 baseColor = vColor;
    if (uIsTorch) {
        float patina = 0.82 + 0.18 * sin(vLocalPos.x * 74.0 + sin(vLocalPos.y * 91.0));
        baseColor *= patina;
    }
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
        fragColor = vec4(finishSceneColor(color), 1.0);
        return;
    }
    float light = max(dot(normalize(vNormal), normalize(vec3(0.3, 0.8, 0.4))), 0.0);
    vec3 ambient = uAmbientLight * baseColor * 0.4;
    vec3 diffuse = baseColor * light * 0.7;
    vec3 color = ambient + diffuse;
    if (uIsTorch) {
        float glassMask = smoothstep(0.55, 0.9, vColor.r) * (1.0 - smoothstep(0.34, 0.72, vColor.g));
        float edgeWear = pow(1.0 - abs(dot(normalize(vNormal), normalize(uCameraPos - vFragPos))), 2.5);
        float normalizedIntensity = uTorchLit ? clamp(uTorchLightIntensity / 6.0, 0.0, 2.0) : 0.0;
        color += baseColor * (0.16 + normalizedIntensity * 0.13);
        color += vec3(0.20, 0.09, 0.025) * edgeWear * (0.35 + normalizedIntensity * 0.65);
        color += vec3(1.0, 0.24, 0.018) * glassMask * (0.06 + normalizedIntensity * 2.25);
    }
    color += calculateTorchLight(baseColor, 0.0);
    if (uIsCompass && uCompassHovered) {
        color = mix(color, vec3(1.0, 0.9, 0.5), 0.7);
    }
    if (uIsTorch && uTorchHovered) {
        color = mix(color, vec3(1.0, 0.8, 0.2), 0.7);
    }
    fragColor = vec4(finishSceneColor(color), 1.0);
}
