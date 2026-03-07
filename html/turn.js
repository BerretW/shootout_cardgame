// ==========================================
// FILE: turn.js — Herní smyčka (tahy)
// ==========================================

function startPlayerTurn() {
    if (gameEnded) return;

    myTurn = true;
    if (maxMana < 10) maxMana++;
    currentMana = maxMana;
    heroPowerUsed = false;
    heroPowerMode = false;

    drawCard("player");

    // Probuzení jednotek + reset stunu + Start of Turn efekty
    playerBoard.forEach(u => {
        if (u.type === "Unit") {
            if (u.stunned) {
                u.stunned = false;
                u.canAttack = false;
            } else {
                u.canAttack = true;
                u.attacksRemaining = u.maxAttacks || 1;
            }
        }

        // Start of Turn efekty Landmarků
        if (u.logic && u.logic.onTurnStart) u.logic.onTurnStart(GameInterface, u);
    });

    // Synchronizace stavu po začátku tahu
    emitStateSync({ type: "startTurn" });

    $("#game-message").text("YOUR TURN");
    $("#end-turn-btn").prop("disabled", false);

    checkDeaths();
    updateUI();
}

function endTurn() {
    if (!myTurn || gameEnded) return;

    myTurn = false;

    // End of Turn efekty
    playerBoard.forEach(u => {
        if (u.logic && u.logic.onTurnEnd) u.logic.onTurnEnd(GameInterface, u);
    });
    checkDeaths();

    $("#game-message").text("ENEMY TURN");
    $("#end-turn-btn").prop("disabled", true);

    cancelSelection();

    SoundFX.endTurn();
    emitStateSync({ type: "endTurn" });

    updateUI();

    if (isSinglePlayer) {
        setTimeout(startAITurn, 1500);
    }
}
