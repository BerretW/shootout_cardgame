// ==========================================
// FILE: html/script.js (COMPLETE FINAL VERSION)
// ==========================================

// --- Globální Proměnné ---
let currentMana = 1;
let maxMana = 1;

let playerHand = [];
let playerBoard = [];
let playerDeckCount = 26; // Visual only

let enemyHandAI = [];
let enemyBoard = [];
let enemyDeckCount = 26;

// Životy
let playerHp = 30; 
let playerMaxHp = 30;
let enemyHp = 30;
let enemyMaxHp = 30;

// Stavy hry
let myTurn = false; 
let isSinglePlayer = false; 
let gameEnded = false;

// Hřbitovy
let playerGraveyard = [];
let enemyGraveyard = [];

// Interakce
let selectedCardIndex = -1;
let selectedAttacker = null; // Jednotka vybraná k útoku

// ==========================================
// 1. INICIALIZACE A KOMUNIKACE (NUI)
// ==========================================

$(document).ready(function() {
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
            isSinglePlayer = false;
            showHeroSelection(data.isFirst, data.opponentName);
        }
        else if (data.type === "start_singleplayer") {
            isSinglePlayer = true;
            showHeroSelection(true, "Training Bot");
        }
        else if (data.type === "enemy_action") {
            if (!isSinglePlayer) handleRemoteAction(data.action);
        }
        else if (data.type === "game_over") {
            showNotification(data.message, 4000);
            setTimeout(exitGame, 4000);
        }
    });

    // Klávesové zkratky
    document.onkeyup = function (data) {
        if (data.which == 27) { // ESC
            exitGame();
        }
        else if (data.which == 2) { // Pravé tlačítko myši (volitelné, v NUI to bývá jinak, ale pro web debug)
            cancelSelection();
        }
    };
    
    // Kliknutí mimo zruší výběr (pokud neklikáme na kartu nebo hrdinu)
    $(document).mousedown(function(e) {
        const t = $(e.target);
        if (!t.closest('.card').length &&
            !t.closest('#end-turn-btn').length &&
            !t.closest('.hero-portrait').length) {
            cancelSelection();
        }
    });
});

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

function exitGame() {
    // Odeslat info do LUA, že končíme
    $.post('https://berretw-shootout_cardgame/exit', JSON.stringify({}));
    $("#game-container").hide();
    $("#result-overlay").hide();
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

    // Vyfiltrujeme jen Hero karty
    let heroes = CardDB.filter(c => c.type === "Hero");
    
    heroes.forEach(hero => {
        let el = $(`
            <div class="hero-option">
                <img src="${getImgName(hero)}" style="width:160px; height:240px; object-fit:cover;">
                <div style="margin-top:10px; color:gold; font-family:'Western'; font-size:18px;">${hero.name}</div>
            </div>
        `);
        el.click(() => {
            $("#hero-selection").hide();
            initGame(isFirst, oppName, hero);
        });
        $("#hero-list").append(el);
    });
}

function initGame(isFirst, oppName, chosenHero) {
    // Reset proměnných
    currentMana = 1; maxMana = 1;
    playerHand = []; playerBoard = [];
    enemyBoard = []; enemyHandAI = [];
    playerGraveyard = []; enemyGraveyard = [];
    selectedCardIndex = -1; selectedAttacker = null;
    gameEnded = false;
    
    // Nastavení Hráče
    playerHp = chosenHero.hp; 
    playerMaxHp = chosenHero.hp;
    $("#player-name").text(chosenHero.name);
    $("#player-hero").css("background-image", `url('${getImgName(chosenHero)}')`);

    // Nastavení Oponenta (Bot nebo Hráč)
    // Pokud je SP, vybereme náhodného oponenta
    let enemyHero = CardDB.filter(c => c.type === "Hero" && c.id !== chosenHero.id)[0] || CardDB[80];
    
    enemyHp = enemyHero.hp; 
    enemyMaxHp = enemyHero.hp;
    $("#opp-name").text(oppName);
    $("#opp-hero").css("background-image", `url('${getImgName(enemyHero)}')`);

    // Nastavení tahu
    myTurn = isFirst;
    $("#game-message").text(myTurn ? "YOUR TURN" : "ENEMY TURN");
    $("#end-turn-btn").prop("disabled", !myTurn);

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
            u.canAttack = true;
            u.attacksRemaining = u.maxAttacks || 1;
        }
        // Stun vyprší (byl nastaven během nepřátelského tahu)
        // (enemy stun se resetuje v aiAttackPhase)

        // Start of Turn efekty Landmarků (VOODOO ALTAR, TRAIN STATION)
        if (u.logic && u.logic.onTurnStart) u.logic.onTurnStart(GameInterface, u);
    });

    // Reset stunu na nepřátelských jednotkách (HANDCUFFS vliv vypršel)
    enemyBoard.forEach(u => {
        if (u.stunned) u.stunned = false;
    });

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
    
    // Odeslání akce serveru (pokud MP)
    emitAction("endTurn", {});
    
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

    // Výjimky pro globální spelly (Dynamite, Bar Fight), které cíl nepotřebují
    const isGlobal = text.includes("all units") || text.includes("all characters") || text.includes("random");
    
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
    return cost;
}

