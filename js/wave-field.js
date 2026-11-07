// The ocean surface, shared by the vertex shader (drawing) and the boat (bob, roll and pitch).
// Two layers, both multiplied by the current wave height:
//   swells — three long sine waves (wavelengths ~90-200 units) that set the boat's motion;
//   chop   — two shorter Gerstner waves whose horizontal displacement sharpens the crests and
//            whose fold (where the surface bunches up) marks where foam forms.
// The shader receives the chop table through the uChop/uChopShape uniforms, so this file is the
// single source of truth. sample() returns the height at an undisplaced point; the Gerstner
// sideways shift (at most steepness x amplitude x height, ~0.2 units) is ignored for the boat.
(function exposeWaveField(global) {
    const GRAVITY = 9.81;
    const CHOP_PACE = 0.55; // slows deep-water speed to the scene's slow, heavy swell

    function gerstner(wavelength, directionX, directionZ, amplitude, steepness) {
        const length = Math.hypot(directionX, directionZ);
        const k = (2 * Math.PI) / wavelength;
        return Object.freeze({
            dirX: directionX / length, dirZ: directionZ / length, k,
            omega: Math.sqrt(GRAVITY * k) * CHOP_PACE, amplitude, steepness
        });
    }

    const CHOP = Object.freeze([
        gerstner(24, 0.8, 0.6, 0.16, 0.7),
        gerstner(15, -0.4, 0.92, 0.10, 0.6)
    ]);
    const SWELL_AMPLITUDES = Object.freeze([0.48, 0.32, 0.20]);

    const uniforms = Object.freeze({
        // vec4 uChop[2]: direction x, direction z, wavenumber k, angular frequency
        chop: new Float32Array(CHOP.flatMap((w) => [w.dirX, w.dirZ, w.k, w.omega])),
        // vec4 uChopShape: amplitude 0, steepness 0, amplitude 1, steepness 1
        shape: new Float32Array(CHOP.flatMap((w) => [w.amplitude, w.steepness]))
    });

    global.WaveField = {
        CHOP,
        uniforms,
        // Upper bound of |height| / waveHeight.
        maxAmplitude: [...SWELL_AMPLITUDES, ...CHOP.map((w) => w.amplitude)].reduce((sum, a) => sum + a, 0),
        sample(x, z, time, height, speed) {
            const a = x * 0.055 + time * speed;
            const b = z * 0.071 - time * speed * 0.73;
            const c = (x + z) * 0.031 + time * speed * 0.46;
            let surface = Math.sin(a) * 0.48 + Math.sin(b) * 0.32 + Math.sin(c) * 0.20;
            let slopeX = Math.cos(a) * 0.48 * 0.055 + Math.cos(c) * 0.20 * 0.031;
            let slopeZ = Math.cos(b) * 0.32 * 0.071 + Math.cos(c) * 0.20 * 0.031;
            for (const w of CHOP) {
                const theta = w.k * (w.dirX * x + w.dirZ * z) - w.omega * time * speed;
                const along = w.amplitude * w.k * Math.cos(theta);
                surface += w.amplitude * Math.sin(theta);
                slopeX += w.dirX * along;
                slopeZ += w.dirZ * along;
            }
            return { height: surface * height, slopeX: slopeX * height, slopeZ: slopeZ * height };
        }
    };
}(typeof window !== 'undefined' ? window : globalThis));
