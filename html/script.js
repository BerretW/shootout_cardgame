let currentMana = 1;
let maxMana = 1;
let playerHand = [];
let playerBoard = [];
let enemyBoard = [];
let myTurn = true;

// Pomocná funkce pro vytvoření názvu obrázku
function getImgName(card) {
    // ID_Type_Name.png -> nahradit mezery podtržítky
    let safeName = card.name.replace(/ /g, "_");
    return `img/${card.id}_${card.type}_${safeName}.png`;
}

// Inicializace
$(document).ready(function() {
    window.addEventListener('message', function(event) {
        if (event.data.type === "ui") {
            if (event.data.status) {
                $("#game-container").show();
                startGame();
            } else {
                $("#game-container").hide();
            }
        }
    });

    document.onkeyup = function (data) {
        if (data.which == 27) { // ESC
            $.post('https://shootout_cardgame/exit', JSON.stringify({}));
        }
    };
});

function startGame() {
    // Reset hry
    currentMana = 1;
    maxMana = 1;
    playerHand = [];
    playerBoard = [];
    
    // Lízni 4 karty (simulace)
    for(let i=0; i<4; i++) drawCard();
    updateUI();
}

function drawCard() {
    // Vybere náhodnou kartu z DB (zde bys měl opravdový balíček)
    let randomCardTemplate = CardDB[Math.floor(Math.random() * CardDB.length)];
    
    // Vytvoří instanci karty
    let newCard = {
        ...randomCardTemplate,
        instanceId: Date.now() + Math.random(),
        logic: getCardLogic(randomCardTemplate),
        canAttack: false
    };
    
    playerHand.push(newCard);
    updateUI();
}

function playCard(index) {
    if (!myTurn) return;
    
    let card = playerHand[index];
    if (card.cost > currentMana) return;

    // Platba Manou
    currentMana -= card.cost;
    
    // Odstranit z ruky
    playerHand.splice(index, 1);

    if (card.type === "Unit" || card.type === "Landmark") {
        // Vyložit na stůl
        playerBoard.push(card);
        
        // Battlecry trigger (pokud nepotřebuje cíl - zjednodušeno)
        if (card.logic.onPlay) {
            card.logic.onPlay(GameInterface, card, null);
        }

        // Ambush check
        if (card.logic.keywords.includes("Ambush")) {
            card.canAttack = true;
        }
    } else if (card.type === "Spell") {
        // Spelly jdou rovnou do hrobu po efektu
        if (card.logic.onPlay) {
            // Tady bys normálně vybíral cíl, pro demo aplikujeme na náhodného nepřítele
            card.logic.onPlay(GameInterface, card, enemyBoard[0] || null);
        }
    }

    updateUI();
}

function endTurn() {
    myTurn = false;
    $("#game-message").text("ENEMY TURN");
    $("#end-turn-btn").prop("disabled", true);
    
    // Simulace AI soupeře
    setTimeout(() => {
        myTurn = true;
        if (maxMana < 10) maxMana++;
        currentMana = maxMana;
        drawCard();
        
        // Probuzení jednotek
        playerBoard.forEach(c => c.canAttack = true);
        
        $("#game-message").text("YOUR TURN");
        $("#end-turn-btn").prop("disabled", false);
        updateUI();
    }, 2000);
}

// Interface pro kartu, aby mohla ovlivňovat hru
const GameInterface = {
    board: playerBoard,
    enemyBoard: enemyBoard,
    damageAll: (amt) => { console.log(`Dealt ${amt} to all`); },
    drawCard: (owner, amt) => { for(let i=0; i<amt; i++) drawCard(); },
    dealDamage: (target, amt) => {
        if(target) target.hp -= amt;
        // Check death logic here
    }
};

function updateUI() {
    $("#player-mana").text(`Grit: ${currentMana}/${maxMana}`);
    
    // Render Hand
    $("#player-hand").empty();
    playerHand.forEach((card, index) => {
        let cardHTML = createCardHTML(card);
        let el = $(cardHTML).addClass(card.cost <= currentMana ? "playable" : "");
        el.click(() => playCard(index));
        $("#player-hand").append(el);
    });

    // Render Board
    $("#player-board").empty();
    playerBoard.forEach((card) => {
        let el = $(createCardHTML(card));
        if (card.canAttack) el.css("border-color", "green");
        $("#player-board").append(el);
    });
}

function createCardHTML(card) {
    let imgPath = getImgName(card);
    let stats = card.type === "Unit" ? `
        <div class="stat-box atk">${card.atk}</div>
        <div class="stat-box hp">${card.hp}</div>
    ` : "";
    
    return `
    <div class="card">
        <div class="stat-box cost">${card.cost}</div>
        ${stats}
        <div class="card-top">
            <img src="${imgPath}" onerror="this.src='https://via.placeholder.com/120x90?text=No+Image'">
        </div>
        <div class="card-bottom">
            <div class="card-title">${card.name}</div>
            <div>${card.text}</div>
        </div>
    </div>`;
}