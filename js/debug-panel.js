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
    document.getElementById('debug-measure').addEventListener('click', () => {
        const output = document.getElementById('debug-measurements');
        output.textContent = JSON.stringify(global.getSceneDiagnostics(), null, 2);
        output.hidden = false;
    });
    document.getElementById('debug-context-loss').addEventListener('click', () => global.dispatchEvent(new CustomEvent('scene:context-loss')));
    global.addEventListener('keydown', (event) => {
        if (event.key === 'F2' && !event.repeat) {
            if (!document.getElementById('launch-screen').hidden || !document.getElementById('loading-screen').hidden) return;
            if (!document.getElementById('pause-screen').hidden || !document.getElementById('ending-card').hidden) return;
            panel.hidden = !panel.hidden;
            if (!panel.hidden) {
                if (document.pointerLockElement) document.exitPointerLock();
                quality.focus();
            }
        }
    });
}(window));
