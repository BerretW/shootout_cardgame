// ==========================================
// FILE: html/cards.js
// ==========================================

// CardDB je naplněn daty z Lua (Config.Cards) přes SendNUIMessage při startu hry.
// Viz client.lua -> start_game / start_singleplayer -> data.cards
let CardDB = [];

// Interní záložní pole pro případ spuštění mimo FiveM (např. testování v prohlížeči)
const _CardDB_fallback = [
    // --- LAW ---
    {id: 1, faction: "Law", name: "IRON SHERIFF", type: "Unit", cost: 5, atk: 4, hp: 5, text: "Battlecry: Give other Law units +1/+1"},
    {id: 2, faction: "Law", name: "MARSHAL", type: "Unit", cost: 6, atk: 3, hp: 7, text: "Guardian"},
    {id: 3, faction: "Law", name: "DETECTIVE", type: "Unit", cost: 3, atk: 2, hp: 3, text: "Battlecry: Look at enemy hand"},
    {id: 4, faction: "Law", name: "HANDCUFFS", type: "Spell", cost: 2, atk: 0, hp: 0, text: "Choose an enemy Unit. It can't attack next turn."},
    {id: 5, faction: "Law", name: "WANTED POSTER", type: "Spell", cost: 2, atk: 0, hp: 0, text: "Draw 2 cards."},
    {id: 24, faction: "Law", name: "GATLING GUN", type: "Gear", cost: 5, atk: 0, hp: 0, text: "Give a Unit +3 Attack. It also damages neighbors of target."},
    {id: 26, faction: "Law", name: "THE HANGMAN", type: "Unit", cost: 5, atk: 5, hp: 4, text: "Battlecry: Destroy a damaged Unit."},
    {id: 27, faction: "Law", name: "OIL TYCOON", type: "Unit", cost: 4, atk: 1, hp: 5, text: "End of Turn: Gain +1 Grit."},
    {id: 28, faction: "Law", name: "RAILROAD BOSS", type: "Unit", cost: 3, atk: 3, hp: 3, text: "Battlecry: Give a Landmark +3 Health."},
    {id: 29, faction: "Law", name: "DEPUTY SQUAD", type: "Unit", cost: 4, atk: 3, hp: 3, text: "Battlecry: Summon a copy of this unit."},
    {id: 30, faction: "Law", name: "CELL DOOR", type: "Spell", cost: 2, atk: 0, hp: 0, text: "Return a Unit to its owner's hand."},
    {id: 31, faction: "Law", name: "TELEGRAPH", type: "Unit", cost: 2, atk: 1, hp: 2, text: "Battlecry: Draw 1 card."},
    {id: 32, faction: "Law", name: "SNIPER", type: "Unit", cost: 4, atk: 4, hp: 2, text: "Immune while attacking."},
    {id: 33, faction: "Law", name: "COURTHOUSE", type: "Landmark", cost: 4, atk: 0, hp: 6, text: "Your units have +1 Health."},
    {id: 62, faction: "Law", name: "THE BANK", type: "Landmark", cost: 3, atk: 0, hp: 5, text: "End of Turn: 50% chance to gain 1 Grit."},
    {id: 68, faction: "Law", name: "THE GALLOWS", type: "Landmark", cost: 3, atk: 0, hp: 4, text: "Enemy units have -1 Attack."},
    {id: 74, faction: "Law", name: "SHERIFF BADGE", type: "Gear", cost: 2, atk: 0, hp: 0, text: "Give a Unit +1/+3 and Guardian."},
    {id: 80, faction: "Law", name: "MARSHAL EARP", type: "Hero", cost: 0, atk: 0, hp: 60, text: "Hero Power (2 Grit): Summon a 1/1 Deputy with Guard."},
    {id: 85, faction: "Law", name: "DEPUTY", type: "Unit", cost: 1, atk: 1, hp: 1, text: "Guardian"}, // Token

    // --- OUTLAW ---
    {id: 6, faction: "Outlaw", name: "DYNAMITE", type: "Spell", cost: 5, atk: 0, hp: 0, text: "Deal 3 damage to ALL characters."},
    {id: 7, faction: "Outlaw", name: "BANDIT", type: "Unit", cost: 3, atk: 4, hp: 2, text: "Ambush"},
    {id: 8, faction: "Outlaw", name: "DUELIST", type: "Unit", cost: 4, atk: 4, hp: 3, text: "Battlecry: Deal 2 damage."},
    {id: 9, faction: "Outlaw", name: "MOLOTOV", type: "Spell", cost: 3, atk: 0, hp: 0, text: "Deal 4 damage to a Unit."},
    {id: 10, faction: "Outlaw", name: "THE HEIST", type: "Spell", cost: 0, atk: 0, hp: 0, text: "Gain 3 Grit this turn only."},
    {id: 25, faction: "Outlaw", name: "SAFECRACKER", type: "Unit", cost: 2, atk: 2, hp: 2, text: "Battlecry: Silence an enemy Unit."},
    {id: 34, faction: "Outlaw", name: "TRAIN ROBBER", type: "Unit", cost: 3, atk: 4, hp: 3, text: "Last Word: Add a 'Coin' to your hand."},
    {id: 35, faction: "Outlaw", name: "GANG LEADER", type: "Unit", cost: 6, atk: 6, hp: 5, text: "Your other Outlaws have Ambush."},
    {id: 36, faction: "Outlaw", name: "POKER CHEAT", type: "Unit", cost: 3, atk: 3, hp: 3, text: "Battlecry: Discard 1 card, then Draw 1 card."},
    {id: 37, faction: "Outlaw", name: "KNIFE THROWER", type: "Unit", cost: 2, atk: 3, hp: 1, text: "Battlecry: Deal 1 damage to a random enemy."},
    {id: 38, faction: "Outlaw", name: "GUNSLINGER", type: "Unit", cost: 4, atk: 3, hp: 4, text: "Can attack twice per turn."},
    {id: 39, faction: "Outlaw", name: "GETAWAY HORSE", type: "Spell", cost: 1, atk: 0, hp: 0, text: "Return a friendly Unit to hand. Give it +2/+2."},
    {id: 40, faction: "Outlaw", name: "JAILBREAK", type: "Spell", cost: 4, atk: 0, hp: 0, text: "Summon a random Outlaw from your graveyard."},
    {id: 41, faction: "Outlaw", name: "DEAD MANS HAND", type: "Spell", cost: 3, atk: 0, hp: 0, text: "Discard your hand. Draw 3 cards."},
    {id: 64, faction: "Outlaw", name: "HIDEOUT", type: "Landmark", cost: 4, atk: 0, hp: 4, text: "Your Units have Stealth."},
    {id: 79, faction: "Outlaw", name: "BOWIE KNIFE", type: "Gear", cost: 2, atk: 0, hp: 0, text: "Give a Unit +2 Attack and Ambush."},
    {id: 81, faction: "Outlaw", name: "BELLE STARR", type: "Hero", cost: 0, atk: 0, hp: 20, text: "Hero Power (2 Grit): Deal 2 damage to the enemy Hero."},

    // --- WILD ---
    {id: 11, faction: "Wild", name: "GRIZZLY", type: "Unit", cost: 7, atk: 7, hp: 7, text: "Has +3 Attack while damaged."},
    {id: 12, faction: "Wild", name: "WOLF PACK", type: "Unit", cost: 4, atk: 2, hp: 2, text: "Battlecry: Summon two 2/1 Wolves."},
    {id: 13, faction: "Wild", name: "COUGAR", type: "Unit", cost: 4, atk: 5, hp: 3, text: "Stealth"},
    {id: 14, faction: "Wild", name: "SNAKE OIL", type: "Spell", cost: 2, atk: 0, hp: 0, text: "Fully heal a Unit."},
    {id: 15, faction: "Wild", name: "BEAR TRAP", type: "Spell", cost: 2, atk: 0, hp: 0, text: "Deal 3 damage to an undamaged Unit."},
    {id: 42, faction: "Wild", name: "EAGLE", type: "Unit", cost: 2, atk: 2, hp: 1, text: "Battlecry: Reveal the enemy's hand."},
    {id: 43, faction: "Wild", name: "WHITE BISON", type: "Unit", cost: 6, atk: 4, hp: 8, text: "Can't be targeted by Spells or Hero Powers."},
    {id: 44, faction: "Wild", name: "TRAPPER", type: "Unit", cost: 3, atk: 3, hp: 3, text: "Battlecry: Add a 'Bear Trap' to your hand."},
    {id: 45, faction: "Wild", name: "SCOUT", type: "Unit", cost: 2, atk: 2, hp: 3, text: "Battlecry: Gain an empty Grit crystal."},
    {id: 46, faction: "Wild", name: "SHAMAN", type: "Unit", cost: 4, atk: 2, hp: 5, text: "Battlecry: Restore 4 Health to your Hero."},
    {id: 47, faction: "Wild", name: "MUSTANG", type: "Unit", cost: 3, atk: 3, hp: 1, text: "Ambush"},
    {id: 48, faction: "Wild", name: "THUNDERSTORM", type: "Spell", cost: 4, atk: 0, hp: 0, text: "Deal 2 damage to all enemy Units."},
    {id: 65, faction: "Wild", name: "TOTEM POLE", type: "Landmark", cost: 2, atk: 0, hp: 5, text: "Your Wild units have +1 Attack."},
    {id: 70, faction: "Wild", name: "BEAVER DAM", type: "Landmark", cost: 3, atk: 0, hp: 6, text: "Enemy units cost (1) more."},
    {id: 72, faction: "Wild", name: "GREY WOLF", type: "Unit", cost: 1, atk: 2, hp: 1, text: ""}, // Token
    {id: 76, faction: "Wild", name: "WAR PAINT", type: "Gear", cost: 1, atk: 0, hp: 0, text: "Give a Unit +2/+1."},
    {id: 82, faction: "Wild", name: "SITTING BEAR", type: "Hero", cost: 0, atk: 0, hp: 25, text: "Hero Power (2 Grit): Heal a Unit for 2 and give it +1 Health."},

    // --- MYTHOS ---
    {id: 16, faction: "Mythos", name: "NIGHT FOLK", type: "Unit", cost: 3, atk: 3, hp: 3, text: "Has +2/+2 if you have less Health than opponent."},
    {id: 17, faction: "Mythos", name: "VAMPIRE", type: "Unit", cost: 4, atk: 3, hp: 4, text: "Lethal. Restore Health to your Hero equal to damage dealt."},
    {id: 18, faction: "Mythos", name: "GHOST TRAIN", type: "Unit", cost: 5, atk: 8, hp: 8, text: "Ambush. Dies at end of turn. Last Word: Shuffle into deck."},
    {id: 19, faction: "Mythos", name: "OPEN GRAVE", type: "Spell", cost: 2, atk: 0, hp: 0, text: "Return a dead Unit to your hand."},
    {id: 20, faction: "Mythos", name: "CURSED MASK", type: "Gear", cost: 2, atk: 0, hp: 0, text: "Give a Unit +3/+3. Deal 3 damage to your Hero."},
    {id: 49, faction: "Mythos", name: "STRANGE MAN", type: "Unit", cost: 5, atk: 3, hp: 3, text: "Battlecry: Copy a friendly Unit's Attack and Health."},
    {id: 50, faction: "Mythos", name: "VOODOO ALTAR", type: "Landmark", cost: 3, atk: 0, hp: 5, text: "At the start of your turn, deal 1 damage to a random enemy."},
    {id: 51, faction: "Mythos", name: "SASQUATCH", type: "Unit", cost: 7, atk: 8, hp: 8, text: "Stealth"},
    {id: 52, faction: "Mythos", name: "UFO", type: "Spell", cost: 8, atk: 0, hp: 0, text: "Destroy ALL Units."},
    {id: 53, faction: "Mythos", name: "BLIND SEER", type: "Unit", cost: 2, atk: 1, hp: 2, text: "Battlecry: Discover a card from your deck."},
    {id: 54, faction: "Mythos", name: "ANCIENT BONES", type: "Unit", cost: 3, atk: 5, hp: 5, text: "Can't Attack unless it's the only Unit you control."},
    {id: 55, faction: "Mythos", name: "BLOOD RITUAL", type: "Spell", cost: 1, atk: 0, hp: 0, text: "Deal 3 damage to your Hero. Gain 2 Grit."},
    {id: 56, faction: "Mythos", name: "CREEPY DOLL", type: "Gear", cost: 2, atk: 0, hp: 0, text: "Give a Unit -3 Attack."},
    {id: 57, faction: "Mythos", name: "DEVILS CAVE", type: "Landmark", cost: 4, atk: 0, hp: 5, text: "End of Turn: Summon a 1/1 Bat."},
    {id: 58, faction: "Mythos", name: "SWAMP WITCH", type: "Unit", cost: 5, atk: 3, hp: 4, text: "Battlecry: Set a Unit's Attack to 1."},
    {id: 67, faction: "Mythos", name: "OLD GRAVEYARD", type: "Landmark", cost: 4, atk: 0, hp: 5, text: "Last Word on your units: Return them to hand instead of dying."},
    {id: 73, faction: "Mythos", name: "CAVE BAT", type: "Unit", cost: 1, atk: 1, hp: 1, text: ""}, // Token
    {id: 77, faction: "Mythos", name: "SILVER BULLETS", type: "Gear", cost: 3, atk: 0, hp: 0, text: "Give a Unit +2 Attack and Lethal."},
    {id: 83, faction: "Mythos", name: "BARON SAMEDI", type: "Hero", cost: 0, atk: 0, hp: 20, text: "Hero Power (2 Grit): Deal 1 damage. If target dies draw a card."},

    // --- SALOON / NEUTRAL ---
    {id: 21, faction: "Saloon", name: "BARTENDER", type: "Unit", cost: 2, atk: 1, hp: 4, text: "End of Turn: Heal 1 damage from another random Ally."},
    {id: 22, faction: "Saloon", name: "LUCKY COIN", type: "Spell", cost: 0, atk: 0, hp: 0, text: "50% Chance to gain 1 Grit."},
    {id: 23, faction: "Saloon", name: "BAR FIGHT", type: "Spell", cost: 4, atk: 0, hp: 0, text: "Deal 2 damage to ALL Units."},
    {id: 59, faction: "Saloon", name: "SUPPLY WAGON", type: "Unit", cost: 4, atk: 0, hp: 5, text: "Last Word: Draw 2 cards."},
    {id: 60, faction: "Saloon", name: "LOAN SHARK", type: "Unit", cost: 3, atk: 4, hp: 4, text: "Battlecry: Deal 3 damage to your Hero."},
    {id: 61, faction: "Neutral", name: "GENERAL STORE", type: "Landmark", cost: 2, atk: 0, hp: 4, text: "Your Gear cards cost (1) less."},
    {id: 63, faction: "Saloon", name: "GRAND SALOON", type: "Landmark", cost: 3, atk: 0, hp: 5, text: "End of Turn: Heal all friendly characters for 1."},
    {id: 66, faction: "Neutral", name: "TRAIN STATION", type: "Landmark", cost: 3, atk: 0, hp: 4, text: "At the start of your turn, draw an extra card."},
    {id: 69, faction: "Neutral", name: "OIL DERRICK", type: "Landmark", cost: 5, atk: 0, hp: 7, text: "End of Turn: Gain 2 Grit."},
    {id: 71, faction: "Neutral", name: "GOLD COIN", type: "Spell", cost: 0, atk: 0, hp: 0, text: "Gain 1 Grit this turn only."},
    {id: 75, faction: "Neutral", name: "WINCHESTER", type: "Gear", cost: 3, atk: 0, hp: 0, text: "Give a Unit +4 Attack."},
    {id: 78, faction: "Saloon", name: "IRON PONCHO", type: "Gear", cost: 2, atk: 0, hp: 0, text: "Give a Unit +5 Health."},
    {id: 84, faction: "Saloon", name: "DIAMOND JIM", type: "Hero", cost: 0, atk: 0, hp: 25, text: "Hero Power (1 Grit): Add a random 'Coin' to your hand."},

    // === LAW (nové) ===
    {id: 86, faction: "Law", name: "PINKERTON", type: "Unit", cost: 3, atk: 2, hp: 4, text: "Battlecry: Look at the top 3 cards of your deck."},
    {id: 87, faction: "Law", name: "JUDGE'S GAVEL", type: "Spell", cost: 3, atk: 0, hp: 0, text: "Destroy a Unit with 3 or less Attack."},
    {id: 88, faction: "Law", name: "FRONTIER DOC", type: "Unit", cost: 3, atk: 1, hp: 4, text: "Battlecry: Restore 3 Health to your Hero."},
    {id: 89, faction: "Law", name: "PRISON WAGON", type: "Unit", cost: 4, atk: 2, hp: 6, text: "Guardian. Battlecry: Silence a Unit."},
    {id: 90, faction: "Law", name: "LAND SEIZURE", type: "Spell", cost: 5, atk: 0, hp: 0, text: "Destroy all enemy Landmarks."},
    {id: 91, faction: "Law", name: "RANGER CAPTAIN", type: "Unit", cost: 5, atk: 4, hp: 5, text: "Battlecry: Give all other friendly Law units +2 Attack."},
    {id: 92, faction: "Law", name: "RIOT SHIELD", type: "Gear", cost: 2, atk: 0, hp: 0, text: "Give a Unit +4 Health and Guardian."},
    {id: 93, faction: "Law", name: "FORT WORTH", type: "Landmark", cost: 4, atk: 0, hp: 7, text: "Your Units cost (1) less."},

    // === OUTLAW (nové) ===
    {id: 94, faction: "Outlaw", name: "CATTLE RUSTLER", type: "Unit", cost: 2, atk: 3, hp: 1, text: "Ambush. Last Word: Steal 1 Grit from opponent."},
    {id: 95, faction: "Outlaw", name: "SNAKE EYES", type: "Spell", cost: 2, atk: 0, hp: 0, text: "Deal 3 damage to a Unit. If it dies, draw a card."},
    {id: 96, faction: "Outlaw", name: "DESPERADO", type: "Unit", cost: 5, atk: 6, hp: 4, text: "Battlecry: Deal 2 damage to all enemy Units."},
    {id: 97, faction: "Outlaw", name: "SABOTAGE", type: "Spell", cost: 3, atk: 0, hp: 0, text: "Destroy an enemy Landmark."},
    {id: 98, faction: "Outlaw", name: "BLACK BART", type: "Unit", cost: 7, atk: 5, hp: 7, text: "Battlecry: Steal a random card from opponent's hand."},
    {id: 99, faction: "Outlaw", name: "HIGHWAYMAN", type: "Unit", cost: 4, atk: 4, hp: 3, text: "Battlecry: Deal 2 damage to the enemy Hero."},
    {id: 100, faction: "Outlaw", name: "OUTLAW CAMP", type: "Landmark", cost: 3, atk: 0, hp: 5, text: "End of Turn: Give a random Outlaw in your hand +1/+1."},
    {id: 101, faction: "Outlaw", name: "RUSTY REVOLVER", type: "Gear", cost: 1, atk: 0, hp: 0, text: "Give a Unit +2 Attack."},

    // === WILD (nové) ===
    {id: 102, faction: "Wild", name: "HAWK RIDER", type: "Unit", cost: 3, atk: 3, hp: 2, text: "Battlecry: Deal 2 damage to a random enemy Unit."},
    {id: 103, faction: "Wild", name: "STAMPEDE", type: "Spell", cost: 6, atk: 0, hp: 0, text: "Deal 2 damage to all enemy Units. Summon a 3/3 Bull."},
    {id: 104, faction: "Wild", name: "RIVER SPIRIT", type: "Unit", cost: 4, atk: 2, hp: 6, text: "End of Turn: Restore 2 Health to a damaged friendly Unit."},
    {id: 105, faction: "Wild", name: "HUNTING GROUND", type: "Landmark", cost: 2, atk: 0, hp: 4, text: "Your Wild units have +1 Attack."},
    {id: 106, faction: "Wild", name: "PACK ALPHA", type: "Unit", cost: 5, atk: 4, hp: 4, text: "Battlecry: Give all friendly Wolves +2/+2."},
    {id: 107, faction: "Wild", name: "BADGER", type: "Unit", cost: 2, atk: 2, hp: 3, text: "Can't be targeted by Spells."},
    {id: 108, faction: "Wild", name: "TOTEM OF WRATH", type: "Gear", cost: 3, atk: 0, hp: 0, text: "Give a Unit +3 Attack and Ambush."},
    {id: 109, faction: "Wild", name: "BULL", type: "Unit", cost: 3, atk: 3, hp: 3, token: true, text: ""},

    // === MYTHOS (nové) ===
    {id: 110, faction: "Mythos", name: "WENDIGO", type: "Unit", cost: 4, atk: 5, hp: 3, text: "Ambush. Gains +2 Attack each time any Unit dies."},
    {id: 111, faction: "Mythos", name: "CURSED GROUND", type: "Landmark", cost: 3, atk: 0, hp: 5, text: "Units that die here can't be resurrected."},
    {id: 112, faction: "Mythos", name: "SHADOW WALKER", type: "Unit", cost: 3, atk: 2, hp: 3, text: "Stealth. Battlecry: Deal 1 damage to all enemies."},
    {id: 113, faction: "Mythos", name: "WITCH'S BREW", type: "Spell", cost: 2, atk: 0, hp: 0, text: "Give a Unit +3/+3. At end of turn, destroy it."},
    {id: 114, faction: "Mythos", name: "POLTERGEIST", type: "Unit", cost: 2, atk: 1, hp: 3, text: "Battlecry: Return a random enemy Unit to their hand."},
    {id: 115, faction: "Mythos", name: "LICH KING", type: "Unit", cost: 8, atk: 6, hp: 8, text: "Last Word: Return this to your hand with full Health."},
    {id: 116, faction: "Mythos", name: "SOUL HARVEST", type: "Spell", cost: 4, atk: 0, hp: 0, text: "Destroy all damaged Units. Gain 1 Grit for each destroyed."},
    {id: 117, faction: "Mythos", name: "BANSHEE", type: "Unit", cost: 3, atk: 1, hp: 3, text: "Last Word: Deal 3 damage to all enemy Units."},

    // === SALOON / NEUTRAL (nové) ===
    {id: 118, faction: "Saloon", name: "CARD SHARK", type: "Unit", cost: 2, atk: 2, hp: 2, text: "Battlecry: Peek at the top card of your deck."},
    {id: 119, faction: "Saloon", name: "WHISKEY BOTTLE", type: "Spell", cost: 1, atk: 0, hp: 0, text: "Give a Unit +2 Attack until end of turn."},
    {id: 120, faction: "Neutral", name: "BOUNTY HUNTER", type: "Unit", cost: 4, atk: 4, hp: 3, text: "Battlecry: Deal 2 damage to a Unit."},
    {id: 121, faction: "Neutral", name: "PRAIRIE FIRE", type: "Spell", cost: 3, atk: 0, hp: 0, text: "Deal 1 damage to all Units. Repeat 3 times."},
    {id: 122, faction: "Saloon", name: "CANTEEN", type: "Gear", cost: 2, atk: 0, hp: 0, text: "Give a Unit +2 Health. Draw a card."},
    {id: 123, faction: "Saloon", name: "UNDERTAKER", type: "Unit", cost: 3, atk: 2, hp: 4, text: "Each time a friendly Unit dies, gain +1 Grit."},
    {id: 124, faction: "Neutral", name: "CAMPFIRE", type: "Landmark", cost: 2, atk: 0, hp: 3, text: "End of Turn: Restore 1 Health to your Hero."},
    {id: 125, faction: "Neutral", name: "PONY EXPRESS", type: "Unit", cost: 2, atk: 1, hp: 2, text: "Battlecry: Draw a card. Give it (1) less cost."}
];

