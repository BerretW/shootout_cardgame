// ==========================================
// FILE: nui.js — NUI komunikace a inicializace
// ==========================================

$(document).ready(function() {
    // Inicializace mute stavu
    soundMuted = localStorage.getItem('shootout_muted') === '1';
    $('#sound-btn').text(soundMuted ? '🔇' : '🔊');

    // Naslouchání zprávám z LUA (Client)
    window.addEventListener('message', function(event) {
        let data = event.data;

        if (data.type === "ui") {
            if (data.status) {
                $("#game-container").show();
            } else {
                $("#game-container").hide();
            }
        }
        else if (data.type === "start_game") {
            initCardDB(data.cards);
            myInventoryCards = data.myCards || [];
            isSinglePlayer = false;
            showHeroSelection(data.isFirst, data.opponentName);
        }
        else if (data.type === "start_singleplayer") {
            initCardDB(data.cards);
            myInventoryCards = data.myCards || [];
            isSinglePlayer = true;
            isDebug = data.debug === true;
            showHeroSelection(true, "Training Bot");
        }
        else if (data.type === "enemy_action") {
            if (!isSinglePlayer) handleRemoteAction(data.action);
        }
        else if (data.type === "game_over") {
            showNotification(data.message, 4000);
            setTimeout(exitGame, 4000);
        }
        else if (data.type === "pack_opened") {
            if ((!CardDB || CardDB.length === 0) && data.allCards) initCardDB(data.allCards);
            showPackOpening(data.packId, data.cards);
        }
        else if (data.type === "show_card") {
            if ((!CardDB || CardDB.length === 0) && data.allCards) initCardDB(data.allCards);
            showCardOverlay(data.card);
        }
    });

    // Tooltip pro karty v historii tahů
    $(document).on('mouseenter', '.hist-card-name', function() {
        let cardId = $(this).data('id');
        let cardData = CardDB.find(c => c.id == cardId);
        if (cardData) {
            let dummyCard = { ...cardData, gear: [] };
            if (dummyCard.type === "Unit" || dummyCard.type === "Landmark") {
                dummyCard.keywords = getCardLogic(dummyCard).keywords || [];
            }
            showCardTooltip(dummyCard);
        }
    });

    $(document).on('mouseleave', '.hist-card-name', function() {
        hideCardTooltip();
    });

    // Klávesové zkratky
    document.onkeyup = function(data) {
        if (data.which == 27) { // ESC
            if ($("#card-zoom").is(":visible")) {
                hideCardZoom();
            } else {
                exitGame();
            }
        }
        else if (data.which == 2) {
            cancelSelection();
        }
    };

    // Pravé tlačítko mimo kartu zavře zoom
    $(document).on("contextmenu", function(e) {
        if (!$(e.target).closest('.card').length) {
            e.preventDefault();
            hideCardZoom();
        }
    });

    // Levé kliknutí zavře zoom
    $(document).on("click", function() { hideCardZoom(); });

    // Kliknutí mimo zruší výběr
    $(document).mousedown(function(e) {
        const t = $(e.target);
        if (!t.closest('.card').length &&
            !t.closest('#end-turn-btn').length &&
            !t.closest('.hero-portrait').length &&
            !t.closest('.hero-wrapper').length) {
            cancelSelection();
        }
    });
});

// ==========================================
// UTILITY FUNKCE
// ==========================================

function addToHistory(text) {
    moveHistory.unshift(text);
    if (!isDebug && moveHistory.length > 20) moveHistory.pop();

    const list = $("#history-list");
    list.empty();
    moveHistory.forEach(entry => {
        list.append(`<div class="history-entry">${entry}</div>`);
    });
}

function showNotification(msg, duration) {
    duration = duration || 3000;
    $("#game-notification").text(msg).show().css("opacity", 1);
    clearTimeout(showNotification._timer);
    showNotification._timer = setTimeout(() => {
        $("#game-notification").animate({ opacity: 0 }, 400, function() { $(this).hide(); });
    }, duration);
}

function cancelSelection() {
    selectedCardIndex = -1;
    selectedAttacker = null;
    heroPowerMode = false;
    updateUI();
}

function confirmExitGame() {
    if (!isSinglePlayer) emitAction("playerAborted", {});
    $("#confirm-overlay").css("display", "flex");
}

function exitGame() {
    $.post('https://shootout_cardgame/exit', JSON.stringify({}));
    $("#game-container").hide();
    $("#result-overlay").hide();
    $("#confirm-overlay").hide();
    $("#hero-selection").hide();
    $("#history-panel").hide();

    teardownDebugUI();
    isDebug = false;
    gameEnded = true;
}
