(function exposeRitualPresentation(global) {
    const COPY = Object.freeze({
        'awakening:rumble': 'Something moves beneath the water.',
        'awakening:compass': 'The compass has forgotten north.',
        'awakening:surge': 'The sea recoils.',
        'awakening:pillars': "R'lyeh rises.",
        'awakening:presence': 'You are no longer alone.',
        'awakening:silhouette': 'A shape eclipses the horizon.',
        'awakening:flash': 'The storm reveals what darkness concealed.',
        'awakening:eyes': 'It sees you.',
        'awakening:reveal': 'Cthulhu awakens.'
    });

    class RitualPresentation {
        constructor(events) {
            this.events = events;
            this.caption = document.getElementById('ritual-caption');
            this.progress = document.querySelector('#ritual-progress span');
            this.ending = document.getElementById('ending-card');
            this.witness = document.getElementById('witness-focus');
            this.witnessRing = this.witness.querySelector('.witness-ring');
            this.witnessLabel = this.witness.querySelector('.witness-label');
            this.hideTimer = 0;
            this.endingTimer = 0;
            Object.entries(COPY).forEach(([name, copy]) => events.on(name, () => this.show(copy, name === 'awakening:reveal' ? 5200 : 3300)));
            events.on('timeline:update', ({ progress }) => this.setProgress(progress));
            events.on('timeline:complete', () => this.beginWitness());
        }

        show(copy, duration) {
            this.caption.textContent = copy;
            this.caption.classList.add('visible');
            this.hideTimer = duration / 1000;
        }

        update(deltaSeconds) {
            if (this.hideTimer > 0) {
                this.hideTimer -= deltaSeconds;
                if (this.hideTimer <= 0) this.caption.classList.remove('visible');
            }
            if (this.endingTimer > 0) {
                this.endingTimer -= deltaSeconds;
                if (this.endingTimer <= 0) {
                    this.ending.hidden = false;
                    this.events.emit('ending:shown');
                    document.getElementById('ending-continue').focus();
                }
            }
        }

        setProgress(progress) {
            this.progress.style.transform = `scaleX(${Math.max(0, Math.min(1, progress))})`;
        }

        beginWitness() {
            this.hideTimer = 0;
            this.setProgress(0);
            this.witness.hidden = false;
            this.show('Let the light bear witness.', 5200);
        }

        updateWitness(progress, status) {
            const clamped = Math.max(0, Math.min(1, progress));
            this.witnessRing.style.setProperty('--focus-angle', `${clamped * 360}deg`);
            this.witness.classList.toggle('locked', status === 'locked');
            this.witnessLabel.textContent = status === 'unlit'
                ? 'Light the lantern'
                : status === 'locked' ? 'Hold the light' : 'Find its eyes';
            this.setProgress(clamped);
        }

        completeWitness() {
            this.hideTimer = 0;
            this.caption.classList.remove('visible');
            this.witness.hidden = true;
            this.endingTimer = 0.9;
        }

        setOutcome(outcome) {
            document.getElementById('ending-title').textContent = outcome === 'refused' ? 'You Withheld the Light' : 'The Ancient One Has Awakened';
            document.getElementById('ending-copy').textContent = outcome === 'refused'
                ? 'The sea lets you pass. For now.' : 'The sea remembers. So do you.';
        }

        dismissEnding() {
            this.ending.hidden = true;
        }

        reset() {
            this.hideTimer = 0;
            this.endingTimer = 0;
            this.caption.classList.remove('visible');
            this.caption.textContent = '';
            this.progress.style.transform = 'scaleX(0)';
            this.witness.hidden = true;
            this.witness.classList.remove('locked');
            this.witnessRing.style.setProperty('--focus-angle', '0deg');
            this.ending.hidden = true;
        }
    }

    global.RitualPresentation = RitualPresentation;
}(window));
