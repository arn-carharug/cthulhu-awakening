(function setupDebugPanel(global) {
    const panel = document.getElementById('debug-panel');
    const quality = document.getElementById('debug-quality');
    const toggles = panel.querySelectorAll('[data-effect]');

    quality.value = global.GameConfig.defaultQuality;
    quality.addEventListener('change', () => {
        global.dispatchEvent(new CustomEvent('scene:quality', { detail: { quality: quality.value } }));
    });
    toggles.forEach((toggle) => toggle.addEventListener('change', () => {
        global.dispatchEvent(new CustomEvent('scene:effect', {
            detail: { effect: toggle.dataset.effect, enabled: toggle.checked }
        }));
    }));
    document.getElementById('debug-reset').addEventListener('click', () => {
        global.dispatchEvent(new CustomEvent('scene:reset'));
    });
    document.getElementById('debug-awaken').addEventListener('click', () => {
        global.dispatchEvent(new CustomEvent('scene:awaken'));
    });
    global.addEventListener('keydown', (event) => {
        if (event.key === 'F2') panel.hidden = !panel.hidden;
    });
}(window));