function playCard(index, target) {
    let card = playerHand[index];

    // Odečíst manu (s případnou slevou)
    currentMana -= getCardCost(card);
    
    // Odstranit z ruky
    playerHand.splice(index, 1);

    // Zpracování Targetu pro síťovou komunikaci
    let targetInfo = null;
    if (target && typeof target !== "string") {
        let isMyUnit = playerBoard.includes(target);
        targetInfo = {
            index: isMyUnit ? playerBoard.indexOf(target) : enemyBoard.indexOf(target),
            type: isMyUnit ? "playerUnit" : "enemyUnit"
        };
    } else if (target === "hero") {
        targetInfo = { type: "hero", index: 0 };
    }

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

    // Síťová synchronizace (MP)
    emitAction("playCard", { 
        cardId: card.id, 
        targetIndex: targetInfo?.index, 
        targetType: targetInfo?.type 
    });

    checkDeaths();
    updateUI();
}

function performAttack(myUnitIndex, targetUnitIndex, isTargetHero) {
    let attacker = playerBoard[myUnitIndex];

    // Gunslinger: sledujeme zbývající útoky
    attacker.attacksRemaining = (attacker.attacksRemaining || 1) - 1;
    if (attacker.attacksRemaining <= 0) attacker.canAttack = false;

    let dmgDealt = attacker.atk;

    if (isTargetHero) {
        enemyHp -= dmgDealt;
        // Vampire: lifesteal při útoku na hrdinu
        if (attacker.id === 17) playerHp = Math.min(playerMaxHp, playerHp + dmgDealt);
    } else {
        let defender = enemyBoard[targetUnitIndex];

        defender.hp -= dmgDealt;

        // Sniper: immune while attacking (nedostane zpět poškození)
        let sniperImmune = attacker.text && attacker.text.toLowerCase().includes("immune while attacking");
        if (!sniperImmune) attacker.hp -= defender.atk;

        // Lethal
        if (attacker.keywords.includes("Lethal")) defender.hp = -99;
        if (defender.keywords.includes("Lethal")) attacker.hp = -99;

        // Vampire: lifesteal při útoku do jednotky
        if (attacker.id === 17) playerHp = Math.min(playerMaxHp, playerHp + dmgDealt);
    }

    // Sync
    emitAction("attack", {
        attackerIndex: myUnitIndex,
        targetIndex: isTargetHero ? -1 : targetUnitIndex,
        targetType: isTargetHero ? "hero" : "enemyUnit"
    });

    checkDeaths();
    updateUI();
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
    } else {
        $("#result-title").text("DEFEAT").css("color", "#8b0000");
        $("#result-desc").text("Looks like this is the end of the line.");
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
            
            // Trigger Battlecry (zjednodušeně, AI vždy cílí hráče nebo náhodnou jednotku)
            if (card.logic.onPlay) {
                let target = playerBoard.length > 0 ? playerBoard[0] : null;
                card.logic.onPlay(GameInterface, card, target);
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
    const hasTotemPole  = playerBoard.some(b => b.id === 65);
    const hasGangLeader = playerBoard.some(b => b.id === 35);
    const hasHideout    = playerBoard.some(b => b.id === 64);
    const hasGallows    = playerBoard.some(b => b.id === 68);

    playerBoard.forEach(u => {
        // --- ATK aura ---
        let newAuraAtk = 0;
        if (hasTotemPole && u.faction === "Wild") newAuraAtk += 1;
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
    $("#deck-count").text(Math.max(0, 26 - (maxMana * 1))); // Falešný counter decku

    // --- RENDER PLAYER HAND ---
    $("#player-hand").empty();
    playerHand.forEach((card, index) => {
        let el = $(createCardHTML(card, "hand"));
        
        // Stavy v ruce
        if (getCardCost(card) <= currentMana && myTurn) el.addClass("card-playable");
        if (index === selectedCardIndex) el.addClass("card-selected");
        
        el.click(() => handleCardClick(index));
        el.on("mouseenter", () => showCardTooltip(card));
        el.on("mouseleave", hideCardTooltip);

        $("#player-hand").append(el);
    });

    // --- RENDER BOARDS ---
    renderBoard($("#player-board"), playerBoard, false);
    renderBoard($("#opp-board"), enemyBoard, true);
    
    // --- RENDER ENEMY HAND ---
    $("#opp-hand").empty();
    let count = isSinglePlayer ? enemyHandAI.length : 5; // V MP nevidíme počet přesně bez syncu, 5 je placeholder
    for(let i=0; i<count; i++) {
        $("#opp-hand").append(`<div class="card-back"></div>`);
    }

    // Zvýraznění enemy hrdiny jako cíle útoku
    const heroAttackable = selectedAttacker && myTurn &&
        !enemyBoard.some(u => u.keywords.includes("Guardian"));
    $("#opp-hero").toggleClass("hero-targetable", !!heroAttackable);

    // Bind event na enemy hrdinu (pro útok/target)
    $("#opp-hero").off("click").on("click", handleEnemyHeroClick);
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

        el.click(() => handleUnitClick(card, isEnemy));
        el.on("mouseenter", () => showCardTooltip(card));
        el.on("mouseleave", hideCardTooltip);
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
    $("#card-tooltip").show();
}

function hideCardTooltip() {
    $("#card-tooltip").hide();
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

function drawCard(owner) {
    if (owner === "player") {
        if (playerHand.length >= 10) return; // Ruka plná
        let randomId = Math.floor(Math.random() * 84) + 1;
        let card = createCardInstance(randomId, "player");
        if (card) playerHand.push(card);
    } else if (owner === "enemy") {
        if (enemyHandAI.length >= 10) return;
        let randomId = Math.floor(Math.random() * 84) + 1;
        let card = createCardInstance(randomId, "enemy");
        if (card) enemyHandAI.push(card);
    }
}

function createCardInstance(cardId, owner) {
    let template = CardDB.find(c => c.id === cardId); 
    if(!template) return null;
    
    // Rekurzivní ochrana proti Hero/Token kartám v balíčku
    if (template.type === "Hero" || template.type === "Token") return createCardInstance(Math.floor(Math.random()*60)+1, owner);

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

function handleRemoteAction(data) {
    // Jednoduchá implementace pro MP demo
    if (data.type === "endTurn") {
        startPlayerTurn();
    } 
    // V plné verzi by zde byla replikace PlayCard, Attack atd.
}


// ==========================================
// 10. GAME INTERFACE (API pro karty)
// ==========================================
// Tento objekt je předáván do funkcí karet v cards.js (onPlay, onDeath...)

const GameInterface = {
    dealDamage: (target, amt) => {
        if(target && typeof target.hp !== 'undefined') target.hp -= amt;
    },
    damageHero: (owner, amt) => {
        if(owner==="player") playerHp -= amt; else enemyHp -= amt;
    },
    damageAll: (amt, hitHeroes) => {
        playerBoard.forEach(u => u.hp -= amt);
        enemyBoard.forEach(u => u.hp -= amt);
        if(hitHeroes) { playerHp -= amt; enemyHp -= amt; }
    },
    damageAllEnemies: (amt) => {
        enemyBoard.forEach(u => u.hp -= amt);
    },
    damageRandomEnemy: (amt) => {
        if(enemyBoard.length > 0) {
            let t = enemyBoard[Math.floor(Math.random()*enemyBoard.length)];
            t.hp -= amt;
        } else {
            enemyHp -= amt;
        }
    },
    healHero: (owner, amt) => {
        if(owner==="player") playerHp = Math.min(playerMaxHp, playerHp + amt);
    },
    addGrit: (owner, amt) => {
        if(owner==="player") currentMana = Math.min(10, currentMana + amt);
    },
    addMaxGrit: (owner) => {
        if(owner==="player" && maxMana < 10) { maxMana++; currentMana = Math.min(currentMana + 1, maxMana); }
    },
    drawCard: (owner, amt) => {
        for(let i=0; i<amt; i++) drawCard(owner);
    },
    addCardToHand: (owner, id) => {
        if(owner==="player" && playerHand.length < 10) {
            playerHand.push(createCardInstance(id, "player"));
        }
    },
    discardCards: (owner, count) => {
        if(owner==="player" && playerHand.length > 0) {
            let n = Math.min(count, playerHand.length);
            let idx = Math.floor(Math.random() * playerHand.length);
            playerGraveyard.push(...playerHand.splice(idx, 1));
            if(n > 1) GameInterface.discardCards(owner, n - 1);
        }
    },
    discardAllCards: (owner) => {
        if(owner==="player") { playerGraveyard.push(...playerHand); playerHand = []; }
    },
    returnFromGraveyard: (owner) => {
        // Vrátí posledně mrtvou unit z hřbitova do ruky (s plným HP)
        if (owner === "player") {
            let idx = -1;
            for (let i = playerGraveyard.length - 1; i >= 0; i--) {
                if (playerGraveyard[i].type === "Unit") { idx = i; break; }
            }
            if (idx > -1 && playerHand.length < 10) {
                let card = playerGraveyard.splice(idx, 1)[0];
                card.hp = card.maxHp;
                card.canAttack = false;
                playerHand.push(card);
            }
        }
    },
    summonFromGraveyard: (owner, faction) => {
        // Svolá náhodnou unit dané frakce z hřbitova (nebo random novou, pokud prázdný)
        if (owner === "player") {
            let pool = playerGraveyard.filter(c => c.type === "Unit" && (!faction || c.faction === faction));
            if (pool.length > 0) {
                let card = pool[Math.floor(Math.random() * pool.length)];
                playerGraveyard.splice(playerGraveyard.indexOf(card), 1);
                card.hp = card.maxHp;
                card.canAttack = card.keywords.includes("Ambush");
                if (playerBoard.length < 7) playerBoard.push(card);
            } else {
                // Fallback: náhodná unit z CardDB
                let fallback = CardDB.filter(c => c.type === "Unit" && (!faction || c.faction === faction));
                let pick = fallback[Math.floor(Math.random() * fallback.length)];
                if (pick) GameInterface.summonUnit(pick.id, "player");
            }
        }
    },
    bounceUnit: (unit, toOwner) => {
        // Odeber ze stolu
        let idx = playerBoard.indexOf(unit);
        if(idx > -1) {
            playerBoard.splice(idx, 1);
        } else {
            idx = enemyBoard.indexOf(unit);
            if(idx > -1) enemyBoard.splice(idx, 1);
        }
        // Vrať do ruky
        unit.canAttack = false;
        unit.stunned = false;
        if(toOwner === "player" && playerHand.length < 10) {
            playerHand.push(unit);
        } else if(toOwner === "enemy" && enemyHandAI.length < 10) {
            enemyHandAI.push(unit);
        }
    },
    summonUnit: (id, owner) => {
        let card = createCardInstance(id, owner);
        if(!card) return;
        card.canAttack = card.keywords.includes("Ambush");
        if(owner === "player" && playerBoard.length < 7) {
            playerBoard.push(card);
        } else if(owner === "enemy" && enemyBoard.length < 7) {
            enemyBoard.push(card);
        }
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
        if (isSinglePlayer) {
            let names = enemyHandAI.map(c => c.name).join(", ");
            showNotification("Enemy hand: " + names, 5000);
        } else {
            showNotification("Enemy hand revealed!", 3000);
        }
    },

    // Getters pro karty, které potřebují scanovat stůl
    get board() { return playerBoard; },
    get enemyBoard() { return enemyBoard; }
};