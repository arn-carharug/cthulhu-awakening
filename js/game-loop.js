(function exposeRitualCycle(global) {
    const OBJECTIVES = ['compass', 'rlyeh', 'lantern', 'witness'];
    const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

    class RitualCycle {
        constructor(events) {
            this.events = events;
            this.items = new Map([...document.querySelectorAll('#objective-list [data-objective]')]
                .map((item) => [item.dataset.objective, item]));
            this.cycleLabel = document.getElementById('cycle-label');
            this.countLabel = document.getElementById('objective-count');
            this.cycle = 1;
            this.omenLabel = '--';
            this.bindEvents();
            this.start(false);
        }

        bindEvents() {
            this.events.on('interaction:compass', () => this.complete('compass'));
            this.events.on('awakening:started', () => this.complete('rlyeh'));
            this.events.on('interaction:torch', () => this.complete('lantern'));
            this.events.on('witness:complete', () => {
                this.complete('witness');
                this.finish();
            });
        }

        start(advanceCycle = true) {
            if (advanceCycle) this.cycle += 1;
            this.completed = new Set();
            this.startedAt = performance.now();
            this.witnessLitTime = 0;
            this.witnessLockedTime = 0;
            this.currentStreak = 0;
            this.bestStreak = 0;
            this.render();
        }

        complete(id) {
            if (!OBJECTIVES.includes(id) || this.completed.has(id)) return;
            this.completed.add(id);
            this.render();
        }

        updateWitness(deltaSeconds, locked, torchLit) {
            if (torchLit) this.witnessLitTime += deltaSeconds;
            if (locked) {
                this.witnessLockedTime += deltaSeconds;
                this.currentStreak += deltaSeconds;
                this.bestStreak = Math.max(this.bestStreak, this.currentStreak);
            } else {
                this.currentStreak = 0;
            }
        }

        setOmen(label) {
            this.omenLabel = label || '--';
        }

        finish() {
            const elapsedSeconds = Math.max(0, (performance.now() - this.startedAt) / 1000);
            const minutes = Math.floor(elapsedSeconds / 60);
            const seconds = Math.floor(elapsedSeconds % 60).toString().padStart(2, '0');
            const focus = this.witnessLitTime > 0
                ? Math.round((this.witnessLockedTime / this.witnessLitTime) * 100)
                : 0;
            document.getElementById('stat-cycle').textContent = this.cycleName();
            document.getElementById('stat-time').textContent = `${minutes}:${seconds}`;
            document.getElementById('stat-focus').textContent = `${focus}%`;
            document.getElementById('stat-streak').textContent = `${this.bestStreak.toFixed(1)}s`;
            document.getElementById('stat-omen').textContent = this.omenLabel;
        }

        cycleName() {
            return ROMAN[this.cycle - 1] || String(this.cycle);
        }

        render() {
            this.cycleLabel.textContent = `Cycle ${this.cycleName()}`;
            this.countLabel.textContent = `${this.completed.size}/${OBJECTIVES.length}`;
            const active = OBJECTIVES.find((id) => !this.completed.has(id));
            OBJECTIVES.forEach((id) => {
                const item = this.items.get(id);
                item.classList.toggle('complete', this.completed.has(id));
                item.classList.toggle('active', id === active);
            });
        }
    }

    global.RitualCycle = RitualCycle;
}(window));
