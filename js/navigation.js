(function exposeVoyageNavigation(global) {
    const wrap = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle)) || 0;
    class VoyageNavigation {
        sample(position, front, time) {
            const dx = -position[0], dz = -30 - position[2];
            const distance = Math.hypot(dx, dz);
            const heading = Math.atan2(front[0], -front[2]);
            const bearing = Math.atan2(dx, -dz);
            const proximity = Math.max(0, Math.min(1, (65 - distance) / 40));
            const deviation = Math.sin(time * 1.7) * proximity * 0.65;
            return { distance, heading, bearing, relative: wrap(bearing - heading),
                needleAngle: deviation, disturbed: proximity > 0.15,
                canAwaken: distance < 40 && Math.abs(wrap(bearing - heading)) < Math.PI * 2 / 9 };
        }
        guidance(sample, inspected, inspecting, awakening, torchLit, finished) {
            if (finished) return 'The sea remembers. Keep watching, or begin another cycle.';
            if (inspecting) return 'North is marked by the needle. Press C to lower the compass and sail.';
            if (!inspected) return 'Find R’lyeh beyond the northern mist. Inspect your compass first (E).';
            if (!awakening) return sample.disturbed
                ? 'The needle is drifting. Trust the pale northern beacon; approach the ruins.'
                : 'Sail toward the pale northern beacon. WASD moves; arrow keys look around.';
            return torchLit ? 'When the rising shape opens its eyes, hold your light on them.'
                : 'The sea is changing. Raise your lantern when you are ready.';
        }
    }
    global.VoyageNavigation = VoyageNavigation;
}(window));
