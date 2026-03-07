// ==========================================
// FILE: hero-power.js — Schopnost hrdiny
// ==========================================

// Hrdinové, jejichž schopnost nevyžaduje výběr cíle
const HERO_POWER_NO_TARGET = [80, 81, 84, 127, 128, 130];

function onHeroPowerClick() {
    if (!myTurn || gameEnded || heroPowerUsed || !playerHeroCard) return;
    if (currentMana < heroPowerCost) {
        $("#game-message").text("Nedostatek Grit!");
        setTimeout(() => $("#game-message").text("YOUR TURN"), 1500);
        return;
    }
    if (HERO_POWER_NO_TARGET.includes(playerHeroCard.id)) {
        useHeroPower(null);
    } else {
        heroPowerMode = true;
        selectedCardIndex = -1;
        selectedAttacker = null;
        updateUI();
        $("#game-message").text("Vyber cíl pro schopnost hrdiny...");
    }
}

function useHeroPower(target) {
    if (!playerHeroLogic || !playerHeroLogic.onHeroPower) return;
    currentMana -= heroPowerCost;
    heroPowerUsed = true;
    heroPowerMode = false;
    playerHeroLogic.onHeroPower(GameInterface, playerHeroCard, target);
    checkDeaths();
    updateUI();
    emitStateSync({ type: "heroPower", heroId: playerHeroCard.id });
}

function updateHeroPowerBtn() {
    const btn = $("#hero-power-btn");
    if (!playerHeroCard) { btn.hide(); return; }
    btn.show();
    const canUse = myTurn && !heroPowerUsed && currentMana >= heroPowerCost && !gameEnded;
    btn.prop("disabled", !canUse);
    btn.text(`⚡ ${heroPowerCost}💎`);
    btn.toggleClass("hero-power-active", heroPowerMode);
}
