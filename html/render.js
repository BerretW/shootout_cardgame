// ==========================================
// FILE: render.js — Renderování UI
// ==========================================

// ==========================================
// AURY (pasivní efekty Landmarků)
// ==========================================

function applyAuras() {
    const hasTotemPole    = playerBoard.some(b => b.id === 65);
    const hasHuntingGround = playerBoard.some(b => b.id === 105);
    const hasGangLeader  = playerBoard.some(b => b.id === 35);
    const hasHideout     = playerBoard.some(b => b.id === 64);
    const hasGallows     = playerBoard.some(b => b.id === 68);

    playerBoard.forEach(u => {
        // --- ATK aura ---
        let newAuraAtk = 0;
        if ((hasTotemPole || hasHuntingGround) && u.faction === "Wild") newAuraAtk += 1;
        // GRIZZLY (id:11): +3 ATK while damaged
        if (u.id === 11 && u.hp < u.maxHp) newAuraAtk += 3;
        // NIGHT FOLK (id:16): +2 ATK if player HP < enemy HP
        if (u.id === 16 && playerHp < enemyHp) newAuraAtk += 2;

        let atkDiff = newAuraAtk - (u.auraAtk || 0);
        u.atk = Math.max(0, u.atk + atkDiff);
        u.auraAtk = newAuraAtk;

        // --- HP aura (NIGHT FOLK: +2 HP conditionally) ---
        let newAuraHp = 0;
        if (u.id === 16 && playerHp < enemyHp) newAuraHp += 2;

        let hpDiff = newAuraHp - (u.auraHp || 0);
        if (hpDiff !== 0) {
            u.maxHp += hpDiff;
            u.hp = Math.max(1, Math.min(u.hp + hpDiff, u.maxHp));
        }
        u.auraHp = newAuraHp;

        // --- Keyword aury ---
        let prevAuraKw = u.auraKeywords || [];
        u.keywords = u.keywords.filter(k => !prevAuraKw.includes(k));

        let newAuraKeywords = [];
        if (hasGangLeader && u.faction === "Outlaw" && u.id !== 35) newAuraKeywords.push("Ambush");
        if (hasHideout && u.type === "Unit" && !u.keywords.includes("Guardian")) newAuraKeywords.push("Stealth");

        newAuraKeywords.forEach(k => { if (!u.keywords.includes(k)) u.keywords.push(k); });
        u.auraKeywords = newAuraKeywords;
    });

    // Enemy board: THE GALLOWS -1 ATK
    enemyBoard.forEach(u => {
        let newAuraAtk = hasGallows ? -1 : 0;
        let atkDiff = newAuraAtk - (u.auraAtk || 0);
        u.atk = Math.max(0, u.atk + atkDiff);
        u.auraAtk = newAuraAtk;
    });
}

// ==========================================
// HLAVNÍ UI UPDATE
// ==========================================

