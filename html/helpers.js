// ==========================================
// FILE: helpers.js — Helpery a factory funkce
// ==========================================

function getImgName(card) {
    let safeName = card.name.replace(/ /g, "_");
    return `img/${card.id}_${card.type}_${safeName}.png`;
}

function buildDeck(size) {
    const pool = myInventoryCards.filter(c => c.type !== "Hero" && !c.token);
    if (!pool.length) return [];

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

    if (deck.length === 0) {
        if (!recycleGraveyardIntoDeck(owner)) {
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
    if (!template) return null;

    // Ochrana proti Hero/Token kartám
    if (template.type === "Hero" || template.token) {
        const pool = CardDB.filter(c => c.type !== "Hero" && !c.token);
        if (!pool.length) return null;
        return createCardInstance(pool[Math.floor(Math.random() * pool.length)].id, owner);
    }

    let card = {
        ...template,
        instanceId: Date.now() + Math.random(),
        owner: owner,

        hp: template.hp,
        maxHp: template.hp,
        baseHp: template.hp,

        atk: template.atk,
        baseAtk: template.atk,

        logic: getCardLogic(template),
        keywords: getCardLogic(template).keywords || [],

        canAttack: false,
        stunned: false,
        maxAttacks: template.text && template.text.toLowerCase().includes("attack twice") ? 2 : 1,
        attacksRemaining: template.text && template.text.toLowerCase().includes("attack twice") ? 2 : 1,
        gear: []
    };
    return card;
}

function checkGuardian(targetUnit) {
    if (targetUnit.keywords.includes("Guardian")) return true;
    if (enemyBoard.some(u => u.keywords.includes("Guardian"))) return false;
    return true;
}

function emitAction(type, payload) {
    if (!isSinglePlayer) {
        $.post('https://shootout_cardgame/sendAction', JSON.stringify({ type: type, payload: payload }));
    }
}
