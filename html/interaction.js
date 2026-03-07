// ==========================================
// FILE: interaction.js — Interakce s kartami a stolem
// ==========================================

// Kliknutí na kartu v ruce
function handleCardClick(index) {
    if (!myTurn || gameEnded) return;

    let card = playerHand[index];

    if (selectedCardIndex === index) {
        selectedCardIndex = -1;
        updateUI();
        return;
    }

    if (getCardCost(card) > currentMana) {
        return;
    }

    const text = card.text.toLowerCase();
    const needsTarget = (
        card.type === "Gear" ||
        (card.type === "Spell" && (
            text.includes("deal") ||
            text.includes("give") ||
            text.includes("destroy") ||
            text.includes("heal") ||
            text.includes("return a unit") ||
            text.includes("choose an enemy")
        )) ||
        (card.logic.onPlay && text.includes("target"))
    );

    const isGlobal = text.includes("all units") || text.includes("all characters") ||
        text.includes("all enemy") || text.includes("all friendly") ||
        text.includes("all damaged") || text.includes("random");

    if (needsTarget && !isGlobal) {
        selectedCardIndex = index;
        selectedAttacker = null;
        updateUI();
    } else {
        playCard(index, null);
    }
}

// Kliknutí na jednotku na stole
function handleUnitClick(unit, isEnemy) {
    if (gameEnded) return;

    // 0. Hero Power targeting
    if (heroPowerMode) {
        if (unit.keywords && unit.keywords.includes("SpellImmune")) return;
        useHeroPower(unit);
        return;
    }

    // 1. Mám vybranou kartu v ruce a vybírám cíl
    if (selectedCardIndex > -1) {
        let card = playerHand[selectedCardIndex];
        if (isEnemy && unit.keywords.includes("Stealth")) return;
        // WHITE BISON (id:43): imunní vůči Spellům a Gearům
        if (unit.id === 43 && (card.type === "Spell" || card.type === "Gear")) return;
        playCard(selectedCardIndex, unit);
        selectedCardIndex = -1;
        return;
    }

    // 2. Útok
    if (!myTurn) return;

    // A) Klik na vlastní jednotku -> vybrat útočníka
    if (!isEnemy) {
        if (unit.type === "Unit" && unit.canAttack) {
            // ANCIENT BONES (id:54): může útočit jen jako jediná jednotka
            if (unit.id === 54 && playerBoard.filter(u => u.type === "Unit").length > 1) return;
            selectedAttacker = (selectedAttacker === unit) ? null : unit;
            updateUI();
        }
        return;
    }

    // B) Klik na nepřátelskou jednotku -> provést útok
    if (isEnemy && selectedAttacker) {
        if (unit.keywords.includes("Stealth")) return;

        if (!checkGuardian(unit)) {
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

    // 0. Hero Power targeting
    if (heroPowerMode) {
        useHeroPower("hero");
        return;
    }

    // 1. Cíl spellu
    if (selectedCardIndex > -1) {
        let card = playerHand[selectedCardIndex];
        if (card.text.toLowerCase().includes("hero") || card.text.toLowerCase().includes("enemy")) {
            playCard(selectedCardIndex, "hero");
            selectedCardIndex = -1;
        }
        return;
    }

    // 2. Útok jednotkou
    if (selectedAttacker) {
        if (enemyBoard.some(u => u.keywords.includes("Guardian"))) {
            return;
        }

        let attackerIdx = playerBoard.indexOf(selectedAttacker);
        performAttack(attackerIdx, -1, true);
        selectedAttacker = null;
    }
}