function updateUI() {
    applyAuras();
    updateHeroPowerBtn();

    $("#player-mana").html(`💎 ${currentMana} / ${maxMana}`);
    $("#opp-mana").html(`💎 ${isSinglePlayer ? maxMana : "?"} / ?`);
    $("#player-hero .hp-badge").text(playerHp);
    $("#opp-hero .hp-badge").text(enemyHp);
    $("#deck-count").text(playerDeck.length);
    $("#player-grave-count").text(playerGraveyard.length);
    $("#opp-grave-count").text(enemyGraveyard.length);

    // --- RENDER PLAYER HAND ---
    $("#player-hand").empty();
    playerHand.forEach((card, index) => {
        let el = $(createCardHTML(card, "hand"));

        if (getCardCost(card) <= currentMana && myTurn) el.addClass("card-playable");
        if (index === selectedCardIndex) el.addClass("card-selected");

        el.click(() => handleCardClick(index));
        el.on("mouseenter", () => { showCardTooltip(card); SoundFX.hover(); });
        el.on("mouseleave", hideCardTooltip);
        el.on("contextmenu", (e) => { e.preventDefault(); showCardZoom(card); });

        $("#player-hand").append(el);
    });

    // --- RENDER BOARDS ---
    renderBoard($("#player-board"), playerBoard, false);
    renderBoard($("#opp-board"), enemyBoard, true);

    // --- RENDER ENEMY HAND ---
    $("#opp-hand").empty();
    if (isDebug && isSinglePlayer) {
        enemyHandAI.forEach(card => {
            let el = $(createCardHTML(card, "hand"));
            el.addClass("debug-enemy-card");
            el.on("mouseenter", () => showCardTooltip(card));
            el.on("mouseleave", hideCardTooltip);
            el.on("contextmenu", (e) => { e.preventDefault(); showCardZoom(card); });
            $("#opp-hand").append(el);
        });
    } else {
        let count = isSinglePlayer ? enemyHandAI.length : mpEnemyHandCount;
        for (let i = 0; i < count; i++) {
            $("#opp-hand").append(`<div class="card-back"></div>`);
        }
    }

    // Zvýraznění enemy hrdiny jako cíle útoku nebo spellu
    const heroAttackable = selectedAttacker && myTurn &&
        !enemyBoard.some(u => u.keywords.includes("Guardian"));
    let heroSpellTargetable = false;
    if (selectedCardIndex > -1 && myTurn) {
        let sc = playerHand[selectedCardIndex];
        let st = sc.text.toLowerCase();
        heroSpellTargetable = st.includes("hero") ||
            ((st.includes("deal") || st.includes("damage")) && (st.includes("enemy") || st.includes("any")));
    }
    $("#opp-hero").toggleClass("hero-targetable", !!(heroAttackable || heroSpellTargetable));

    $("#opp-hero").off("click mousedown contextmenu")
        .on("mousedown", function(e) { e.stopPropagation(); })
        .on("click", handleEnemyHeroClick)
        .on("contextmenu", (e) => { e.preventDefault(); if (enemyHeroCard) showCardZoom(enemyHeroCard); });

    $("#player-hero").off("contextmenu")
        .on("contextmenu", (e) => { e.preventDefault(); if (playerHeroCard) showCardZoom(playerHeroCard); });
}

function renderBoard(container, boardData, isEnemy) {
    container.empty();
    boardData.forEach((card) => {
        let el = $(createCardHTML(card, "board"));

        if (card.keywords.includes("Guardian")) el.addClass("guardian-glow");
        if (card.keywords.includes("Stealth")) el.addClass("stealth-visual");

        if (!isEnemy && card.type === "Unit") {
            if (card.canAttack && myTurn) el.addClass("card-ready");
            else el.addClass("card-exhausted");
        }

        if (selectedAttacker === card) {
            el.removeClass("card-ready").addClass("card-attacker");
        }

        // Platný cíl útoku
        if (isEnemy && selectedAttacker && myTurn) {
            const hasGuardian = enemyBoard.some(u => u.keywords.includes("Guardian"));
            const isValidTarget = !card.keywords.includes("Stealth") &&
                (!hasGuardian || card.keywords.includes("Guardian"));
            if (isValidTarget) el.addClass("card-targetable");
        }

        // Zvýraznění cílů spellu / gearu
        if (selectedCardIndex > -1 && myTurn) {
            let sc = playerHand[selectedCardIndex];
            let st = sc ? sc.text.toLowerCase() : "";
            let targetsEnemies = isEnemy &&
                !card.keywords.includes("Stealth") && card.id !== 43 &&
                (st.includes("deal") || st.includes("destroy") ||
                 st.includes("choose an enemy") || st.includes("silence") ||
                 st.includes("return a unit") || st.includes("enemy unit"));
            let targetsFriendly = !isEnemy &&
                (sc && sc.type === "Gear" ||
                 st.includes("give") || st.includes("heal") ||
                 st.includes("return a friendly") || st.includes("copy"));
            if (targetsEnemies || targetsFriendly) el.addClass("card-targetable");
        }

        el.click(() => handleUnitClick(card, isEnemy));
        el.on("mouseenter", () => { showCardTooltip(card); SoundFX.hover(); });
        el.on("mouseleave", hideCardTooltip);
        el.on("contextmenu", (e) => { e.preventDefault(); showCardZoom(card); });
        container.append(el);
    });
}

// ==========================================
// TOOLTIP
// ==========================================

