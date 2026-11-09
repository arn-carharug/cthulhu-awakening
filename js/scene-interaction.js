(function exposeSceneInteraction(global) {
    function isInterfaceTarget(target) {
        return Boolean(target?.closest?.('button, input, select, textarea, summary, a, [contenteditable="true"], [role="dialog"]'));
    }

    class SceneInteraction {
        constructor(context) {
            this.ctx = context;
            this.bound = false;
            this.handlers = [];
        }

        get state() { return this.ctx.STATE; }
        get lifecycle() { return this.ctx.sceneLifecycle; }
        get controls() { return this.ctx.sceneControls; }
        get audio() { return this.ctx.ritualAudio; }
        get narrator() { return this.ctx.narrator; }
        get presentation() { return this.ctx.ritualPresentation; }
        get comfort() { return this.ctx.comfortSettings; }
        get discoveries() { return this.ctx.discoveries; }
        get omens() { return this.ctx.omenSystem; }
        get renderer() { return this.ctx.sceneRenderer; }

        reportPointerLockError() {
            const doc = global.document;
            const status = doc?.getElementById('input-status');
            if (status) {
                status.textContent = 'Mouse capture unavailable. Use arrow keys to look, or click the scene to retry.';
                status.hidden = false;
            }
        }

        requestPointerLock() {
            const S = this.state;
            const doc = global.document;
            if (!S?.canvas || S.paused) return;
            S.canvas.focus?.();
            if (doc?.pointerLockElement === S.canvas) return;
            try {
                if (!S.canvas.requestPointerLock) return this.reportPointerLockError();
                const request = S.canvas.requestPointerLock();
                request?.catch?.(() => this.reportPointerLockError());
            } catch {
                this.reportPointerLockError();
            }
        }

        releasePointerLock() {
            const S = this.state;
            const doc = global.document;
            if (doc?.pointerLockElement === S?.canvas) {
                doc.exitPointerLock?.();
            }
        }

        addListener(target, type, handler, options) {
            if (!target?.addEventListener) return;
            target.addEventListener(type, handler, options);
            this.handlers.push({ target, type, handler, options });
        }

        bind() {
            if (this.bound) return;
            this.bound = true;
            const doc = global.document;
            const win = global.window || global;
            const S = this.state;
            const L = this.lifecycle;

            // Mouse move (camera rotation & raycasting hover)
            this.addListener(win, 'mousemove', (event) => {
                if (!S?.canvas || S.paused || doc?.getElementById('comfort-controls')?.open || doc?.pointerLockElement !== S.canvas) return;
                if (S.firstMouse) {
                    S.firstMouse = false;
                    return;
                }
                const offsetX = event.movementX * S.sensitivity;
                const offsetY = -event.movementY * S.sensitivity;
                this.renderer?.rotateCamera(offsetX, offsetY);

                // Compass hover check
                if (!S.compassInspectMode && this.renderer?.getCompassPosition) {
                    const rect = S.canvas.getBoundingClientRect();
                    const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
                    const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
                    const ray = this.renderer.getRayFromMouse(mouseX, mouseY);
                    const compassPos = this.renderer.getCompassPosition();
                    S.compassHovered = this.renderer.rayIntersectsSphere(ray.origin, ray.direction, compassPos, 0.22);
                } else {
                    S.compassHovered = false;
                }

                // Torch hover check
                if (S.awakeningStarted && !S.torchLit && this.renderer?.getRayFromMouse) {
                    const rect = S.canvas.getBoundingClientRect();
                    const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
                    const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
                    const ray = this.renderer.getRayFromMouse(mouseX, mouseY);
                    const pickPos = [
                        S.shipPosition[0] + 0.8,
                        S.shipPosition[1] + (S.boatMotion?.bob || 0),
                        S.shipPosition[2] - 1.2
                    ];
                    S.torchHovered = this.renderer.rayIntersectsSphere(ray.origin, ray.direction, pickPos, 0.6);
                } else {
                    S.torchHovered = false;
                }
            });

            // Wheel: adjust torch brightness
            this.addListener(win, 'wheel', (e) => {
                if (S?.paused || isInterfaceTarget(e.target)) return;
                if (S?.torchLit && S.torchControlMode) {
                    S.torchLightIntensity += (e.deltaY < 0 ? 0.25 : -0.25);
                    S.torchLightIntensity = Math.max(S.minTorch, Math.min(S.maxTorch, S.torchLightIntensity));
                    const tb = doc?.getElementById("torch-brightness");
                    if (tb) tb.textContent = S.torchLightIntensity.toFixed(2);
                }
            });

            // Keydown: shortcuts, camera, movement, modals
            this.addListener(win, 'keydown', (e) => {
                if (!S?.canvas) return;
                const key = e.key.toLowerCase();
                const pauseScreen = doc?.getElementById('pause-screen');
                const endingCard = this.presentation?.ending;
                const discoveryCard = doc?.getElementById('discovery-card');
                const choiceCard = doc?.getElementById('choice-card');

                const modal = (!pauseScreen?.hidden) ? pauseScreen
                    : (!endingCard?.hidden) ? endingCard
                    : (!discoveryCard?.hidden) ? discoveryCard
                    : (!choiceCard?.hidden) ? choiceCard : null;

                if (key === 'escape') {
                    const guide = doc?.getElementById('controls-guide');
                    if (guide && guide.style.display !== 'none') {
                        global.toggleControlsGuide?.();
                        e.preventDefault();
                        return;
                    }
                    if (discoveryCard && !discoveryCard.hidden) {
                        doc.getElementById('discovery-close')?.click();
                        e.preventDefault();
                        return;
                    }
                    if (choiceCard && !choiceCard.hidden) {
                        doc.getElementById('reject-cancel')?.click();
                        e.preventDefault();
                        return;
                    }
                }

                if (modal && key === 'tab') {
                    const buttons = [...modal.querySelectorAll('button')];
                    if (buttons.length > 0) {
                        const index = buttons.indexOf(doc.activeElement);
                        buttons[(index + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
                    }
                    e.preventDefault();
                    return;
                }

                if (key === 'p' && !e.repeat && (!isInterfaceTarget(e.target) || e.target?.id === 'pause-resume')) {
                    L.setPaused(!S.paused);
                    if (!S.paused) this.requestPointerLock();
                    return;
                }

                if (isInterfaceTarget(e.target) && !(S.paused && key === 'r' && e.target?.id === 'pause-resume')) return;

                if (key === 'r') {
                    if (!e.repeat) L.reset();
                    return;
                }

                if (S.paused) return;

                if (key === 'e' && !e.repeat) { L.toggleCompassInspection(); return; }
                if (key === 'l' && !e.repeat) { L.lightLantern(); return; }
                if (key === 'b' && !e.repeat) { L.openEndingChoice(); return; }
                if (key === 'f' && !e.repeat) {
                    const site = this.discoveries?.nearby(S.shipPosition, S.cameraFront)?.[0];
                    if (site) L.inspectDiscovery(site.id);
                    return;
                }

                if (!S.compassInspectMode && key.startsWith('arrow')) {
                    this.renderer?.rotateCamera(
                        key === 'arrowleft' ? -4 : key === 'arrowright' ? 4 : 0,
                        key === 'arrowup' ? 3 : key === 'arrowdown' ? -3 : 0
                    );
                    e.preventDefault();
                    return;
                }

                if (key === 'n') {
                    if (!e.repeat) this.audio?.toggle();
                    return;
                }

                if (S.compassInspectMode) {
                    if (e.key === "ArrowLeft" || key === "a") {
                        S.compassYaw -= 0.08;
                    } else if (e.key === "ArrowRight" || key === "d") {
                        S.compassYaw += 0.08;
                    } else if (e.key === "ArrowUp" || key === "w") {
                        S.compassPitch = Math.max(-Math.PI / 2, S.compassPitch - 0.08);
                    } else if (e.key === "ArrowDown" || key === "s") {
                        S.compassPitch = Math.min(Math.PI / 2, S.compassPitch + 0.08);
                    } else if (key === "c") {
                        S.compassInspectMode = false;
                        S.compassYaw = 0;
                        S.compassPitch = 0;
                        this.ctx.compassInspectedOnce = true;
                    }
                    e.preventDefault();
                    return;
                }

                if (key === "m" && S.torchLit && !e.repeat) {
                    S.torchControlMode = !S.torchControlMode;
                    const tm = doc?.getElementById("torch-mode");
                    if (tm) tm.textContent = S.torchControlMode ? "ON" : "OFF";
                    return;
                }

                if (key === 'h') return;

                if (!this.ctx.compassInspectedOnce || S.awakeningStarted) return;
                if (['w', 'a', 's', 'd'].includes(key)) {
                    this.controls?.keys?.add(key);
                    e.preventDefault();
                }
            });

            this.addListener(win, 'keyup', (event) => {
                this.controls?.keys?.delete(event.key.toLowerCase());
            });

            this.addListener(win, 'blur', () => {
                this.narrator?.setHidden(true);
                const endingHidden = this.presentation?.ending?.hidden ?? true;
                const discoveryHidden = doc?.getElementById('discovery-card')?.hidden ?? true;
                const choiceHidden = doc?.getElementById('choice-card')?.hidden ?? true;
                if (S?.canvas && endingHidden && discoveryHidden && choiceHidden) {
                    L.setPaused(true);
                } else {
                    this.controls?.clear();
                }
            });

            this.addListener(doc, 'visibilitychange', () => {
                if (doc.hidden) {
                    this.narrator?.setHidden(true);
                    const endingHidden = this.presentation?.ending?.hidden ?? true;
                    const discoveryHidden = doc?.getElementById('discovery-card')?.hidden ?? true;
                    const choiceHidden = doc?.getElementById('choice-card')?.hidden ?? true;
                    L.setPaused(true, endingHidden && discoveryHidden && choiceHidden);
                }
            });

            this.addListener(doc, 'focusin', (event) => {
                if (isInterfaceTarget(event.target)) this.controls?.keys?.clear();
            });

            this.addListener(doc, 'pointerlockchange', () => {
                this.controls?.clear();
                if (S) S.firstMouse = true;
                if (doc.pointerLockElement === S?.canvas) {
                    const status = doc.getElementById('input-status');
                    if (status) status.hidden = true;
                }
            });

            this.addListener(doc, 'pointerlockerror', () => this.reportPointerLockError());

            // Button bindings
            const bindClick = (id, fn) => {
                const el = doc?.getElementById(id);
                if (el) this.addListener(el, 'click', fn);
            };

            bindClick('inspect-compass', () => { L.toggleCompassInspection(); S?.canvas?.focus(); });
            bindClick('light-lantern', () => { L.lightLantern(); S?.canvas?.focus(); });
            bindClick('reject-light', () => L.openEndingChoice());
            bindClick('reject-cancel', () => L.dismissEndingChoice());
            bindClick('reject-confirm', () => {
                const choiceCard = doc?.getElementById('choice-card');
                if (choiceCard) choiceCard.hidden = true;
                L.setPaused(doc?.hidden);
                L.resolveEnding('refused');
                S?.canvas?.focus();
            });
            bindClick('pause-toggle', () => L.setPaused(true));
            bindClick('pause-resume', () => { L.setPaused(false); this.requestPointerLock(); });
            bindClick('ending-restart', () => { L.reset(true); this.requestPointerLock(); });
            bindClick('ending-continue', () => L.dismissEnding());
            bindClick('ending-read', () => {
                if (!this.presentation?.ending?.hidden) {
                    void L.replayNarration(S.witness?.outcome === 'refused' ? 'ending.refused' : 'ending.witnessed');
                }
            });
            bindClick('discovery-read', () => {
                const card = doc?.getElementById('discovery-card');
                if (card && !card.hidden) void L.replayNarration(`discovery.${card.dataset.site}`);
            });
            bindClick('discovery-close', () => L.closeDiscovery());
            bindClick('archive-clear', () => { this.ctx.voyageArchive?.clear(); L.updateArchiveSummary(); });

            if (this.discoveries?.sites) {
                for (const site of this.discoveries.sites) {
                    bindClick(`discover-${site.id}`, () => L.inspectDiscovery(site.id));
                }
            }

            // Audio & volume controls
            const soundToggle = doc?.getElementById('sound-toggle');
            const volumeControl = doc?.getElementById('volume-control');
            const volumeValue = doc?.getElementById('volume-value');
            const narrationToggle = doc?.getElementById('narration-enabled');
            const narrationVolume = doc?.getElementById('narration-volume');

            if (this.audio) {
                this.audio.onStateChange = ({ enabled, muted, volume }) => {
                    this.narrator?.sync();
                    const percentage = Math.round(volume * 100);
                    if (soundToggle) {
                        soundToggle.textContent = percentage === 0 ? 'Sound: silent' : enabled && !muted ? 'Sound: awake' : 'Sound: dormant';
                        soundToggle.setAttribute('aria-pressed', String(enabled && !muted && percentage > 0));
                    }
                    if (volumeValue) volumeValue.textContent = String(percentage);
                };
            }

            if (soundToggle) {
                this.addListener(soundToggle, 'click', (event) => {
                    event.stopPropagation();
                    this.audio?.toggle();
                });
            }

            if (volumeControl) {
                this.addListener(volumeControl, 'input', () => {
                    const percentage = Number(volumeControl.value);
                    this.audio?.setVolume(percentage / 100);
                    try { global.localStorage?.setItem('ritual-volume', String(percentage)); } catch {}
                });
            }

            if (narrationToggle && this.narrator) {
                narrationToggle.checked = this.narrator.enabled;
                this.addListener(narrationToggle, 'change', () => this.narrator.setEnabled(narrationToggle.checked));
            }
            if (narrationVolume && this.narrator) {
                narrationVolume.value = String(Math.round(this.narrator.volume * 100));
                this.addListener(narrationVolume, 'input', () => this.narrator.setVolume(Number(narrationVolume.value) / 100));
            }

            for (const channel of ['ambient', 'effects']) {
                const input = doc?.getElementById(channel === 'ambient' ? 'ambient-volume' : 'effects-volume');
                if (input && this.audio?.mix) {
                    input.value = String(Math.round(this.audio.mix[channel] * 100));
                    this.addListener(input, 'input', () => this.audio.setMix(channel, Number(input.value) / 100));
                }
            }

            // Comfort & captions
            const comfortMap = {
                'comfort-system': 'followSystem',
                'comfort-boat': 'reduceBoat',
                'comfort-shake': 'reduceShake',
                'comfort-lightning': 'reduceLightning',
                'comfort-dread': 'reduceDread'
            };
            for (const [id, key] of Object.entries(comfortMap)) {
                const input = doc?.getElementById(id);
                if (input && this.comfort?.values) {
                    input.checked = this.comfort.values[key];
                    this.addListener(input, 'change', () => this.comfort.set(key, input.checked));
                }
            }

            const captionsToggle = doc?.getElementById('captions-enabled');
            if (captionsToggle && this.comfort) {
                captionsToggle.checked = this.comfort.values?.captionsEnabled ?? true;
                this.addListener(captionsToggle, 'change', () => {
                    this.comfort.set('captionsEnabled', captionsToggle.checked);
                    this.presentation?.applyCaptionSettings(this.comfort);
                });
            }

            const captionSizeSelect = doc?.getElementById('caption-size');
            if (captionSizeSelect && this.comfort) {
                captionSizeSelect.value = this.comfort.values?.captionSize ?? 'normal';
                this.addListener(captionSizeSelect, 'change', () => {
                    this.comfort.set('captionSize', captionSizeSelect.value);
                    this.presentation?.applyCaptionSettings(this.comfort);
                });
            }

            const seedInput = doc?.getElementById('omen-seed');
            const seedApply = doc?.getElementById('omen-seed-apply');
            if (seedInput && seedApply && this.comfort && this.omens) {
                seedInput.value = String(this.comfort.values?.seed ?? 0);
                this.addListener(seedApply, 'click', () => {
                    if (seedInput.value.trim() === '' || !this.comfort.set('seed', Number(seedInput.value))) {
                        seedInput.setCustomValidity?.('Enter a whole number between 0 and 4294967295.');
                        seedInput.reportValidity?.();
                        return;
                    }
                    seedInput.setCustomValidity?.('');
                    this.omens.setSeed(this.comfort.values.seed);
                    const comfortControls = doc?.getElementById('comfort-controls');
                    if (comfortControls) comfortControls.open = false;
                    L.reset();
                });
            }

            const comfortControls = doc?.getElementById('comfort-controls');
            if (comfortControls) {
                this.addListener(comfortControls, 'toggle', (event) => {
                    this.controls?.clear();
                    if (event.target?.open) this.releasePointerLock();
                });
            }

            // Custom scene events
            this.addListener(win, 'scene:reset', () => L.reset());
            this.addListener(win, 'scene:awaken', () => L.startAwakening());
            this.addListener(win, 'scene:quality', (event) => {
                this.renderer?.applyQuality(event.detail?.quality);
            });
            this.addListener(win, 'scene:effect', (event) => {
                if (event.detail?.effect in S.effects) {
                    S.effects[event.detail.effect] = event.detail.enabled;
                    if (event.detail.effect === 'post') {
                        doc?.body?.classList?.toggle('post-disabled', !event.detail.enabled);
                    }
                    this.ctx.sceneEvents?.emit('effect:changed', event.detail);
                }
            });
            this.addListener(win, 'scene:context-loss', () => {
                S.gl?.getExtension('WEBGL_lose_context')?.loseContext();
            });
        }

        unbind() {
            for (const { target, type, handler, options } of this.handlers) {
                target.removeEventListener?.(type, handler, options);
            }
            this.handlers = [];
            this.bound = false;
        }
    }

    global.SceneInteraction = SceneInteraction;
}(typeof window !== 'undefined' ? window : globalThis));
