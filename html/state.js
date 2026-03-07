// ==========================================
// FILE: state.js — Globální stav hry
// ==========================================

// Mana
let currentMana = 1;
let maxMana = 1;

// Karty v ruce / na stole / v balíčku
let playerHand = [];
let playerBoard = [];
let playerDeck = [];

let enemyHandAI = [];
let enemyBoard = [];
let enemyDeck = [];

// Životy
let playerHp = 30;
let playerMaxHp = 30;
let enemyHp = 30;
let enemyMaxHp = 30;

// Stavy hry
let myTurn = false;
let isSinglePlayer = false;
let gameEnded = false;
let mpEnemyHandCount = 5;
let isHost = false;

// Hero selection (MP synchronizace)
let myHeroChoice = null;
let opponentHeroId = null;
let pendingIsFirst = false;
let pendingOppName = "";
let myInventoryCards = [];

// Hřbitovy
let playerGraveyard = [];
let enemyGraveyard = [];

// Debug mód
let isDebug = false;

// Interakce
let selectedCardIndex = -1;
let selectedAttacker = null;

// Hero Power
let playerHeroCard = null;
let enemyHeroCard = null;
let playerHeroLogic = null;
let heroPowerUsed = false;
let heroPowerMode = false;
let heroPowerCost = 2;

// Historie tahů
let moveHistory = [];
