(function exposeVoyageArchive(global) {
    const ALLOWED = { omens: ['black-tide','red-wake','drowned-star','hollow-calm'], notes: ['journal','stone'], endings: ['witness','refused'] };
    class VoyageArchive {
        constructor() {
            this.data = { omens: [], notes: [], endings: [] };
            try {
                const saved = JSON.parse(global.localStorage.getItem('ritual-archive') || 'null');
                for (const key of Object.keys(ALLOWED)) if (Array.isArray(saved?.[key])) this.data[key] = [...new Set(saved[key].filter(value => ALLOWED[key].includes(value)))];
            } catch { /* Session only. */ }
        }
        record(key, id) {
            if (!ALLOWED[key]?.includes(id) || this.data[key].includes(id)) return false;
            this.data[key].push(id); this.save(); return true;
        }
        save() { try { global.localStorage.setItem('ritual-archive', JSON.stringify(this.data)); } catch { /* Session only. */ } }
        clear() { this.data = { omens: [], notes: [], endings: [] }; this.save(); }
        summary() { return `Omens ${this.data.omens.length}/4 · Notes ${this.data.notes.length}/2 · Endings ${this.data.endings.length}/2`; }
    }
    global.VoyageArchive = VoyageArchive;
}(window));
