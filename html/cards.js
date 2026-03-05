// Databáze karet z tvého CSV
const CardDB = [
    {id: 1, faction: "Law", name: "IRON SHERIFF", type: "Unit", cost: 5, atk: 4, hp: 5, text: "Battlecry: Give other Law units +1/+1"},
    {id: 2, faction: "Law", name: "MARSHAL", type: "Unit", cost: 6, atk: 3, hp: 7, text: "Guardian"},
    {id: 3, faction: "Law", name: "DETECTIVE", type: "Unit", cost: 3, atk: 2, hp: 3, text: "Battlecry: Look at enemy hand"},
    {id: 4, faction: "Law", name: "HANDCUFFS", type: "Spell", cost: 2, atk: 0, hp: 0, text: "Choose an enemy Unit. It can't attack next turn."},
    {id: 5, faction: "Law", name: "WANTED POSTER", type: "Spell", cost: 2, atk: 0, hp: 0, text: "Draw 2 cards."},
    {id: 6, faction: "Outlaw", name: "DYNAMITE", type: "Spell", cost: 5, atk: 0, hp: 0, text: "Deal 3 damage to ALL characters."},
    {id: 22, faction: "Saloon", name: "LUCKY COIN", type: "Spell", cost: 0, atk: 0, hp: 0, text: "50% Chance to gain 1 Grit."},
    {id: 80, faction: "Law", name: "MARSHAL EARP", type: "Hero", cost: 0, atk: 0, hp: 30, text: "Hero Power (2 Grit): Summon a 1/1 Deputy with Guard."},
    // ... Zde doplň zbytek karet podle vzoru ...
];

/**
 * Tato funkce analyzuje text karty a vrací objekt s funkcemi.
 * Automaticky detekuje: Battlecry, Guardian, Ambush, Deal Damage, Buffs.
 */
function getCardLogic(cardData) {
    let logic = {
        keywords: [],
        onPlay: null,      // Spustí se při vyložení (Battlecry/Spell)
        onDeath: null,     // Last Word
        onTurnEnd: null,   // End of Turn efekty
        aura: null         // Pasivní efekty (Landmarks)
    };

    const text = cardData.text.toLowerCase();

    // 1. Klíčová slova
    if (text.includes("guardian")) logic.keywords.push("Guardian");
    if (text.includes("ambush")) logic.keywords.push("Ambush");
    if (text.includes("stealth")) logic.keywords.push("Stealth");
    if (text.includes("lethal")) logic.keywords.push("Lethal");

    // 2. Battlecry / Spell Logic parsing
    if (text.includes("battlecry") || cardData.type === "Spell") {
        logic.onPlay = function(game, selfCard, target) {
            console.log(`Executing ${cardData.name} effect...`);
            
            // "Deal X damage"
            const dmgMatch = text.match(/deal (\d+) damage/);
            if (dmgMatch) {
                let dmg = parseInt(dmgMatch[1]);
                if (text.includes("to all characters")) {
                    game.damageAll(dmg);
                } else if (text.includes("to all units")) {
                    game.damageAllUnits(dmg);
                } else if (target) {
                    game.dealDamage(target, dmg);
                }
            }

            // "Give ... +X/+X"
            const buffMatch = text.match(/give .* \+(\d+)\/\+(\d+)/);
            if (buffMatch) {
                let buffAtk = parseInt(buffMatch[1]);
                let buffHp = parseInt(buffMatch[2]);
                
                if (text.includes("other law units")) {
                    game.board.forEach(u => {
                        if (u !== selfCard && u.faction === "Law" && u.owner === selfCard.owner) {
                            u.atk += buffAtk; u.hp += buffHp;
                        }
                    });
                } else if (target) {
                    target.atk += buffAtk; target.hp += buffHp;
                }
            }
            
            // "Draw X cards"
            const drawMatch = text.match(/draw (\d+) card/);
            if (drawMatch) {
                game.drawCard(selfCard.owner, parseInt(drawMatch[1]));
            }
            
            // Specifické hardcoded logiky (pro složité karty)
            if (cardData.id === 3) { alert("Enemy hand: " + JSON.stringify(game.opponentHand)); } // Detective
            if (cardData.id === 22 && Math.random() > 0.5) { game.addMana(selfCard.owner, 1); } // Lucky Coin
        };
    }

    return logic;
}