// ==========================================
// FILE: hero-select.js — Výběr hrdiny a inicializace hry
// ==========================================

function showHeroSelection(isFirst, oppName) {
    $("#hero-selection").css("display", "flex");
    $("#result-overlay").hide();
    $("#hero-list").empty();

    gameEnded = false;
    myHeroChoice = null;
    opponentHeroId = null;
    pendingIsFirst = isFirst;
    pendingOppName = oppName;

    const inventoryHeroIds = new Set(myInventoryCards.filter(c => c.type === "Hero").map(c => c.id));
    let heroes = CardDB.filter(c => c.type === "Hero" && inventoryHeroIds.has(c.id));

    if (heroes.length === 0) {
        $("#hero-list").html(`
            <div style="color:red; font-family:'Western'; font-size:20px; text-align:center; padding:60px 20px;">
                Nemáš žádnou hero kartu v inventáři!<br>Otevři balíček karet a získej hrdinu.
            </div>
        `);
        return;
    }

    const deckCards = myInventoryCards.filter(c => c.type !== "Hero" && !c.token);
    if (deckCards.length < 20) {
        $("#hero-list").html(`
            <div style="color:red; font-family:'Western'; font-size:20px; text-align:center; padding:60px 20px;">
                Nemáš dostatek karet pro hru!<br>Potřebuješ alespoň 20 karet (máš ${deckCards.length}).<br>Otevři více balíčků karet.
            </div>
        `);
        return;
    }

    heroes.forEach(hero => {
        let el = $(`
            <div class="hero-option">
                <img src="${getImgName(hero)}" style="width:160px; height:240px; object-fit:cover;">
                <div style="margin-top:10px; color:gold; font-family:'Western'; font-size:18px;">${hero.name}</div>
            </div>
        `);
        el.click(() => {
            if (isSinglePlayer) {
                $("#hero-selection").hide();
                initGame(isFirst, oppName, hero, null);
            } else {
                myHeroChoice = hero;
                emitAction("heroSelected", { heroId: hero.id });
                $("#hero-list").empty().html(`
                    <div style="color:gold; font-family:'Western'; font-size:22px; text-align:center; padding:60px 20px;">
                        Waiting for opponent to choose their hero...
                    </div>
                `);
                if (opponentHeroId !== null) {
                    startGameWithHeroes();
                }
            }
        });
        $("#hero-list").append(el);
    });
}

function startGameWithHeroes() {
    let enemyHeroTemplate = CardDB.find(c => c.id === opponentHeroId && c.type === "Hero") || null;
    $("#hero-selection").hide();
    initGame(pendingIsFirst, pendingOppName, myHeroChoice, enemyHeroTemplate);
}

function initGame(isFirst, oppName, chosenHero, enemyHeroOverride) {
    isHost = isFirst;

    // Reset proměnných
    currentMana = 1; maxMana = 1;
    playerHand = []; playerBoard = [];
    enemyBoard = []; enemyHandAI = [];
    playerGraveyard = []; enemyGraveyard = [];
    playerDeck = []; enemyDeck = [];
    selectedCardIndex = -1; selectedAttacker = null;
    gameEnded = false;
    mpEnemyHandCount = 4;
    moveHistory = []; $("#history-list").empty();
    $("#history-panel").show();
    if (isDebug) setupDebugUI(); else teardownDebugUI();

    // Nastavení hráče
    playerHp = chosenHero.hp;
    playerMaxHp = chosenHero.hp;
    $("#player-name").text(chosenHero.name);
    $("#player-hero").css("background-image", `url('${getImgName(chosenHero)}')`);

    // Hero Power
    playerHeroCard = chosenHero;
    playerHeroLogic = getCardLogic(chosenHero);
    heroPowerUsed = false;
    heroPowerMode = false;
    const powerMatch = chosenHero.text.match(/hero power \((\d+) grit\)/i);
    heroPowerCost = powerMatch ? parseInt(powerMatch[1]) : 2;

    // Nastavení oponenta
    let enemyHero = enemyHeroOverride || CardDB.filter(c => c.type === "Hero" && c.id !== chosenHero.id)[0] || CardDB[80];
    enemyHeroCard = enemyHero;
    enemyHp = enemyHero.hp;
    enemyMaxHp = enemyHero.hp;
    $("#opp-name").text(oppName);
    $("#opp-hero").css("background-image", `url('${getImgName(enemyHero)}')`);

    // Nastavení tahu
    myTurn = isFirst;
    $("#game-message").text(myTurn ? "YOUR TURN" : "ENEMY TURN");
    $("#end-turn-btn").prop("disabled", !myTurn);

    // Inicializace balíčků
    playerDeck = buildDeck(26);
    enemyDeck = buildDeck(26);

    // Počáteční lízání (4 karty)
    for (let i = 0; i < 4; i++) drawCard("player");
    if (isSinglePlayer) {
        for (let i = 0; i < 4; i++) drawCard("enemy");
    }

    updateUI();
}
