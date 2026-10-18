(function exposeDiscoverySystem(global) {
    const SITES = Object.freeze([
        { id: 'journal', title: 'The drifting journal', position: [8, -2.7, 43], color: [0.64, 0.44, 0.21],
            text: 'The last entry ends mid-sentence: “The compass lies near the stones. Keep the pale beacon ahead. If the eyes open, the lantern can bear witness.”' },
        { id: 'stone', title: 'The tide-marked stone', position: [-9, -1.4, 17], color: [0.23, 0.49, 0.43],
            text: 'A weathered inscription: “Three pillars keep the threshold. The sea remembers every visitor. What you choose to illuminate will remember you.”' }
    ]);
    class DiscoverySystem {
        constructor() { this.reset(); }
        reset() { this.found = new Set(); }
        get sites() { return SITES; }
        nearby(position) {
            return SITES.filter((site) => Math.hypot(position[0] - site.position[0], position[2] - site.position[2]) <= 18);
        }
        inspect(id, position) {
            const site = this.nearby(position).find((item) => item.id === id);
            if (site) this.found.add(id);
            return site || null;
        }
        static aligned(front, toTarget) {
            const length = Math.hypot(...front) * Math.hypot(...toTarget);
            return length > 0 && (front[0] * toTarget[0] + front[1] * toTarget[1] + front[2] * toTarget[2]) / length > 0.965;
        }
    }
    global.DiscoverySystem = DiscoverySystem;
}(window));
