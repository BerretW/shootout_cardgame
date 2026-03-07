// ==========================================
// FILE: pack-opening.js — Otevírání balíčků karet
// ==========================================

function showPackOpening(_packId, cardIds) {
    if (showPackOpening._cleanup) {
        showPackOpening._cleanup();
        showPackOpening._cleanup = null;
    }

    const db = (CardDB && CardDB.length > 0) ? CardDB : _CardDB_fallback;
    const cards = (cardIds || []).map(id => db.find(c => c.id == id) || { id, name: '???', rarity: 'Common', type: 'Unit' });
    if (!cards.length) return;

    const overlay  = document.getElementById('pack-opening-overlay');
    const row      = document.getElementById('pack-cards-row');
    const hint     = document.getElementById('pack-opening-hint');
    const btn      = document.getElementById('pack-collect-btn');

    row.innerHTML  = '';
    hint.style.display = 'block';
    btn.style.display  = 'none';

    let revealedCount = 0;
    let dragState = null;
    let escHandled = false;

    function revealCard(slot, inner) {
        inner.style.transition = 'transform 0.14s ease-out';
        inner.style.transform  = 'translateY(-22px)';
        setTimeout(() => {
            inner.style.transition = '';
            inner.style.transform  = '';
            slot.style.cursor = 'default';
            slot.classList.add('revealed');
            slot.classList.add('just-revealed');
            setTimeout(() => slot.classList.remove('just-revealed'), 600);
            SoundFX.draw();
            const rClass = [...slot.querySelector('.pack-slot-face').classList].find(c => c.startsWith('r-'));
            if (rClass === 'r-legendary') setTimeout(() => SoundFX.victory(), 250);
            else if (rClass === 'r-epic')  setTimeout(() => SoundFX.zoom(),    150);
            revealedCount++;
            if (revealedCount === cards.length) {
                setTimeout(() => { hint.style.display = 'none'; btn.style.display = 'block'; }, 450);
            }
        }, 140);
    }

    function onMouseMove(e) {
        if (!dragState) return;
        const { slot, inner, startY, startX } = dragState;
        if (slot.classList.contains('revealed')) { dragState = null; return; }
        const dy = e.clientY - startY;
        const dx = e.clientX - startX;
        dragState.moved = dy;
        if (dy < 0) {
            inner.style.transform = `translateY(${dy}px) rotate(${dx * 0.015}deg)`;
        }
    }

    function onMouseUp(_e) {
        if (!dragState) return;
        const { slot, inner, startTime } = dragState;
        const moved = dragState.moved || 0;
        dragState = null;
        if (slot.classList.contains('revealed')) return;

        const elapsed   = Date.now() - startTime;
        const draggedUp = moved < -50;
        const quickClick = elapsed < 280 && Math.abs(moved) < 15;

        if (draggedUp || quickClick) {
            revealCard(slot, inner);
        } else {
            inner.style.transition = 'transform 0.28s ease';
            inner.style.transform  = '';
            slot.style.cursor = 'grab';
        }
    }

    function onKeyUp(e) {
        if (e.which !== 27 || escHandled) return;
        escHandled = true;
        const unrevealed = row.querySelectorAll('.pack-slot:not(.revealed)');
        unrevealed.forEach(slot => {
            const inner = slot.querySelector('.pack-slot-inner');
            revealCard(slot, inner);
        });
        if (unrevealed.length > 0) {
            setTimeout(collectPackCards, 900);
        } else {
            collectPackCards();
        }
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup',   onMouseUp);
    document.addEventListener('keyup',     onKeyUp);

    showPackOpening._cleanup = function() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup',   onMouseUp);
        document.removeEventListener('keyup',     onKeyUp);
    };

    // Sestavení slotů karet
    cards.forEach((card, idx) => {
        const rarity     = card.rarity || 'Common';
        const rarityClass = 'r-' + rarity.toLowerCase();

        const slot  = document.createElement('div');
        slot.className = 'pack-slot';
        slot.style.animation = `packCardEnter 0.5s cubic-bezier(0.34,1.56,0.64,1) ${idx * 0.13}s both`;

        const inner = document.createElement('div');
        inner.className = 'pack-slot-inner';

        const back = document.createElement('div');
        back.className = 'pack-slot-back';

        const face = document.createElement('div');
        face.className = `pack-slot-face ${rarityClass}`;

        const badge = document.createElement('div');
        badge.className = 'pack-rarity-badge';
        badge.textContent = rarity;

        const img = document.createElement('img');
        img.className = 'pack-card-art';
        img.src = getImgName(card);
        img.onerror = function() { this.style.display = 'none'; };

        const nameTag = document.createElement('div');
        nameTag.className = 'pack-card-name-tag';
        nameTag.textContent = card.name;

        const line = document.createElement('div');
        line.className = 'pack-rarity-line';

        face.append(badge, img, nameTag, line);
        inner.append(back, face);
        slot.appendChild(inner);
        row.appendChild(slot);

        slot.addEventListener('mousedown', function(e) {
            if (slot.classList.contains('revealed')) return;
            e.preventDefault();
            dragState = { slot, inner, startY: e.clientY, startX: e.clientX, moved: 0, startTime: Date.now() };
            inner.style.transition = 'none';
            slot.style.cursor = 'grabbing';
        });
    });

    overlay.style.display = 'flex';
}

function collectPackCards() {
    document.getElementById('pack-opening-overlay').style.display = 'none';
    if (showPackOpening._cleanup) {
        showPackOpening._cleanup();
        showPackOpening._cleanup = null;
    }
    try { fetch('https://shootout_cardgame/pack_collected', { method: 'POST', body: JSON.stringify({}) }); } catch(e) {}
}