function showCardTooltip(card) {
    let statsHtml = "";
    if (card.type !== "Spell" && card.type !== "Gear") {
        statsHtml = `⚔️ <b>${card.atk}</b> &nbsp; ❤️ <b>${card.hp}</b>`;
        if (card.keywords && card.keywords.length > 0) {
            statsHtml += `<br><span style="color:#d4af37;font-size:10px;">${card.keywords.join(", ")}</span>`;
        }
    }
    let costDisplay = getCardCost(card);
    let costStr = costDisplay < card.cost
        ? `<span style="color:#76ff03">${costDisplay}</span> <span style="text-decoration:line-through;color:#888">${card.cost}</span>`
        : `${card.cost}`;

    $("#tt-name").text(card.name);
    $("#tt-meta").text(`${card.faction} · ${card.type}`);
    $("#tt-cost").html(`💎 ${costStr} Grit`);
    $("#tt-stats").html(statsHtml);
    $("#tt-text").text(card.text || "");

    let gearHtml = "";
    if (card.gear && card.gear.length > 0) {
        card.gear.forEach(g => {
            gearHtml += `
                <div class="tt-gear-item">
                    <div class="tt-gear-name">🔧 ${g.name}</div>
                    <div class="tt-gear-text">${g.text || ""}</div>
                </div>`;
        });
    }
    $("#tt-gear").html(gearHtml);

    $("#card-tooltip").show();
}

function hideCardTooltip() {
    $("#card-tooltip").hide();
}

// ==========================================
// ZOOM KARTY (pravé tlačítko)
// ==========================================

function showCardZoom(card) {
    let imgPath = getImgName(card);
    $("#card-zoom-img").attr("src", imgPath);

    const rarityClass = RARITY_CLASS[card.rarity] || 'r-common';
    const face = document.getElementById('card-zoom-face');
    face.className = rarityClass;
    document.getElementById('cz-rarity-badge').textContent = card.rarity || '';

    $("#cz-name").text(card.name);
    $("#cz-meta").text(`${card.faction} · ${card.type}`);

    let costDisplay = (typeof getCardCost === "function") ? getCardCost(card) : card.cost;
    let costStr = costDisplay < card.cost
        ? `💎 <span style="color:#76ff03">${costDisplay}</span> <span style="text-decoration:line-through;color:#666">${card.cost}</span> Grit`
        : `💎 ${card.cost} Grit`;
    $("#cz-cost").html(costStr);

    if (card.type !== "Spell" && card.type !== "Gear") {
        let atkColor = card.atk > card.baseAtk ? "#76ff03" : "#eee";
        let hpColor  = card.hp < card.maxHp ? "#ff5252" : (card.hp > card.baseHp ? "#76ff03" : "#eee");
        $("#cz-stats").html(
            `⚔️ <span style="color:${atkColor};font-weight:bold">${card.atk}</span>` +
            `&nbsp;&nbsp;❤️ <span style="color:${hpColor};font-weight:bold">${card.hp}</span>` +
            (card.maxHp !== card.hp ? ` <span style="color:#666;font-size:10px">/${card.maxHp}</span>` : "")
        );
    } else {
        $("#cz-stats").html("");
    }

    let kw = (card.keywords && card.keywords.length > 0) ? card.keywords.join(" · ") : "";
    $("#cz-keywords").text(kw);
    $("#cz-text").text(card.text || "");

    let gearHtml = "";
    if (card.gear && card.gear.length > 0) {
        card.gear.forEach(g => {
            gearHtml += `<div class="cz-gear-item"><div class="cz-gear-name">🔧 ${g.name}</div><div>${g.text || ""}</div></div>`;
        });
    }
    $("#cz-gear").html(gearHtml);

    const el = document.getElementById("card-zoom");
    el.style.display = "block";
    el.style.animation = "none";
    void el.offsetWidth;
    el.style.animation = "";

    SoundFX.zoom();
}

function hideCardZoom() {
    $("#card-zoom").hide();
}

// ==========================================
// HŘBITOV & INSPEKTOR BALÍČKU
// ==========================================

function showGraveyard(owner) {
    let grave = owner === "player" ? playerGraveyard : enemyGraveyard;
    let title = owner === "player" ? "Tvůj hřbitov" : "Hřbitov protivníka";
    $("#graveyard-title").text(`${title} (${grave.length})`);

    let container = $("#graveyard-cards").empty();
    if (grave.length === 0) {
        container.html('<div style="color:#888;text-align:center;padding:20px;font-family:sans-serif;">Hřbitov je prázdný.</div>');
    } else {
        [...grave].reverse().forEach(card => {
            let statsHtml = (card.type !== "Spell" && card.type !== "Gear")
                ? `<div class="grave-card-stats">⚔️${card.atk} ❤️${card.maxHp}</div>` : "";
            let el = $(`
                <div class="grave-card-item">
                    <img src="${getImgName(card)}" class="grave-card-img" onerror="this.src='img/card_back.png'">
                    <div class="grave-card-info">
                        <div class="grave-card-name">${card.name}</div>
                        <div class="grave-card-type">${card.faction} · ${card.type}</div>
                        ${statsHtml}
                        <div class="grave-card-text">${card.text || ""}</div>
                    </div>
                </div>
            `);
            container.append(el);
        });
    }
    $("#graveyard-modal").show();
}

