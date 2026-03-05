// ==========================================
// FILE: html/cards.js
// ==========================================

const CardDB = [
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
    {id: 80, faction: "Law", name: "MARSHAL EARP", type: "Hero", cost: 0, atk: 0, hp: 30, text: "Hero Power (2 Grit): Summon a 1/1 Deputy with Guard."},
    {id: 85, faction: "Law", name: "DEPUTY", type: "Unit", cost: 1, atk: 1, hp: 1, text: "Guardian"}, // Token

    // --- OUTLAW ---
    {id: 6, faction: "Outlaw", name: "DYNAMITE", type: "Spell", cost: 5, atk: 0, hp: 0, text: "Deal 3 damage to ALL characters."},
    {id: 7, faction: "Outlaw", name: "BANDIT", type: "Unit", cost: 3, atk: 4, hp: 2, text: "Ambush"},
    {id: 8, faction: "Outlaw", name: "DUELIST", type: "Unit", cost: 4, atk: 4, hp: 3, text: "Battlecry: Deal 2 damage."},
    {id: 9, faction: "Outlaw", name: "MOLOTOV", type: "Spell", cost: 3, atk: 0, hp: 0, text: "Deal 4 damage to a Unit."},
    {id: 10, faction: "Outlaw", name: "THE HEIST", type: "Spell", cost: 3, atk: 0, hp: 0, text: "Gain 3 Grit this turn only."},
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
    {id: 84, faction: "Saloon", name: "DIAMOND JIM", type: "Hero", cost: 0, atk: 0, hp: 25, text: "Hero Power (1 Grit): Add a random 'Coin' to your hand."}
];

/**
 * Hlavní funkce pro parsování logiky karty.
 * Vrací objekt s funkcemi onPlay, onDeath, onTurnEnd a seznamem klíčových slov.
 */
/**
 * Hlavní funkce pro parsování logiky karty.
 */
function getCardLogic(cardData) {
    let logic = {
        keywords: [],
        onPlay: null,
        onDeath: null,
        onTurnEnd: null
    };

    const text = cardData.text ? cardData.text.toLowerCase() : "";

    // 1. Klíčová slova
    if (text.includes("guardian")) logic.keywords.push("Guardian");
    if (text.includes("ambush")) logic.keywords.push("Ambush");
    if (text.includes("stealth")) logic.keywords.push("Stealth");
    if (text.includes("lethal")) logic.keywords.push("Lethal");
    if (text.includes("immune")) logic.keywords.push("Immune");

    // 2. Battlecry / Spell Efekty
    if (text.includes("battlecry") || cardData.type === "Spell" || cardData.type === "Gear") {
        logic.onPlay = function(game, selfCard, target) {
            
            // --- UFO LOGIC (Destroy ALL Units) ---
            if (text.includes("destroy all units")) {
                game.destroyAllUnits();
                return; // Konec, nic jiného nedělá
            }

            // --- EAGLE / DETECTIVE LOGIC (Reveal Hand) ---
            if (text.includes("reveal") && text.includes("hand")) {
                game.revealEnemyHand();
            }

            // --- DAMAGE LOGIC ---
            const dmgMatch = text.match(/deal (\d+) damage/);
            if (dmgMatch) {
                let dmg = parseInt(dmgMatch[1]);
                if (text.includes("to all characters") || text.includes("to all units")) {
                    // Deal damage to all
                    let hitHeroes = text.includes("characters");
                    game.damageAll(dmg, hitHeroes);
                } else if (text.includes("to all enemy units")) {
                    game.damageAllEnemies(dmg);
                } else if (text.includes("to your hero")) {
                    game.damageHero("player", dmg);
                } else if (target) {
                    game.dealDamage(target, dmg);
                } else if (text.includes("random enemy")) {
                    game.damageRandomEnemy(dmg);
                }
            }

            // --- HEAL LOGIC ---
            if (text.includes("restore") || text.includes("heal")) {
                const healMatch = text.match(/(\d+) health/) || text.match(/heal .* for (\d+)/);
                if (healMatch) {
                    let amt = parseInt(healMatch[1]);
                    if (text.includes("to your hero")) {
                        game.healHero("player", amt);
                    } else if (target) {
                         target.hp = Math.min(target.maxHp, target.hp + amt);
                    }
                } else if (text.includes("fully heal")) {
                    if (target) target.hp = target.maxHp;
                }
            }

            // --- GEAR LOGIC ---
            if (cardData.type === "Gear" && target && target.type === "Unit") {
                let atkBuff = 0;
                let hpBuff = 0;
                const statsMatch = text.match(/\+(\d+)\/\+(\d+)/);
                const atkMatch = text.match(/\+(\d+) attack/);
                const hpMatch = text.match(/\+(\d+) health/);
                const negAtkMatch = text.match(/-(\d+) attack/);

                if (statsMatch) { atkBuff += parseInt(statsMatch[1]); hpBuff += parseInt(statsMatch[2]); }
                if (atkMatch) atkBuff += parseInt(atkMatch[1]);
                if (hpMatch) hpBuff += parseInt(hpMatch[1]);
                if (negAtkMatch) atkBuff -= parseInt(negAtkMatch[1]);

                target.atk = Math.max(0, target.atk + atkBuff);
                target.hp += hpBuff;
                target.maxHp += hpBuff;

                if (text.includes("guardian")) target.keywords.push("Guardian");
                if (text.includes("lethal")) target.keywords.push("Lethal");
                if (text.includes("ambush")) target.keywords.push("Ambush");
            }
            
            // --- GRIT / DRAW ---
            if (text.includes("gain") && text.includes("grit")) {
                let amt = text.includes("3 grit") ? 3 : 1;
                game.addGrit("player", amt);
            }
            if (text.includes("draw")) {
                let match = text.match(/draw (\d+)/);
                if(match) game.drawCard("player", parseInt(match[1]));
            }
        };
    }

    // 3. Last Word
    if (text.includes("last word")) {
        logic.onDeath = function(game, selfCard) {
            if (text.includes("draw")) game.drawCard("player", 1);
            if (text.includes("coin")) game.addCardToHand("player", 71); // Gold Coin ID
        };
    }

    // 4. End of Turn
    if (text.includes("end of turn")) {
        logic.onTurnEnd = function(game, selfCard) {
            if (text.includes("heal")) {
                // Heal logic simplified
                game.board.forEach(u => u.hp = Math.min(u.maxHp, u.hp + 1));
            }
            if (text.includes("grit")) game.addGrit("player", 1);
        };
    }

    return logic;
}