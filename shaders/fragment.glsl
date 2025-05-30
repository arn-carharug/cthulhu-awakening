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
uniform sampler2D uAOTex;
uniform sampler2D uMetallicTex;
uniform sampler2D uRoughnessTex;
uniform sampler2D uTorchMetallicTex;

out vec4 fragColor;

void main() {
    vec3 baseColor = vColor;
    if (uUseTexture) {
        baseColor = texture(uTexture, vTexCoord).rgb;
        vec3 ao = texture(uAOTex, vTexCoord).rgb;
        float metallic = uIsTorch
    ? texture(uTorchMetallicTex, vTexCoord).r
    : texture(uMetallicTex, vTexCoord).r;
        float roughness = texture(uRoughnessTex, vTexCoord).r;        
        baseColor *= ao;
        float rough = 1.0 - roughness;
        float metal = metallic;
        float light = max(dot(normalize(vNormal), normalize(vec3(0.3, 0.8, 0.4))), 0.0);
        vec3 ambient = uAmbientLight * baseColor * 0.4;
        vec3 diffuse = baseColor * light * 0.7 * rough;
        vec3 color = ambient + diffuse;
        if (uTorchLit) {
            vec3 lightDir = normalize(uTorchLightPos - vFragPos);
            float diff = max(dot(vNormal, lightDir), 0.0);
            float dist = length(uTorchLightPos - vFragPos);
            float attenuation = 1.0 / (1.0 + 0.15 * dist + 0.02 * dist * dist);
            float spotEffect = max(dot(lightDir, -normalize(uTorchDirection)), 0.0);
            spotEffect = pow(spotEffect, 8.0);
            vec3 torch = uTorchLightColor * baseColor * diff * attenuation * uTorchLightIntensity * spotEffect * (1.0 + metal);
            color += torch;
        }
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
    if (uTorchLit) {
        vec3 lightDir = normalize(uTorchLightPos - vFragPos);
        float diff = max(dot(vNormal, lightDir), 0.0);
        float dist = length(uTorchLightPos - vFragPos);
        float attenuation = 1.0 / (1.0 + 0.15 * dist + 0.02 * dist * dist);
        float spotEffect = max(dot(lightDir, -normalize(uTorchDirection)), 0.0);
        spotEffect = pow(spotEffect, 8.0);
        vec3 torch = uTorchLightColor * baseColor * diff * attenuation * uTorchLightIntensity * spotEffect * 2.0;
        color += torch;
    }
    if (uIsCompass && uCompassHovered) {
        color = mix(color, vec3(1.0, 0.9, 0.5), 0.7);
    }
    if (uIsTorch && uTorchHovered) {
        color = mix(color, vec3(1.0, 0.8, 0.2), 0.7);
    }
    fragColor = vec4(color, 1.0);
}
