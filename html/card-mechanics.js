// ==========================================
// FILE: card-mechanics.js — Hraní karet a útoky
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

    currentMana -= getCardCost(card);
    playerHand.splice(index, 1);

    if (card.type === "Unit" || card.type === "Landmark") {
        playerBoard.push(card);

        // Summoning Sickness (pokud nemá Ambush)
        card.canAttack = false;
        if (card.keywords.includes("Ambush")) card.canAttack = true;

        // COURTHOUSE (id:33): dej +1 HP všem dosavadním unit na stole
        if (card.id === 33) {
            playerBoard.forEach(u => {
                if (u !== card && u.type === "Unit") { u.maxHp += 1; u.hp += 1; }
            });
        }

        // Pokud COURTHOUSE je na stole, nová unit dostane +1 HP
        if (card.type === "Unit" && playerBoard.some(b => b.id === 33 && b !== card)) {
            card.maxHp += 1; card.hp += 1;
        }

        if (card.logic && card.logic.onPlay) {
            card.logic.onPlay(GameInterface, card, target);
        }

    } else if (card.type === "Spell") {
        if (card.logic && card.logic.onPlay) {
            card.logic.onPlay(GameInterface, card, target);
        }
        playerGraveyard.push(card);

    } else if (card.type === "Gear") {
        if (target && target.type === "Unit") {
            if (!target.gear) target.gear = [];
            target.gear.push(card);
            if (card.logic && card.logic.onPlay) {
                card.logic.onPlay(GameInterface, card, target);
            }
        }
    }

    SoundFX.play();
    checkDeaths();
    updateUI();
    emitStateSync({ type: "playCard", cardId: card.id, cardName: card.name });
}

function performAttack(myUnitIndex, targetUnitIndex, isTargetHero) {
    let attacker = playerBoard[myUnitIndex];
    let attackerSpan = `<span class="hist-card-name" data-id="${attacker.id}">${attacker.name}</span>`;

    let targetName = isTargetHero ? "Hrdinu" : (enemyBoard[targetUnitIndex]?.name || "?");
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

    // Animace útoku
    let attackerEl = $("#player-board .card").eq(myUnitIndex);
    let targetEl = isTargetHero ? $("#opp-hero") : $("#opp-board .card").eq(targetUnitIndex);

    if (!attackerEl.length) {
        checkDeaths();
        updateUI();
        emitStateSync(lastAttackAction);
        return;
    }

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
        targetEl.addClass('card-hit');
        attackerEl.css({ transition: 'transform 0.12s ease-out', transform: 'translate(0,0)' });
        setTimeout(() => {
            targetEl.removeClass('card-hit');
            attackerEl.css('transition', '');
            checkDeaths();
            updateUI();
            emitStateSync(lastAttackAction);
        }, 180);
    }, 160);
}
