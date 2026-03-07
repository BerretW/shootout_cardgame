// ==========================================
// FILE: html/script.js (COMPLETE FINAL VERSION)
// ==========================================

// --- Globální Proměnné ---
let currentMana = 1;
let maxMana = 1;

let playerHand = [];
let playerBoard = [];
let playerDeck = [];

let enemyHandAI = [];
let enemyBoard = [];
let enemyDeck = [];

// Životy
let playerHp = 30; 
let playerMaxHp = 30;
let enemyHp = 30;
let enemyMaxHp = 30;

// Stavy hry
let myTurn = false;
let isSinglePlayer = false;
let gameEnded = false;
let mpEnemyHandCount = 5; // Počet karet v ruce protivníka (MP sync)
let isHost = false;       // true = hostující hráč (má autoritu nad herním stavem)

// Hero selection (MP synchronizace)
let myHeroChoice = null;
let opponentHeroId = null;
let pendingIsFirst = false;
let pendingOppName = "";
let myInventoryCards = [];

// Hřbitovy
let playerGraveyard = [];
let enemyGraveyard = [];

// Debug mód
let isDebug = false;

// Interakce
let selectedCardIndex = -1;
let selectedAttacker = null; // Jednotka vybraná k útoku

// Historie tahů
let moveHistory = [];

// ==========================================
// ZVUKOVÉ EFEKTY (Web Audio API)
// ==========================================
let soundMuted = false;
const customSounds = {}; // { eventName: AudioBuffer }

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

// Otevře kartu na celou obrazovku
function viewFullscreen(imgSrc) {
    const overlay = document.getElementById('fullscreen-overlay');
    const img = document.getElementById('fullscreen-img');
    if (overlay && img) {
        img.src = imgSrc;
        overlay.style.display = 'flex';
        // Přehraje zvuk zoomu, pokud máš implementováno
        // playSound('zoom'); 
    }
}

// Zavře fullscreen
function closeFullscreen() {
    document.getElementById('fullscreen-overlay').style.display = 'none';
}

// ==========================================
// SHOW CARD OVERLAY
// ==========================================
const RARITY_CLASS = {
    'Common':    'r-common',
    'Uncommon':  'r-uncommon',
    'Rare':      'r-rare',
    'Epic':      'r-epic',
    'Legendary': 'r-legendary',
};

