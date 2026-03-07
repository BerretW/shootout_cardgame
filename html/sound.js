// ==========================================
// FILE: sound.js — Zvukové efekty (Web Audio API)
// ==========================================

let soundMuted = false;
const customSounds = {};

const SoundFX = (() => {
    let ctx = null;
    function getCtx() {
        if (!ctx) ctx = new (window.AudioContext || window['webkitAudioContext'])();
        return ctx;
    }
    function tone(freq, type, duration, vol = 0.18, delay = 0) {
        if (soundMuted) return;
        try {
            const c = getCtx();
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.connect(gain); gain.connect(c.destination);
            osc.type = type;
            osc.frequency.setValueAtTime(freq, c.currentTime + delay);
            gain.gain.setValueAtTime(0.001, c.currentTime + delay);
            gain.gain.linearRampToValueAtTime(vol, c.currentTime + delay + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration);
            osc.start(c.currentTime + delay);
            osc.stop(c.currentTime + delay + duration + 0.05);
        } catch(e) {}
    }
    function playCustom(name, fallback) {
        if (soundMuted) return;
        if (customSounds[name]) {
            try {
                const c = getCtx();
                const source = c.createBufferSource();
                source.buffer = customSounds[name];
                source.connect(c.destination);
                source.start();
            } catch(e) {}
        } else {
            fallback();
        }
    }
    return {
        hover:   () => playCustom('hover',   () => tone(900, 'sine', 0.06, 0.07)),
        zoom:    () => playCustom('zoom',    () => { tone(440, 'sine', 0.12, 0.15); tone(660, 'sine', 0.18, 0.12, 0.07); }),
        play:    () => playCustom('play',    () => { tone(300, 'triangle', 0.1, 0.25); tone(480, 'triangle', 0.18, 0.2, 0.08); tone(600, 'sine', 0.22, 0.12, 0.16); }),
        attack:  () => playCustom('attack',  () => { tone(180, 'sawtooth', 0.08, 0.3); tone(120, 'sawtooth', 0.12, 0.2, 0.06); }),
        death:   () => playCustom('death',   () => { tone(250, 'triangle', 0.1, 0.2); tone(160, 'triangle', 0.2, 0.15, 0.09); tone(90, 'sine', 0.3, 0.1, 0.18); }),
        endTurn: () => playCustom('endTurn', () => { tone(350, 'sine', 0.12, 0.15); tone(280, 'sine', 0.18, 0.1, 0.1); }),
        draw:    () => playCustom('draw',    () => tone(700, 'sine', 0.09, 0.1)),
        victory: () => playCustom('victory', () => { [0, 0.12, 0.24, 0.38].forEach((d, i) => { tone([440, 550, 660, 880][i], 'sine', 0.25, 0.2, d); }); }),
        defeat:  () => playCustom('defeat',  () => { [0, 0.15, 0.32].forEach((d, i) => { tone([300, 220, 150][i], 'triangle', 0.3, 0.2, d); }); }),

        decodeAndStore: (name, arrayBuffer) => {
            try {
                const c = getCtx();
                c.decodeAudioData(arrayBuffer, (buffer) => {
                    customSounds[name] = buffer;
                    const el = document.getElementById('sound-status-' + name);
                    if (el) el.textContent = '✓';
                });
            } catch(e) {}
        }
    };
})();

function toggleMute() {
    soundMuted = !soundMuted;
    localStorage.setItem('shootout_muted', soundMuted ? '1' : '0');
    document.getElementById('sound-btn').textContent = soundMuted ? '🔇' : '🔊';
    const muteBtn = document.getElementById('sound-settings-mute-btn');
    if (muteBtn) muteBtn.textContent = soundMuted ? '🔇 Zvuk vypnut' : '🔊 Zvuk zapnut';
}

function openSoundSettings() {
    document.getElementById('sound-settings-modal').style.display = 'flex';
}

function closeSoundSettings() {
    document.getElementById('sound-settings-modal').style.display = 'none';
}

function handleSoundUpload(name, input) {
    if (!input.files || !input.files[0]) return;
    const reader = new FileReader();
    reader.onload = (e) => SoundFX.decodeAndStore(name, e.target.result.slice(0));
    reader.readAsArrayBuffer(input.files[0]);
}
