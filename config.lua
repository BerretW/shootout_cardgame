Config = {}

-- Rarity tiers: "Common", "Uncommon", "Rare", "Epic", "Legendary"
-- token = true  →  karta se nevyskytuje v balíčcích (generuje se efekty)
Config.Debug = true
Config.Cards = {
    -- === LAW ===
    [1]  = { id = 1,  faction = "Law",     name = "IRON SHERIFF",  type = "Unit",     cost = 5, atk = 4, hp = 5,  rarity = "Rare",      text = "Battlecry: Give other Law units +1/+1" },
    [2]  = { id = 2,  faction = "Law",     name = "MARSHAL",       type = "Unit",     cost = 6, atk = 3, hp = 7,  rarity = "Uncommon",  text = "Guardian" },
    [3]  = { id = 3,  faction = "Law",     name = "DETECTIVE",     type = "Unit",     cost = 3, atk = 2, hp = 3,  rarity = "Uncommon",  text = "Battlecry: Look at enemy hand" },
    [4]  = { id = 4,  faction = "Law",     name = "HANDCUFFS",     type = "Spell",    cost = 2, atk = 0, hp = 0,  rarity = "Common",    text = "Choose an enemy Unit. It can't attack next turn." },
    [5]  = { id = 5,  faction = "Law",     name = "WANTED POSTER", type = "Spell",    cost = 2, atk = 0, hp = 0,  rarity = "Common",    text = "Draw 2 cards." },
    [24] = { id = 24, faction = "Law",     name = "GATLING GUN",   type = "Gear",     cost = 5, atk = 0, hp = 0,  rarity = "Rare",      text = "Give a Unit +3 Attack. It also damages neighbors of target." },
    [26] = { id = 26, faction = "Law",     name = "THE HANGMAN",   type = "Unit",     cost = 5, atk = 5, hp = 4,  rarity = "Rare",      text = "Battlecry: Destroy a damaged Unit." },
    [27] = { id = 27, faction = "Law",     name = "OIL TYCOON",    type = "Unit",     cost = 4, atk = 1, hp = 5,  rarity = "Uncommon",  text = "End of Turn: Gain +1 Grit." },
    [28] = { id = 28, faction = "Law",     name = "RAILROAD BOSS", type = "Unit",     cost = 3, atk = 3, hp = 3,  rarity = "Common",    text = "Battlecry: Give a Landmark +3 Health." },
    [29] = { id = 29, faction = "Law",     name = "DEPUTY SQUAD",  type = "Unit",     cost = 4, atk = 3, hp = 3,  rarity = "Rare",      text = "Battlecry: Summon a copy of this unit." },
    [30] = { id = 30, faction = "Law",     name = "CELL DOOR",     type = "Spell",    cost = 2, atk = 0, hp = 0,  rarity = "Common",    text = "Return a Unit to its owner's hand." },
    [31] = { id = 31, faction = "Law",     name = "TELEGRAPH",     type = "Unit",     cost = 2, atk = 1, hp = 2,  rarity = "Common",    text = "Battlecry: Draw 1 card." },
    [32] = { id = 32, faction = "Law",     name = "SNIPER",        type = "Unit",     cost = 4, atk = 4, hp = 2,  rarity = "Uncommon",  text = "Immune while attacking." },
    [33] = { id = 33, faction = "Law",     name = "COURTHOUSE",    type = "Landmark", cost = 4, atk = 0, hp = 6,  rarity = "Rare",      text = "Your units have +1 Health." },
    [62] = { id = 62, faction = "Law",     name = "THE BANK",      type = "Landmark", cost = 3, atk = 0, hp = 5,  rarity = "Uncommon",  text = "Start of Turn: 50% chance to gain 1 Grit." },
    [68] = { id = 68, faction = "Law",     name = "THE GALLOWS",   type = "Landmark", cost = 3, atk = 0, hp = 4,  rarity = "Rare",      text = "Enemy units have -1 Attack." },
    [74] = { id = 74, faction = "Law",     name = "SHERIFF BADGE", type = "Gear",     cost = 2, atk = 0, hp = 0,  rarity = "Common",    text = "Give a Unit +1/+3 and Guardian." },
    [80] = { id = 80, faction = "Law",     name = "MARSHAL EARP",  type = "Hero",     cost = 0, atk = 0, hp = 30, rarity = "Legendary", text = "Hero Power (2 Grit): Summon a 1/1 Deputy with Guard." },
    [85] = { id = 85, faction = "Law",     name = "DEPUTY",        type = "Unit",     cost = 1, atk = 1, hp = 1,  rarity = "Common",    token = true, text = "Guardian" },
    [86] = { id = 86, faction = "Law",     name = "PINKERTON",     type = "Unit",     cost = 3, atk = 2, hp = 4,  rarity = "Uncommon",  text = "Battlecry: Look at the top 3 cards of your deck." },
    [87] = { id = 87, faction = "Law",     name = "JUDGE'S GAVEL", type = "Spell",    cost = 3, atk = 0, hp = 0,  rarity = "Common",    text = "Destroy a Unit with 3 or less Attack." },
    [88] = { id = 88, faction = "Law",     name = "FRONTIER DOC",  type = "Unit",     cost = 3, atk = 1, hp = 4,  rarity = "Common",    text = "Battlecry: Restore 3 Health to your Hero." },
    [89] = { id = 89, faction = "Law",     name = "PRISON WAGON",  type = "Unit",     cost = 4, atk = 2, hp = 6,  rarity = "Uncommon",  text = "Guardian. Battlecry: Silence a Unit." },
    [90] = { id = 90, faction = "Law",     name = "LAND SEIZURE",  type = "Spell",    cost = 5, atk = 0, hp = 0,  rarity = "Rare",      text = "Destroy all enemy Landmarks." },
    [91] = { id = 91, faction = "Law",     name = "RANGER CAPTAIN",type = "Unit",     cost = 5, atk = 4, hp = 5,  rarity = "Epic",      text = "Battlecry: Give all other friendly Law units +2 Attack." },
    [92] = { id = 92, faction = "Law",     name = "RIOT SHIELD",   type = "Gear",     cost = 2, atk = 0, hp = 0,  rarity = "Common",    text = "Give a Unit +4 Health and Guardian." },
    [93] = { id = 93, faction = "Law",     name = "FORT WORTH",    type = "Landmark", cost = 4, atk = 0, hp = 7,  rarity = "Rare",      text = "Your Units cost (1) less." },

    -- === OUTLAW ===
    [6]  = { id = 6,  faction = "Outlaw",  name = "DYNAMITE",       type = "Spell",    cost = 5, atk = 0, hp = 0,  rarity = "Rare",      text = "Deal 3 damage to ALL characters." },
    [7]  = { id = 7,  faction = "Outlaw",  name = "BANDIT",         type = "Unit",     cost = 3, atk = 4, hp = 2,  rarity = "Common",    text = "Ambush" },
    [8]  = { id = 8,  faction = "Outlaw",  name = "DUELIST",        type = "Unit",     cost = 4, atk = 4, hp = 3,  rarity = "Uncommon",  text = "Battlecry: Deal 2 damage." },
    [9]  = { id = 9,  faction = "Outlaw",  name = "MOLOTOV",        type = "Spell",    cost = 3, atk = 0, hp = 0,  rarity = "Common",    text = "Deal 4 damage to a Unit." },
    [10] = { id = 10, faction = "Outlaw",  name = "THE HEIST",      type = "Spell",    cost = 0, atk = 0, hp = 0,  rarity = "Rare",      text = "Gain 3 Grit this turn only." },
    [25] = { id = 25, faction = "Outlaw",  name = "SAFECRACKER",    type = "Unit",     cost = 2, atk = 2, hp = 2,  rarity = "Uncommon",  text = "Battlecry: Silence an enemy Unit." },
    [34] = { id = 34, faction = "Outlaw",  name = "TRAIN ROBBER",   type = "Unit",     cost = 3, atk = 4, hp = 3,  rarity = "Uncommon",  text = "Last Word: Add a 'Coin' to your hand." },
    [35] = { id = 35, faction = "Outlaw",  name = "GANG LEADER",    type = "Unit",     cost = 6, atk = 6, hp = 5,  rarity = "Epic",      text = "Your other Outlaws have Ambush." },
    [36] = { id = 36, faction = "Outlaw",  name = "POKER CHEAT",    type = "Unit",     cost = 3, atk = 3, hp = 3,  rarity = "Common",    text = "Battlecry: Discard 1 card, then Draw 1 card." },
    [37] = { id = 37, faction = "Outlaw",  name = "KNIFE THROWER",  type = "Unit",     cost = 2, atk = 3, hp = 1,  rarity = "Common",    text = "Battlecry: Deal 1 damage to a random enemy." },
    [38] = { id = 38, faction = "Outlaw",  name = "GUNSLINGER",     type = "Unit",     cost = 4, atk = 3, hp = 4,  rarity = "Rare",      text = "Can attack twice per turn." },
    [39] = { id = 39, faction = "Outlaw",  name = "GETAWAY HORSE",  type = "Spell",    cost = 1, atk = 0, hp = 0,  rarity = "Uncommon",  text = "Return a friendly Unit to hand. Give it +2/+2." },
    [40] = { id = 40, faction = "Outlaw",  name = "JAILBREAK",      type = "Spell",    cost = 4, atk = 0, hp = 0,  rarity = "Epic",      text = "Summon a random Outlaw from your graveyard." },
    [41] = { id = 41, faction = "Outlaw",  name = "DEAD MANS HAND", type = "Spell",    cost = 3, atk = 0, hp = 0,  rarity = "Rare",      text = "Discard your hand. Draw 3 cards." },
    [64] = { id = 64, faction = "Outlaw",  name = "HIDEOUT",        type = "Landmark", cost = 4, atk = 0, hp = 4,  rarity = "Epic",      text = "Your Units have Stealth." },
    [79] = { id = 79, faction = "Outlaw",  name = "BOWIE KNIFE",    type = "Gear",     cost = 2, atk = 0, hp = 0,  rarity = "Common",    text = "Give a Unit +2 Attack and Ambush." },
    [81] = { id = 81, faction = "Outlaw",  name = "BELLE STARR",    type = "Hero",     cost = 0, atk = 0, hp = 20, rarity = "Legendary", text = "Hero Power (2 Grit): Deal 2 damage to the enemy Hero." },
    [94] = { id = 94, faction = "Outlaw",  name = "CATTLE RUSTLER", type = "Unit",     cost = 2, atk = 3, hp = 1,  rarity = "Common",    text = "Ambush. Last Word: Steal 1 Grit from opponent." },
    [95] = { id = 95, faction = "Outlaw",  name = "SNAKE EYES",     type = "Spell",    cost = 2, atk = 0, hp = 0,  rarity = "Uncommon",  text = "Deal 3 damage to a Unit. If it dies, draw a card." },
    [96] = { id = 96, faction = "Outlaw",  name = "DESPERADO",      type = "Unit",     cost = 5, atk = 6, hp = 4,  rarity = "Rare",      text = "Battlecry: Deal 2 damage to all enemy Units." },
    [97] = { id = 97, faction = "Outlaw",  name = "SABOTAGE",       type = "Spell",    cost = 3, atk = 0, hp = 0,  rarity = "Uncommon",  text = "Destroy an enemy Landmark." },
    [98] = { id = 98, faction = "Outlaw",  name = "BLACK BART",     type = "Unit",     cost = 7, atk = 5, hp = 7,  rarity = "Epic",      text = "Battlecry: Steal a random card from opponent's hand." },
    [99] = { id = 99, faction = "Outlaw",  name = "HIGHWAYMAN",     type = "Unit",     cost = 4, atk = 4, hp = 3,  rarity = "Common",    text = "Battlecry: Deal 2 damage to the enemy Hero." },
    [100]= { id = 100,faction = "Outlaw",  name = "OUTLAW CAMP",    type = "Landmark", cost = 3, atk = 0, hp = 5,  rarity = "Uncommon",  text = "End of Turn: Give a random Outlaw in your hand +1/+1." },
    [101]= { id = 101,faction = "Outlaw",  name = "RUSTY REVOLVER", type = "Gear",     cost = 1, atk = 0, hp = 0,  rarity = "Common",    text = "Give a Unit +2 Attack." },

    -- === WILD ===
    [11] = { id = 11, faction = "Wild",    name = "GRIZZLY",        type = "Unit",     cost = 7, atk = 7, hp = 7,  rarity = "Epic",      text = "Has +3 Attack while damaged." },
    [12] = { id = 12, faction = "Wild",    name = "WOLF PACK",      type = "Unit",     cost = 4, atk = 2, hp = 2,  rarity = "Uncommon",  text = "Battlecry: Summon two 2/1 Wolves." },
    [13] = { id = 13, faction = "Wild",    name = "COUGAR",         type = "Unit",     cost = 4, atk = 5, hp = 3,  rarity = "Rare",      text = "Stealth" },
    [14] = { id = 14, faction = "Wild",    name = "SNAKE OIL",      type = "Spell",    cost = 2, atk = 0, hp = 0,  rarity = "Common",    text = "Fully heal a Unit." },
    [15] = { id = 15, faction = "Wild",    name = "BEAR TRAP",      type = "Spell",    cost = 2, atk = 0, hp = 0,  rarity = "Common",    text = "Deal 3 damage to an undamaged Unit." },
    [42] = { id = 42, faction = "Wild",    name = "EAGLE",          type = "Unit",     cost = 2, atk = 2, hp = 1,  rarity = "Common",    text = "Battlecry: Reveal the enemy's hand." },
    [43] = { id = 43, faction = "Wild",    name = "WHITE BISON",    type = "Unit",     cost = 6, atk = 4, hp = 8,  rarity = "Epic",      text = "Can't be targeted by Spells or Hero Powers." },
    [44] = { id = 44, faction = "Wild",    name = "TRAPPER",        type = "Unit",     cost = 3, atk = 3, hp = 3,  rarity = "Uncommon",  text = "Battlecry: Add a 'Bear Trap' to your hand." },
    [45] = { id = 45, faction = "Wild",    name = "SCOUT",          type = "Unit",     cost = 2, atk = 2, hp = 3,  rarity = "Common",    text = "Battlecry: Gain an empty Grit crystal." },
    [46] = { id = 46, faction = "Wild",    name = "SHAMAN",         type = "Unit",     cost = 4, atk = 2, hp = 5,  rarity = "Rare",      text = "Battlecry: Restore 4 Health to your Hero." },
    [47] = { id = 47, faction = "Wild",    name = "MUSTANG",        type = "Unit",     cost = 3, atk = 3, hp = 1,  rarity = "Common",    text = "Ambush" },
    [48] = { id = 48, faction = "Wild",    name = "THUNDERSTORM",   type = "Spell",    cost = 4, atk = 0, hp = 0,  rarity = "Rare",      text = "Deal 2 damage to all enemy Units." },
    [65] = { id = 65, faction = "Wild",    name = "TOTEM POLE",     type = "Landmark", cost = 2, atk = 0, hp = 5,  rarity = "Uncommon",  text = "Your Wild units have +1 Attack." },
    [70] = { id = 70, faction = "Wild",    name = "BEAVER DAM",     type = "Landmark", cost = 3, atk = 0, hp = 6,  rarity = "Rare",      text = "Enemy units cost (1) more." },
    [72] = { id = 72, faction = "Wild",    name = "GREY WOLF",      type = "Unit",     cost = 1, atk = 2, hp = 1,  rarity = "Common",    token = true, text = "" },
    [76] = { id = 76, faction = "Wild",    name = "WAR PAINT",      type = "Gear",     cost = 1, atk = 0, hp = 0,  rarity = "Common",    text = "Give a Unit +2/+1." },
    [82] = { id = 82, faction = "Wild",    name = "SITTING BEAR",   type = "Hero",     cost = 0, atk = 0, hp = 25, rarity = "Legendary", text = "Hero Power (2 Grit): Heal a Unit for 2 and give it +1 Health." },
    [102]= { id = 102,faction = "Wild",    name = "HAWK RIDER",     type = "Unit",     cost = 3, atk = 3, hp = 2,  rarity = "Uncommon",  text = "Battlecry: Deal 2 damage to a random enemy Unit." },
    [103]= { id = 103,faction = "Wild",    name = "STAMPEDE",       type = "Spell",    cost = 6, atk = 0, hp = 0,  rarity = "Rare",      text = "Deal 2 damage to all enemy Units. Summon a 3/3 Bull." },
    [104]= { id = 104,faction = "Wild",    name = "RIVER SPIRIT",   type = "Unit",     cost = 4, atk = 2, hp = 6,  rarity = "Uncommon",  text = "End of Turn: Restore 2 Health to a damaged friendly Unit." },
    [105]= { id = 105,faction = "Wild",    name = "HUNTING GROUND", type = "Landmark", cost = 2, atk = 0, hp = 4,  rarity = "Common",    text = "Your Wild units have +1 Attack." },
    [106]= { id = 106,faction = "Wild",    name = "PACK ALPHA",     type = "Unit",     cost = 5, atk = 4, hp = 4,  rarity = "Rare",      text = "Battlecry: Give all friendly Wolves +2/+2." },
    [107]= { id = 107,faction = "Wild",    name = "BADGER",         type = "Unit",     cost = 2, atk = 2, hp = 3,  rarity = "Common",    text = "Can't be targeted by Spells." },
    [108]= { id = 108,faction = "Wild",    name = "TOTEM OF WRATH", type = "Gear",     cost = 3, atk = 0, hp = 0,  rarity = "Uncommon",  text = "Give a Unit +3 Attack and Ambush." },
    [109]= { id = 109,faction = "Wild",    name = "BULL",           type = "Unit",     cost = 3, atk = 3, hp = 3,  rarity = "Common",    token = true, text = "" },

    -- === MYTHOS ===
    [16] = { id = 16, faction = "Mythos",  name = "NIGHT FOLK",     type = "Unit",     cost = 3, atk = 3, hp = 3,  rarity = "Uncommon",  text = "Has +2/+2 if you have less Health than opponent." },
    [17] = { id = 17, faction = "Mythos",  name = "VAMPIRE",        type = "Unit",     cost = 4, atk = 3, hp = 4,  rarity = "Rare",      text = "Lethal. Restore Health to your Hero equal to damage dealt." },
    [18] = { id = 18, faction = "Mythos",  name = "GHOST TRAIN",    type = "Unit",     cost = 5, atk = 8, hp = 8,  rarity = "Epic",      text = "Ambush. Dies at end of turn. Last Word: Shuffle into deck." },
    [19] = { id = 19, faction = "Mythos",  name = "OPEN GRAVE",     type = "Spell",    cost = 2, atk = 0, hp = 0,  rarity = "Common",    text = "Return a dead Unit to your hand." },
    [20] = { id = 20, faction = "Mythos",  name = "CURSED MASK",    type = "Gear",     cost = 2, atk = 0, hp = 0,  rarity = "Uncommon",  text = "Give a Unit +3/+3. Deal 3 damage to your Hero." },
    [49] = { id = 49, faction = "Mythos",  name = "STRANGE MAN",    type = "Unit",     cost = 5, atk = 3, hp = 3,  rarity = "Rare",      text = "Battlecry: Copy a friendly Unit's Attack and Health." },
    [50] = { id = 50, faction = "Mythos",  name = "VOODOO ALTAR",   type = "Landmark", cost = 3, atk = 0, hp = 5,  rarity = "Rare",      text = "At the start of your turn, deal 1 damage to a random enemy." },
    [51] = { id = 51, faction = "Mythos",  name = "SASQUATCH",      type = "Unit",     cost = 7, atk = 8, hp = 8,  rarity = "Epic",      text = "Stealth" },
    [52] = { id = 52, faction = "Mythos",  name = "UFO",            type = "Spell",    cost = 8, atk = 0, hp = 0,  rarity = "Epic",      text = "Destroy ALL Units." },
    [53] = { id = 53, faction = "Mythos",  name = "BLIND SEER",     type = "Unit",     cost = 2, atk = 1, hp = 2,  rarity = "Common",    text = "Battlecry: Discover a card from your deck." },
    [54] = { id = 54, faction = "Mythos",  name = "ANCIENT BONES",  type = "Unit",     cost = 3, atk = 5, hp = 5,  rarity = "Rare",      text = "Can't Attack unless it's the only Unit you control." },
    [55] = { id = 55, faction = "Mythos",  name = "BLOOD RITUAL",   type = "Spell",    cost = 1, atk = 0, hp = 0,  rarity = "Common",    text = "Deal 3 damage to your Hero. Gain 2 Grit." },
    [56] = { id = 56, faction = "Mythos",  name = "CREEPY DOLL",    type = "Gear",     cost = 2, atk = 0, hp = 0,  rarity = "Common",    text = "Give a Unit -3 Attack." },
    [57] = { id = 57, faction = "Mythos",  name = "DEVILS CAVE",    type = "Landmark", cost = 4, atk = 0, hp = 5,  rarity = "Rare",      text = "End of Turn: Summon a 1/1 Bat." },
    [58] = { id = 58, faction = "Mythos",  name = "SWAMP WITCH",    type = "Unit",     cost = 5, atk = 3, hp = 4,  rarity = "Uncommon",  text = "Battlecry: Set a Unit's Attack to 1." },
    [67] = { id = 67, faction = "Mythos",  name = "OLD GRAVEYARD",  type = "Landmark", cost = 4, atk = 0, hp = 5,  rarity = "Epic",      text = "Last Word on your units: Return them to hand instead of dying." },
    [73] = { id = 73, faction = "Mythos",  name = "CAVE BAT",       type = "Unit",     cost = 1, atk = 1, hp = 1,  rarity = "Common",    token = true, text = "" },
    [77] = { id = 77, faction = "Mythos",  name = "SILVER BULLETS", type = "Gear",     cost = 3, atk = 0, hp = 0,  rarity = "Uncommon",  text = "Give a Unit +2 Attack and Lethal." },
    [83] = { id = 83, faction = "Mythos",  name = "BARON SAMEDI",   type = "Hero",     cost = 0, atk = 0, hp = 20, rarity = "Legendary", text = "Hero Power (2 Grit): Deal 1 damage. If target dies draw a card." },
    [110]= { id = 110,faction = "Mythos",  name = "WENDIGO",        type = "Unit",     cost = 4, atk = 5, hp = 3,  rarity = "Legendary",      text = "Ambush. Gains +2 Attack each time any Unit dies." },
    [111]= { id = 111,faction = "Mythos",  name = "CURSED GROUND",  type = "Landmark", cost = 3, atk = 0, hp = 5,  rarity = "Uncommon",  text = "Units that die here can't be resurrected." },
    [112]= { id = 112,faction = "Mythos",  name = "SHADOW WALKER",  type = "Unit",     cost = 3, atk = 2, hp = 3,  rarity = "Common",    text = "Stealth. Battlecry: Deal 1 damage to all enemies." },
    [113]= { id = 113,faction = "Mythos",  name = "WITCHS BREW",   type = "Spell",    cost = 2, atk = 0, hp = 0,  rarity = "Common",    text = "Give a Unit +3/+3. At end of turn, destroy it." },
    [114]= { id = 114,faction = "Mythos",  name = "POLTERGEIST",    type = "Unit",     cost = 2, atk = 1, hp = 3,  rarity = "Legendary",  text = "Battlecry: Return a random enemy Unit to their hand." },
    [115]= { id = 115,faction = "Mythos",  name = "LICH KING",      type = "Unit",     cost = 8, atk = 6, hp = 8,  rarity = "Legendary", text = "Last Word: Return this to your hand with full Health." },
    [116]= { id = 116,faction = "Mythos",  name = "SOUL HARVEST",   type = "Spell",    cost = 4, atk = 0, hp = 0,  rarity = "Epic",      text = "Destroy all damaged Units. Gain 1 Grit for each destroyed." },
    [117]= { id = 117,faction = "Mythos",  name = "BANSHEE",        type = "Unit",     cost = 3, atk = 1, hp = 3,  rarity = "Rare",      text = "Last Word: Deal 3 damage to all enemy Units." },

    -- === SALOON / NEUTRAL ===
    [21] = { id = 21, faction = "Saloon",  name = "BARTENDER",      type = "Unit",     cost = 2, atk = 1, hp = 4,  rarity = "Common",    text = "End of Turn: Heal 1 damage from another random Ally." },
    [22] = { id = 22, faction = "Saloon",  name = "LUCKY COIN",     type = "Spell",    cost = 0, atk = 0, hp = 0,  rarity = "Common",    text = "50% Chance to gain 1 Grit." },
    [23] = { id = 23, faction = "Saloon",  name = "BAR FIGHT",      type = "Spell",    cost = 4, atk = 0, hp = 0,  rarity = "Uncommon",  text = "Deal 2 damage to ALL Units." },
    [59] = { id = 59, faction = "Saloon",  name = "SUPPLY WAGON",   type = "Unit",     cost = 4, atk = 0, hp = 5,  rarity = "Uncommon",  text = "Last Word: Draw 2 cards." },
    [60] = { id = 60, faction = "Saloon",  name = "LOAN SHARK",     type = "Unit",     cost = 3, atk = 4, hp = 4,  rarity = "Uncommon",  text = "Battlecry: Deal 3 damage to your Hero." },
    [61] = { id = 61, faction = "Neutral", name = "GENERAL STORE",  type = "Landmark", cost = 2, atk = 0, hp = 4,  rarity = "Common",    text = "Your Gear cards cost (1) less." },
    [63] = { id = 63, faction = "Saloon",  name = "GRAND SALOON",   type = "Landmark", cost = 3, atk = 0, hp = 5,  rarity = "Uncommon",  text = "End of Turn: Heal all friendly characters for 1." },
    [66] = { id = 66, faction = "Neutral", name = "TRAIN STATION",  type = "Landmark", cost = 3, atk = 0, hp = 4,  rarity = "Rare",      text = "At the start of your turn, draw an extra card." },
    [69] = { id = 69, faction = "Neutral", name = "OIL DERRICK",    type = "Landmark", cost = 5, atk = 0, hp = 7,  rarity = "Rare",      text = "End of Turn: Gain 2 Grit." },
    [71] = { id = 71, faction = "Neutral", name = "GOLD COIN",      type = "Spell",    cost = 0, atk = 0, hp = 0,  rarity = "Common",    text = "Gain 1 Grit this turn only." },
    [75] = { id = 75, faction = "Neutral", name = "WINCHESTER",     type = "Gear",     cost = 3, atk = 0, hp = 0,  rarity = "Uncommon",  text = "Give a Unit +4 Attack." },
    [78] = { id = 78, faction = "Saloon",  name = "IRON PONCHO",    type = "Gear",     cost = 2, atk = 0, hp = 0,  rarity = "Common",    text = "Give a Unit +5 Health." },
    [84] = { id = 84, faction = "Saloon",  name = "DIAMOND JIM",    type = "Hero",     cost = 0, atk = 0, hp = 25, rarity = "Legendary", text = "Hero Power (1 Grit): Add a random 'Coin' to your hand." },
    [118]= { id = 118,faction = "Saloon",  name = "CARD SHARK",     type = "Unit",     cost = 2, atk = 2, hp = 2,  rarity = "Common",    text = "Battlecry: Peek at the top card of your deck." },
    [119]= { id = 119,faction = "Saloon",  name = "WHISKEY BOTTLE", type = "Spell",    cost = 1, atk = 0, hp = 0,  rarity = "Common",    text = "Give a Unit +2 Attack until end of turn." },
    [120]= { id = 120,faction = "Neutral", name = "BOUNTY HUNTER",  type = "Unit",     cost = 4, atk = 4, hp = 3,  rarity = "Uncommon",  text = "Battlecry: Deal 2 damage to a Unit." },
    [121]= { id = 121,faction = "Neutral", name = "PRAIRIE FIRE",   type = "Spell",    cost = 3, atk = 0, hp = 0,  rarity = "Rare",      text = "Deal 1 damage to all Units. Repeat 3 times." },
    [122]= { id = 122,faction = "Saloon",  name = "CANTEEN",        type = "Gear",     cost = 2, atk = 0, hp = 0,  rarity = "Common",    text = "Give a Unit +2 Health. Draw a card." },
    [123]= { id = 123,faction = "Saloon",  name = "UNDERTAKER",     type = "Unit",     cost = 3, atk = 2, hp = 4,  rarity = "Uncommon",  text = "Each time a friendly Unit dies, gain +1 Grit." },
    [124]= { id = 124,faction = "Neutral", name = "CAMPFIRE",       type = "Landmark", cost = 2, atk = 0, hp = 3,  rarity = "Common",    text = "End of Turn: Restore 1 Health to your Hero." },
    [125]= { id = 125,faction = "Neutral", name = "PONY EXPRESS",   type = "Unit",     cost = 2, atk = 1, hp = 2,  rarity = "Common",    text = "Battlecry: Draw a card. Give it (1) less cost." },

    -- === TOKENY (Epic Heroes) ===
    [131]= { id = 131,faction = "Wild",    name = "SPIRIT WOLF",    type = "Unit",     cost = 0, atk = 3, hp = 3,  rarity = "Common",    token = true, text = "Guardian" },

    -- === EPIC HEROES ===
    [126]= { id = 126,faction = "Law",     name = "JUDGE HOLLIDAY", type = "Hero",     cost = 0, atk = 0, hp = 25, rarity = "Epic",      text = "Hero Power (2 Grit): Give a friendly Unit +2/+2 and Immune this turn." },
    [127]= { id = 127,faction = "Outlaw",  name = "JESSE JAMES",    type = "Hero",     cost = 0, atk = 0, hp = 20, rarity = "Epic",      text = "Hero Power (1 Grit): Deal 1 damage to a random enemy for each Outlaw you control." },
    [128]= { id = 128,faction = "Wild",    name = "THUNDERHAWK",    type = "Hero",     cost = 0, atk = 0, hp = 28, rarity = "Epic",      text = "Hero Power (3 Grit): Summon a 3/3 Spirit Wolf with Guardian." },
    [129]= { id = 129,faction = "Mythos",  name = "THE PALE RIDER", type = "Hero",     cost = 0, atk = 0, hp = 22, rarity = "Epic",      text = "Hero Power (2 Grit): Give a Unit Lethal. If it already has Lethal, destroy it instead." },
    [130]= { id = 130,faction = "Saloon",  name = "BIG NOSE KATE",  type = "Hero",     cost = 0, atk = 0, hp = 25, rarity = "Epic",      text = "Hero Power (2 Grit): Draw a card. If it costs 3 or less, play it for free." },
}

