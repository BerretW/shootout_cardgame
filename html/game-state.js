// ==========================================
// FILE: game-state.js — Kontrola stavu a konec hry
// ==========================================

function checkDeaths() {
    // OLD GRAVEYARD (id:67): umírající unit friendly jde zpět do ruky
    const hasOldGraveyard = playerBoard.some(b => b.id === 67);

    playerBoard = playerBoard.filter(u => {
        if (u.hp <= 0) {
            if (hasOldGraveyard && u.type === "Unit" && u.id !== 67 && playerHand.length < 10) {
                u.hp = u.maxHp;
                u.canAttack = false;
                u.auraAtk = 0; u.auraHp = 0; u.auraKeywords = [];
                playerHand.push(u);
                return false;
            }
            if (u.logic && u.logic.onDeath) u.logic.onDeath(GameInterface, u);
            playerGraveyard.push(u);
            SoundFX.death();
            return false;
        }
        return true;
    });

    enemyBoard = enemyBoard.filter(u => {
        if (u.hp <= 0) {
            enemyGraveyard.push(u);
            return false;
        }
        return true;
    });

    if (playerHp <= 0) {
        showEndScreen(false);
    } else if (enemyHp <= 0) {
        showEndScreen(true);
    }

    updateUI();
}

function showEndScreen(isVictory) {
    if (gameEnded) return;
    gameEnded = true;

    $("#game-container").css("filter", "blur(4px)");
    $("#result-overlay").fadeIn(500);

    if (isVictory) {
        $("#result-title").text("VICTORY").css("color", "gold");
        $("#result-desc").text("The West is yours, partner.");
        setTimeout(() => SoundFX.victory(), 300);
    } else {
        $("#result-title").text("DEFEAT").css("color", "#8b0000");
        $("#result-desc").text("Looks like this is the end of the line.");
        setTimeout(() => SoundFX.defeat(), 300);
    }
}
