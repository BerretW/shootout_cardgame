// ==========================================
// FILE: html/script.js
// ==========================================

let currentMana = 1;
let maxMana = 1;
let playerHand = [];
let playerBoard = [];
let enemyBoard = [];
let enemyHandCount = 0; // Pro vizuál v MP, pro logiku v SP
let enemyHandAI = []; // Skutečná ruka Bota v SP

let playerHp = 20;
let enemyHp = 20;

let myTurn = false; 
let isSinglePlayer = false; // Přepínač režimů

let selectedCardIndex = -1;
let selectedAttacker = null;
let gameRunning = false;

// Inicializace
$(document).ready(function() {
    window.addEventListener('message', function(event) {
        let data = event.data;

        if (data.type === "ui") {
            if (data.status) $("#game-container").show();
            else $("#game-container").hide();
        } 
        else if (data.type === "start_game") {
            // Multiplayer start
            isSinglePlayer = false;
            initGame(data.isFirst, data.opponentName);
        }
        else if (data.type === "start_singleplayer") {
            // Singleplayer start
            isSinglePlayer = true;
            initGame(true, "Training Bot"); // V SP začínáš vždy ty
        }
        else if (data.type === "enemy_action") {
            if (!isSinglePlayer) handleRemoteAction(data.action);
        }
        else if (data.type === "game_over") {
            alert(data.message);
            location.reload(); 
        }
    });

    // Ovládání kláves
    document.onkeyup = function (data) {
        if (data.which == 27) { // ESC
            $.post('https://shootout_cardgame/exit', JSON.stringify({}));
        } else if (data.which == 2) { // Right Click - zrušit výběr
            selectedCardIndex = -1;
            selectedAttacker = null;
            updateUI();
        }
    };
});

// Funkce pro název obrázku
function getImgName(card) {
    let safeName = card.name.replace(/ /g, "_");
    return `img/${card.id}_${card.type}_${safeName}.png`;
}

// ---------------------------------------------------------
// INICIALIZACE HRY
// ---------------------------------------------------------

function initGame(isFirst, oppName) {
    console.log("Starting Game. Mode:", isSinglePlayer ? "Singleplayer" : "Multiplayer");
    gameRunning = true;
    
    // Reset
    currentMana = 1;
    maxMana = 1;
    playerHand = [];
    playerBoard = [];
    enemyBoard = [];
    enemyHandAI = [];
    
    playerHp = 20;
    enemyHp = 20;
    selectedCardIndex = -1;
    selectedAttacker = null;
    
    // UI Setup
    $("#opp-name").text(oppName);
    myTurn = isFirst;
    
    $("#game-message").text(myTurn ? "YOUR TURN" : "ENEMY TURN");
    $("#end-turn-btn").prop("disabled", !myTurn);

    // Lízni startovní ruku (4 karty)
    for(let i=0; i<4; i++) drawCard("player");
    
    if (isSinglePlayer) {
        // V SP musíme botovi nalízat skutečné karty
        for(let i=0; i<4; i++) drawCard("enemy");
    } else {
        // V MP jen vizuálně
        renderEnemyHand(4);
    }
    
    updateUI();
}

// ---------------------------------------------------------
// LOGIKA TAHŮ & SÍTĚ
// ---------------------------------------------------------

// Odeslání akce (v SP neposílá nic, v MP posílá serveru)
function emitAction(actionType, payload) {
    if (isSinglePlayer) return; // V singlu nic neposíláme

    $.post('https://shootout_cardgame/sendAction', JSON.stringify({
        type: actionType,
        payload: payload
    }));
}

// Ukončení tahu hráče
function endTurn() {
    if (!myTurn) return;
    myTurn = false;
    
    // End Turn efekty (Léčení, Grit atd.)
    playerBoard.forEach(u => {
        if (u.logic.onTurnEnd) u.logic.onTurnEnd(GameInterface, u);
    });

    $("#game-message").text("ENEMY TURN");
    $("#end-turn-btn").prop("disabled", true);
    selectedAttacker = null;
    selectedCardIndex = -1;
    
    // Odeslat info oponentovi (v MP)
    emitAction("endTurn", {});

    // Pokud je SP, spustíme AI
    if (isSinglePlayer) {
        setTimeout(startAITurn, 1000);
    }
}

// ---------------------------------------------------------
// UMĚLÁ INTELIGENCE (BOT)
// ---------------------------------------------------------

