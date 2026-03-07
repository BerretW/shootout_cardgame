// ==========================================
// FILE: sync.js — Multiplayer synchronizace stavu
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

// Sestaví payload pro stateSync z aktuálního stavu hry
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

// Aplikuje přijatý stateSync (perspektiva se invertuje)
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

// Zkratka: sestav stav a odešli jako stateSync
function emitStateSync(lastAction) {
    if (!isSinglePlayer) {
        emitAction("stateSync", buildStateSync(lastAction));
    }
}

// Animace útoku přicházejícího od protivníka
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
                startPlayerTurn();
                return;
            }
            else if (lastAction.type === "attack") {
                playRemoteAttackAnimation(lastAction, () => {
                    checkDeaths();
                    updateUI();
                });
                return;
            }
            else if (lastAction.type === "heroPower") {
                const heroTemplate = CardDB.find(c => c.id === lastAction.heroId);
                const heroName = heroTemplate ? heroTemplate.name : "Hrdina";
                addToHistory(`<span class="hist-opp">Opp:</span> aktivuje schopnost hrdiny <b>${heroName}</b>`);
                SoundFX.play();
            }
            else if (lastAction.type === "playCard") {
                if (lastAction.cardName) {
                    let cardSpan = lastAction.cardId
                        ? `<span class="hist-card-name" data-id="${lastAction.cardId}">${lastAction.cardName}</span>`
                        : `<b>${lastAction.cardName}</b>`;
                    addToHistory(`<span class="hist-opp">Opp:</span> zahraje ${cardSpan}`);
                }
                SoundFX.play();
                // Eagle (42) nebo Detective (3) — protivník chce vidět naši ruku
                if (lastAction.cardId === 42 || lastAction.cardId === 3) {
                    emitAction("revealHand", {
                        cards: playerHand.map(c => ({ id: c.id, name: c.name }))
                    });
                }
            }
        }

        checkDeaths();
        updateUI();
    }
}
