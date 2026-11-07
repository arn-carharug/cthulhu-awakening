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
uniform bool uIsEye;
uniform float uEyeIntensity;
uniform float uTime;
uniform bool uIsWater;
uniform float uWaveHeight;
uniform float uWaveSpeed;
uniform vec4 uChop[2];     // Gerstner chop (WaveField.CHOP): direction x, direction z, wavenumber, angular frequency
uniform vec4 uChopShape;   // amplitude 0, steepness 0, amplitude 1, steepness 1

// VARYING
out vec3 vColor;
out vec3 vNormal;
out vec3 vFragPos;
out vec2 vTexCoord;
out vec3 vLocalPos;
out float vWaveHeight;
out float vCrest;

void main() {
    // World pos
    vec3 animatedPosition = aPosition;
    vec3 animatedNormal = aNormal;
    vWaveHeight = 0.0;
    vCrest = 0.0;
    if (uIsWater) {
        vec3 waterPosition = (uModel * vec4(aPosition, 1.0)).xyz;
        float phaseA = waterPosition.x * 0.055 + uTime * uWaveSpeed;
        float phaseB = waterPosition.z * 0.071 - uTime * uWaveSpeed * 0.73;
        float phaseC = (waterPosition.x + waterPosition.z) * 0.031 + uTime * uWaveSpeed * 0.46;
        float wave = sin(phaseA) * 0.48 + sin(phaseB) * 0.32 + sin(phaseC) * 0.20;
        float derivativeX = cos(phaseA) * 0.48 * 0.055 + cos(phaseC) * 0.20 * 0.031;
        float derivativeZ = cos(phaseB) * 0.32 * 0.071 + cos(phaseC) * 0.20 * 0.031;

        // Gerstner chop: vertices slide toward each crest, sharpening it; "fold" measures how much
        // the surface bunches up there (1 - Jacobian), which is where foam forms.
        vec3 chop = vec3(0.0);
        float fold = 0.0;
        float foldMax = 0.0;
        for (int i = 0; i < 2; i++) {
            vec4 w = uChop[i];
            float amplitude = i == 0 ? uChopShape.x : uChopShape.z;
            float steepness = i == 0 ? uChopShape.y : uChopShape.w;
            float theta = w.z * dot(w.xy, waterPosition.xz) - w.w * uTime * uWaveSpeed;
            float s = sin(theta);
            float c = cos(theta);
            chop += vec3(w.x * steepness * amplitude * c, amplitude * s, w.y * steepness * amplitude * c);
            derivativeX += w.x * w.z * amplitude * c;
            derivativeZ += w.y * w.z * amplitude * c;
            fold += steepness * w.z * amplitude * s;
            foldMax += steepness * w.z * amplitude;
        }
        animatedPosition += vec3(chop.x, wave + chop.y, chop.z) * uWaveHeight;
        animatedNormal = normalize(vec3(-derivativeX * uWaveHeight, 1.0 - fold * uWaveHeight, -derivativeZ * uWaveHeight));
        vWaveHeight = wave;
        vCrest = foldMax > 0.0 ? fold / foldMax : 0.0;
    }
    if (uIsParticle) {
        animatedPosition.x += sin(uTime * 0.35 + aPosition.z * 0.7) * 0.22;
        animatedPosition.y += sin(uTime * 0.55 + aPosition.x * 0.9) * 0.18;
        animatedPosition.z += cos(uTime * 0.3 + aPosition.y) * 0.16;
        gl_PointSize = 2.2 + 2.4 * fract(aTexCoord.x * 17.0);
    }
    if (uIsEye) {
        gl_PointSize = 12.0 + uEyeIntensity * 15.0;
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