function startAITurn() {
    // 1. Bot lízne a dostane manu
    if (maxMana < 10) maxMana++; // Mana roste oběma stejně (zjednodušeno)
    let aiMana = maxMana;
    
    drawCard("enemy");
    
    // Probuzení botových jednotek
    enemyBoard.forEach(u => u.canAttack = true);

    // 2. Fáze hraní karet (zpožděná smyčka pro efekt přemýšlení)
    let playInterval = setInterval(() => {
        // Najdi hratelnou kartu
        let playableCardIndex = enemyHandAI.findIndex(c => c.cost <= aiMana && c.type !== "Gear"); // AI neumí moc používat Geary, tak je ignoruje
        
        if (playableCardIndex > -1 && enemyBoard.length < 7) {
            let card = enemyHandAI[playableCardIndex];
            aiMana -= card.cost;
            enemyHandAI.splice(playableCardIndex, 1);
            
            // Vyložení na stůl
            if (card.type === "Unit" || card.type === "Landmark") {
                enemyBoard.push(card);
                if (card.keywords.includes("Ambush")) card.canAttack = true;
                // AI Battlecry (zjednodušený - random target)
                if (card.logic.onPlay) {
                    let target = playerBoard.length > 0 ? playerBoard[0] : null;
                    card.logic.onPlay(GameInterface, card, target);
                }
            } else if (card.type === "Spell") {
                // AI hraje spell - jednoduchá logika: poškození do náhodného cíle
                if (card.logic.onPlay) {
                    let target = playerBoard.length > 0 ? playerBoard[Math.floor(Math.random()*playerBoard.length)] : null;
                    card.logic.onPlay(GameInterface, card, target);
                }
            }
            updateUI();
        } else {
            // Žádné další karty k zahrání, přechod na útok
            clearInterval(playInterval);
            setTimeout(aiAttackPhase, 800);
        }
    }, 1000);
}

function aiAttackPhase() {
    // AI útočí se vším, co může
    enemyBoard.forEach((attacker, idx) => {
        if (attacker.canAttack) {
            attacker.canAttack = false;
            
            // Rozhodování AI: 
            // 1. Pokud je hráč pod 5 HP, jdi face
            // 2. Pokud je taunt, musí do tauntu
            // 3. Jinak 50% face, 50% trade
            
            let target = null;
            let tauntUnit = playerBoard.find(u => u.keywords.includes("Guardian"));
            
            if (tauntUnit) {
                target = tauntUnit;
            } else if (playerHp < 5) {
                target = "hero";
            } else {
                if (playerBoard.length > 0 && Math.random() > 0.5) {
                    // Trade
                    target = playerBoard[Math.floor(Math.random() * playerBoard.length)];
                } else {
                    target = "hero";
                }
            }
            
            // Provedení útoku
            if (target === "hero") {
                playerHp -= attacker.atk;
            } else {
                performCombat(attacker, target);
            }
        }
    });
    
    checkDeaths();
    updateUI();
    
    // Konec tahu AI
    setTimeout(() => {
        myTurn = true;
        currentMana = maxMana; // Hráč dostane manu na začátku svého kola
        drawCard("player");
        playerBoard.forEach(u => u.canAttack = true);
        
        $("#game-message").text("YOUR TURN");
        $("#end-turn-btn").prop("disabled", false);
        updateUI();
    }, 1000);
}


// ---------------------------------------------------------
// ZPRACOVÁNÍ AKCÍ Z MULTIPLAYERU
// ---------------------------------------------------------

