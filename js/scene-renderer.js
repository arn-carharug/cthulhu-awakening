(function exposeSceneRenderer(global) {
    function toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }
    const WORLD_UP = Object.freeze([0, 1, 0]);
    const FPS_TORCH_SCALE = Object.freeze([0.08, 0.08, 0.08]);

    class SceneRenderer {
        constructor(context) {
            this.ctx = context;
            // Per-frame scratch storage. Getters below return these buffers instead of new arrays:
            // callers must use a result before the next call to the same getter and must not keep it.
            this.scratch = {
                camera: [0, 0, 0],
                front: [0, 0, 0],
                right: [0, 0, 0],
                up: [0, 0, 0],
                torchPosition: [0, 0, 0],
                torchLight: [0, 0, 0],
                compass: [0, 0, 0],
                torchMatrix: new Float32Array(16),
                waves: { height: 0, speed: 0 }
            };
        }

        get state() { return this.ctx.STATE; }
        get gl() { return this.ctx.STATE.gl; }
        get comfort() { return this.ctx.comfortSettings; }
        get events() { return this.ctx.sceneEvents; }
        get navigation() { return this.ctx.navigation; }
        get discoveries() { return this.ctx.discoveries; }

        createWaterGrid(cols, rows, size = 1) {
            const positions = [];
            const normals = [];
            const colors = [];
            const uvs = [];
            const indices = [];
            const HALF_X = (cols * size) / 2;
            const HALF_Z = (rows * size) / 2;
            for (let i = 0; i <= rows; i++) {
                for (let j = 0; j <= cols; j++) {
                    const x = j * size - HALF_X;
                    const z = i * size - HALF_Z;
                    positions.push(x, 0, z);
                    normals.push(0, 1, 0);
                    colors.push(0.15, 0.23, 0.35);
                    uvs.push(j / cols, i / rows);
                }
            }
            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    const a = i * (cols + 1) + j;
                    const b = a + 1;
                    const c = a + (cols + 1);
                    const d = c + 1;
                    indices.push(a, c, b);
                    indices.push(b, c, d);
                }
            }
            const vertices = [];
            for (let i = 0; i < positions.length / 3; i++) {
                vertices.push(
                    positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2],
                    normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2],
                    colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2],
                    uvs[i * 2], uvs[i * 2 + 1]
                );
            }
            return {
                vertices: new Float32Array(vertices),
                indices: new Uint32Array(indices)
            };
        }

        rebuildWaterMesh(segments) {
            const S = this.state;
            const gl = S.gl;
            if (!gl) return;
            const waterGrid = this.createWaterGrid(segments, segments, 2);
            if (!S.waterVAO) S.waterVAO = gl.createVertexArray();
            gl.bindVertexArray(S.waterVAO);

            if (!S.waterVBO) S.waterVBO = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, S.waterVBO);
            gl.bufferData(gl.ARRAY_BUFFER, waterGrid.vertices, gl.STATIC_DRAW);

            if (!S.waterEBO) S.waterEBO = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, S.waterEBO);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, waterGrid.indices, gl.STATIC_DRAW);

            const stride = 11 * Float32Array.BYTES_PER_ELEMENT;
            gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
            gl.enableVertexAttribArray(0);
            gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 3 * Float32Array.BYTES_PER_ELEMENT);
            gl.enableVertexAttribArray(1);
            gl.vertexAttribPointer(2, 3, gl.FLOAT, false, stride, 6 * Float32Array.BYTES_PER_ELEMENT);
            gl.enableVertexAttribArray(2);
            gl.vertexAttribPointer(3, 2, gl.FLOAT, false, stride, 9 * Float32Array.BYTES_PER_ELEMENT);
            gl.enableVertexAttribArray(3);

            S.waterIndexCount = waterGrid.indices.length;
            gl.bindVertexArray(null);
        }

        createEffectsVAO(vertices) {
            const gl = this.gl;
            const vao = gl.createVertexArray();
            gl.bindVertexArray(vao);
            const vbo = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
            gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

            const stride = 11 * Float32Array.BYTES_PER_ELEMENT;
            gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
            gl.enableVertexAttribArray(0);
            gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 3 * Float32Array.BYTES_PER_ELEMENT);
            gl.enableVertexAttribArray(1);
            gl.vertexAttribPointer(2, 3, gl.FLOAT, false, stride, 6 * Float32Array.BYTES_PER_ELEMENT);
            gl.enableVertexAttribArray(2);
            gl.vertexAttribPointer(3, 2, gl.FLOAT, false, stride, 9 * Float32Array.BYTES_PER_ELEMENT);
            gl.enableVertexAttribArray(3);
            gl.bindVertexArray(null);
            return { vao, vbo };
        }

        rebuildAtmosphere(particleCount) {
            const S = this.state;
            const gl = S.gl;
            if (!gl) return;
            const particles = global.EnvironmentEffects?.createDustField(particleCount);
            if (!particles) return;
            if (S.particleVAO) gl.deleteVertexArray(S.particleVAO);
            if (S.particleVBO) gl.deleteBuffer(S.particleVBO);
            const effect = this.createEffectsVAO(particles);
            S.particleVAO = effect.vao;
            S.particleVBO = effect.vbo;
            S.particleCount = particleCount;
        }

        async refreshTextures(quality) {
            const S = this.state;
            const gl = S.gl;
            if (!gl) return false;
            if (!this.ctx.textureRequest) this.ctx.textureRequest = 0;
            const request = ++this.ctx.textureRequest;
            const entries = Object.entries(global.TextureCatalog?.entries(quality) || {});
            const results = await Promise.allSettled(entries.map(([, url]) => global.loadTexture ? global.loadTexture(gl, url) : Promise.reject(new Error('loadTexture not available'))));
            const failed = results.find((result) => result.status === 'rejected');
            if (failed || request !== this.ctx.textureRequest || gl.isContextLost()) {
                for (const result of results) if (result.status === 'fulfilled') gl.deleteTexture(result.value);
                if (failed && request === this.ctx.textureRequest) throw failed.reason;
                return false;
            }
            for (let index = 0; index < entries.length; index++) {
                const key = entries[index][0];
                const previous = S[key];
                S[key] = results[index].value;
                if (previous) gl.deleteTexture(previous);
            }
            S.textureVariant = quality === 'low' ? 'low' : 'high';
            return true;
        }

        async applyQuality(quality) {
            const S = this.state;
            const presets = global.GameConfig?.qualityPresets || global.qualityPresets;
            if (!presets || !presets[quality]) return;
            if (!this.ctx.qualityGeneration) this.ctx.qualityGeneration = 0;
            const generation = ++this.ctx.qualityGeneration;
            this.ctx.textureRequest = (this.ctx.textureRequest || 0) + 1;
            const previous = S.appliedQuality || S.quality;
            S.quality = quality;
            const doc = global.document;

            if (S.gl && S.textureVariant !== (quality === 'low' ? 'low' : 'high')) {
                const status = doc?.getElementById('input-status');
                if (status) {
                    status.textContent = `Loading ${presets[quality].label} textures…`;
                    status.hidden = false;
                }
                try {
                    if (!await this.refreshTextures(quality)) return;
                } catch (error) {
                    if (generation !== this.ctx.qualityGeneration) return;
                    S.quality = previous;
                    const debugQuality = doc?.getElementById('debug-quality');
                    if (debugQuality) debugQuality.value = previous;
                    this.ctx.sceneInteraction?.reportPointerLockError();
                    if (status) status.textContent = `Quality change failed: ${error.message}`;
                    return;
                }
                if (status) status.hidden = true;
            }

            if (generation !== this.ctx.qualityGeneration) return;
            const inputStatus = doc?.getElementById('input-status');
            if (inputStatus) inputStatus.hidden = true;

            if (S.gl) {
                this.rebuildWaterMesh(presets[quality].waterSegments);
                this.rebuildAtmosphere(presets[quality].particles);
            }
            this.resizeCanvas(true);
            this.events?.emit('quality:changed', { quality, preset: presets[quality] });
            S.appliedQuality = quality;
        }

        rotateCamera(yawDelta, pitchDelta) {
            const S = this.state;
            S.yaw += yawDelta;
            S.pitch = Math.max(-89, Math.min(89, S.pitch + pitchDelta));
            const yaw = toRadians(S.yaw);
            const pitch = toRadians(S.pitch);
            const fromValues = S.vec3 ? S.vec3.fromValues : (...v) => v;

            S.cameraFront = fromValues(Math.cos(yaw) * Math.cos(pitch), Math.sin(pitch), Math.sin(yaw) * Math.cos(pitch));
            const right = fromValues(-Math.sin(yaw), 0, Math.cos(yaw));
            S.cameraUp = fromValues(-right[2] * S.cameraFront[1], Math.cos(pitch), right[0] * S.cameraFront[1]);
        }

        getWaveSettings() {
            const S = this.state;
            const ocean = global.GameConfig?.ocean || global.oceanConfig || { waveHeight: 0.72, waveSpeed: 0.82 };
            const surge = S.cinematic?.surge ? Math.min(1, Math.max(0, (S.awakeningTimeline?.elapsed - 5) / 12)) : 0;
            const omenWaveHeight = S.omen?.waveHeight ?? 1.0;
            const omenWaveSpeed = S.omen?.waveSpeed ?? 1.0;
            const waves = this.scratch.waves;
            waves.height = S.effects?.water ? ocean.waveHeight * omenWaveHeight * (1 + surge * 1.05) : 0;
            waves.speed = ocean.waveSpeed * omenWaveSpeed;
            return waves;
        }

        updateBoatMotion() {
            const S = this.state;
            if (!S.effects?.boatMotion || !S.effects?.water || !this.comfort?.boatMotionEnabled) {
                S.boatMotion.bob = 0;
                S.boatMotion.roll = 0;
                S.boatMotion.pitch = 0;
                return;
            }
            const settings = this.getWaveSettings();
            const wave = global.WaveField?.sample(S.shipPosition[0], S.shipPosition[2], S.elapsedTime, settings.height, settings.speed) || { height: 0, slopeX: 0, slopeZ: 0 };
            S.boatMotion.bob = wave.height;
            S.boatMotion.roll = Math.atan(wave.slopeX);
            S.boatMotion.pitch = -Math.atan(wave.slopeZ);
        }

        getCameraPosition() {
            const S = this.state;
            const cameraPosition = this.scratch.camera;
            cameraPosition[0] = S.shipPosition[0];
            cameraPosition[1] = S.shipPosition[1] + 1.2;
            cameraPosition[2] = S.shipPosition[2] + 0.3;
            if (!S.vec3) return cameraPosition;
            cameraPosition[1] += (S.boatMotion?.bob || 0) * 0.62;
            if (this.comfort?.cameraShakeEnabled && S.cinematic?.shake > 0.001) {
                const shake = S.cinematic.shake;
                cameraPosition[0] += Math.sin(S.elapsedTime * 31.0) * shake * 0.09;
                cameraPosition[1] += Math.sin(S.elapsedTime * 43.0 + 0.7) * shake * 0.055;
                cameraPosition[2] += Math.cos(S.elapsedTime * 37.0) * shake * 0.045;
            }
            return cameraPosition;
        }

        // Fills scratch.front/right/up with the normalized camera basis and returns the scratch object.
        updateCameraBasis() {
            const S = this.state;
            const { front, right, up } = this.scratch;
            S.vec3.normalize(front, S.cameraFront);
            S.vec3.cross(right, front, WORLD_UP);
            S.vec3.normalize(right, right);
            S.vec3.cross(up, right, front);
            S.vec3.normalize(up, up);
            return this.scratch;
        }

        // out = camera + front * f + right * r + up * u
        offsetFromCamera(out, forward, side, vertical) {
            const S = this.state;
            const { front, right, up } = this.updateCameraBasis();
            S.vec3.copy(out, this.getCameraPosition());
            S.vec3.scaleAndAdd(out, out, front, forward);
            S.vec3.scaleAndAdd(out, out, right, side);
            S.vec3.scaleAndAdd(out, out, up, vertical);
            return out;
        }

        getTorchPosition() {
            const S = this.state;
            const out = this.scratch.torchPosition;
            if (S.torchLit) return this.offsetFromCamera(out, 1.2, 0.5, -0.4);
            out[0] = S.shipPosition[0] + 0.8;
            out[1] = S.shipPosition[1] + (S.boatMotion?.bob || 0);
            out[2] = S.shipPosition[2] - 1.2;
            return out;
        }

        getCompassPosition() {
            const S = this.state;
            const out = this.scratch.compass;
            out[0] = S.shipPosition[0] + 0.35;
            out[1] = S.shipPosition[1] + 0.65 + (S.boatMotion?.bob || 0);
            out[2] = S.shipPosition[2] - 1.0;
            return out;
        }

        // Writes the hand-held torch transform into `out` (defaults to a reused scratch matrix).
        getFPSTorchMatrix(out = this.scratch.torchMatrix) {
            const S = this.state;
            S.mat4.identity(out);
            const torchPos = this.offsetFromCamera(this.scratch.torchPosition, 0.45, 0.22, -0.18);
            const front = this.scratch.front;
            S.mat4.translate(out, out, torchPos);
            S.mat4.rotateY(out, out, -Math.atan2(front[0], -front[2]));
            S.mat4.rotateX(out, out, Math.asin(front[1]));
            S.mat4.rotateX(out, out, -Math.PI / 8);
            S.mat4.scale(out, out, FPS_TORCH_SCALE);
            return out;
        }

        getTorchLightWorldPosition() {
            const S = this.state;
            const out = this.scratch.torchLight;
            if (S.torchLit) return this.offsetFromCamera(out, 0.55, 0.22, 0.02);
            out[0] = S.shipPosition[0] + 0.8;
            out[1] = S.shipPosition[1] + (S.boatMotion?.bob || 0) + 0.5;
            out[2] = S.shipPosition[2] - 1.1;
            return out;
        }

        getRayFromMouse(mouseX, mouseY, viewMatrix, projectionMatrix) {
            const S = this.state;
            if (!viewMatrix) {
                viewMatrix = S.mat4.create();
                const cameraPosition = this.getCameraPosition();
                const target = S.vec3.create();
                S.vec3.add(target, cameraPosition, S.cameraFront);
                S.mat4.lookAt(viewMatrix, cameraPosition, target, S.cameraUp);
            }
            if (!projectionMatrix) {
                const cam = global.GameConfig?.camera || global.cameraConfig || { fov: Math.PI / 4, near: 0.1, far: 500 };
                projectionMatrix = S.mat4.create();
                S.mat4.perspective(projectionMatrix, cam.fov, S.canvas.width / S.canvas.height, cam.near, cam.far);
            }

            const invProj = S.mat4.create();
            S.mat4.invert(invProj, projectionMatrix);
            const invView = S.mat4.create();
            S.mat4.invert(invView, viewMatrix);

            const nearPoint = S.vec4.fromValues(mouseX, mouseY, -1.0, 1.0);
            const farPoint = S.vec4.fromValues(mouseX, mouseY, 1.0, 1.0);

            S.vec4.transformMat4(nearPoint, nearPoint, invProj);
            S.vec4.scale(nearPoint, nearPoint, 1.0 / nearPoint[3]);
            S.vec4.transformMat4(nearPoint, nearPoint, invView);

            S.vec4.transformMat4(farPoint, farPoint, invProj);
            S.vec4.scale(farPoint, farPoint, 1.0 / farPoint[3]);
            S.vec4.transformMat4(farPoint, farPoint, invView);

            const rayDir = S.vec3.create();
            S.vec3.subtract(rayDir, [farPoint[0], farPoint[1], farPoint[2]], [nearPoint[0], nearPoint[1], nearPoint[2]]);
            S.vec3.normalize(rayDir, rayDir);

            return {
                origin: [nearPoint[0], nearPoint[1], nearPoint[2]],
                direction: rayDir
            };
        }

        rayIntersectsSphere(rayOrigin, rayDir, sphereCenter, radius) {
            const S = this.state;
            if (!S.vec3) return false;
            const oc = S.vec3.create();
            S.vec3.subtract(oc, rayOrigin, sphereCenter);
            const a = S.vec3.dot(rayDir, rayDir);
            const b = 2.0 * S.vec3.dot(oc, rayDir);
            const c = S.vec3.dot(oc, oc) - radius * radius;
            const discriminant = b * b - 4 * a * c;
            return discriminant >= 0;
        }

        resizeCanvas(force = false) {
            const S = this.state;
            if (!S?.canvas || !S?.gl) return;
            const presets = global.GameConfig?.qualityPresets || global.qualityPresets;
            const targetDpr = presets?.[S.quality]?.dpr ?? 1.5;
            const dpr = Math.min(global.window?.devicePixelRatio || 1, targetDpr);
            const displayWidth = Math.round(S.canvas.clientWidth * dpr);
            const displayHeight = Math.round(S.canvas.clientHeight * dpr);

            if (force || S.canvas.width !== displayWidth || S.canvas.height !== displayHeight) {
                S.canvas.width = displayWidth;
                S.canvas.height = displayHeight;
                S.gl.viewport(0, 0, displayWidth, displayHeight);
                const cam = global.GameConfig?.camera || global.cameraConfig || { fov: Math.PI / 4, near: 0.1, far: 500 };
                const projectionMatrix = S.mat4.create();
                S.mat4.perspective(projectionMatrix, cam.fov, S.canvas.width / S.canvas.height, cam.near, cam.far);
                S.gl.uniformMatrix4fv(S.uProjectionLoc, false, projectionMatrix);
            }
        }
    }

    global.SceneRenderer = SceneRenderer;
}(typeof window !== 'undefined' ? window : globalThis));
