// ==========================================
// FILE: overlay.js — Fullscreen a Show Card overlay
// ==========================================

// Zobrazí kartu na celou obrazovku
function viewFullscreen(imgSrc) {
    const overlay = document.getElementById('fullscreen-overlay');
    const img = document.getElementById('fullscreen-img');
    if (overlay && img) {
        img.src = imgSrc;
        overlay.style.display = 'flex';
    }
}

function closeFullscreen() {
    document.getElementById('fullscreen-overlay').style.display = 'none';
}

// Mapování rarity na CSS třídu (sdíleno s render.js)
const RARITY_CLASS = {
    'Common':    'r-common',
    'Uncommon':  'r-uncommon',
    'Rare':      'r-rare',
    'Epic':      'r-epic',
    'Legendary': 'r-legendary',
};

// Show Card overlay (zobrazení karty z inventáře / balíčku)
function showCardOverlay(card) {
    if (!card) return;
    const face = document.getElementById('show-card-face');
    const rarityClass = RARITY_CLASS[card.rarity] || 'r-common';

    face.className = rarityClass;

    const safeName = card.name.replace(/ /g, '_');
    document.getElementById('show-card-img').src = `img/${card.id}_${card.type}_${safeName}.png`;

    document.getElementById('show-card-rarity-badge').textContent = card.rarity || '';
    document.getElementById('show-card-name-tag').textContent = card.name || '';

    document.getElementById('sc-name').textContent = card.name || '';
    document.getElementById('sc-meta').textContent = `${card.faction || ''} · ${card.type || ''}`;
    document.getElementById('sc-cost').textContent = card.cost !== undefined ? `💎 Cena: ${card.cost}` : '';
    let stats = '';
    if (card.type === 'Unit')     stats = `⚔️ ${card.atk}  ❤️ ${card.hp}`;
    if (card.type === 'Landmark') stats = `🏚️ Výdrž: ${card.hp}`;
    document.getElementById('sc-stats').textContent = stats;
    document.getElementById('sc-text').textContent = card.text || '';

    document.getElementById('show-card-overlay').style.display = 'flex';
}

function closeShowCard() {
    document.getElementById('show-card-overlay').style.display = 'none';
    fetch(`https://${GetParentResourceName()}/closeCard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    }).catch(() => {});
}

// ESC zavře všechny overlay
document.addEventListener('keydown', function(event) {
    if (event.key === "Escape") {
        closeFullscreen();
        closeShowCard();
        closeSoundSettings();
        $('#graveyard-modal').hide();
    }
});