/**
 * Naplní CardDB z dat odeslaných z Lua přes SendNUIMessage.
 * Lua posílá Config.Cards jako objekt { [id] = {...} }, JS ho převede na pole.
 * Pokud data nepřijdou (testování v prohlížeči), použije se fallback.
 */
function initCardDB(luaCards) {
    if (luaCards && typeof luaCards === "object") {
        CardDB = Object.values(luaCards);
    } else {
        CardDB = _CardDB_fallback;
    }
}

/**
 * Hlavní funkce pro parsování logiky karty.
 * Vrací objekt s funkcemi onPlay, onDeath, onTurnEnd, onTurnStart a seznamem klíčových slov.
 */
function getCardLogic(cardData) {
    let logic = {
        keywords: [],
        onPlay: null,
        onDeath: null,
        onTurnEnd: null,
        onTurnStart: null
    };

    const text = cardData.text ? cardData.text.toLowerCase() : "";
    const id = cardData.id;

    // 1. Klíčová slova
    if (text.includes("guardian")) logic.keywords.push("Guardian");
    if (text.includes("ambush"))   logic.keywords.push("Ambush");
    if (text.includes("stealth"))  logic.keywords.push("Stealth");
    if (text.includes("lethal"))   logic.keywords.push("Lethal");

    // 2. onPlay: Battlecry / Spell / Gear
    if (text.includes("battlecry") || cardData.type === "Spell" || cardData.type === "Gear") {
        logic.onPlay = function(game, selfCard, target) {

            // === Specifická logika dle ID karty ===

            // IRON SHERIFF: Battlecry: Give other Law units +1/+1
            if (id === 1) {
                game.board.filter(u => u.faction === "Law" && u !== selfCard).forEach(u => {
                    u.atk += 1; u.hp += 1; u.maxHp += 1;
                });
                return;
            }

            // HANDCUFFS: Choose an enemy Unit. It can't attack next turn.
            if (id === 4) {
                if (target && target.type === "Unit") target.stunned = true;
                return;
            }

            // THE HANGMAN: Battlecry: Destroy a damaged Unit.
            if (id === 26) {
                if (target && target.hp < target.maxHp) game.destroyUnit(target);
                return;
            }

            // RAILROAD BOSS: Battlecry: Give a Landmark +3 Health.
            if (id === 28) {
                if (target && target.type === "Landmark") { target.hp += 3; target.maxHp += 3; }
                return;
            }

            // DEPUTY SQUAD: Battlecry: Summon a copy of this unit.
            if (id === 29) {
                game.summonUnit(29, selfCard.owner);
                return;
            }

            // CELL DOOR: Return a Unit to its owner's hand.
            if (id === 30) {
                if (target && target.type === "Unit") game.bounceUnit(target, target.owner);
                return;
            }

            // WOLF PACK: Battlecry: Summon two 2/1 Wolves.
            if (id === 12) {
                game.summonUnit(72, selfCard.owner);
                game.summonUnit(72, selfCard.owner);
                return;
            }

            // SAFECRACKER: Battlecry: Silence an enemy Unit.
            if (id === 25) {
                if (target) game.silenceUnit(target);
                return;
            }

            // POKER CHEAT: Battlecry: Discard 1 card, then Draw 1 card.
            if (id === 36) {
                game.discardCards("player", 1);
                game.drawCard("player", 1);
                return;
            }

            // GETAWAY HORSE: Return a friendly Unit to hand. Give it +2/+2.
            if (id === 39) {
                if (target && target.type === "Unit") {
                    target.atk += 2; target.hp += 2; target.maxHp += 2;
                    game.bounceUnit(target, "player");
                }
                return;
            }

            // OPEN GRAVE: Return a dead Unit to your hand.
            if (id === 19) {
                game.returnFromGraveyard("player");
                return;
            }

            // JAILBREAK: Summon a random Outlaw from your graveyard.
            if (id === 40) {
                game.summonFromGraveyard("player", "Outlaw");
                return;
            }

            // DEAD MAN'S HAND: Discard your hand. Draw 3 cards.
            if (id === 41) {
                game.discardAllCards("player");
                game.drawCard("player", 3);
                return;
            }

            // TRAPPER: Battlecry: Add a 'Bear Trap' to your hand.
            if (id === 44) {
                game.addCardToHand("player", 15);
                return;
            }

            // SCOUT: Battlecry: Gain an empty Grit crystal.
            if (id === 45) {
                game.addMaxGrit("player");
                return;
            }

            // STRANGE MAN: Battlecry: Copy a friendly Unit's Attack and Health.
            if (id === 49) {
                if (target && target.type === "Unit") {
                    selfCard.atk = target.atk;
                    selfCard.hp = target.hp;
                    selfCard.maxHp = target.maxHp;
                }
                return;
            }

            // SWAMP WITCH: Battlecry: Set a Unit's Attack to 1.
            if (id === 58) {
                if (target) game.setUnitAttack(target, 1);
                return;
            }

            // BLIND SEER: Battlecry: Discover a card from your deck. (simplified: draw 1)
            if (id === 53) {
                game.drawCard("player", 1);
                return;
            }

            // LOAN SHARK: Battlecry: Deal 3 damage to your Hero.
            if (id === 60) {
                game.damageHero("player", 3);
                return;
            }

            // PRAIRIE FIRE: Deal 1 damage to all Units. Repeat 3 times.
            if (id === 121) {
                for (let i = 0; i < 3; i++) {
                    game.damageAll(1, false);
                }
                return;
            }

            // === Nové karty (86–125) ===

            // PINKERTON (86): Battlecry: Look at top 3 cards (simplified: draw 1)
            if (id === 86) { game.drawCard("player", 1); return; }

            // JUDGE'S GAVEL (87): Destroy a Unit with 3 or less Attack.
            if (id === 87) {
                if (target && target.type === "Unit" && target.atk <= 3) game.destroyUnit(target);
                return;
            }

            // FRONTIER DOC (88): Battlecry: Restore 3 Health to your Hero.
            if (id === 88) { game.healHero("player", 3); return; }

            // PRISON WAGON (89): Battlecry: Silence a Unit. [Guardian handled by keyword]
            if (id === 89) { if (target) game.silenceUnit(target); return; }

            // LAND SEIZURE (90): Destroy all enemy Landmarks.
            if (id === 90) {
                game.enemyBoard.filter(u => u.type === "Landmark").forEach(u => game.destroyUnit(u));
                return;
            }

            // RANGER CAPTAIN (91): Give all other friendly Law units +2 Attack.
            if (id === 91) {
                game.board.filter(u => u.faction === "Law" && u !== selfCard).forEach(u => {
                    u.atk += 2; u.baseAtk = u.atk;
                });
                return;
            }

            // CATTLE RUSTLER (94): Ambush – no Battlecry, handled in onDeath.

            // SNAKE EYES (95): Deal 3 damage to a Unit. If it dies, draw a card.
            if (id === 95) {
                if (target && typeof target !== "string") {
                    game.dealDamage(target, 3);
                    if (target.hp <= 0) game.drawCard("player", 1);
                }
                return;
            }

            // DESPERADO (96): Battlecry: Deal 2 damage to all enemy Units.
            if (id === 96) { game.damageAllEnemies(2); return; }

            // SABOTAGE (97): Destroy an enemy Landmark.
            if (id === 97) {
                if (target && target.type === "Landmark") game.destroyUnit(target);
                return;
            }

            // BLACK BART (98): Steal a random card (simplified: draw 1).
            if (id === 98) { game.drawCard("player", 1); return; }

            // HIGHWAYMAN (99): Battlecry: Deal 2 damage to the enemy Hero.
            if (id === 99) { game.damageHero("enemy", 2); return; }

            // HAWK RIDER (102): Battlecry: Deal 2 damage to a random enemy Unit.
            if (id === 102) { game.damageRandomEnemy(2); return; }

            // STAMPEDE (103): Deal 2 damage to all enemy Units. Summon a 3/3 Bull.
            if (id === 103) {
                game.damageAllEnemies(2);
                game.summonUnit(109, selfCard.owner);
                return;
            }

            // PACK ALPHA (106): Give all friendly Wolves +2/+2.
            if (id === 106) {
                game.board.filter(u => u.id === 72).forEach(u => {
                    u.atk += 2; u.hp += 2; u.maxHp += 2;
                });
                return;
            }

            // SHADOW WALKER (112): Battlecry: Deal 1 damage to all enemies.
            if (id === 112) { game.damageAllEnemies(1); return; }

            // WITCH'S BREW (113): Give a Unit +3/+3.
            if (id === 113) {
                if (target && typeof target !== "string") {
                    target.atk += 3; target.hp += 3; target.maxHp += 3;
                }
                return;
            }

            // POLTERGEIST (114): Battlecry: Return a random enemy Unit to their hand.
            if (id === 114) {
                let pool = game.enemyBoard.filter(u => u.type === "Unit");
                if (pool.length > 0) {
                    let t = pool[Math.floor(Math.random() * pool.length)];
                    game.bounceUnit(t, t.owner);
                }
                return;
            }

            // SOUL HARVEST (116): Destroy all damaged Units. Gain 1 Grit per destroyed.
            if (id === 116) {
                let damaged = [
                    ...game.board.filter(u => u.hp < u.maxHp),
                    ...game.enemyBoard.filter(u => u.hp < u.maxHp)
                ];
                damaged.forEach(u => game.destroyUnit(u));
                game.addGrit("player", damaged.length);
                return;
            }

            // CARD SHARK (118): Battlecry: Peek at top card (simplified: draw 1).
            if (id === 118) { game.drawCard("player", 1); return; }

            // WHISKEY BOTTLE (119): Give a Unit +2 Attack.
            if (id === 119) {
                if (target && typeof target !== "string") {
                    target.atk += 2; target.baseAtk = target.atk;
                }
                return;
            }

            // BOUNTY HUNTER (120): Battlecry: Deal 2 damage to a Unit.
            if (id === 120) {
                if (target && typeof target !== "string") game.dealDamage(target, 2);
                return;
            }

            // CANTEEN (122): Gear – Give a Unit +2 Health. Draw a card.
            if (id === 122) {
                if (target && typeof target !== "string") {
                    target.hp += 2; target.maxHp += 2;
                }
                game.drawCard("player", 1);
                return;
            }

            // PONY EXPRESS (125): Battlecry: Draw a card.
            if (id === 125) { game.drawCard("player", 1); return; }

            // === Generická logika ===

            // UFO: Destroy ALL Units.
            if (text.includes("destroy all units")) {
                game.destroyAllUnits();
                return;
            }

            // Reveal / Look at enemy hand (EAGLE, DETECTIVE)
            if ((text.includes("reveal") || text.includes("look at")) && text.includes("hand")) {
                game.revealEnemyHand();
                return;
            }

            // 50% náhodné efekty (LUCKY COIN, THE BANK)
            if (text.includes("50%")) {
                if (Math.random() >= 0.5) {
                    if (text.includes("grit")) game.addGrit("player", 1);
                }
                return;
            }

            // Damage
            const dmgMatch = text.match(/deal (\d+) damage/);
            if (dmgMatch) {
                let dmg = parseInt(dmgMatch[1]);
                if (text.includes("to all characters")) {
                    game.damageAll(dmg, true);
                } else if (text.includes("to all enemy units") || text.includes("to all units")) {
                    game.damageAll(dmg, false);
                } else if (text.includes("to your hero")) {
                    game.damageHero("player", dmg);
                } else if (text.includes("random enemy")) {
                    game.damageRandomEnemy(dmg);
                } else if (target && typeof target !== "string") {
                    game.dealDamage(target, dmg);
                } else if (target === "hero") {
                    game.damageHero("enemy", dmg);
                }
            }

            // Heal / Restore
            if (text.includes("fully heal")) {
                if (target && typeof target !== "string") target.hp = target.maxHp;
            } else if (text.includes("restore") || (text.includes("heal") && cardData.type === "Spell")) {
                const healMatch = text.match(/(\d+) health/) || text.match(/heal .* for (\d+)/);
                if (healMatch) {
                    let amt = parseInt(healMatch[1]);
                    if (text.includes("to your hero")) {
                        game.healHero("player", amt);
                    } else if (target && typeof target !== "string") {
                        target.hp = Math.min(target.maxHp, target.hp + amt);
                    }
                }
            }

            // Gear buffs
            if (cardData.type === "Gear" && target && typeof target !== "string" && target.type === "Unit") {
                let atkBuff = 0, hpBuff = 0;
                const statsMatch = text.match(/\+(\d+)\/\+(\d+)/);
                const atkMatch  = text.match(/\+(\d+) attack/);
                const hpMatch   = text.match(/\+(\d+) health/);
                const negAtkMatch = text.match(/-(\d+) attack/);

                if (statsMatch)   { atkBuff += parseInt(statsMatch[1]); hpBuff += parseInt(statsMatch[2]); }
                if (atkMatch)       atkBuff += parseInt(atkMatch[1]);
                if (hpMatch)        hpBuff  += parseInt(hpMatch[1]);
                if (negAtkMatch)    atkBuff -= parseInt(negAtkMatch[1]);

                target.atk = Math.max(0, target.atk + atkBuff);
                target.hp    += hpBuff;
                target.maxHp += hpBuff;

                if (text.includes("guardian") && !target.keywords.includes("Guardian")) target.keywords.push("Guardian");
                if (text.includes("lethal")   && !target.keywords.includes("Lethal"))   target.keywords.push("Lethal");
                if (text.includes("ambush")   && !target.keywords.includes("Ambush"))   target.keywords.push("Ambush");
            }

            // Discard (univerzální)
            // Podporuje: "Discard your hand", "Discard X cards",
            //            "Discard X Tokens/Spells/Units/Gear/[jméno karty]"
            if (text.includes("discard")) {
                if (text.includes("discard your hand")) {
                    game.discardAllCards("player");
                } else {
                    const discardMatch = text.match(/discard (\d+) (\w+)/);
                    if (discardMatch) {
                        game.discardByType("player", parseInt(discardMatch[1]), discardMatch[2]);
                    }
                }
            }

            // Grit (obecný)
            if (text.includes("gain") && text.includes("grit")) {
                const gritMatch = text.match(/gain (\d+) grit/);
                let amt = gritMatch ? parseInt(gritMatch[1]) : 1;
                game.addGrit("player", amt);
            }

            // Draw (obecný)
            if (text.includes("draw")) {
                const drawMatch = text.match(/draw (\d+)/);
                if (drawMatch) game.drawCard("player", parseInt(drawMatch[1]));
            }
        };
    }

    // 3. Last Word
    if (text.includes("last word")) {
        logic.onDeath = function(game, selfCard) {
            // TRAIN ROBBER: Add a Coin to your hand.
            if (id === 34) { game.addCardToHand("player", 71); return; }
            // SUPPLY WAGON: Draw 2 cards.
            if (id === 59) { game.drawCard("player", 2); return; }
            // GHOST TRAIN: Shuffle into deck (simplified: nothing extra)
            if (id === 18) { return; }
            // OLD GRAVEYARD: Return dying units to hand (handled in script.js checkDeaths)
            if (id === 67) { return; }
            // CATTLE RUSTLER (94): Steal 1 Grit (simplified: gain 1).
            if (id === 94) { game.addGrit("player", 1); return; }
            // LICH KING (115): Return to hand with full Health.
            if (id === 115) { game.addCardToHand("player", 115); return; }
            // BANSHEE (117): Deal 3 damage to all enemy Units.
            if (id === 117) { game.damageAllEnemies(3); return; }
            // Obecný
            const drawMatch = text.match(/draw (\d+)/);
            if (drawMatch) game.drawCard("player", parseInt(drawMatch[1]));
            if (text.includes("coin")) game.addCardToHand("player", 71);
        };
    }

    // 4. End of Turn
    if (text.includes("end of turn")) {
        logic.onTurnEnd = function(game, selfCard) {
            // BARTENDER: Heal 1 damage from another random Ally.
            if (id === 21) {
                let allies = game.board.filter(u => u !== selfCard && u.hp < u.maxHp);
                if (allies.length > 0) {
                    let t = allies[Math.floor(Math.random() * allies.length)];
                    t.hp = Math.min(t.maxHp, t.hp + 1);
                }
                return;
            }
            // DEVILS CAVE: Summon a 1/1 Bat.
            if (id === 57) {
                game.summonUnit(73, selfCard.owner);
                return;
            }
            // GHOST TRAIN: Dies at end of turn.
            if (id === 18) {
                selfCard.hp = -99;
                return;
            }
            // GRAND SALOON: Heal all friendly characters for 1.
            if (id === 63) {
                game.board.forEach(u => u.hp = Math.min(u.maxHp, u.hp + 1));
                game.healHero("player", 1);
                return;
            }
            // THE BANK: 50% chance to gain 1 Grit.
            if (id === 62) {
                if (Math.random() >= 0.5) game.addGrit("player", 1);
                return;
            }
            // OUTLAW CAMP (100): Give a random Outlaw in hand +1/+1.
            if (id === 100) {
                let outlaws = playerHand.filter(c => c.faction === "Outlaw");
                if (outlaws.length > 0) {
                    let t = outlaws[Math.floor(Math.random() * outlaws.length)];
                    t.atk += 1; t.hp += 1; t.maxHp += 1;
                }
                return;
            }
            // RIVER SPIRIT (104): Restore 2 Health to a damaged friendly Unit.
            if (id === 104) {
                let damaged = game.board.filter(u => u !== selfCard && u.hp < u.maxHp);
                if (damaged.length > 0) {
                    let t = damaged[Math.floor(Math.random() * damaged.length)];
                    t.hp = Math.min(t.maxHp, t.hp + 2);
                }
                return;
            }
            // CAMPFIRE (124): Restore 1 Health to your Hero.
            if (id === 124) { game.healHero("player", 1); return; }
            // Obecný heal
            if (text.includes("heal") && id !== 21 && id !== 63) {
                game.board.forEach(u => u.hp = Math.min(u.maxHp, u.hp + 1));
            }
            // Obecný grit (s extrakcí množství)
            if (text.includes("grit")) {
                const gritMatch = text.match(/gain (\d+) grit/);
                let amt = gritMatch ? parseInt(gritMatch[1]) : 1;
                game.addGrit("player", amt);
            }
        };
    }

    // 5. Start of Turn (Landmark efekty)
    if (text.includes("start of your turn") || text.includes("at the start of your turn")) {
        logic.onTurnStart = function(game, selfCard) {
            // VOODOO ALTAR: Deal 1 damage to a random enemy.
            if (id === 50) {
                game.damageRandomEnemy(1);
                return;
            }
            // TRAIN STATION: Draw an extra card.
            if (id === 66) {
                game.drawCard("player", 1);
                return;
            }
        };
    }

    return logic;
}