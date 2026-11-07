(function exposeSceneLifecycle(global) {
    class SceneLifecycle {
        constructor(context) {
            this.ctx = context;
            // Identifies the latest "Read aloud" request. Bumped whenever the card or cycle that
            // asked for it goes away, so a replay waiting on audio activation can tell it is obsolete.
            this.replayRequest = 0;
        }

        cancelPendingReplay() {
            this.replayRequest++;
        }

        get state() { return this.ctx.STATE; }
        get events() { return this.ctx.sceneEvents; }
        get audio() { return this.ctx.ritualAudio; }
        get narrator() { return this.ctx.narrator; }
        get presentation() { return this.ctx.ritualPresentation; }
        get archive() { return this.ctx.voyageArchive; }
        get cycle() { return this.ctx.ritualCycle; }
        get omens() { return this.ctx.omenSystem; }
        get discoveries() { return this.ctx.discoveries; }
        get navigation() { return this.ctx.navigation; }
        get collision() { return this.ctx.collisionSystem; }
        get controls() { return this.ctx.sceneControls; }
        get comfort() { return this.ctx.comfortSettings; }

        setPaused(paused, showScreen = true) {
            const S = this.state;
            const P = this.presentation;
            const doc = global.document;
            if (!paused && (doc?.hidden || !P?.ending?.hidden || !doc?.getElementById('discovery-card')?.hidden || !doc?.getElementById('choice-card')?.hidden)) {
                return;
            }
            S.paused = paused;
            if (!paused) this.narrator?.setHidden(false);
            this.controls?.clear();
            S.firstMouse = true;
            this.audio?.setPaused(paused);
            const pauseScreen = doc?.getElementById('pause-screen');
            if (pauseScreen) pauseScreen.hidden = !paused || !showScreen;
            if (paused) {
                const debugPanel = doc?.getElementById('debug-panel');
                if (debugPanel) debugPanel.hidden = true;
                this.ctx.releaseScenePointerLock?.();
                if (showScreen) doc?.getElementById('pause-resume')?.focus();
            }
        }

        reset(advanceCycle = false) {
            const S = this.state;
            const doc = global.document;
            const initialPos = global.GameConfig.world.initialShipPosition;

            this.controls?.clear();
            if (S.vec3) {
                S.shipPosition = S.vec3.fromValues(initialPos[0], initialPos[1], initialPos[2]);
                S.cameraFront = S.vec3.fromValues(0, 0, -1);
                S.cameraUp = S.vec3.fromValues(0, 1, 0);
            } else {
                S.shipPosition = [...initialPos];
                S.cameraFront = [0, 0, -1];
                S.cameraUp = [0, 1, 0];
            }
            S.yaw = -90;
            S.pitch = 0;
            S.firstMouse = true;
            S.awakeningStarted = false;
            S.torchLit = false;
            S.torchClicked = false;
            S.torchHovered = false;
            S.torchControlMode = false;
            S.torchLightIntensity = 0.0;
            S.compassInspectMode = false;
            S.compassYaw = 0;
            S.compassPitch = 0;
            S.compassHovered = false;
            S.cthulhuRiseY = 0;
            this.ctx.pillarsRiseY = 0;
            S.cinematic = { compassSpin: false, surge: false, eyes: false, shake: 0, torchShock: 0 };
            S.witness = { active: false, focus: 0, complete: false };
            this.ctx.compassInspectedOnce = false;

            this.collision?.setPillarsActive(false);

            this.cycle?.start(advanceCycle);
            if (this.omens && this.cycle) {
                S.omen = this.omens.beginCycle(this.cycle.cycle);
            }

            if (S.omen) {
                this.cycle?.setOmen(S.omen.label);
                this.audio?.setOmen(S.omen.id);
                S.lightning?.setProfile({ intervalScale: S.omen.lightningInterval });
            }

            this.cancelPendingReplay();
            this.narrator?.reset();
            S.awakeningTimeline?.reset();
            this.audio?.reset();
            this.presentation?.reset();

            const torchMode = doc?.getElementById("torch-mode");
            if (torchMode) torchMode.textContent = "OFF";
            const torchBrightness = doc?.getElementById("torch-brightness");
            if (torchBrightness) torchBrightness.textContent = "0.00";
            const discoveryCard = doc?.getElementById('discovery-card');
            if (discoveryCard) discoveryCard.hidden = true;
            const choiceCard = doc?.getElementById('choice-card');
            if (choiceCard) choiceCard.hidden = true;
            const endingChoice = doc?.getElementById('ending-choice');
            if (endingChoice) endingChoice.hidden = true;
            const lightLanternBtn = doc?.getElementById('light-lantern');
            if (lightLanternBtn) lightLanternBtn.hidden = true;
            const witnessFocus = doc?.getElementById('witness-focus');
            if (witnessFocus) witnessFocus.hidden = true;

            if (this.comfort) this.presentation?.applyCaptionSettings(this.comfort);
            this.updateArchiveSummary();
            this.setPaused(false, false);
            this.events?.emit('scene:reset');
        }

        startAwakening() {
            const S = this.state;
            if (S.awakeningStarted || !this.ctx.compassInspectedOnce) return;
            S.awakeningStarted = true;
            this.controls?.clear();
            S.awakeningTimeline?.start();
            this.events?.emit('awakening:started');
        }

        openEndingChoice() {
            const S = this.state;
            const doc = global.document;
            if (S.paused || !S.awakeningTimeline?.complete || S.witness.complete) return;
            const choiceCard = doc?.getElementById('choice-card');
            if (choiceCard) choiceCard.hidden = false;
            this.setPaused(true, false);
            doc?.getElementById('reject-cancel')?.focus();
        }

        dismissEndingChoice() {
            const doc = global.document;
            const choiceCard = doc?.getElementById('choice-card');
            if (choiceCard) choiceCard.hidden = true;
            this.setPaused(doc?.hidden);
            this.state.canvas?.focus();
        }

        resolveEnding(outcome) {
            const S = this.state;
            const doc = global.document;
            if (S.witness.complete || !S.awakeningTimeline?.complete || !['witness', 'refused'].includes(outcome)) return;
            S.witness.complete = true;
            S.witness.outcome = outcome;
            if (outcome === 'refused') {
                S.torchLit = false;
                S.torchLightIntensity = 0;
            } else {
                S.lightning?.strike(1.85);
                S.cinematic.shake = 0.42;
                S.cinematic.torchShock = 0.65;
                this.audio?.cue('awakening:reveal');
            }
            this.archive?.record('endings', outcome);
            this.updateArchiveSummary();
            this.presentation?.setOutcome(outcome);
            this.events?.emit(outcome === 'witness' ? 'witness:complete' : 'ritual:refused');
            this.presentation?.completeWitness();
            const endingChoice = doc?.getElementById('ending-choice');
            if (endingChoice) endingChoice.hidden = true;
        }

        dismissEnding() {
            this.cancelPendingReplay();
            this.narrator?.stop();
            this.presentation?.dismissEnding();
            this.setPaused(false);
            this.ctx.requestScenePointerLock?.();
        }

        inspectDiscovery(id) {
            const S = this.state;
            const doc = global.document;
            if (S.paused || S.awakeningStarted || !this.ctx.compassInspectedOnce) return;
            const site = this.discoveries?.inspect(id, S.shipPosition, S.cameraFront);
            if (!site) return;
            this.cancelPendingReplay();
            const title = doc?.getElementById('discovery-title');
            if (title) title.textContent = site.title;
            const copy = doc?.getElementById('discovery-copy');
            if (copy) copy.textContent = site.text;
            const card = doc?.getElementById('discovery-card');
            if (card) {
                card.hidden = false;
                card.dataset.site = id;
            }
            this.setPaused(true, false);
            doc?.getElementById('discovery-close')?.focus();
            this.events?.emit('discovery:found', { id });
            this.narrator?.setHidden(doc?.hidden);
            void this.narrator?.play(`discovery.${id}`, { modal: true, repeat: true });
        }

        closeDiscovery() {
            const doc = global.document;
            this.cancelPendingReplay();
            this.narrator?.stop();
            const card = doc?.getElementById('discovery-card');
            if (card) card.hidden = true;
            this.setPaused(doc?.hidden);
            this.audio?.cue('discovery:found');
            this.state.canvas?.focus();
        }

        toggleCompassInspection() {
            const S = this.state;
            if (S.paused || S.awakeningStarted) return;
            this.controls?.clear();
            S.compassInspectMode = !S.compassInspectMode;
            S.compassYaw = 0;
            S.compassPitch = 0;
            if (S.compassInspectMode) {
                if (!this.audio?.enabled) this.audio?.enable().catch(() => {});
                global.hideCompassWarning?.();
                this.events?.emit('interaction:compass');
            } else {
                this.ctx.compassInspectedOnce = true;
            }
        }

        lightLantern() {
            const S = this.state;
            const torchCfg = global.GameConfig?.torch || { defaultIntensity: 5 };
            if (S.paused || !S.awakeningStarted || S.torchLit) return;
            S.torchClicked = true;
            S.torchLit = true;
            S.torchHovered = false;
            S.torchLightIntensity = torchCfg.defaultIntensity;
            this.events?.emit('interaction:torch');
        }

        updateArchiveSummary() {
            const el = global.document?.getElementById('archive-summary');
            if (el && this.archive) el.textContent = this.archive.summary();
        }

        // Resolves true only if playback was requested; false when audio could not be enabled or
        // the card/cycle that asked for the replay was closed or reset while activation was pending.
        async replayNarration(id) {
            const request = ++this.replayRequest;
            const doc = global.document;
            this.narrator?.setHidden(doc?.hidden);
            this.narrator?.setEnabled(true);
            const toggle = doc?.getElementById('narration-enabled');
            if (toggle) toggle.checked = true;
            try { await this.audio?.enable(); } catch { return false; }
            if (request !== this.replayRequest) return false;
            void this.narrator?.play(id, { modal: true, repeat: true });
            return true;
        }
    }

    global.SceneLifecycle = SceneLifecycle;
}(typeof window !== 'undefined' ? window : globalThis));
