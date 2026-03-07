// ==========================================
// FILE: ai.js — AI (umělá inteligence)
// ==========================================

function startAITurn() {
    if (gameEnded) return;

    if (maxMana < 10) maxMana++;
    let aiMana = maxMana;

    drawCard("enemy");

    enemyBoard.forEach(u => u.canAttack = true);
    updateUI();

    // Fáze 1: Vykládání karet
    let aiInterval = setInterval(() => {
        if (gameEnded) { clearInterval(aiInterval); return; }

        // BEAVER DAM (id:70): enemy units cost +1
        let beaverPenalty = playerBoard.some(b => b.id === 70) ? 1 : 0;
        let playableIdx = enemyHandAI.findIndex(c => c.cost + beaverPenalty <= aiMana && c.type === "Unit");

        if (playableIdx > -1 && enemyBoard.length < 7) {
            let card = enemyHandAI[playableIdx];

            aiMana -= card.cost;
            enemyHandAI.splice(playableIdx, 1);
            enemyBoard.push(card);

            card.canAttack = card.keywords.includes("Ambush");

            if (card.logic.onPlay) {
                let target = playerBoard.length > 0 ? playerBoard[0] : null;
                card.logic.onPlay(makeGameInterface("enemy"), card, target);
            }

            updateUI();
        } else {
            clearInterval(aiInterval);
            setTimeout(aiAttackPhase, 800);
        }
    }, 1000);
}

function aiAttackPhase() {
    if (gameEnded) return;

    enemyBoard.forEach(attacker => {
        if (attacker.stunned) { attacker.stunned = false; return; }
        if (attacker.canAttack && attacker.atk > 0 && attacker.type === "Unit") {
            attacker.canAttack = false;

            let target = "hero";

            // 1. Musí útočit na Guardiana?
            let tauntUnit = playerBoard.find(u => u.keywords.includes("Guardian"));
            if (tauntUnit) {
                target = tauntUnit;
            }
            // 2. Trade logika (náhodná)
            else if (playerBoard.length > 0 && Math.random() > 0.6) {
                target = playerBoard[Math.floor(Math.random() * playerBoard.length)];
            }

            if (target === "hero") {
                playerHp -= attacker.atk;
            } else {
                target.hp -= attacker.atk;
                attacker.hp -= target.atk;

                if (attacker.keywords.includes("Lethal")) target.hp = -99;
                if (target.keywords.includes("Lethal")) attacker.hp = -99;
            }
        }
    });

    checkDeaths();
    updateUI();

    if (!gameEnded) {
        setTimeout(startPlayerTurn, 1000);
    }
}