function showCardOverlay(card) {
    if (!card) return;
    const face = document.getElementById('show-card-face');
    const rarityClass = RARITY_CLASS[card.rarity] || 'r-common';

    // Rarity třídy – vyčistíme a nastavíme
    face.className = rarityClass;

    // Obrázek
    const safeName = card.name.replace(/ /g, '_');
    document.getElementById('show-card-img').src = `img/${card.id}_${card.type}_${safeName}.png`;

    // Badge + jméno + linka
    document.getElementById('show-card-rarity-badge').textContent = card.rarity || '';
    document.getElementById('show-card-name-tag').textContent = card.name || '';

    // Info panel
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

// Naslouchání klávesy ESC pro zavření
document.addEventListener('keydown', function(event) {
    if (event.key === "Escape") {
        closeFullscreen();
        closeShowCard();
        closeSoundSettings(); // Pokud je otevřené
        $('#graveyard-modal').hide(); // Pokud je otevřené
    }
});


// ==========================================
// 1. INICIALIZACE A KOMUNIKACE (NUI)
// ==========================================

$(document).ready(function() {
    // Inicializace mute stavu
    soundMuted = localStorage.getItem('shootout_muted') === '1';
    $('#sound-btn').text(soundMuted ? '🔇' : '🔊');

    // Naslouchání zprávám z LUA (Client)
    window.addEventListener('message', function(event) {
        let data = event.data;
        
        if (data.type === "ui") {
            if (data.status) {
                $("#game-container").show();
            } else {
                $("#game-container").hide();
            }
        } 
        else if (data.type === "start_game") {
            initCardDB(data.cards);
            myInventoryCards = data.myCards || [];
            isSinglePlayer = false;
            showHeroSelection(data.isFirst, data.opponentName);
        }
        else if (data.type === "start_singleplayer") {
            initCardDB(data.cards);
            myInventoryCards = data.myCards || [];
            isSinglePlayer = true;
            isDebug = data.debug === true;
            showHeroSelection(true, "Training Bot");
        }
        else if (data.type === "enemy_action") {
            if (!isSinglePlayer) handleRemoteAction(data.action);
        }
        else if (data.type === "game_over") {
            showNotification(data.message, 4000);
            setTimeout(exitGame, 4000);
        }
        else if (data.type === "pack_opened") {
            if ((!CardDB || CardDB.length === 0) && data.allCards) initCardDB(data.allCards);
            showPackOpening(data.packId, data.cards);
        }
        else if (data.type === "show_card") {
            if ((!CardDB || CardDB.length === 0) && data.allCards) initCardDB(data.allCards);
            showCardOverlay(data.card);
        }
    });
    $(document).on('mouseenter', '.hist-card-name', function() {
        let cardId = $(this).data('id');
        let cardData = CardDB.find(c => c.id == cardId);
        if (cardData) {
            // Vytvoříme dočasný objekt karty pro tooltip
            // (Tooltip funkce očekává objekt, ne jen ID)
            let dummyCard = { ...cardData, gear: [] }; 
            // Pro unit/landmark doplníme aktuální staty z DB (ne ze hry, historie ukazuje base kartu)
            if(dummyCard.type === "Unit" || dummyCard.type === "Landmark") {
                dummyCard.hp = dummyCard.hp; 
                dummyCard.atk = dummyCard.atk;
                dummyCard.keywords = getCardLogic(dummyCard).keywords || [];
            }
            showCardTooltip(dummyCard);
        }
    });

    $(document).on('mouseleave', '.hist-card-name', function() {
        hideCardTooltip();
    });
    // Klávesové zkratky
    document.onkeyup = function (data) {
        if (data.which == 27) { // ESC
            if ($("#card-zoom").is(":visible")) {
                hideCardZoom();
            } else {
                exitGame();
            }
        }
        else if (data.which == 2) {
            cancelSelection();
        }
    };
    
    // Pravé tlačítko mimo kartu zavře zoom
    $(document).on("contextmenu", function(e) {
        if (!$(e.target).closest('.card').length) {
            e.preventDefault();
            hideCardZoom();
        }
    });

    // Levé kliknutí zavře zoom
    $(document).on("click", function() { hideCardZoom(); });

    // Kliknutí mimo zruší výběr (pokud neklikáme na kartu nebo hrdinu)
    $(document).mousedown(function(e) {
        const t = $(e.target);
        if (!t.closest('.card').length &&
            !t.closest('#end-turn-btn').length &&
            !t.closest('.hero-portrait').length &&
            !t.closest('.hero-wrapper').length) { // <-- PŘIDAT TENTO ŘÁDEK {
            cancelSelection();
        }
    });
});

function addToHistory(text, cardId = null) {
    // Pokud je předáno ID karty, nahradíme zástupný znak v textu nebo prostě formátujeme jméno
    // Ale pro jednoduchost budeme volat funkci takto: 
    // addToHistoryHtml(`<span class="hist-you">Ty:</span> Hraješ <span class="hist-card-name" data-id="${card.id}">${card.name}</span>`);
    
    // Ukládáme přímo HTML řetězec
    moveHistory.unshift(text);
    if (!isDebug && moveHistory.length > 20) moveHistory.pop();
    
    const list = $("#history-list");
    list.empty();
    moveHistory.forEach(entry => {
        list.append(`<div class="history-entry">${entry}</div>`);
    });
}

function showNotification(msg, duration) {
    duration = duration || 3000;
    $("#game-notification").text(msg).show().css("opacity", 1);
    clearTimeout(showNotification._timer);
    showNotification._timer = setTimeout(() => {
        $("#game-notification").animate({ opacity: 0 }, 400, function() { $(this).hide(); });
    }, duration);
}

function cancelSelection() {
    selectedCardIndex = -1; 
    selectedAttacker = null; 
    updateUI();
}

function confirmExitGame() {
    // Upozorní protivníka, pokud jsme ve fázi výběru hrdiny (MP)
    if (!isSinglePlayer) emitAction("playerAborted", {});
    $("#confirm-overlay").css("display", "flex");
}

function exitGame() {
    $.post('https://shootout_cardgame/exit', JSON.stringify({}));
    $("#game-container").hide();
    $("#result-overlay").hide();
    $("#confirm-overlay").hide();
    $("#hero-selection").hide();

    // Skrýt panel historie při odchodu
    $("#history-panel").hide();

    teardownDebugUI();
    isDebug = false;
    gameEnded = true;
}

function getImgName(card) {
    // Bezpečný název souboru
    let safeName = card.name.replace(/ /g, "_");
    return `img/${card.id}_${card.type}_${safeName}.png`;
}

// ==========================================
// 2. VÝBĚR HRDINY A START
// ==========================================

function showHeroSelection(isFirst, oppName) {
    $("#hero-selection").css("display", "flex");
    $("#result-overlay").hide();
    $("#hero-list").empty();

    gameEnded = false;
    myHeroChoice = null;
    opponentHeroId = null;
    pendingIsFirst = isFirst;
    pendingOppName = oppName;

    // Vyfiltrujeme jen Hero karty, které má hráč v inventáři
    const inventoryHeroIds = new Set(myInventoryCards.filter(c => c.type === "Hero").map(c => c.id));
    let heroes = CardDB.filter(c => c.type === "Hero" && inventoryHeroIds.has(c.id));

    if (heroes.length === 0) {
        $("#hero-list").html(`
            <div style="color:red; font-family:'Western'; font-size:20px; text-align:center; padding:60px 20px;">
                Nemáš žádnou hero kartu v inventáři!<br>Otevři balíček karet a získej hrdinu.
            </div>
        `);
        return;
    }

    const deckCards = myInventoryCards.filter(c => c.type !== "Hero" && !c.token);
    if (deckCards.length < 20) {
        $("#hero-list").html(`
            <div style="color:red; font-family:'Western'; font-size:20px; text-align:center; padding:60px 20px;">
                Nemáš dostatek karet pro hru!<br>Potřebuješ alespoň 20 karet (máš ${deckCards.length}).<br>Otevři více balíčků karet.
            </div>
        `);
        return;
    }

    heroes.forEach(hero => {
        let el = $(`
            <div class="hero-option">
                <img src="${getImgName(hero)}" style="width:160px; height:240px; object-fit:cover;">
                <div style="margin-top:10px; color:gold; font-family:'Western'; font-size:18px;">${hero.name}</div>
            </div>
        `);
        el.click(() => {
            if (isSinglePlayer) {
                $("#hero-selection").hide();
                initGame(isFirst, oppName, hero, null);
            } else {
                myHeroChoice = hero;
                emitAction("heroSelected", { heroId: hero.id });
                // Zobrazit čekání
                $("#hero-list").empty().html(`
                    <div style="color:gold; font-family:'Western'; font-size:22px; text-align:center; padding:60px 20px;">
                        Waiting for opponent to choose their hero...
                    </div>
                `);
                // Pokud protivník už vybral, spustíme hru
                if (opponentHeroId !== null) {
                    startGameWithHeroes();
                }
            }
        });
        $("#hero-list").append(el);
    });
}

function startGameWithHeroes() {
    let enemyHeroTemplate = CardDB.find(c => c.id === opponentHeroId && c.type === "Hero") || null;
    $("#hero-selection").hide();
    initGame(pendingIsFirst, pendingOppName, myHeroChoice, enemyHeroTemplate);
}

function initGame(isFirst, oppName, chosenHero, enemyHeroOverride) {
    isHost = isFirst;
    // Reset proměnných
    currentMana = 1; maxMana = 1;
    playerHand = []; playerBoard = [];
    enemyBoard = []; enemyHandAI = [];
    playerGraveyard = []; enemyGraveyard = [];
    playerDeck = []; enemyDeck = [];
    selectedCardIndex = -1; selectedAttacker = null;
    gameEnded = false;
    mpEnemyHandCount = 4; // Oba hráči začínají se 4 kartami
    moveHistory = []; $("#history-list").empty();
    $("#history-panel").show();
    if (isDebug) setupDebugUI(); else teardownDebugUI();
    // Nastavení Hráče
    playerHp = chosenHero.hp;
    playerMaxHp = chosenHero.hp;
    $("#player-name").text(chosenHero.name);
    $("#player-hero").css("background-image", `url('${getImgName(chosenHero)}')`);

    // Nastavení Oponenta
    let enemyHero = enemyHeroOverride || CardDB.filter(c => c.type === "Hero" && c.id !== chosenHero.id)[0] || CardDB[80];
    
    enemyHp = enemyHero.hp; 
    enemyMaxHp = enemyHero.hp;
    $("#opp-name").text(oppName);
    $("#opp-hero").css("background-image", `url('${getImgName(enemyHero)}')`);

    // Nastavení tahu
    myTurn = isFirst;
    $("#game-message").text(myTurn ? "YOUR TURN" : "ENEMY TURN");
    $("#end-turn-btn").prop("disabled", !myTurn);

    // Inicializace balíčků
    playerDeck = buildDeck(26);
    enemyDeck = buildDeck(26);

    // Počáteční lízání (4 karty)
    for(let i=0; i<4; i++) drawCard("player");
    if (isSinglePlayer) {
        for(let i=0; i<4; i++) drawCard("enemy");
    }
    
    updateUI();
}

// ==========================================
// 3. HERNÍ SMYČKA (Turn Logic)
// ==========================================

function startPlayerTurn() {
    if (gameEnded) return;

    myTurn = true;
    if(maxMana < 10) maxMana++;
    currentMana = maxMana;

    drawCard("player");

    // Probuzení jednotek + reset stunu + Start of Turn efekty
    playerBoard.forEach(u => {
        if (u.type === "Unit") {
            if (u.stunned) {
                // Stun vyprší – jednotka tento tah nemůže útočit
                u.stunned = false;
                u.canAttack = false;
            } else {
                u.canAttack = true;
                u.attacksRemaining = u.maxAttacks || 1;
            }
        }

        // Start of Turn efekty Landmarků (VOODOO ALTAR, TRAIN STATION)
        if (u.logic && u.logic.onTurnStart) u.logic.onTurnStart(GameInterface, u);
    });

    // Synchronizace stavu po začátku tahu (draw + start-of-turn efekty) protivníkovi
    emitStateSync({ type: "startTurn" });

    $("#game-message").text("YOUR TURN");
    $("#end-turn-btn").prop("disabled", false);

    checkDeaths();
    updateUI();
}

function endTurn() {
    if (!myTurn || gameEnded) return;
    
    myTurn = false;
    
    // Spuštění "End of Turn" efektů
    playerBoard.forEach(u => {
        if (u.logic && u.logic.onTurnEnd) u.logic.onTurnEnd(GameInterface, u);
    });
    checkDeaths(); // Ghost Train a jiné "die at end of turn" efekty

    $("#game-message").text("ENEMY TURN");
    $("#end-turn-btn").prop("disabled", true);
    
    cancelSelection();
    
    SoundFX.endTurn();
    // Synchronizace stavu po ukončení tahu (včetně end-of-turn efektů)
    emitStateSync({ type: "endTurn" });

    updateUI();

    // Pokud Singleplayer, hraje AI
    if (isSinglePlayer) {
        setTimeout(startAITurn, 1500);
    }
}

// ==========================================
// 4. INTERAKCE S KARTAMI A STOLEM
// ==========================================

// Kliknutí na kartu v ruce
function handleCardClick(index) {
    if (!myTurn || gameEnded) return;
    
    let card = playerHand[index];
    
    // Pokud už je vybraná, zrušíme výběr
    if (selectedCardIndex === index) { 
        selectedCardIndex = -1; 
        updateUI(); 
        return; 
    }

    // Kontrola many (s případnou slevou)
    if (getCardCost(card) > currentMana) {
        return;
    }

    // Kontrola, zda karta potřebuje Cíl (Target)
    const text = card.text.toLowerCase();
    const needsTarget = (
        card.type === "Gear" ||
        (card.type === "Spell" && (
            text.includes("deal") ||
            text.includes("give") ||
            text.includes("destroy") ||
            text.includes("heal") ||
            text.includes("return a unit") ||  // CELL DOOR, GETAWAY HORSE
            text.includes("choose an enemy")   // HANDCUFFS
        )) ||
        (card.logic.onPlay && text.includes("target"))
    );

    // Výjimky pro globální spelly, které cíl nepotřebují
    const isGlobal = text.includes("all units") || text.includes("all characters") ||
        text.includes("all enemy") || text.includes("all friendly") ||
        text.includes("all damaged") || text.includes("random");
    
    if (needsTarget && !isGlobal) {
        selectedCardIndex = index;
        selectedAttacker = null; // Zrušíme případný výběr útoku
        updateUI();
    } else {
        // Hrajeme rovnou (Unit bez targetu, nebo Global Spell)
        playCard(index, null);
    }
}

// Kliknutí na jednotku na stole
function handleUnitClick(unit, isEnemy) {
    if (gameEnded) return;

    // 1. SCÉNÁŘ: Mám vybranou kartu v ruce a vybírám pro ni cíl
    if (selectedCardIndex > -1) {
        let card = playerHand[selectedCardIndex];
        // Nelze cílit Stealth jednotku
        if (isEnemy && unit.keywords.includes("Stealth")) return;
        // WHITE BISON (id:43): imunní vůči Spellům a Gearům
        if (unit.id === 43 && (card.type === "Spell" || card.type === "Gear")) return;
        playCard(selectedCardIndex, unit);
        selectedCardIndex = -1;
        return;
    }

    // 2. SCÉNÁŘ: Chci útočit
    if (!myTurn) return;

    // A) Klik na vlastní jednotku -> Vybrat jako útočníka
    if (!isEnemy) {
        if (unit.type === "Unit" && unit.canAttack) {
            // ANCIENT BONES (id:54): může útočit jen jako jediná jednotka
            if (unit.id === 54 && playerBoard.filter(u => u.type === "Unit").length > 1) return;
            selectedAttacker = (selectedAttacker === unit) ? null : unit;
            updateUI();
        }
        return;
    }

    // B) Klik na nepřátelskou jednotku -> Provést útok
    if (isEnemy && selectedAttacker) {
        // Kontrola Stealth
        if (unit.keywords.includes("Stealth")) return;
        
        // Kontrola Guardian (Taunt)
        if (!checkGuardian(unit)) {
            // Visual feedback: "You must attack the Guardian!"
            return; 
        }

        let attackerIdx = playerBoard.indexOf(selectedAttacker);
        let targetIdx = enemyBoard.indexOf(unit);
        
        performAttack(attackerIdx, targetIdx, false);
        selectedAttacker = null;
    }
}

// Kliknutí na nepřátelského hrdinu
function handleEnemyHeroClick() {
    if (gameEnded) return;

    // 1. Cíl spellu
    if (selectedCardIndex > -1) {
        let card = playerHand[selectedCardIndex];
        // Některé karty mohou cílit hrdinu (Damage spells)
        if (card.text.toLowerCase().includes("hero") || card.text.toLowerCase().includes("enemy")) {
            playCard(selectedCardIndex, "hero");
            selectedCardIndex = -1;
        }
        return;
    }

    // 2. Útok jednotkou
    if (selectedAttacker) {
        // Kontrola Guardian
        if (enemyBoard.some(u => u.keywords.includes("Guardian"))) {
            return; // Musí zničit Guardiana
        }
        
        let attackerIdx = playerBoard.indexOf(selectedAttacker);
        performAttack(attackerIdx, -1, true);
        selectedAttacker = null;
    }
}

// ==========================================
// 5. MECHANIKA HRANÍ KARET & GEAR
// ==========================================

function getCardCost(card) {
    let cost = card.cost;
    // GENERAL STORE (id:61): Gear cards cost (1) less
    if (card.type === "Gear" && playerBoard.some(b => b.id === 61)) {
        cost = Math.max(0, cost - 1);
    }
    // FORT WORTH (id:93): All Units cost (1) less
    if (card.type === "Unit" && playerBoard.some(b => b.id === 93)) {
        cost = Math.max(0, cost - 1);
    }
    return cost;
}

function playCard(index, target) {
    let card = playerHand[index];

        let cardSpan = `<span class="hist-card-name" data-id="${card.id}">${card.name}</span>`;
    addToHistory(`<span class="hist-you">Ty:</span> Hraješ ${cardSpan}`);

    // Odečíst manu (s případnou slevou)
    currentMana -= getCardCost(card);
    
    // Odstranit z ruky
 playerHand.splice(index, 1);

    // --- LOGIKA DLE TYPU ---

    if (card.type === "Unit" || card.type === "Landmark") {
        // Vyložení na stůl
        playerBoard.push(card);

        // Summoning Sickness (pokud nemá Ambush)
        card.canAttack = false;
        if (card.keywords.includes("Ambush")) card.canAttack = true;

        // COURTHOUSE (id:33): dej +1 HP všem dosavadním unit na stole (vyjma sebe)
        if (card.id === 33) {
            playerBoard.forEach(u => {
                if (u !== card && u.type === "Unit") { u.maxHp += 1; u.hp += 1; }
            });
        }

        // Pokud COURTHOUSE je na stole, nová unit dostane +1 HP
        if (card.type === "Unit" && playerBoard.some(b => b.id === 33 && b !== card)) {
            card.maxHp += 1; card.hp += 1;
        }

        // Battlecry Effect
        if (card.logic && card.logic.onPlay) {
            card.logic.onPlay(GameInterface, card, target);
        }

    } else if (card.type === "Spell") {
        // Spell Effect
        if (card.logic && card.logic.onPlay) {
            card.logic.onPlay(GameInterface, card, target);
        }
        // Spell jde na hřbitov
        playerGraveyard.push(card);

    } else if (card.type === "Gear") {
        // --- GEAR IMPLEMENTACE ---
        if (target && target.type === "Unit") {
            // Přidáme Gear objekt do pole 'gear' na cílové jednotce
            if (!target.gear) target.gear = [];
            target.gear.push(card);
            
            // Aplikujeme efekt (staty se zvednou v onPlay)
            if (card.logic && card.logic.onPlay) {
                card.logic.onPlay(GameInterface, card, target);
            }
        }
    }

    SoundFX.play();
    checkDeaths();
    updateUI();
    // Synchronizace stavu po zahraní karty – posíláme až po checkDeaths
    emitStateSync({ type: "playCard", cardId: card.id, cardName: card.name });
}

function performAttack(myUnitIndex, targetUnitIndex, isTargetHero) {
    let attacker = playerBoard[myUnitIndex];
    let attackerSpan = `<span class="hist-card-name" data-id="${attacker.id}">${attacker.name}</span>`;

    let targetName = isTargetHero ? "Hrdinu" : (enemyBoard[targetUnitIndex]?.name || "?");
    // Pokud cílem není hrdina, uděláme ho taky interaktivním
    if (!isTargetHero && enemyBoard[targetUnitIndex]) {
        targetName = `<span class="hist-card-name" data-id="${enemyBoard[targetUnitIndex].id}">${enemyBoard[targetUnitIndex].name}</span>`;
    }

    addToHistory(`<span class="hist-you">Ty:</span> ${attackerSpan} ⚔️ ${targetName}`);

    // Gunslinger: sledujeme zbývající útoky
    attacker.attacksRemaining = (attacker.attacksRemaining || 1) - 1;
    if (attacker.attacksRemaining <= 0) attacker.canAttack = false;

    let dmgDealt = attacker.atk;

    if (isTargetHero) {
        enemyHp -= dmgDealt;
        if (attacker.id === 17) playerHp = Math.min(playerMaxHp, playerHp + dmgDealt);
    } else {
        let defender = enemyBoard[targetUnitIndex];
        defender.hp -= dmgDealt;
        let sniperImmune = attacker.text && attacker.text.toLowerCase().includes("immune while attacking");
        if (!sniperImmune) attacker.hp -= defender.atk;
        if (attacker.keywords.includes("Lethal")) defender.hp = -99;
        if (defender.keywords.includes("Lethal")) attacker.hp = -99;
        if (attacker.id === 17) playerHp = Math.min(playerMaxHp, playerHp + dmgDealt);
    }

    // Info pro animaci na straně protivníka (odesíláme v stateSync)
    let lastAttackAction = {
        type: "attack",
        attackerIndex: myUnitIndex,
        targetIndex: isTargetHero ? -1 : targetUnitIndex,
        targetType: isTargetHero ? "hero" : "enemyUnit",
        attackerId: attacker.id,
        attackerName: attacker.name,
        targetId: isTargetHero ? null : enemyBoard[targetUnitIndex]?.id,
        targetName: isTargetHero ? null : enemyBoard[targetUnitIndex]?.name
    };

    // Animace útoku – damage se aplikoval výše, UI se obnoví po animaci
    let attackerEl = $("#player-board .card").eq(myUnitIndex);
    let targetEl = isTargetHero ? $("#opp-hero") : $("#opp-board .card").eq(targetUnitIndex);

    if (!attackerEl.length) {
        checkDeaths();
        updateUI();
        emitStateSync(lastAttackAction);
        return;
    }

    // Vypočítat směr pohybu (útočník -> cíl)
    let aRect = attackerEl[0].getBoundingClientRect();
    let tRect = targetEl.length ? targetEl[0].getBoundingClientRect() : null;
    let dx = tRect ? (tRect.left + tRect.width / 2) - (aRect.left + aRect.width / 2) : 0;
    let dy = tRect ? (tRect.top + tRect.height / 2) - (aRect.top + aRect.height / 2) : -80;
    let dist = Math.sqrt(dx * dx + dy * dy);
    let nx = (dx / dist) * 60;
    let ny = (dy / dist) * 60;

    SoundFX.attack();
    attackerEl.css({ transition: 'transform 0.15s ease-in', transform: `translate(${nx}px, ${ny}px)` });

    setTimeout(() => {
        // Flash na cíli
        targetEl.addClass('card-hit');
        attackerEl.css({ transition: 'transform 0.12s ease-out', transform: 'translate(0,0)' });
        setTimeout(() => {
            targetEl.removeClass('card-hit');
            attackerEl.css('transition', '');
            checkDeaths();
            updateUI();
            // Synchronizace po animaci – posíláme až po checkDeaths
            emitStateSync(lastAttackAction);
        }, 180);
    }, 160);
}

// ==========================================
// 6. KONTROLA STAVU A KONEC HRY
// ==========================================

function checkDeaths() {
    // OLD GRAVEYARD (id:67): umírající unit friendly jde zpět do ruky
    const hasOldGraveyard = playerBoard.some(b => b.id === 67);

    // Odstranění mrtvých jednotek
    playerBoard = playerBoard.filter(u => {
        if (u.hp <= 0) {
            // OLD GRAVEYARD: vrátit unit do ruky místo hřbitova (kromě samotného landmarku)
            if (hasOldGraveyard && u.type === "Unit" && u.id !== 67 && playerHand.length < 10) {
                u.hp = u.maxHp;
                u.canAttack = false;
                u.auraAtk = 0; u.auraHp = 0; u.auraKeywords = [];
                playerHand.push(u);
                return false;
            }
            if (u.logic && u.logic.onDeath) u.logic.onDeath(GameInterface, u);
            playerGraveyard.push(u);
            SoundFX.death();
            return false;
        }
        return true;
    });

    enemyBoard = enemyBoard.filter(u => {
        if (u.hp <= 0) {
            enemyGraveyard.push(u);
            return false;
        }
        return true;
    });

    // Kontrola Hrdinů (Konec Hry)
    if (playerHp <= 0) {
        showEndScreen(false); // Prohra
    } else if (enemyHp <= 0) {
        showEndScreen(true); // Výhra
    }
    
    // Refresh UI po čistce
    updateUI(); 
}

function showEndScreen(isVictory) {
    if (gameEnded) return;
    gameEnded = true;

    $("#game-container").css("filter", "blur(4px)"); // Efekt rozmazání
    $("#result-overlay").fadeIn(500); // Zobrazení overlaye
    
    if (isVictory) {
        $("#result-title").text("VICTORY").css("color", "gold");
        $("#result-desc").text("The West is yours, partner.");
        setTimeout(() => SoundFX.victory(), 300);
    } else {
        $("#result-title").text("DEFEAT").css("color", "#8b0000");
        $("#result-desc").text("Looks like this is the end of the line.");
        setTimeout(() => SoundFX.defeat(), 300);
    }
}

// ==========================================
// 7. AI (UMĚLÁ INTELIGENCE)
// ==========================================

function startAITurn() {
    if (gameEnded) return;

    // AI Mana
    if(maxMana < 10) maxMana++; // Sync many (v reálu by AI mělo svou proměnnou)
    let aiMana = maxMana;
    
    drawCard("enemy");
    
    // Wake up enemy units
    enemyBoard.forEach(u => u.canAttack = true);
    updateUI();

    // 1. FÁZE: VYKLÁDÁNÍ KARET
    let aiInterval = setInterval(() => {
        if (gameEnded) { clearInterval(aiInterval); return; }

        // BEAVER DAM (id:70): enemy units cost +1
        let beaverPenalty = playerBoard.some(b => b.id === 70) ? 1 : 0;
        // Najdi hratelnou kartu (Unit)
        let playableIdx = enemyHandAI.findIndex(c => c.cost + beaverPenalty <= aiMana && c.type === "Unit");
        
        if (playableIdx > -1 && enemyBoard.length < 7) {
            let card = enemyHandAI[playableIdx];
            
            // AI zahraje kartu
            aiMana -= card.cost;
            enemyHandAI.splice(playableIdx, 1);
            enemyBoard.push(card);
            
            // Ambush logika
            card.canAttack = card.keywords.includes("Ambush");
            
            // Trigger Battlecry — AI používá rozhraní z perspektivy "enemy",
            // aby "enemy" v textu karty správně mířilo na hráče, ne na sebe.
            if (card.logic.onPlay) {
                let target = playerBoard.length > 0 ? playerBoard[0] : null;
                card.logic.onPlay(makeGameInterface("enemy"), card, target);
            }
            
            updateUI();
        } else {
            // Už nemá co hrát -> Jde útočit
            clearInterval(aiInterval);
            setTimeout(aiAttackPhase, 800);
        }
    }, 1000); // Pauza mezi vyložením karet
}

function aiAttackPhase() {
    if (gameEnded) return;

    enemyBoard.forEach(attacker => {
        // Přeskoč zastavenou (stunned) jednotku
        if (attacker.stunned) { attacker.stunned = false; return; }
        if (attacker.canAttack && attacker.atk > 0 && attacker.type === "Unit") {
            attacker.canAttack = false;
            
            // AI Logika cílení
            let target = "hero";
            
            // 1. Musí útočit na Guardiana?
            let tauntUnit = playerBoard.find(u => u.keywords.includes("Guardian"));
            if (tauntUnit) {
                target = tauntUnit;
            } 
            // 2. Trade logika (pokud může zničit jednotku zdarma nebo výhodně)
            else if (playerBoard.length > 0 && Math.random() > 0.6) {
                target = playerBoard[Math.floor(Math.random() * playerBoard.length)];
            }
            
            // Provedení útoku
            if (target === "hero") {
                playerHp -= attacker.atk;
            } else {
                target.hp -= attacker.atk;
                attacker.hp -= target.atk;
                
                // Lethal
                if (attacker.keywords.includes("Lethal")) target.hp = -99;
                if (target.keywords.includes("Lethal")) attacker.hp = -99;
            }
        }
    });

    checkDeaths();
    updateUI();
    
    // Předání tahu zpět hráči
    if (!gameEnded) {
        setTimeout(startPlayerTurn, 1000);
    }
}

// ==========================================
// 8. RENDEROVÁNÍ UI (VISUAL UPDATE)
// ==========================================

// ==========================================
// 8b. AURY (pasivní efekty Landmarků)
// ==========================================

function applyAuras() {
    const hasTotemPole    = playerBoard.some(b => b.id === 65);
    const hasHuntingGround = playerBoard.some(b => b.id === 105);
    const hasGangLeader  = playerBoard.some(b => b.id === 35);
    const hasHideout     = playerBoard.some(b => b.id === 64);
    const hasGallows     = playerBoard.some(b => b.id === 68);

    playerBoard.forEach(u => {
        // --- ATK aura ---
        let newAuraAtk = 0;
        if ((hasTotemPole || hasHuntingGround) && u.faction === "Wild") newAuraAtk += 1;
        // GRIZZLY (id:11): +3 ATK while damaged
        if (u.id === 11 && u.hp < u.maxHp) newAuraAtk += 3;
        // NIGHT FOLK (id:16): +2 ATK if player HP < enemy HP
        if (u.id === 16 && playerHp < enemyHp) newAuraAtk += 2;

        let atkDiff = newAuraAtk - (u.auraAtk || 0);
        u.atk = Math.max(0, u.atk + atkDiff);
        u.auraAtk = newAuraAtk;

        // --- HP aura (NIGHT FOLK: +2 HP conditionally) ---
        let newAuraHp = 0;
        if (u.id === 16 && playerHp < enemyHp) newAuraHp += 2;

        let hpDiff = newAuraHp - (u.auraHp || 0);
        if (hpDiff !== 0) {
            u.maxHp += hpDiff;
            u.hp = Math.max(1, Math.min(u.hp + hpDiff, u.maxHp));
        }
        u.auraHp = newAuraHp;

        // --- Keyword aury ---
        let prevAuraKw = u.auraKeywords || [];
        u.keywords = u.keywords.filter(k => !prevAuraKw.includes(k));

        let newAuraKeywords = [];
        if (hasGangLeader && u.faction === "Outlaw" && u.id !== 35) newAuraKeywords.push("Ambush");
        if (hasHideout) newAuraKeywords.push("Stealth");

        newAuraKeywords.forEach(k => { if (!u.keywords.includes(k)) u.keywords.push(k); });
        u.auraKeywords = newAuraKeywords;
    });

    // Enemy board: THE GALLOWS -1 ATK
    enemyBoard.forEach(u => {
        let newAuraAtk = hasGallows ? -1 : 0;
        let atkDiff = newAuraAtk - (u.auraAtk || 0);
        u.atk = Math.max(0, u.atk + atkDiff);
        u.auraAtk = newAuraAtk;
    });
}

function updateUI() {
    applyAuras();

    // Update textů
    $("#player-mana").html(`💎 ${currentMana} / ${maxMana}`);
    $("#opp-mana").html(`💎 ${isSinglePlayer ? maxMana : "?"} / ?`);
    $("#player-hero .hp-badge").text(playerHp);
    $("#opp-hero .hp-badge").text(enemyHp);
    $("#deck-count").text(playerDeck.length);
    $("#player-grave-count").text(playerGraveyard.length);
    $("#opp-grave-count").text(enemyGraveyard.length);

    // --- RENDER PLAYER HAND ---
    $("#player-hand").empty();
    playerHand.forEach((card, index) => {
        let el = $(createCardHTML(card, "hand"));
        
        // Stavy v ruce
        if (getCardCost(card) <= currentMana && myTurn) el.addClass("card-playable");
        if (index === selectedCardIndex) el.addClass("card-selected");
        
        el.click(() => handleCardClick(index));
        el.on("mouseenter", () => { showCardTooltip(card); SoundFX.hover(); });
        el.on("mouseleave", hideCardTooltip);
        el.on("contextmenu", (e) => { e.preventDefault(); showCardZoom(card); });

        $("#player-hand").append(el);
    });

    // --- RENDER BOARDS ---
    renderBoard($("#player-board"), playerBoard, false);
    renderBoard($("#opp-board"), enemyBoard, true);
    
    // --- RENDER ENEMY HAND ---
    $("#opp-hand").empty();
    if (isDebug && isSinglePlayer) {
        enemyHandAI.forEach(card => {
            let el = $(createCardHTML(card, "hand"));
            el.addClass("debug-enemy-card");
            el.on("mouseenter", () => showCardTooltip(card));
            el.on("mouseleave", hideCardTooltip);
            el.on("contextmenu", (e) => { e.preventDefault(); showCardZoom(card); });
            $("#opp-hand").append(el);
        });
    } else {
        let count = isSinglePlayer ? enemyHandAI.length : mpEnemyHandCount;
        for(let i=0; i<count; i++) {
            $("#opp-hand").append(`<div class="card-back"></div>`);
        }
    }

    // Zvýraznění enemy hrdiny jako cíle útoku nebo spellu
    const heroAttackable = selectedAttacker && myTurn &&
        !enemyBoard.some(u => u.keywords.includes("Guardian"));
    let heroSpellTargetable = false;
    if (selectedCardIndex > -1 && myTurn) {
        let sc = playerHand[selectedCardIndex];
        let st = sc.text.toLowerCase();
        heroSpellTargetable = st.includes("hero") ||
            ((st.includes("deal") || st.includes("damage")) && (st.includes("enemy") || st.includes("any")));
    }
    $("#opp-hero").toggleClass("hero-targetable", !!(heroAttackable || heroSpellTargetable));

    // Bind event na enemy hrdinu (pro útok/target)
        $("#opp-hero").off("click mousedown")
        .on("mousedown", function(e) { e.stopPropagation(); }) 
        .on("click", handleEnemyHeroClick);
}

function renderBoard(container, boardData, isEnemy) {
    container.empty();
    boardData.forEach((card) => {
        let el = $(createCardHTML(card, "board"));
        
        // Vizuální efekty
        if (card.keywords.includes("Guardian")) el.addClass("guardian-glow");
        if (card.keywords.includes("Stealth")) el.addClass("stealth-visual");

        // Interaktivita (jen moje jednotky)
        if (!isEnemy && card.type === "Unit") {
            if (card.canAttack && myTurn) el.addClass("card-ready"); // Zelená
            else el.addClass("card-exhausted"); // Šedá
        }

        if (selectedAttacker === card) {
            el.removeClass("card-ready").addClass("card-attacker"); // Červená
        }

        // Platný cíl útoku – červené pulzování
        if (isEnemy && selectedAttacker && myTurn) {
            const hasGuardian = enemyBoard.some(u => u.keywords.includes("Guardian"));
            const isValidTarget = !card.keywords.includes("Stealth") &&
                (!hasGuardian || card.keywords.includes("Guardian"));
            if (isValidTarget) el.addClass("card-targetable");
        }

        // Zvýraznění cílů spellu / gearu
        if (selectedCardIndex > -1 && myTurn) {
            let sc = playerHand[selectedCardIndex];
            let st = sc ? sc.text.toLowerCase() : "";
            let targetsEnemies = isEnemy &&
                !card.keywords.includes("Stealth") && card.id !== 43 &&
                (st.includes("deal") || st.includes("destroy") ||
                 st.includes("choose an enemy") || st.includes("silence") ||
                 st.includes("return a unit") || st.includes("enemy unit"));
            let targetsFriendly = !isEnemy &&
                (sc && sc.type === "Gear" ||
                 st.includes("give") || st.includes("heal") ||
                 st.includes("return a friendly") || st.includes("copy"));
            if (targetsEnemies || targetsFriendly) el.addClass("card-targetable");
        }

        el.click(() => handleUnitClick(card, isEnemy));
        el.on("mouseenter", () => { showCardTooltip(card); SoundFX.hover(); });
        el.on("mouseleave", hideCardTooltip);
        el.on("contextmenu", (e) => { e.preventDefault(); showCardZoom(card); });
        container.append(el);
    });
}

function showCardTooltip(card) {
    let statsHtml = "";
    if (card.type !== "Spell" && card.type !== "Gear") {
        statsHtml = `⚔️ <b>${card.atk}</b> &nbsp; ❤️ <b>${card.hp}</b>`;
        if (card.keywords && card.keywords.length > 0) {
            statsHtml += `<br><span style="color:#d4af37;font-size:10px;">${card.keywords.join(", ")}</span>`;
        }
    }
    let costDisplay = getCardCost(card);
    let costStr = costDisplay < card.cost
        ? `<span style="color:#76ff03">${costDisplay}</span> <span style="text-decoration:line-through;color:#888">${card.cost}</span>`
        : `${card.cost}`;

    $("#tt-name").text(card.name);
    $("#tt-meta").text(`${card.faction} · ${card.type}`);
    $("#tt-cost").html(`💎 ${costStr} Grit`);
    $("#tt-stats").html(statsHtml);
    $("#tt-text").text(card.text || "");

    // Gear tooltipy
    let gearHtml = "";
    if (card.gear && card.gear.length > 0) {
        card.gear.forEach(g => {
            gearHtml += `
                <div class="tt-gear-item">
                    <div class="tt-gear-name">🔧 ${g.name}</div>
                    <div class="tt-gear-text">${g.text || ""}</div>
                </div>`;
        });
    }
    $("#tt-gear").html(gearHtml);

    $("#card-tooltip").show();
}

function hideCardTooltip() {
    $("#card-tooltip").hide();
}

function showCardZoom(card) {
    let imgPath = getImgName(card);
    $("#card-zoom-img").attr("src", imgPath);

    // Rarity vizuál
    const rarityClass = RARITY_CLASS[card.rarity] || 'r-common';
    const face = document.getElementById('card-zoom-face');
    face.className = rarityClass;
    document.getElementById('cz-rarity-badge').textContent = card.rarity || '';

    $("#cz-name").text(card.name);
    $("#cz-meta").text(`${card.faction} · ${card.type}`);

    let costDisplay = (typeof getCardCost === "function") ? getCardCost(card) : card.cost;
    let costStr = costDisplay < card.cost
        ? `💎 <span style="color:#76ff03">${costDisplay}</span> <span style="text-decoration:line-through;color:#666">${card.cost}</span> Grit`
        : `💎 ${card.cost} Grit`;
    $("#cz-cost").html(costStr);

    if (card.type !== "Spell" && card.type !== "Gear") {
        let atkColor = card.atk > card.baseAtk ? "#76ff03" : "#eee";
        let hpColor  = card.hp < card.maxHp ? "#ff5252" : (card.hp > card.baseHp ? "#76ff03" : "#eee");
        $("#cz-stats").html(
            `⚔️ <span style="color:${atkColor};font-weight:bold">${card.atk}</span>` +
            `&nbsp;&nbsp;❤️ <span style="color:${hpColor};font-weight:bold">${card.hp}</span>` +
            (card.maxHp !== card.hp ? ` <span style="color:#666;font-size:10px">/${card.maxHp}</span>` : "")
        );
    } else {
        $("#cz-stats").html("");
    }

    let kw = (card.keywords && card.keywords.length > 0) ? card.keywords.join(" · ") : "";
    $("#cz-keywords").text(kw);
    $("#cz-text").text(card.text || "");

    let gearHtml = "";
    if (card.gear && card.gear.length > 0) {
        card.gear.forEach(g => {
            gearHtml += `<div class="cz-gear-item"><div class="cz-gear-name">🔧 ${g.name}</div><div>${g.text || ""}</div></div>`;
        });
    }
    $("#cz-gear").html(gearHtml);

    // Restartuj animaci
    const el = document.getElementById("card-zoom");
    el.style.display = "block";
    el.style.animation = "none";
    void el.offsetWidth;
    el.style.animation = "";

    SoundFX.zoom();
}

function hideCardZoom() {
    $("#card-zoom").hide();
}

function showGraveyard(owner) {
    let grave = owner === "player" ? playerGraveyard : enemyGraveyard;
    let title = owner === "player" ? "Tvůj hřbitov" : "Hřbitov protivníka";
    $("#graveyard-title").text(`${title} (${grave.length})`);

    let container = $("#graveyard-cards").empty();
    if (grave.length === 0) {
        container.html('<div style="color:#888;text-align:center;padding:20px;font-family:sans-serif;">Hřbitov je prázdný.</div>');
    } else {
        [...grave].reverse().forEach(card => {
            let statsHtml = (card.type !== "Spell" && card.type !== "Gear")
                ? `<div class="grave-card-stats">⚔️${card.atk} ❤️${card.maxHp}</div>` : "";
            let el = $(`
                <div class="grave-card-item">
                    <img src="${getImgName(card)}" class="grave-card-img" onerror="this.src='img/card_back.png'">
                    <div class="grave-card-info">
                        <div class="grave-card-name">${card.name}</div>
                        <div class="grave-card-type">${card.faction} · ${card.type}</div>
                        ${statsHtml}
                        <div class="grave-card-text">${card.text || ""}</div>
                    </div>
                </div>
            `);
            container.append(el);
        });
    }
    $("#graveyard-modal").show();
}

function showDeckInspector(owner) {
    let deck = owner === "player" ? playerDeck : enemyDeck;
    let title = owner === "player" ? "Tvůj balíček" : "Balíček protivníka";
    $("#graveyard-title").text(`${title} (${deck.length} karet)`);

    let container = $("#graveyard-cards").empty();
    if (deck.length === 0) {
        container.html('<div style="color:#888;text-align:center;padding:20px;font-family:sans-serif;">Balíček je prázdný.</div>');
    } else {
        // Skupinujeme karty podle jména pro přehlednost
        let grouped = {};
        deck.forEach(card => {
            let key = card.id;
            if (!grouped[key]) grouped[key] = { card, count: 0 };
            grouped[key].count++;
        });
        Object.values(grouped).forEach(({ card, count }) => {
            let statsHtml = (card.type !== "Spell" && card.type !== "Gear")
                ? `<div class="grave-card-stats">⚔️${card.atk} ❤️${card.maxHp}</div>` : "";
            let countBadge = count > 1 ? `<div class="deck-inspector-count">×${count}</div>` : "";
            let el = $(`
                <div class="grave-card-item">
                    <img src="${getImgName(card)}" class="grave-card-img" onerror="this.src='img/card_back.png'">
                    <div class="grave-card-info">
                        <div class="grave-card-name">${card.name} ${countBadge}</div>
                        <div class="grave-card-type">${card.faction} · ${card.type} · 💎${card.cost}</div>
                        ${statsHtml}
                        <div class="grave-card-text">${card.text || ""}</div>
                    </div>
                </div>
            `);
            el.on("mouseenter", () => showCardTooltip({ ...card, gear: [] }));
            el.on("mouseleave", hideCardTooltip);
            container.append(el);
        });
    }
    $("#graveyard-modal").show();
}

function setupDebugUI() {
    // Debug badge
    if ($("#debug-badge").length === 0) {
        $("body").append(`<div id="debug-badge">🔧 DEBUG</div>`);
    }
    // Tlačítka pro inspekci balíčků – přidáme do player-area
    if ($("#debug-deck-btns").length === 0) {
        $("#player-deck").css("cursor", "pointer").attr("title", "Klikni pro inspekci svého balíčku");
        $("#player-deck").on("click.debug", () => showDeckInspector("player"));
        $(".player-area.opponent .hero-wrapper").append(
            `<div id="debug-deck-btns"><button class="debug-deck-btn" onclick="showDeckInspector('enemy')">🃏 AI Deck</button></div>`
        );
    }
    // Rozšíření history panelu v debug módu
    $("#history-panel").addClass("debug-history");
}

function teardownDebugUI() {
    $("#debug-badge").remove();
    $("#debug-deck-btns").remove();
    $("#player-deck").off("click.debug").css("cursor", "").removeAttr("title");
    $("#history-panel").removeClass("debug-history");
}

/**
 * Hlavní funkce pro HTML strukturu karty – full art, bez textu přímo na kartě
 */
function createCardHTML(card, context) {
    let imgPath = getImgName(card);
    let stats = "";

    // Staty (atk/hp) jen pro Unit a Landmark
    if (card.type !== "Spell" && card.type !== "Gear") {
        let atkClass = "atk";
        if (card.atk > card.baseAtk) atkClass += " stat-buff";

        let hpClass = "hp";
        if (card.hp < card.maxHp) hpClass += " stat-dmg";
        else if (card.hp > card.baseHp) hpClass += " stat-buff";

        stats = `
            <div class="stat-box ${atkClass}">${card.atk}</div>
            <div class="stat-box ${hpClass}">${card.hp}</div>
        `;
    }

    // Cena (jen v ruce)
    let displayCost = context === "hand" ? getCardCost(card) : card.cost;
    let costClass = (context === "hand" && displayCost < card.cost) ? "stat-box cost stat-buff" : "stat-box cost";
    let costHtml = context === "hand" ? `<div class="${costClass}">${displayCost}</div>` : "";

    // Gear ikony na stole
    let gearHtml = "";
    if (context === "board" && card.gear && card.gear.length > 0) {
        gearHtml = `<div class="gear-container">`;
        card.gear.forEach(g => {
            gearHtml += `<img src="${getImgName(g)}" class="gear-icon">`;
        });
        gearHtml += `</div>`;
    }

    return `
    <div class="card">
        ${costHtml}
        <div class="card-frame">
            <img class="card-img" src="${imgPath}" onerror="this.src='img/card_back.png'">
            <div class="card-name-tag">${card.name}</div>
        </div>
        ${gearHtml}
        ${stats}
    </div>`;
}


// ==========================================
// 9. HELPERY & FACTORY
// ==========================================

function buildDeck(size) {
    const pool = myInventoryCards.filter(c => c.type !== "Hero" && !c.token);
    if (!pool.length) return [];

    // Pokud má inventář méně karet než size, opakuj karty dokud nedoplníme balíček
    let deck = [];
    for (let i = 0; i < size; i++) {
        deck.push(pool[i % pool.length].id);
    }
    // Fisher-Yates shuffle
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function recycleGraveyardIntoDeck(owner) {
    const graveyard = owner === "player" ? playerGraveyard : enemyGraveyard;
    if (graveyard.length === 0) return false;

    let recycled = graveyard.map(c => c.id);
    // Shuffle
    for (let i = recycled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [recycled[i], recycled[j]] = [recycled[j], recycled[i]];
    }
    if (owner === "player") {
        playerDeck = recycled;
        playerGraveyard = [];
        showNotification("Hřbitov zamíchán zpět do balíčku!", 2500);
    } else {
        enemyDeck = recycled;
        enemyGraveyard = [];
    }
    updateUI();
    return true;
}

function drawCard(owner) {
    let deck = owner === "player" ? playerDeck : enemyDeck;

    // Balíček prázdný – recykluj hřbitov
    if (deck.length === 0) {
        if (!recycleGraveyardIntoDeck(owner)) {
            // Hřbitov i balíček prázdné
            if (owner === "player") showNotification("Balíček i hřbitov jsou prázdné!", 2000);
            return;
        }
        deck = owner === "player" ? playerDeck : enemyDeck;
    }

    const hand = owner === "player" ? playerHand : enemyHandAI;
    if (hand.length >= 10) return;

    const cardId = deck.pop();
    if (owner === "player") playerDeck = deck;
    else enemyDeck = deck;

    let card = createCardInstance(cardId, owner);
    if (card) {
        if (owner === "player") { playerHand.push(card); SoundFX.draw(); }
        else enemyHandAI.push(card);
    }
}

function createCardInstance(cardId, owner) {
    let template = CardDB.find(c => c.id === cardId); 
    if(!template) return null;
    
    // Ochrana proti Hero/Token kartám – vyber jinou z poolu
    if (template.type === "Hero" || template.token) {
        const pool = CardDB.filter(c => c.type !== "Hero" && !c.token);
        if (!pool.length) return null;
        return createCardInstance(pool[Math.floor(Math.random() * pool.length)].id, owner);
    }

    // Klonování objektu karty
    let card = { 
        ...template, 
        instanceId: Date.now() + Math.random(), 
        owner: owner, 
        
        // HP/ATK Tracking
        hp: template.hp, 
        maxHp: template.hp, 
        baseHp: template.hp, 
        
        atk: template.atk, 
        baseAtk: template.atk, 
        
        // Logika
        logic: getCardLogic(template), 
        keywords: getCardLogic(template).keywords || [], 
        
        // Stav
        canAttack: false,
        stunned: false,
        maxAttacks: template.text && template.text.toLowerCase().includes("attack twice") ? 2 : 1,
        attacksRemaining: template.text && template.text.toLowerCase().includes("attack twice") ? 2 : 1,
        gear: [] // Pole pro nasazené vybavení
    };
    return card;
}

function checkGuardian(targetUnit) {
    // Pokud cíl má Guardian, je to ok
    if (targetUnit.keywords.includes("Guardian")) return true;
    
    // Pokud nějaký jiný nepřítel má Guardian, musím útočit na něj -> return false
    if (enemyBoard.some(u => u.keywords.includes("Guardian"))) return false;
    
    // Nikdo nemá Guardian -> ok
    return true;
}

function emitAction(type, payload) {
    if(!isSinglePlayer) {
        $.post('https://shootout_cardgame/sendAction', JSON.stringify({type: type, payload: payload}));
    }
}

// ==========================================
// HOST-AUTHORITATIVE SYNC – helper funkce
// ==========================================

function serializeBoard(board) {
    return board.map(u => ({
        id: u.id,
        hp: u.hp, maxHp: u.maxHp, baseHp: u.baseHp || u.maxHp,
        atk: u.atk, baseAtk: u.baseAtk || u.atk,
        canAttack: u.canAttack || false,
        stunned: u.stunned || false,
        attacksRemaining: u.attacksRemaining || 1,
        maxAttacks: u.maxAttacks || 1,
        keywords: [...(u.keywords || [])],
        gear: (u.gear || []).map(g => ({ id: g.id })),
        text: u.text || "",
        auraAtk: u.auraAtk || 0,
        auraHp: u.auraHp || 0,
        auraKeywords: [...(u.auraKeywords || [])]
    }));
}

function deserializeBoard(data, owner) {
    return (data || []).map(d => {
        let card = createCardInstance(d.id, owner);
        if (!card) return null;
        card.hp = d.hp; card.maxHp = d.maxHp; card.baseHp = d.baseHp;
        card.atk = d.atk; card.baseAtk = d.baseAtk;
        card.canAttack = d.canAttack; card.stunned = d.stunned;
        card.attacksRemaining = d.attacksRemaining; card.maxAttacks = d.maxAttacks;
        card.keywords = [...d.keywords];
        card.text = d.text;
        card.gear = (d.gear || []).map(g => createCardInstance(g.id, owner) || { id: g.id });
        card.auraAtk = d.auraAtk || 0;
        card.auraHp = d.auraHp || 0;
        card.auraKeywords = [...(d.auraKeywords || [])];
        return card;
    }).filter(Boolean);
}

// Sestaví payload pro stateSync z aktuálního stavu hry.
// "my" = odesílatel (player), "opp" = příjemce (enemy z pohledu odesílatele).
function buildStateSync(lastAction) {
    return {
        myHp: playerHp, myMaxHp: playerMaxHp,
        oppHp: enemyHp, oppMaxHp: enemyMaxHp,
        myBoard: serializeBoard(playerBoard),
        oppBoard: serializeBoard(enemyBoard),
        myGraveyardIds: playerGraveyard.map(c => c.id),
        oppGraveyardIds: enemyGraveyard.map(c => c.id),
        myHandCount: playerHand.length,
        lastAction: lastAction || null
    };
}

// Aplikuje přijatý stateSync (perspektiva se invertuje – "my" odesílatele = náš enemy).
function applyStateSync(p) {
    enemyHp     = p.myHp;
    enemyMaxHp  = p.myMaxHp  || enemyMaxHp;
    playerHp    = p.oppHp;
    playerMaxHp = p.oppMaxHp || playerMaxHp;
    enemyBoard    = deserializeBoard(p.myBoard,  "enemy");
    playerBoard   = deserializeBoard(p.oppBoard, "player");
    enemyGraveyard  = (p.myGraveyardIds  || []).map(id => createCardInstance(id, "enemy")).filter(Boolean);
    playerGraveyard = (p.oppGraveyardIds || []).map(id => createCardInstance(id, "player")).filter(Boolean);
    mpEnemyHandCount = p.myHandCount;
}

// Zkratka: sestav stav a odešli jako stateSync.
function emitStateSync(lastAction) {
    if (!isSinglePlayer) {
        emitAction("stateSync", buildStateSync(lastAction));
    }
}

// Animace útoku přicházejícího od protivníka (guest přijal stateSync s lastAction.type="attack").
// Stav boardů je již aplikovaný – animace jen vizualizuje pohyb.
function playRemoteAttackAnimation(lastAction, callback) {
    SoundFX.attack();

    let attackerSpan = lastAction.attackerName
        ? `<span class="hist-card-name" data-id="${lastAction.attackerId}">${lastAction.attackerName}</span>`
        : "?";
    let targetStr = lastAction.targetType === "hero"
        ? "Tvého Hrdinu"
        : (lastAction.targetName
            ? `<span class="hist-card-name" data-id="${lastAction.targetId}">${lastAction.targetName}</span>`
            : "?");
    addToHistory(`<span class="hist-opp">Opp:</span> ${attackerSpan} ⚔️ ${targetStr}`);

    let attackerEl = $("#opp-board .card").eq(lastAction.attackerIndex);
    let targetEl   = lastAction.targetType === "hero"
        ? $("#player-hero")
        : $("#player-board .card").eq(lastAction.targetIndex);

    if (!attackerEl.length) { callback(); return; }

    let aRect = attackerEl[0].getBoundingClientRect();
    let tRect = targetEl.length ? targetEl[0].getBoundingClientRect() : null;
    let dx = tRect ? (tRect.left + tRect.width  / 2) - (aRect.left + aRect.width  / 2) : 0;
    let dy = tRect ? (tRect.top  + tRect.height / 2) - (aRect.top  + aRect.height / 2) : 80;
    let dist = Math.sqrt(dx * dx + dy * dy) || 1;
    let nx = (dx / dist) * 60, ny = (dy / dist) * 60;

    attackerEl.css({ transition: 'transform 0.15s ease-in', transform: `translate(${nx}px, ${ny}px)` });
    setTimeout(() => {
        targetEl.addClass('card-hit');
        attackerEl.css({ transition: 'transform 0.12s ease-out', transform: 'translate(0,0)' });
        setTimeout(() => {
            targetEl.removeClass('card-hit');
            attackerEl.css('transition', '');
            callback();
        }, 180);
    }, 160);
}

function handleRemoteAction(action) {
    if (!action) return;

    if (action.type === "heroSelected") {
        opponentHeroId = action.payload.heroId;
        if (myHeroChoice !== null) startGameWithHeroes();
        return;
    }
    else if (action.type === "playerAborted") {
        showNotification("Protivník opustil hru.", 4000);
        return;
    }
    else if (action.type === "revealHand") {
        // Odpověď protivníka na Eagle/Detective — zobrazíme jeho ruku v historii
        const cards = action.payload && action.payload.cards;
        if (cards && cards.length > 0) {
            const cardSpans = cards.map(c =>
                `<span class="hist-card-name" data-id="${c.id}">${c.name}</span>`
            ).join(", ");
            addToHistory(`<span class="hist-opp">Soupeř má v ruce:</span> ${cardSpans}`);
        } else {
            addToHistory(`<span class="hist-opp">Soupeř má prázdnou ruku.</span>`);
        }
        return;
    }
    else if (action.type === "stateSync") {
        let p = action.payload;
        let lastAction = p.lastAction;

        applyStateSync(p);

        if (lastAction) {
            if (lastAction.type === "endTurn") {
                // Protivník ukončil tah – spustíme náš tah
                // startPlayerTurn() sám volá emitStateSync a updateUI
                startPlayerTurn();
                return;
            }
            else if (lastAction.type === "attack") {
                // Stav boardů je již aplikovaný, jen přehrajeme animaci
                playRemoteAttackAnimation(lastAction, () => {
                    checkDeaths();
                    updateUI();
                });
                return;
            }
            else if (lastAction.type === "playCard") {
                if (lastAction.cardName) {
                    let cardSpan = lastAction.cardId
                        ? `<span class="hist-card-name" data-id="${lastAction.cardId}">${lastAction.cardName}</span>`
                        : `<b>${lastAction.cardName}</b>`;
                    addToHistory(`<span class="hist-opp">Opp:</span> zahraje ${cardSpan}`);
                }
                SoundFX.play();
                // Eagle (42) nebo Detective (3) — protivník chce vidět naši ruku, pošleme ji
                if (lastAction.cardId === 42 || lastAction.cardId === 3) {
                    emitAction("revealHand", {
                        cards: playerHand.map(c => ({ id: c.id, name: c.name }))
                    });
                }
            }
            // lastAction.type === "startTurn": protivník začal tah, jen updateUI
        }

        checkDeaths();
        updateUI();
    }
}


// ==========================================
// 10. GAME INTERFACE (API pro karty)
// ==========================================
// Tento objekt je předáván do funkcí karet v cards.js (onPlay, onDeath...)
// perspective = "player" | "enemy" — určuje kdo efekt aktivuje.
// "player" v textu karty vždy znamená "ten kdo hraje kartu" (self), "enemy" = protivník.

function makeGameInterface(perspective) {
    // flip(owner) přeloží relativní owner z pohledu karty na absolutní owner v herním stavu.
    // Karta vždy říká "player" = já, "enemy" = soupeř.
    const flip = (owner) => {
        if (perspective === "player") return owner;
        return owner === "player" ? "enemy" : "player";
    };

    const getBoard = (owner) => owner === "player" ? playerBoard : enemyBoard;
    const getHand  = (owner) => owner === "player" ? playerHand  : enemyHandAI;
    const getGrave = (owner) => owner === "player" ? playerGraveyard : enemyGraveyard;
    const getHp    = (owner) => owner === "player" ? playerHp : enemyHp;
    const setHp    = (owner, val) => {
        if (owner === "player") playerHp = val; else enemyHp = val;
    };
    const getMaxHp = (owner) => owner === "player" ? playerMaxHp : enemyMaxHp;

    const self = flip("player"); // absolutní owner "já"
    const opp  = flip("enemy");  // absolutní owner "soupeř"

    const gi = {
        dealDamage: (target, amt) => {
            if (target && typeof target.hp !== 'undefined') target.hp -= amt;
        },
        damageHero: (owner, amt) => {
            const actual = flip(owner);
            setHp(actual, getHp(actual) - amt);
        },
        damageAll: (amt, hitHeroes) => {
            playerBoard.forEach(u => u.hp -= amt);
            enemyBoard.forEach(u => u.hp -= amt);
            if (hitHeroes) { playerHp -= amt; enemyHp -= amt; }
        },
        // "enemies" = soupeřovy jednotky z pohledu toho, kdo kartu hraje
        damageAllEnemies: (amt) => {
            getBoard(opp).forEach(u => u.hp -= amt);
        },
        damageRandomEnemy: (amt) => {
            const oppBoard = getBoard(opp);
            if (oppBoard.length > 0) {
                let t = oppBoard[Math.floor(Math.random() * oppBoard.length)];
                t.hp -= amt;
            } else {
                setHp(opp, getHp(opp) - amt);
            }
        },
        healHero: (owner, amt) => {
            const actual = flip(owner);
            setHp(actual, Math.min(getMaxHp(actual), getHp(actual) + amt));
        },
        addGrit: (owner, amt) => {
            // Mana spravuje jen hráčova strana; AI má vlastní aiMana lokálně v startAITurn
            const actual = flip(owner);
            if (actual === "player") currentMana = Math.min(10, currentMana + amt);
        },
        addMaxGrit: (owner) => {
            const actual = flip(owner);
            if (actual === "player" && maxMana < 10) { maxMana++; currentMana = Math.min(currentMana + 1, maxMana); }
        },
        drawCard: (owner, amt) => {
            const actual = flip(owner);
            for (let i = 0; i < amt; i++) drawCard(actual);
        },
        addCardToHand: (owner, id) => {
            const actual = flip(owner);
            const hand = getHand(actual);
            if (hand.length < 10) hand.push(createCardInstance(id, actual));
        },
        discardCards: (owner, count) => {
            const actual = flip(owner);
            const hand  = getHand(actual);
            const grave = getGrave(actual);
            if (hand.length > 0) {
                let n = Math.min(count, hand.length);
                let idx = Math.floor(Math.random() * hand.length);
                grave.push(...hand.splice(idx, 1));
                if (n > 1) gi.discardCards(owner, n - 1);
            }
        },
        discardAllCards: (owner) => {
            const actual = flip(owner);
            const hand  = getHand(actual);
            const grave = getGrave(actual);
            grave.push(...hand);
            if (actual === "player") playerHand = []; else enemyHandAI = [];
        },
        discardByType: (owner, count, typeName) => {
            const actual = flip(owner);
            const hand  = getHand(actual);
            const grave = getGrave(actual);
            const type = (typeName || "").toLowerCase().replace(/s$/, "");

            let pool;
            if (!type || type === "card") {
                pool = [...hand];
            } else if (type === "token") {
                pool = hand.filter(c => c.isToken === true);
            } else {
                pool = hand.filter(c =>
                    (c.type && c.type.toLowerCase() === type) ||
                    (c.name && c.name.toLowerCase() === type)
                );
            }

            let n = Math.min(count, pool.length);
            for (let i = 0; i < n; i++) {
                if (pool.length === 0) break;
                let ri   = Math.floor(Math.random() * pool.length);
                let card = pool.splice(ri, 1)[0];
                let hi   = hand.indexOf(card);
                if (hi !== -1) grave.push(...hand.splice(hi, 1));
            }
        },
        returnFromGraveyard: (owner) => {
            const actual = flip(owner);
            const grave = getGrave(actual);
            const hand  = getHand(actual);
            let idx = -1;
            for (let i = grave.length - 1; i >= 0; i--) {
                if (grave[i].type === "Unit") { idx = i; break; }
            }
            if (idx > -1 && hand.length < 10) {
                let card = grave.splice(idx, 1)[0];
                card.hp = card.maxHp;
                card.canAttack = false;
                hand.push(card);
            }
        },
        summonFromGraveyard: (owner, faction) => {
            const actual = flip(owner);
            const grave = getGrave(actual);
            const board = getBoard(actual);
            let pool = grave.filter(c => c.type === "Unit" && (!faction || c.faction === faction));
            if (pool.length > 0) {
                let card = pool[Math.floor(Math.random() * pool.length)];
                grave.splice(grave.indexOf(card), 1);
                card.hp = card.maxHp;
                card.canAttack = card.keywords.includes("Ambush");
                if (board.length < 7) board.push(card);
            } else {
                let fallback = CardDB.filter(c => c.type === "Unit" && (!faction || c.faction === faction));
                let pick = fallback[Math.floor(Math.random() * fallback.length)];
                if (pick) gi.summonUnit(pick.id, owner);
            }
        },
        bounceUnit: (unit, toOwner) => {
            const actualTo = flip(toOwner);
            let idx = playerBoard.indexOf(unit);
            if (idx > -1) {
                playerBoard.splice(idx, 1);
            } else {
                idx = enemyBoard.indexOf(unit);
                if (idx > -1) enemyBoard.splice(idx, 1);
            }
            unit.canAttack = false;
            unit.stunned = false;
            const hand = getHand(actualTo);
            if (hand.length < 10) hand.push(unit);
        },
        summonUnit: (id, owner) => {
            const actual = flip(owner);
            let card = createCardInstance(id, actual);
            if (!card) return;
            card.canAttack = card.keywords.includes("Ambush");
            const board = getBoard(actual);
            if (board.length < 7) board.push(card);
        },
        silenceUnit: (unit) => {
            unit.keywords = [];
            unit.text = "Silenced";
            unit.logic = { keywords: [], onPlay: null, onDeath: null, onTurnEnd: null, onTurnStart: null };
        },
        setUnitAttack: (unit, val) => {
            unit.atk = Math.max(0, val);
            unit.baseAtk = unit.atk;
        },
        destroyUnit: (unit) => {
            unit.hp = -99;
        },
        destroyAllUnits: () => {
            playerBoard.forEach(u => u.hp = -99);
            enemyBoard.forEach(u => u.hp = -99);
            checkDeaths();
            updateUI();
        },
        revealEnemyHand: () => {
            const oppHand = getHand(opp);
            if (isSinglePlayer && oppHand.length > 0) {
                const cardSpans = oppHand.map(c =>
                    `<span class="hist-card-name" data-id="${c.id}">${c.name}</span>`
                ).join(", ");
                addToHistory(`<span class="hist-opp">Soupeř má v ruce:</span> ${cardSpans}`);
            } else {
                showNotification("Enemy hand revealed!", 3000);
            }
        },

        // Getters pro karty, které potřebují scanovat stůl
        get board() { return getBoard(self); },
        get enemyBoard() { return getBoard(opp); }
    };
    return gi;
}

// Výchozí interface z pohledu hráče (pro hráčovy karty a onDeath/onTurnEnd/onTurnStart)
const GameInterface = makeGameInterface("player");

// ==========================================
// PACK OPENING
// ==========================================

function showPackOpening(_packId, cardIds) {
    // Cleanup any previous drag listeners
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

    function revealCard(slot, inner) {
        // Brief upward pop before flip
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
            // Extra sound for epic/legendary
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

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup',   onMouseUp);

    showPackOpening._cleanup = function() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup',   onMouseUp);
    };

    // Build card slots
    cards.forEach((card, idx) => {
        const rarity     = card.rarity || 'Common';
        const rarityClass = 'r-' + rarity.toLowerCase();

        const slot  = document.createElement('div');
        slot.className = 'pack-slot';
        slot.style.animation = `packCardEnter 0.5s cubic-bezier(0.34,1.56,0.64,1) ${idx * 0.13}s both`;

        const inner = document.createElement('div');
        inner.className = 'pack-slot-inner';

        // Back
        const back = document.createElement('div');
        back.className = 'pack-slot-back';

        // Face
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