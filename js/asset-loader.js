(function exposeAssetLoader(global) {
    async function loadText(url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`${url} could not be loaded (${response.status})`);
        return response.text();
    }

    function parseMTL(source) {
        const materials = {};
        let current = null;
        source.split('\n').forEach((rawLine) => {
            const line = rawLine.trim();
            if (line.startsWith('newmtl ')) {
                current = line.split(/\s+/)[1];
                materials[current] = { Kd: [0.8, 0.8, 0.8] };
            } else if (line.startsWith('Kd ') && current) {
                const [, r, g, b] = line.split(/\s+/);
                materials[current].Kd = [Number(r), Number(g), Number(b)];
            }
        });
        return materials;
    }

    function makeIndexArray(indices) {
        let maximum = 0;
        for (const index of indices) maximum = Math.max(maximum, index);
        return maximum > 65535 ? new Uint32Array(indices) : new Uint16Array(indices);
    }

    async function loadOBJWithMTL(objUrl, mtlUrl, useUV = true) {
        const [objText, mtlText] = await Promise.all([
            loadText(objUrl),
            mtlUrl ? loadText(mtlUrl) : Promise.resolve('')
        ]);
        const materials = parseMTL(mtlText);
        const positions = [], normals = [], uvs = [], vertices = [], indices = [];
        const materialForFace = [], materialList = [], uniqueVertices = new Map();
        let currentMaterial = null;

        objText.split('\n').forEach((rawLine) => {
            const line = rawLine.trim();
            const parts = line.split(/\s+/);
            if (line.startsWith('v ')) positions.push(parts.slice(1, 4).map(Number));
            else if (line.startsWith('vn ')) normals.push(parts.slice(1, 4).map(Number));
            else if (line.startsWith('vt ')) uvs.push(parts.slice(1, 3).map(Number));
            else if (line.startsWith('usemtl ')) {
                currentMaterial = parts[1];
                if (!materialList.includes(currentMaterial)) materialList.push(currentMaterial);
            } else if (line.startsWith('f ')) {
                const faceVertices = parts.slice(1);
                for (let triangle = 1; triangle < faceVertices.length - 1; triangle += 1) {
                    for (const faceIndex of [0, triangle, triangle + 1]) {
                        const [positionToken, uvToken, normalToken] = faceVertices[faceIndex].split('/');
                        const positionIndex = Number(positionToken) || 1;
                        const uvIndex = Number(uvToken) || 1;
                        const normalIndex = Number(normalToken) || 1;
                        const key = `${positionIndex}/${uvIndex}/${normalIndex}/${currentMaterial}`;
                        if (!uniqueVertices.has(key)) {
                            const position = positions[positionIndex - 1];
                            if (!position) throw new Error(`${objUrl} contains an invalid vertex index`);
                            const normal = normals[normalIndex - 1] || [0, 1, 0];
                            const color = (materials[currentMaterial] || { Kd: [0.7, 0.7, 0.7] }).Kd;
                            vertices.push(...position, ...normal, ...color);
                            if (useUV) vertices.push(...(uvs[uvIndex - 1] || [0, 0]));
                            uniqueVertices.set(key, vertices.length / (useUV ? 11 : 9) - 1);
                        }
                        indices.push(uniqueVertices.get(key));
                        materialForFace.push(currentMaterial);
                    }
                }
            }
        });

        return {
            vertices: new Float32Array(vertices),
            indices: makeIndexArray(indices),
            materials,
            materialForFace,
            materialList
        };
    }

    function loadTexture(gl, url) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
            new Uint8Array([120, 100, 80, 255]));
        const image = new Image();
        return new Promise((resolve, reject) => {
            image.onload = () => {
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
                gl.generateMipmap(gl.TEXTURE_2D);
                resolve(texture);
            };
            image.onerror = () => { gl.deleteTexture(texture); reject(new Error(`${url} texture could not be loaded`)); };
            image.src = url;
        });
    }

    async function loadShaderSource(url) {
        return loadText(url);
    }

    function compileShader(gl, source, type) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const message = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw new Error(`Shader compilation failed: ${message}`);
        }
        return shader;
    }

    function createProgram(gl, vertexShader, fragmentShader) {
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const message = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            throw new Error(`Shader program linking failed: ${message}`);
        }
        return program;
    }

    global.AssetLoader = { loadOBJWithMTL, loadTexture, loadShaderSource, compileShader, createProgram, makeIndexArray };
}(window));
