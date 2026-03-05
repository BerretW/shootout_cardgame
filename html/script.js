// ==========================================
// FILE: html/script.js (FINAL VERSION)
// ==========================================

// --- Globální Proměnné ---
let currentMana = 1;
let maxMana = 1;
let playerHand = [];
let playerBoard = [];
let enemyBoard = [];
let enemyHandAI = [];
let enemyHandCount = 0;

let playerHp = 30; 
let playerMaxHp = 30;
let enemyHp = 30;
let enemyMaxHp = 30;

let playerHeroId = null;
let myTurn = false; 
let isSinglePlayer = false; 

let selectedCardIndex = -1;
let selectedAttacker = null; // Jednotka vybraná k útoku
let gameRunning = false;

// --- Inicializace ---
$(document).ready(function() {
    window.addEventListener('message', function(event) {
        let data = event.data;
        if (data.type === "ui") {
            data.status ? $("#game-container").show() : $("#game-container").hide();
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
    });

    document.onkeyup = function (data) {
        if (data.which == 27) $.post('https://shootout_cardgame/exit', JSON.stringify({}));
        else if (data.which == 2) { 
            // Pravé tlačítko myši zruší výběr
            selectedCardIndex = -1; 
            selectedAttacker = null; 
            updateUI(); 
        }
    };
});

function getImgName(card) {
    let safeName = card.name.replace(/ /g, "_");
    return `img/${card.id}_${card.type}_${safeName}.png`;
}

// ---------------------------------------------------------
// 1. VÝBĚR HRDINY & START
// ---------------------------------------------------------

function showHeroSelection(isFirst, oppName) {
    $("#hero-selection").css("display", "flex");
    $("#hero-list").empty();
    CardDB.filter(c => c.type === "Hero").forEach(hero => {
        let el = $(`
            <div class="hero-option">
                <img src="${getImgName(hero)}" style="width:180px; height:250px; border-radius:12px; object-fit:cover;">
                <div style="text-align:center; margin-top:10px; font-weight:bold; color:gold;">${hero.name}</div>
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
    // Reset
    currentMana = 1; maxMana = 1;
    playerHand = []; playerBoard = []; enemyBoard = []; enemyHandAI = [];
    selectedCardIndex = -1; selectedAttacker = null;
    
    // Player Setup
    playerHeroId = chosenHero.id;
    playerHp = chosenHero.hp; playerMaxHp = chosenHero.hp;
    $("#player-name").text(chosenHero.name);
    $("#player-hero").css("background-image", `url('${getImgName(chosenHero)}')`);

    // Enemy Setup (Bot)
    let enemyHero = null;
    if (isSinglePlayer) {
        // Vyber náhodného hrdinu jiného než má hráč
        let heroes = CardDB.filter(c => c.type === "Hero" && c.id !== playerHeroId);
        enemyHero = heroes[Math.floor(Math.random() * heroes.length)];
    } else {
        // MP Placeholder (TODO: poslat data o hrdinovi ze serveru)
        enemyHero = CardDB.find(c => c.id === 81); 
    }
    
    enemyHp = enemyHero.hp; enemyMaxHp = enemyHero.hp;
    $("#opp-name").text(oppName);
    $("#opp-hero").css("background-image", `url('${getImgName(enemyHero)}')`);

    myTurn = isFirst;
    $("#game-message").text(myTurn ? "YOUR TURN" : "ENEMY TURN");
    $("#end-turn-btn").prop("disabled", !myTurn);

    // Lízání
    for(let i=0; i<4; i++) drawCard("player");
    if (isSinglePlayer) for(let i=0; i<4; i++) drawCard("enemy");
    
    updateUI();
}

// ---------------------------------------------------------
// 2. CORE LOGIC (TAHY)
// ---------------------------------------------------------

// Start hráčova kola
function startPlayerTurn() {
    myTurn = true;
    if(maxMana < 10) maxMana++;
    currentMana = maxMana;
    drawCard("player");
    
    // --- PROBUZENÍ JEDNOTEK ---
    playerBoard.forEach(u => {
        if (u.type === "Unit") u.canAttack = true; 
    });
    
    $("#game-message").text("YOUR TURN");
    $("#end-turn-btn").prop("disabled", false);
    recalculateAuras();
    updateUI();
}

// Konec hráčova kola
function endTurn() {
    if (!myTurn) return;
    myTurn = false;
    
    playerBoard.forEach(u => {
        if (u.logic.onTurnEnd) u.logic.onTurnEnd(GameInterface, u);
    });

    $("#game-message").text("ENEMY TURN");
    $("#end-turn-btn").prop("disabled", true);
    selectedAttacker = null; selectedCardIndex = -1;
    
    emitAction("endTurn", {});
    recalculateAuras();
    updateUI(); // Aktualizovat stavy (všechny mé karty zešednou/exhausted)

    if (isSinglePlayer) setTimeout(startAITurn, 1500);
}

// ---------------------------------------------------------
// 3. INTERAKCE (KLIKÁNÍ)
// ---------------------------------------------------------

function handleCardClick(index) {
    if (!myTurn) return;
    let card = playerHand[index];
    
    if (selectedCardIndex === index) { selectedCardIndex = -1; updateUI(); return; }
    if (card.cost > currentMana) return;

    const needsTarget = (
        (card.type === "Spell" && (card.text.includes("damage") || card.text.includes("Give") || card.text.includes("deal"))) ||
        (card.type === "Gear") ||
        (card.logic.onPlay && card.text.includes("target"))
    );

    if (needsTarget) {
        selectedCardIndex = index;
        selectedAttacker = null;
        updateUI();
    } else {
        playCard(index, null);
    }
}

function handleUnitClick(unit, isEnemy) {
    // 1. Hraní karty z ruky
    if (selectedCardIndex > -1) {
        if (isEnemy && unit.keywords.includes("Stealth")) return; 
        playCard(selectedCardIndex, unit);
        selectedCardIndex = -1;
        return;
    }

    // 2. Útočení
    if (!myTurn) return;

    // A) Klik na vlastní (výběr útočníka)
    if (!isEnemy) {
        if (unit.type === "Unit" && unit.canAttack) {
            selectedAttacker = (selectedAttacker === unit) ? null : unit;
            updateUI();
        }
        return;
    }

    // B) Klik na nepřítele (útok)
    if (isEnemy && selectedAttacker) {
        if (unit.keywords.includes("Stealth")) return;
        if (!checkGuardian(unit)) return; // Musí útočit na Guardiana

        let attackerIdx = playerBoard.indexOf(selectedAttacker);
        let targetIdx = enemyBoard.indexOf(unit);
        performAttack(attackerIdx, targetIdx, false);
        selectedAttacker = null;
    }
}

function handleEnemyHeroClick() {
    if (selectedCardIndex > -1) {
        playCard(selectedCardIndex, "hero");
        selectedCardIndex = -1;
        return;
    }
    if (selectedAttacker) {
        if (enemyBoard.some(u => u.keywords.includes("Guardian"))) return;
        let attackerIdx = playerBoard.indexOf(selectedAttacker);
        performAttack(attackerIdx, -1, true);
        selectedAttacker = null;
    }
}

// ---------------------------------------------------------
// 4. GAME ACTIONS
// ---------------------------------------------------------

function playCard(index, target) {
    let card = playerHand[index];
    
    let targetInfo = null;
    if (target && typeof target !== "string") {
        let isMyUnit = playerBoard.includes(target);
        targetInfo = {
            index: isMyUnit ? playerBoard.indexOf(target) : enemyBoard.indexOf(target),
            type: isMyUnit ? "playerUnit" : "enemyUnit"
        };
    } else if (target === "hero") targetInfo = { type: "hero", index: 0 };

    currentMana -= card.cost;
    playerHand.splice(index, 1);

    if (card.type === "Unit" || card.type === "Landmark") {
        playerBoard.push(card);
        
        // --- SUMMONING SICKNESS ---
        card.canAttack = false; 
        if (card.keywords.includes("Ambush")) card.canAttack = true;

        if (card.logic.onPlay) card.logic.onPlay(GameInterface, card, target);
    } else if (card.type === "Spell" || card.type === "Gear") {
        if (card.logic.onPlay) card.logic.onPlay(GameInterface, card, target);
    }

    emitAction("playCard", { cardId: card.id, targetIndex: targetInfo?.index, targetType: targetInfo?.type });
    recalculateAuras();
    checkDeaths();
    updateUI();
}

function performAttack(myUnitIndex, targetUnitIndex, isTargetHero) {
    let attacker = playerBoard[myUnitIndex];
    attacker.canAttack = false; // Vyčerpání

    if (isTargetHero) enemyHp -= attacker.atk;
    else {
        let defender = enemyBoard[targetUnitIndex];
        performCombat(attacker, defender);
    }
    
    emitAction("attack", { attackerIndex: myUnitIndex, targetIndex: isTargetHero ? -1 : targetUnitIndex, targetType: isTargetHero ? "hero" : "playerUnit" });
    checkDeaths();
    updateUI();
}

// ---------------------------------------------------------
// 5. AI LOGIC
// ---------------------------------------------------------

function startAITurn() {
    if (maxMana < 10) maxMana++; // Bot mana sync (simplified)
    let aiMana = maxMana;
    drawCard("enemy");
    enemyBoard.forEach(u => u.canAttack = true);
    updateUI();

    let playInterval = setInterval(() => {
        let playableIdx = enemyHandAI.findIndex(c => c.cost <= aiMana && c.type !== "Gear");
        if (playableIdx > -1 && enemyBoard.length < 7) {
            let card = enemyHandAI[playableIdx];
            aiMana -= card.cost;
            enemyHandAI.splice(playableIdx, 1);
            
            if (card.type === "Unit" || card.type === "Landmark") {
                enemyBoard.push(card);
                if (card.keywords.includes("Ambush")) card.canAttack = true;
                if (card.logic.onPlay) {
                    // Simple AI Target
                    let target = playerBoard.length > 0 ? playerBoard[0] : null; 
                    card.logic.onPlay(GameInterface, card, target);
                }
            } else if (card.type === "Spell") {
                if (card.logic.onPlay) card.logic.onPlay(GameInterface, card, playerBoard[0]);
            }
            recalculateAuras();
            updateUI();
        } else {
            clearInterval(playInterval);
            setTimeout(aiAttackPhase, 1000);
        }
    }, 1200);
}

function aiAttackPhase() {
    enemyBoard.forEach((attacker) => {
        if (attacker.canAttack && attacker.atk > 0 && attacker.type === "Unit") {
            attacker.canAttack = false;
            let target = null;
            let tauntUnit = playerBoard.find(u => u.keywords.includes("Guardian"));
            
            if (tauntUnit) target = tauntUnit;
            else if (playerHp < 10) target = "hero";
            else target = (playerBoard.length > 0 && Math.random() > 0.5) ? playerBoard[Math.floor(Math.random()*playerBoard.length)] : "hero";
            
            if (target === "hero") playerHp -= attacker.atk;
            else performCombat(attacker, target);
        }
    });
    
    checkDeaths();
    updateUI();
    setTimeout(startPlayerTurn, 1000); // Předání tahu hráči
}

// ---------------------------------------------------------
// 6. RENDERING & UTILS
// ---------------------------------------------------------

function updateUI() {
    $("#player-mana").html(`💎 ${currentMana} / ${maxMana}`);
    $("#opp-mana").html(`💎 ${isSinglePlayer ? maxMana : "?"} / ${isSinglePlayer ? maxMana : "?"}`);
    $("#player-hero .hp-badge").text(playerHp);
    $("#opp-hero .hp-badge").text(enemyHp);

    // Player Hand
    $("#player-hand").empty();
    playerHand.forEach((card, index) => {
        let cardHTML = createCardHTML(card, "hand");
        let el = $(cardHTML);
        if (card.cost <= currentMana && myTurn) el.addClass("playable");
        if (index === selectedCardIndex) el.addClass("card-selected");
        el.click(() => handleCardClick(index));
        el.attr("title", card.text); 
        $("#player-hand").append(el);
    });

    // Boards
    renderBoard($("#player-board"), playerBoard, false);
    renderBoard($("#opp-board"), enemyBoard, true);
    
    // Enemy Hand
    $("#opp-hand").empty();
    let count = isSinglePlayer ? enemyHandAI.length : getEnemyHandCount();
    for(let i=0; i<count; i++) $("#opp-hand").append(`<div class="card-back"></div>`);

    $("#opp-hero").off("click").on("click", handleEnemyHeroClick);
}

function renderBoard(container, boardData, isEnemy) {
    container.empty();
    boardData.forEach((card) => {
        let el = $(createCardHTML(card, "board"));
        
        if (card.keywords.includes("Guardian")) el.addClass("guardian-glow");
        if (card.keywords.includes("Stealth")) el.addClass("stealth-visual");

        // Stavy pro hráče (zelená/šedá/červená)
        if (!isEnemy && card.type === "Unit") {
            if (card.canAttack && myTurn) el.addClass("card-ready"); // Zelená
            else el.addClass("card-exhausted"); // Šedá (summoning sickness / attacked)
        }
        if (selectedAttacker === card) {
            el.removeClass("card-ready").addClass("card-attacker");
        }

        el.click(() => handleUnitClick(card, isEnemy));
        container.append(el);
    });
}

function createCardHTML(card, context) {
    let imgPath = getImgName(card);
    let stats = "";
    
    if (card.type !== "Spell" && card.type !== "Gear") {
        let showAtk = (card.atk !== card.baseAtk);
        let atkClass = showAtk ? (card.atk > card.baseAtk ? "stat-changed-buff" : "stat-changed-dmg") : "stat-hidden";
        let showHp = (card.hp !== card.baseHp || card.hp < card.maxHp);
        let hpClass = showHp ? (card.hp < card.maxHp ? "stat-changed-dmg" : "stat-changed-buff") : "stat-hidden";

        stats = `<div class="stat-box atk ${atkClass}">${card.atk}</div><div class="stat-box hp ${hpClass}">${card.hp}</div>`;
    }
    let costHtml = context === "hand" ? `<div class="stat-box cost">${card.cost}</div>` : "";
    return `<div class="card"><img class="card-img" src="${imgPath}" onerror="this.src='https://via.placeholder.com/153x250?text=${card.name}'">${costHtml}${stats}</div>`;
}

// ... Zbytek pomocných funkcí (performCombat, checkDeaths, createCardInstance atd.) ...
// Aby byl kód kompletní, vlož sem prosím zbytek funkcí ze spodní části minulé odpovědi (jsou stejné).
// Zde je pro jistotu znovu createCardInstance a getCardLogic
function createCardInstance(cardId, owner) {
    let template = CardDB.find(c => c.id === cardId); if(!template) return null;
    return { 
        ...template, instanceId: Date.now()+Math.random(), owner: owner, 
        hp: template.hp, maxHp: template.hp, baseHp: template.hp, 
        atk: template.atk, baseAtk: template.atk, 
        logic: getCardLogic(template), keywords: getCardLogic(template).keywords || [], canAttack: false 
    };
}
function getCardLogic(cardData) {
    let logic = { keywords: [], onPlay: null }; 
    const text = cardData.text ? cardData.text.toLowerCase() : "";
    if (text.includes("guardian")) logic.keywords.push("Guardian");
    if (text.includes("ambush")) logic.keywords.push("Ambush");
    if (text.includes("stealth")) logic.keywords.push("Stealth");
    if (text.includes("lethal")) logic.keywords.push("Lethal");
    if (text.includes("battlecry") || cardData.type === "Spell" || cardData.type === "Gear") {
        logic.onPlay = function(game, selfCard, target) {
            // Zjednodušená logika pro damage/buff
            if (text.includes("damage") && target && target.hp) game.dealDamage(target, 2); // Placeholder dmg
        };
    }
    return logic;
}
function performCombat(unitA, unitB) {
    unitB.hp -= unitA.atk; unitA.hp -= unitB.atk;
    if (unitA.keywords.includes("Lethal")) unitB.hp = -99;
    if (unitB.keywords.includes("Lethal")) unitA.hp = -99;
}
function checkDeaths() {
    playerBoard = playerBoard.filter(u => u.hp > 0);
    enemyBoard = enemyBoard.filter(u => u.hp > 0);
    if (playerHp <= 0) alert("DEFEAT"); if (enemyHp <= 0) alert("VICTORY");
}
function drawCard(who) {
    let randomId = CardDB[Math.floor(Math.random() * CardDB.length)].id;
    let newCard = createCardInstance(randomId, who);
    if (who === "player") { if(playerHand.length < 10) playerHand.push(newCard); }
    else { if(isSinglePlayer) enemyHandAI.push(newCard); }
    updateUI();
}
function recalculateAuras() { /* Landmark logic placeholder */ }
function checkGuardian(targetUnit) { if (targetUnit.keywords.includes("Guardian")) return true; if (enemyBoard.some(u => u.keywords.includes("Guardian"))) return false; return true; }
function emitAction(t,p) { if(!isSinglePlayer) $.post('https://shootout_cardgame/sendAction', JSON.stringify({type:t,payload:p})); }
function handleRemoteAction(d) { let p = d.payload; if(d.type==="endTurn") startPlayerTurn(); else if(d.type==="playCard") { /*...*/ } } // Simplified for SP focus
function getEnemyHandCount() { return $("#opp-hand").children().length; }
// ==========================================
// GAME INTERFACE (Funkce volané kartami)
// ==========================================
const GameInterface = {
    // Základní poškození
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
    drawCard: (owner, amt) => { 
        for(let i=0; i<amt; i++) drawCard(owner); 
    },
    addCardToHand: (owner, id) => {
        if(owner==="player" && playerHand.length < 10) {
            playerHand.push(createCardInstance(id, "player"));
        }
    },

    // --- UFO: DESTROY ALL UNITS ---
    destroyAllUnits: () => {
        // Nastavíme HP na -99, checkDeaths() je pak odstraní
        playerBoard.forEach(u => u.hp = -99);
        enemyBoard.forEach(u => u.hp = -99);
        // Okamžitě zkontrolovat smrt
        checkDeaths();
        updateUI();
    },

    // --- EAGLE: REVEAL HAND ---
    revealEnemyHand: () => {
        if (isSinglePlayer) {
            // V Singlu známe ruku bota (enemyHandAI)
            showRevealedCards(enemyHandAI);
        } else {
            // V Multiplayeru klient nezná karty soupeře.
            // Zde by musel být server call. Prozatím simulujeme/hláška.
            alert("Reveal Hand funguje plně jen v Singleplayeru (MP vyžaduje server sync).");
        }
    },
    
    // Potřeba pro aury a iterace
    get board() { return playerBoard; } 
};

// Pomocná funkce pro zobrazení karet (Eagle/Detective)
function showRevealedCards(cards) {
    // Vytvoříme overlay
    let overlay = $(`<div id="reveal-overlay" style="
        position:fixed; top:0; left:0; width:100%; height:100%;
        background:rgba(0,0,0,0.8); z-index:3000;
        display:flex; justify-content:center; align-items:center; flex-direction:column;
    "></div>`);
    
    let title = $(`<h1 style="color:white; font-family:'Western'; margin-bottom:20px;">ENEMY HAND REVEALED</h1>`);
    let cardContainer = $(`<div style="display:flex; gap:15px;"></div>`);
    
    cards.forEach(card => {
        // Použijeme existující createCardHTML, ale vynutíme kontext, aby byly vidět staty
        let cardEl = $(createCardHTML(card, "hand")); 
        cardEl.css("transform", "scale(1.2)"); // Trochu zvětšit
        cardContainer.append(cardEl);
    });
    
    let closeBtn = $(`<button style="
        margin-top:40px; padding:10px 30px; font-size:20px; cursor:pointer;
        background:#5d4037; color:white; border:2px solid gold; font-family:'Western';
    ">CLOSE</button>`);
    
    closeBtn.click(() => overlay.remove());
    
    overlay.append(title).append(cardContainer).append(closeBtn);
    $("body").append(overlay);
    
    // Automaticky zavřít po 5 sekundách
    setTimeout(() => overlay.remove(), 5000);
}