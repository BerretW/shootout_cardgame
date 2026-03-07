// ==========================================
// FILE: game-state.js — Kontrola stavu a konec hry
// ==========================================

function checkDeaths() {
    // OLD GRAVEYARD (id:67): umírající unit friendly jde zpět do ruky
    const hasOldGraveyard = playerBoard.some(b => b.id === 67);

    // UNDERTAKER (id:123): počítáme, kolik přátelských Unit (ne samotný Undertaker) zemřelo
    let undertakerDeaths = 0;

    // WENDIGO (id:110): sledujeme celkový počet zemřelých jednotek (obě strany)
    let wendigoDeaths = 0;

    // CURSED GROUND (id:111): jednotky umírající pod jeho vlivem nelze vzkřísit
    const hasCursedGroundOnEnemy = enemyBoard.some(b => b.id === 111);

    playerBoard = playerBoard.filter(u => {
        if (u.hp <= 0) {
            if (hasCursedGroundOnEnemy && u.type === "Unit") u.cursed = true;
            if (hasOldGraveyard && u.type === "Unit" && u.id !== 67 && !u.cursed && playerHand.length < 10) {
                u.hp = u.maxHp;
                u.canAttack = false;
                u.auraAtk = 0; u.auraHp = 0; u.auraKeywords = [];
                playerHand.push(u);
                return false;
            }
            if (u.type === "Unit" && u.id !== 123) undertakerDeaths++;
            if (u.type === "Unit") wendigoDeaths++;
            if (u.logic && u.logic.onDeath) u.logic.onDeath(GameInterface, u);
            playerGraveyard.push(u);
            SoundFX.death();
            return false;
        }
        return true;
    });

    // UNDERTAKER (id:123): za každou zesnulou přátelskou Unit gain +1 Grit
    if (undertakerDeaths > 0 && playerBoard.some(b => b.id === 123)) {
        GameInterface.addGrit("player", undertakerDeaths);
    }

    const hasCursedGroundOnPlayer = playerBoard.some(b => b.id === 111);

    enemyBoard = enemyBoard.filter(u => {
        if (u.hp <= 0) {
            if (hasCursedGroundOnPlayer && u.type === "Unit") u.cursed = true;
            if (u.type === "Unit") wendigoDeaths++;
            enemyGraveyard.push(u);
            return false;
        }
        return true;
    });

    // WENDIGO (id:110): +2 Attack za každou zemřelou jednotku
    if (wendigoDeaths > 0) {
        playerBoard.filter(u => u.id === 110).forEach(u => { u.atk += 2 * wendigoDeaths; u.baseAtk = u.atk; });
        enemyBoard.filter(u => u.id === 110).forEach(u => { u.atk += 2 * wendigoDeaths; u.baseAtk = u.atk; });
    }

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
