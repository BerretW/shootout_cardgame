// ==========================================
// FILE: game-interface.js — Game Interface API pro karty
// ==========================================
// Tento objekt je předáván do funkcí karet v cards.js (onPlay, onDeath...)
// perspective = "player" | "enemy" — určuje kdo efekt aktivuje.

function makeGameInterface(perspective) {
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

    const self = flip("player");
    const opp  = flip("enemy");

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
                if (grave[i].type === "Unit" && !grave[i].cursed) { idx = i; break; }
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
            let pool = grave.filter(c => c.type === "Unit" && !c.cursed && (!faction || c.faction === faction));
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
        summonCustomUnit: (template, owner) => {
            const actual = flip(owner);
            const board = getBoard(actual);
            if (board.length >= 7) return;
            let card = {
                ...template,
                owner: actual,
                maxHp: template.maxHp || template.hp,
                baseAtk: template.atk,
                baseHp: template.maxHp || template.hp,
                canAttack: (template.keywords || []).includes("Ambush"),
                stunned: false,
                attacksRemaining: 1,
                maxAttacks: 1,
                auraAtk: 0, auraHp: 0, auraKeywords: [],
                logic: getCardLogic(template)
            };
            if (!card.keywords) card.keywords = [];
            board.push(card);
        },
        drawAndPlayIfCheap: (owner, maxCost) => {
            const actual = flip(owner);
            const hand = getHand(actual);
            const deck = actual === "player" ? playerDeck : enemyDeck;
            if (deck.length === 0) return;
            const cardId = deck.pop();
            if (actual === "player") playerDeck = deck; else enemyDeck = deck;
            const card = createCardInstance(cardId, actual);
            if (!card) return;
            if (card.cost <= maxCost) {
                if (card.logic && card.logic.onPlay) card.logic.onPlay(GameInterface, card, null);
            } else {
                if (hand.length < 10) hand.push(card);
            }
        },

        get board() { return getBoard(self); },
        get enemyBoard() { return getBoard(opp); }
    };
    return gi;
}

// Výchozí interface z pohledu hráče
const GameInterface = makeGameInterface("player");