function handleRemoteAction(data) {
    if (isSinglePlayer) return; // Pojistka

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

// ---------------------------------------------------------
// INTERAKCE HRÁČE
// ---------------------------------------------------------

function handleCardClick(index) {
    if (!myTurn) return;
    let card = playerHand[index];
    
    if (selectedCardIndex === index) {
        selectedCardIndex = -1;
        updateUI();
        return;
    }

    if (card.cost > currentMana) return;

    const needsTarget = (
        (card.type === "Spell" && (card.text.includes("damage") || card.text.includes("Give"))) ||
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
        playCard(selectedCardIndex, unit);
        selectedCardIndex = -1;
        return;
    }

    // 2. Útok
    if (!myTurn) return;

    if (!isEnemy) {
        if (unit.canAttack) {
            selectedAttacker = (selectedAttacker === unit) ? null : unit;
            updateUI();
        }
        return;
    }

    if (isEnemy && selectedAttacker) {
        if (!checkGuardian(unit)) {
            // Vizuální indikace chyby?
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

function playCard(index, target) {
    let card = playerHand[index];
    
    // Příprava dat pro síť
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

    checkDeaths();
    updateUI();
}

function performAttack(myUnitIndex, targetUnitIndex, isTargetHero) {
    let attacker = playerBoard[myUnitIndex];
    attacker.canAttack = false;

    if (isTargetHero) {
        enemyHp -= attacker.atk;
    } else {
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

// ---------------------------------------------------------
// DATA & UI
// ---------------------------------------------------------

function createCardInstance(cardId, owner) {
    let template = CardDB.find(c => c.id === cardId);
    if(!template) return null;
    return {
        ...template,
        instanceId: Date.now() + Math.random(),
        owner: owner,
        hp: template.hp, 
        maxHp: template.hp,
        logic: getCardLogic(template),
        keywords: getCardLogic(template).keywords || [],
        canAttack: false
    };
}

const GameInterface = {
    dealDamage: (target, amt) => {
        if (target === "hero") { /* Handled elsewhere usually */ }
        else if (target && typeof target.hp !== 'undefined') target.hp -= amt;
    },
    drawCard: (owner, amt) => { for(let i=0; i<amt; i++) drawCard(owner); },
    addGrit: (owner, amt) => { if(owner==="player") currentMana = Math.min(10, currentMana + amt); }
};

function drawCard(who) {
    let randomId = CardDB[Math.floor(Math.random() * CardDB.length)].id;
    let newCard = createCardInstance(randomId, who);
    
    if (who === "player") {
        if (playerHand.length < 10) playerHand.push(newCard);
    } else {
        // Enemy Logic
        if (isSinglePlayer) {
            enemyHandAI.push(newCard); // Bot má skutečnou ruku
        } else {
            // V MP jen počítáme karty
        }
    }
    updateUI();
}

function checkDeaths() {
    playerBoard = playerBoard.filter(u => u.hp > 0);
    enemyBoard = enemyBoard.filter(u => u.hp > 0);
    
    if (playerHp <= 0) alert("DEFEAT");
    if (enemyHp <= 0) alert("VICTORY");
}

function renderEnemyHand(count) {
    $("#opp-hand").empty();
    // V Singleplayeru vykreslíme podle počtu karet v AI ruce
    let finalCount = isSinglePlayer ? enemyHandAI.length : count;
    
    for(let i=0; i<finalCount; i++) {
        $("#opp-hand").append(`<div class="card-back" style="width:80px; height:115px; background: url('html/img/card_back.png') no-repeat center; background-size: cover; border-radius: 6px; box-shadow: 2px 2px 5px #000;"></div>`);
    }
}
function getEnemyHandCount() { 
    return isSinglePlayer ? enemyHandAI.length : $("#opp-hand").children().length; 
}

function updateUI() {
    $("#player-mana").text(`Grit: ${currentMana}/${maxMana}`);
    $("#player-hero .hp-badge").text(playerHp);
    $("#opp-hero .hp-badge").text(enemyHp);

    $("#player-hand").empty();
    playerHand.forEach((card, index) => {
        let cardHTML = createCardHTML(card);
        let el = $(cardHTML);
        
        if (card.cost <= currentMana && myTurn) el.addClass("playable");
        if (index === selectedCardIndex) el.css("transform", "translateY(-30px)").css("border", "2px solid yellow");
        
        el.click(() => handleCardClick(index));
        el.attr("title", card.text); 
        $("#player-hand").append(el);
    });

    renderBoard($("#player-board"), playerBoard, false);
    renderBoard($("#opp-board"), enemyBoard, true);
    
    // Render ruky oponenta (aktualizováno)
    renderEnemyHand(isSinglePlayer ? enemyHandAI.length : getEnemyHandCount());

    $("#opp-hero").off("click").on("click", handleEnemyHeroClick);
}

function renderBoard(container, boardData, isEnemy) {
    container.empty();
    boardData.forEach((card) => {
        let el = $(createCardHTML(card));
        
        if (card.keywords.includes("Guardian")) el.addClass("guardian-glow");
        if (card.keywords.includes("Stealth")) el.css("opacity", "0.6");

        if (!isEnemy && card.canAttack && myTurn) el.css("border", "2px solid #4CAF50");
        if (selectedAttacker === card) el.css("border", "3px solid red");

        el.click(() => handleUnitClick(card, isEnemy));
        container.append(el);
    });
}

function createCardHTML(card) {
    let imgPath = getImgName(card);
    let stats = "";
    
    if (card.type !== "Spell" && card.type !== "Gear") {
        stats = `
            <div class="stat-box atk">${card.atk}</div>
            <div class="stat-box hp" style="color:${card.hp < card.maxHp ? 'red' : '#8b0000'}">${card.hp}</div>
        `;
    }
    
    return `
    <div class="card">
        <img class="card-img" src="${imgPath}" onerror="this.src='https://via.placeholder.com/160x230?text=${card.name}'">
        <div class="stat-box cost">${card.cost}</div>
        <div class="card-id-display">${card.id}</div>
        ${stats}
    </div>`;
}