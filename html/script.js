// ==========================================
// FILE: html/script.js (UPDATED & SMOOTH)
// ==========================================

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
let selectedAttacker = null;
let gameRunning = false;

// Inicializace
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
        else if (data.which == 2) { selectedCardIndex = -1; selectedAttacker = null; updateUI(); }
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
    let heroes = CardDB.filter(c => c.type === "Hero");

    heroes.forEach(hero => {
        let el = $(`
            <div class="hero-option">
                <img src="${getImgName(hero)}" style="width:180px; height:250px; border-radius:12px;">
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

    // Enemy Setup (Bot Hero)
    let enemyHeroTemplate = null;
    if (isSinglePlayer) {
        let heroes = CardDB.filter(c => c.type === "Hero" && c.id !== playerHeroId);
        enemyHeroTemplate = heroes[Math.floor(Math.random() * heroes.length)];
    } else {
        // V MP zatím default, protože server neposílá ID hrdiny soupeře (TODO)
        enemyHeroTemplate = CardDB.find(c => c.id === 81); // Belle Starr default
    }

    enemyHp = enemyHeroTemplate.hp; enemyMaxHp = enemyHeroTemplate.hp;
    $("#opp-name").text(isSinglePlayer ? "Bot: " + enemyHeroTemplate.name : oppName);
    $("#opp-hero").css("background-image", `url('${getImgName(enemyHeroTemplate)}')`);

    // Turn Setup
    myTurn = isFirst;
    $("#game-message").text(myTurn ? "YOUR TURN" : "ENEMY TURN");
    $("#end-turn-btn").prop("disabled", !myTurn);

    // Draw Hands
    for(let i=0; i<4; i++) drawCard("player");
    if (isSinglePlayer) for(let i=0; i<4; i++) drawCard("enemy");
    
    updateUI();
}

// ---------------------------------------------------------
// 2. CORE LOGIC
// ---------------------------------------------------------

function endTurn() {
    if (!myTurn) return;
    myTurn = false;
    
    // End Turn Effects
    [...playerBoard].forEach(u => {
        if (u.logic.onTurnEnd) u.logic.onTurnEnd(GameInterface, u);
    });

    $("#game-message").text("ENEMY TURN");
    $("#end-turn-btn").prop("disabled", true);
    selectedAttacker = null; selectedCardIndex = -1;
    
    emitAction("endTurn", {});
    
    // Aury se přepočítají na konci kola
    recalculateAuras();

    if (isSinglePlayer) setTimeout(startAITurn, 1500);
}

// Funkce pro Aury (Landmarky) - volá se při každé změně boardu
function recalculateAuras() {
    // Reset temporary buffs
    [...playerBoard, ...enemyBoard].forEach(u => {
        u.atk = u.baseAtk;
        u.maxHp = u.baseHp; 
        // Pozor: U HP je to složitější, protože zranění musí zůstat. 
        // Pro zjednodušení aury zatím jen přidávají buff k current statům
        // V plné hře by to chtělo systém vrstev (Base -> Permanent Buffs -> Auras)
    });

    // Aplikace Player Auras
    playerBoard.filter(c => c.type === "Landmark").forEach(lm => {
        if (lm.name === "COURTHOUSE") { // Hardcoded logic example
            playerBoard.filter(u => u.type === "Unit").forEach(u => {
                u.maxHp += 1;
                u.hp += 1; // Heal effect of aura
            });
        }
        if (lm.name === "TOTEM POLE") {
            playerBoard.filter(u => u.faction === "Wild").forEach(u => u.atk += 1);
        }
    });
    
    // Aplikace Enemy Auras
    enemyBoard.filter(c => c.type === "Landmark").forEach(lm => {
        if (lm.name === "TOTEM POLE") {
            enemyBoard.filter(u => u.faction === "Wild").forEach(u => u.atk += 1);
        }
    });
}

function startAITurn() {
    if (maxMana < 10) maxMana++; 
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
                    // AI Target Logic
                    let target = playerBoard.length > 0 ? playerBoard[0] : null;
                    if (card.text.includes("damage")) target = playerBoard[0]; // Simple logic
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
            else target = (playerBoard.length > 0 && Math.random() > 0.5) ? playerBoard[0] : "hero";
            
            if (target === "hero") {
                playerHp -= attacker.atk;
            } else {
                performCombat(attacker, target);
            }
        }
    });
    
    checkDeaths();
    updateUI();
    
    setTimeout(() => {
        myTurn = true;
        currentMana = maxMana;
        drawCard("player");
        playerBoard.forEach(u => u.canAttack = true);
        $("#game-message").text("YOUR TURN");
        $("#end-turn-btn").prop("disabled", false);
        recalculateAuras();
        updateUI();
    }, 1000);
}

// ---------------------------------------------------------
// 3. INTERAKCE
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
    // 1. Play Card from Hand
    if (selectedCardIndex > -1) {
        // Stealth check: Nelze cílit na nepřítele se Stealth kouzlem
        if (isEnemy && unit.keywords.includes("Stealth")) {
            // Visual feedback (např. shake)
            return;
        }
        playCard(selectedCardIndex, unit);
        selectedCardIndex = -1;
        return;
    }

    // 2. Attack
    if (!myTurn) return;

    if (!isEnemy) {
        if (unit.canAttack && unit.type === "Unit") {
            selectedAttacker = (selectedAttacker === unit) ? null : unit;
            updateUI();
        }
        return;
    }

    if (isEnemy && selectedAttacker) {
        if (unit.keywords.includes("Stealth")) {
            // Cannot attack stealth
            return; 
        }
        if (!checkGuardian(unit)) {
            // Must attack guardian
            return;
        }

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

function checkGuardian(targetUnit) {
    if (targetUnit.keywords.includes("Guardian")) return true;
    if (enemyBoard.some(u => u.keywords.includes("Guardian"))) return false;
    return true;
}

// ---------------------------------------------------------
// 4. GAME ACTIONS
// ---------------------------------------------------------

function playCard(index, target) {
    let card = playerHand[index];
    
    // Serializace pro MP
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

    currentMana -= card.cost;
    playerHand.splice(index, 1);

    if (card.type === "Unit" || card.type === "Landmark") {
        playerBoard.push(card);
        if (card.logic.onPlay) card.logic.onPlay(GameInterface, card, target);
        if (card.keywords.includes("Ambush")) card.canAttack = true;
    } else if (card.type === "Spell" || card.type === "Gear") {
        if (card.logic.onPlay) card.logic.onPlay(GameInterface, card, target);
    }

    emitAction("playCard", {
        cardId: card.id,
        targetIndex: targetInfo ? targetInfo.index : null,
        targetType: targetInfo ? targetInfo.type : null
    });

    recalculateAuras();
    checkDeaths();
    updateUI();
}

function performAttack(myUnitIndex, targetUnitIndex, isTargetHero) {
    let attacker = playerBoard[myUnitIndex];
    attacker.canAttack = false;

    if (isTargetHero) enemyHp -= attacker.atk;
    else {
        let defender = enemyBoard[targetUnitIndex];
        performCombat(attacker, defender);
    }
    
    emitAction("attack", {
        attackerIndex: myUnitIndex,
        targetIndex: isTargetHero ? -1 : targetUnitIndex,
        targetType: isTargetHero ? "hero" : "playerUnit"
    });

    checkDeaths();
    updateUI();
}

function performCombat(unitA, unitB) {
    unitB.hp -= unitA.atk;
    unitA.hp -= unitB.atk;
    if (unitA.keywords.includes("Lethal")) unitB.hp = -99;
    if (unitB.keywords.includes("Lethal")) unitA.hp = -99;
}

function checkDeaths() {
    playerBoard = playerBoard.filter(u => u.hp > 0);
    enemyBoard = enemyBoard.filter(u => u.hp > 0);
    if (playerHp <= 0) alert("DEFEAT");
    if (enemyHp <= 0) alert("VICTORY");
}

function drawCard(who) {
    let randomId = CardDB[Math.floor(Math.random() * CardDB.length)].id;
    let newCard = createCardInstance(randomId, who);
    if (who === "player") { if (playerHand.length < 10) playerHand.push(newCard); }
    else { if (isSinglePlayer) enemyHandAI.push(newCard); }
    updateUI();
}

// ---------------------------------------------------------
// 5. RENDERING
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
    renderEnemyHand(isSinglePlayer ? enemyHandAI.length : getEnemyHandCount());

    $("#opp-hero").off("click").on("click", handleEnemyHeroClick);
}

function renderBoard(container, boardData, isEnemy) {
    container.empty();
    boardData.forEach((card) => {
        let el = $(createCardHTML(card, "board"));
        
        if (card.keywords.includes("Guardian")) el.addClass("guardian-glow");
        if (card.keywords.includes("Stealth")) el.addClass("stealth-visual");

        if (!isEnemy && card.canAttack && myTurn && card.type === "Unit") el.css("border", "2px solid #4CAF50");
        if (selectedAttacker === card) el.addClass("card-attacker");

        el.click(() => handleUnitClick(card, isEnemy));
        container.append(el);
    });
}

function renderEnemyHand(count) {
    $("#opp-hand").empty();
    for(let i=0; i<count; i++) {
        // Použití CSS třídy card-back místo inline stylu
        $("#opp-hand").append(`<div class="card-back"></div>`);
    }
}
function getEnemyHandCount() { return $("#opp-hand").children().length; }

function createCardHTML(card, context) {
    let imgPath = getImgName(card);
    let stats = "";
    
    if (card.type !== "Spell" && card.type !== "Gear") {
        let showAtk = (card.atk !== card.baseAtk);
        let atkClass = showAtk ? (card.atk > card.baseAtk ? "stat-changed-buff" : "stat-changed-dmg") : "stat-hidden";
        
        let showHp = (card.hp !== card.baseHp || card.hp < card.maxHp);
        let hpClass = showHp ? (card.hp < card.maxHp ? "stat-changed-dmg" : "stat-changed-buff") : "stat-hidden";

        stats = `
            <div class="stat-box atk ${atkClass}">${card.atk}</div>
            <div class="stat-box hp ${hpClass}">${card.hp}</div>
        `;
    }
    
    // Cena viditelná v ruce
    let costHtml = context === "hand" ? `<div class="stat-box cost">${card.cost}</div>` : "";

    return `
    <div class="card">
        <img class="card-img" src="${imgPath}" onerror="this.src='https://via.placeholder.com/160x230?text=${card.name}'">
        ${costHtml}
        ${stats}
    </div>`;
}

function createCardInstance(cardId, owner) {
    let template = CardDB.find(c => c.id === cardId);
    if(!template) return null;
    return {
        ...template,
        instanceId: Date.now() + Math.random(),
        owner: owner,
        hp: template.hp, maxHp: template.hp, baseHp: template.hp,
        atk: template.atk, baseAtk: template.atk,
        logic: getCardLogic(template),
        keywords: getCardLogic(template).keywords || [],
        canAttack: false
    };
}

// Dummy interface objects
const GameInterface = {
    dealDamage: (t, a) => { if(t && t.hp) t.hp -= a; },
    damageHero: (o, a) => { if(o==="player") playerHp -= a; else enemyHp -= a; },
    healHero: (o, a) => { if(o==="player") playerHp = Math.min(30, playerHp+a); },
    addGrit: (o, a) => { if(o==="player") currentMana = Math.min(10, currentMana+a); },
    returnToHand: (u) => { /* TODO */ }
};
function emitAction(t,p) { if(!isSinglePlayer) $.post('https://shootout_cardgame/sendAction', JSON.stringify({type:t,payload:p})); }
function handleRemoteAction(d){
    let payload = data.payload;

    switch (data.type) {
        case "playCard":
            let cardTemplate = CardDB.find(c => c.id === payload.cardId);
            let newUnit = createCardInstance(payload.cardId, "enemy");
            
            if (cardTemplate.type === "Unit" || cardTemplate.type === "Landmark") {
                enemyBoard.push(newUnit);
                if (payload.targetIndex !== null) {
                    let target = resolveTarget(payload.targetType, payload.targetIndex);
                    if (newUnit.logic.onPlay) newUnit.logic.onPlay(GameInterface, newUnit, target);
                }
            } else if (cardTemplate.type === "Spell") {
                if (newUnit.logic.onPlay) {
                     let target = resolveTarget(payload.targetType, payload.targetIndex);
                     newUnit.logic.onPlay(GameInterface, newUnit, target);
                }
            }
            renderEnemyHand(getEnemyHandCount() - 1);
            break;

        case "endTurn":
            myTurn = true;
            if (maxMana < 10) maxMana++;
            currentMana = maxMana;
            drawCard("player");
            playerBoard.forEach(u => u.canAttack = true);
            $("#game-message").text("YOUR TURN");
            $("#end-turn-btn").prop("disabled", false);
            break;

        case "attack":
            let attacker = enemyBoard[payload.attackerIndex];
            if (payload.targetType === "hero") {
                playerHp -= attacker.atk;
            } else {
                let defender = playerBoard[payload.targetIndex];
                if (defender) performCombat(attacker, defender);
            }
            break;
    }
    checkDeaths();
    updateUI();
}

function resolveTarget(type, index) {
    if (type === "enemyUnit") return playerBoard[index];
    if (type === "playerUnit") return enemyBoard[index];
    if (type === "hero") return "hero"; 
    return null;
}

function checkDeaths() {
    playerBoard = playerBoard.filter(u => u.hp > 0);
    enemyBoard = enemyBoard.filter(u => u.hp > 0);
    
    if (playerHp <= 0) alert("DEFEAT");
    if (enemyHp <= 0) alert("VICTORY");
}

// =========================================================
// 7. RENDEROVÁNÍ UI & HTML GENERÁTOR
// =========================================================

function createCardInstance(cardId, owner) {
    let template = CardDB.find(c => c.id === cardId);
    if(!template) return null;
    return {
        ...template,
        instanceId: Date.now() + Math.random(),
        owner: owner,
        hp: template.hp, 
        maxHp: template.hp,
        atk: template.atk,
        baseAtk: template.atk, // Důležité pro skrývání statů
        baseHp: template.hp,
        logic: getCardLogic(template),
        keywords: getCardLogic(template).keywords || [],
        canAttack: false
    };
}

function updateUI() {
    // Update textů
    $("#player-mana").html(`💎 ${currentMana} / ${maxMana}`);
    $("#opp-mana").html(`💎 ? / ?`); // Oponentova mana skrytá
    
    $("#player-hero .hp-badge").text(playerHp);
    $("#opp-hero .hp-badge").text(enemyHp);

    // Ruka hráče
    $("#player-hand").empty();
    playerHand.forEach((card, index) => {
        let cardHTML = createCardHTML(card, "hand");
        let el = $(cardHTML);
        
        if (card.cost <= currentMana && myTurn) el.addClass("playable");
        
        // Zvýraznění vybrané karty
        if (index === selectedCardIndex) {
            el.addClass("card-selected");
        }
        
        el.click(() => handleCardClick(index));
        el.attr("title", card.text); 
        $("#player-hand").append(el);
    });

    // Boardy
    renderBoard($("#player-board"), playerBoard, false);
    renderBoard($("#opp-board"), enemyBoard, true);
    
    // Ruka oponenta
    renderEnemyHand(isSinglePlayer ? enemyHandAI.length : getEnemyHandCount());

    // Event listener na oponenta
    $("#opp-hero").off("click").on("click", handleEnemyHeroClick);
}

function renderBoard(container, boardData, isEnemy) {
    container.empty();
    boardData.forEach((card) => {
        let el = $(createCardHTML(card, "board"));
        
        // Vizuální efekty
        if (card.keywords.includes("Guardian")) el.addClass("guardian-glow");
        if (card.keywords.includes("Stealth")) el.css("opacity", "0.7");

        if (!isEnemy && card.canAttack && myTurn) el.css("border", "2px solid #4CAF50");
        if (selectedAttacker === card) el.addClass("card-attacker");

        el.click(() => handleUnitClick(card, isEnemy));
        container.append(el);
    });
}

function renderEnemyHand(count) {
    $("#opp-hand").empty();
    let finalCount = isSinglePlayer ? enemyHandAI.length : count;
    for(let i=0; i<finalCount; i++) {
        $("#opp-hand").append(`<div class="card-back" style="width:80px; height:115px; background: url('html/img/card_back.png') no-repeat center; background-size: cover; border-radius: 6px; box-shadow: 2px 2px 5px #000; border:1px solid white; margin:2px;"></div>`);
    }
}
function getEnemyHandCount() { return $("#opp-hand").children().length; }

/**
 * GENEROVÁNÍ HTML KARTY
 * Implementuje logiku skrývání čísel, pokud jsou součástí obrázku.
 */
function createCardHTML(card, context) {
    let imgPath = getImgName(card);
    let stats = "";
    
    // Staty zobrazujeme jen u Jednotek a Budov
    // Spelly nemají HP/ATK
    if (card.type !== "Spell" && card.type !== "Gear") {
        
        // Zjistíme, jestli se staty liší od základních (base)
        // Pokud ano, zobrazíme HTML bublinu. Pokud ne, spoléháme na obrázek.
        
        // Útok: Zobrazit, pokud se liší
        let showAtk = (card.atk !== card.baseAtk);
        let atkClass = showAtk ? (card.atk > card.baseAtk ? "stat-changed-buff" : "stat-changed-dmg") : "stat-hidden";
        
        // Životy: Zobrazit, pokud se liší nebo je zraněný
        let showHp = (card.hp !== card.baseHp || card.hp < card.maxHp);
        let hpClass = showHp ? (card.hp < card.maxHp ? "stat-changed-dmg" : "stat-changed-buff") : "stat-hidden";

        stats = `
            <div class="stat-box atk ${atkClass}">${card.atk}</div>
            <div class="stat-box hp ${hpClass}">${card.hp}</div>
        `;
    }
    
    // Cost (Cena): Zobrazit jen pokud je karta v ruce?
    // Nebo pokud se změnila (zlevnění).
    // Prozatím zobrazíme cenu vždy v ruce, ale na stole ne.
    let costHtml = "";
    if (context === "hand") {
        // Pokud cena odpovídá obrázku, můžeme ji skrýt (volitelné). 
        // Ale pro přehlednost v ruce je lepší ji vidět.
        // Zde ji nechám zobrazenou, ale můžeš přidat třídu 'stat-hidden' pokud chceš.
        costHtml = `<div class="stat-box cost">${card.cost}</div>`;
    }

    return `
    <div class="card">
        <img class="card-img" src="${imgPath}" onerror="this.src='https://via.placeholder.com/160x230?text=${card.name}'">
        ${costHtml}
        ${stats}
    </div>`;
}