-- ==========================================
-- Konfigurace balíčků karet
-- ==========================================
-- rarityWeights: součet vah = 100 (procentuální šance)
-- guaranteedRarity: tato rarита je zaručena alespoň jednou v balíčku (nil = žádná záruka)

Config.Decks = {
    cards_pack_1 = { name = "Deck 1", item = "cards_pack_1", limit = 25 },
    cards_pack_2 = { name = "Deck 2", item = "cards_pack_2", limit = 30 },
}

Config.Packs = {
    starter = {
        name        = "Starter Pack",
        itemName    = "card_pack_starter",   -- název itemu v inventáři
        cardCount   = 5,
        guaranteedRarity = nil,
        rarityWeights = {
            Common    = 70,
            Uncommon  = 22,
            Rare      = 7,
            Epic      = 1,
            Legendary = 0,
        },
    },
    standard = {
        name        = "Standard Pack",
        itemName    = "card_pack_standard",
        cardCount   = 5,
        guaranteedRarity = "Rare",           -- alespoň 1 Rare nebo vyšší zaručena
        rarityWeights = {
            Common    = 55,
            Uncommon  = 28,
            Rare      = 13,
            Epic      = 3,
            Legendary = 1,
        },
    },
    premium = {
        name        = "Premium Pack",
        itemName    = "card_pack_premium",
        cardCount   = 5,
        guaranteedRarity = "Epic",           -- alespoň 1 Epic nebo vyšší zaručena
        rarityWeights = {
            Common    = 30,
            Uncommon  = 35,
            Rare      = 22,
            Epic      = 10,
            Legendary = 3,
        },
    },
    legendary = {
        name        = "Legendary Pack",
        itemName    = "card_pack_legendary",
        cardCount   = 8,
        guaranteedRarity = "Legendary",      -- alespoň 1 Legendary zaručena
        rarityWeights = {
            Common    = 10,
            Uncommon  = 20,
            Rare      = 35,
            Epic      = 25,
            Legendary = 10,
        },
    },
}

-- Pořadí rarity (pro porovnání "alespoň X nebo vyšší")
Config.RarityOrder = { "Common", "Uncommon", "Rare", "Epic", "Legendary" }