function showDeckInspector(owner) {
    let deck = owner === "player" ? playerDeck : enemyDeck;
    let title = owner === "player" ? "Tvůj balíček" : "Balíček protivníka";
    $("#graveyard-title").text(`${title} (${deck.length} karet)`);

    let container = $("#graveyard-cards").empty();
    if (deck.length === 0) {
        container.html('<div style="color:#888;text-align:center;padding:20px;font-family:sans-serif;">Balíček je prázdný.</div>');
    } else {
        let grouped = {};
        deck.forEach(card => {
            let key = card.id;
            if (!grouped[key]) grouped[key] = { card, count: 0 };
            grouped[key].count++;
        });
        Object.values(grouped).forEach(({ card, count }) => {
            let statsHtml = (card.type !== "Spell" && card.type !== "Gear")
                ? `<div class="grave-card-stats">⚔️${card.atk} ❤️${card.maxHp}</div>` : "";
            let countBadge = count > 1 ? `<div class="deck-inspector-count">×${count}</div>` : "";
            let el = $(`
                <div class="grave-card-item">
                    <img src="${getImgName(card)}" class="grave-card-img" onerror="this.src='img/card_back.png'">
                    <div class="grave-card-info">
                        <div class="grave-card-name">${card.name} ${countBadge}</div>
                        <div class="grave-card-type">${card.faction} · ${card.type} · 💎${card.cost}</div>
                        ${statsHtml}
                        <div class="grave-card-text">${card.text || ""}</div>
                    </div>
                </div>
            `);
            el.on("mouseenter", () => showCardTooltip({ ...card, gear: [] }));
            el.on("mouseleave", hideCardTooltip);
            container.append(el);
        });
    }
    $("#graveyard-modal").show();
}

// ==========================================
// DEBUG UI
// ==========================================

function setupDebugUI() {
    if ($("#debug-badge").length === 0) {
        $("body").append(`<div id="debug-badge">🔧 DEBUG</div>`);
    }
    if ($("#debug-deck-btns").length === 0) {
        $("#player-deck").css("cursor", "pointer").attr("title", "Klikni pro inspekci svého balíčku");
        $("#player-deck").on("click.debug", () => showDeckInspector("player"));
        $(".player-area.opponent .hero-wrapper").append(
            `<div id="debug-deck-btns"><button class="debug-deck-btn" onclick="showDeckInspector('enemy')">🃏 AI Deck</button></div>`
        );
    }
    $("#history-panel").addClass("debug-history");
}

function teardownDebugUI() {
    $("#debug-badge").remove();
    $("#debug-deck-btns").remove();
    $("#player-deck").off("click.debug").css("cursor", "").removeAttr("title");
    $("#history-panel").removeClass("debug-history");
}

// ==========================================
// HTML STRUKTURA KARTY
// ==========================================

function createCardHTML(card, context) {
    let imgPath = getImgName(card);
    let stats = "";

    if (card.type !== "Spell" && card.type !== "Gear") {
        let atkClass = "atk";
        if (card.atk > card.baseAtk) atkClass += " stat-buff";

        let hpClass = "hp";
        if (card.hp < card.maxHp) hpClass += " stat-dmg";
        else if (card.hp > card.baseHp) hpClass += " stat-buff";

        stats = `
            <div class="stat-box ${atkClass}">${card.atk}</div>
            <div class="stat-box ${hpClass}">${card.hp}</div>
        `;
    }

    let displayCost = context === "hand" ? getCardCost(card) : card.cost;
    let costClass = (context === "hand" && displayCost < card.cost) ? "stat-box cost stat-buff" : "stat-box cost";
    let costHtml = context === "hand" ? `<div class="${costClass}">${displayCost}</div>` : "";

    let gearHtml = "";
    if (context === "board" && card.gear && card.gear.length > 0) {
        gearHtml = `<div class="gear-container">`;
        card.gear.forEach(g => {
            gearHtml += `<img src="${getImgName(g)}" class="gear-icon">`;
        });
        gearHtml += `</div>`;
    }

    return `
    <div class="card">
        ${costHtml}
        <div class="card-frame">
            <img class="card-img" src="${imgPath}" onerror="this.src='img/card_back.png'">
            <div class="card-name-tag">${card.name}</div>
        </div>
        ${gearHtml}
        ${stats}
    </div>`;
}
