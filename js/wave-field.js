(function exposeWaveField(global) {
    global.WaveField = {
        sample(x, z, time, height, speed) {
            const a = x * 0.055 + time * speed;
            const b = z * 0.071 - time * speed * 0.73;
            const c = (x + z) * 0.031 + time * speed * 0.46;
            return {
                height: (Math.sin(a)*0.48 + Math.sin(b)*0.32 + Math.sin(c)*0.20) * height,
                slopeX: (Math.cos(a)*0.48*0.055 + Math.cos(c)*0.20*0.031) * height,
                slopeZ: (Math.cos(b)*0.32*0.071 + Math.cos(c)*0.20*0.031) * height
            };
        }
    };
}(window));
