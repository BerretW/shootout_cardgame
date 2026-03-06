-- ==========================================
-- FILE: server.lua
-- ==========================================
math.randomseed(os.time() + GetGameTimer())

local ActiveGames = {}   -- { [source] = opponentSource }
local PendingDuels = {}  -- { [targetSource] = challengerSource }

local function constructCardName(cardID)
    local card = Config.Cards[cardID]
    if card then
        return tostring(card.id .. "_" .. card.type .. "_" .. card.name:gsub(" ", "_"))
    else
        return "Unknown Card"
    end
end

-- Výzva k duelu – spouštěno z klientského příkazu /duel [ID]
RegisterNetEvent('shootout:sendChallenge')
AddEventHandler('shootout:sendChallenge', function(target)
    local src = source
    target = tonumber(target)

    if not target or target == src or not GetPlayerName(target) then
        TriggerClientEvent('chatMessage', src, "^1[Shootout]", {255, 0, 0}, "Hráč nenalezen nebo jsi zadal sebe.")
        return
    end

    if ActiveGames[target] then
        TriggerClientEvent('chatMessage', src, "^1[Shootout]", {255, 0, 0}, "Tento hráč již hraje jinou hru.")
        return
    end

    if PendingDuels[target] then
        TriggerClientEvent('chatMessage', src, "^1[Shootout]", {255, 165, 0}, "Tento hráč již má nevyřízenou výzvu.")
        return
    end

    PendingDuels[target] = src

    TriggerClientEvent('chatMessage', src, "^2[Shootout]", {0, 255, 0}, "Výzva odeslána hráči " .. GetPlayerName(target) .. ". Čekej na přijetí...")
    TriggerClientEvent('shootout:youAreChallenged', target, GetPlayerName(src))

    print("^3[Shootout] " .. GetPlayerName(src) .. " vyzval " .. GetPlayerName(target) .. "^0")
end)

-- Přijetí duelu – spouštěno z klientského příkazu /duel ano
RegisterNetEvent('shootout:acceptDuel')
AddEventHandler('shootout:acceptDuel', function()
    local src = source
    local challenger = PendingDuels[src]

    if not challenger or not GetPlayerName(challenger) then
        TriggerClientEvent('chatMessage', src, "^1[Shootout]", {255, 0, 0}, "Nemáš žádnou nevyřízenou výzvu k duelu.")
        return
    end

    PendingDuels[src] = nil
    ActiveGames[src] = challenger
    ActiveGames[challenger] = src

    TriggerClientEvent('shootout:startMultiplayer', challenger, { opponentName = GetPlayerName(src), isFirst = true })
    TriggerClientEvent('shootout:startMultiplayer', src, { opponentName = GetPlayerName(challenger), isFirst = false })

    print("^2[Shootout] Hra začala: " .. GetPlayerName(challenger) .. " vs " .. GetPlayerName(src) .. "^0")
end)

-- ==========================================
-- SYSTÉM BALÍČKŮ KARET
-- ==========================================

-- Vrátí index rarity v pořadí (pro porovnání "alespoň X nebo vyšší")
local function rarityIndex(rarity)
    for i, r in ipairs(Config.RarityOrder) do
        if r == rarity then return i end
    end
    return 0
end

-- Náhodně vybere raritu dle vah balíčku
local function rollRarity(weights)
    local roll = math.random(1, 100)
    local cumulative = 0
    for _, rarity in ipairs(Config.RarityOrder) do
        cumulative = cumulative + (weights[rarity] or 0)
        if roll <= cumulative then
            return rarity
        end
    end
    return "Common"
end

-- Sestaví lookup tabulku karet dle rarity (bez tokenů)
local cardPoolByRarity = nil
local function buildCardPool()
    if cardPoolByRarity then return end
    cardPoolByRarity = {}
    for _, rarity in ipairs(Config.RarityOrder) do
        cardPoolByRarity[rarity] = {}
    end
    for _, card in pairs(Config.Cards) do
        if not card.token and cardPoolByRarity[card.rarity] then
            table.insert(cardPoolByRarity[card.rarity], card.id)
        end
    end
end

-- Otevře balíček a vrátí seznam cardID; nil + chybovou zprávu při selhání
local function openPack(packId)
    buildCardPool()
    local pack = Config.Packs[packId]
    if not pack then
        return nil, "Neznámý typ balíčku: " .. tostring(packId)
    end

    local result = {}
    local guaranteedSlot = nil  -- index slotu, kam přijde garantovaná rarита

    -- Pokud je garantovaná rarита, rezervuj náhodný slot
    if pack.guaranteedRarity then
        guaranteedSlot = math.random(1, pack.cardCount)
    end

    for i = 1, pack.cardCount do
        local rarity

        if i == guaranteedSlot then
            -- Tento slot musí být alespoň garantovaná rarита
            local minIdx = rarityIndex(pack.guaranteedRarity)
            -- Vyber náhodnou raritu >= garantované
            local eligible = {}
            for _, r in ipairs(Config.RarityOrder) do
                if rarityIndex(r) >= minIdx and #cardPoolByRarity[r] > 0 then
                    table.insert(eligible, r)
                end
            end
            rarity = eligible[math.random(#eligible)]
        else
            -- Normální roll dle vah
            rarity = rollRarity(pack.rarityWeights)
        end

        -- Vyber náhodnou kartu z poolu rarity
        local pool = cardPoolByRarity[rarity]
        if not pool or #pool == 0 then
            -- Fallback na Common pokud rarity pool prázdný
            pool = cardPoolByRarity["Common"]
        end

        local cardId = pool[math.random(#pool)]
        table.insert(result, cardId)
    end

    return result, nil
end

-- ---- SERVER EXPORT ----
-- Volání: exports['shootout_cardgame']:OpenCardPack(source, packId)
-- Vrací: { success, cards = { cardId, ... }, error = "..." }

-- /testpack [starter|standard|premium|legendary]
-- Příklad: /testpack premium
RegisterCommand("testpack", function(src, args)
    local packId = args[1]

    -- Bez argumentu vypiš dostupné typy
    if not packId then
        local types = {}
        for id, pack in pairs(Config.Packs) do
            table.insert(types, string.format("  %s – %s (%d karet, garantováno: %s)", id, pack.name, pack.cardCount, pack.guaranteedRarity or "–"))
        end
        table.sort(types)
        TriggerClientEvent('chatMessage', src, "^3[Shootout]", {255, 165, 0}, "Použití: /testpack <typ>")
        for _, line in ipairs(types) do
            TriggerClientEvent('chatMessage', src, "^3[Shootout]", {255, 165, 0}, line)
        end
        return
    end

    -- Zkontroluj platnost
    if not Config.Packs[packId] then
        local validIds = {}
        for id in pairs(Config.Packs) do table.insert(validIds, id) end
        table.sort(validIds)
        TriggerClientEvent('chatMessage', src, "^1[Shootout]", {255, 0, 0},
            "Neznámý typ balíčku '" .. packId .. "'. Dostupné: " .. table.concat(validIds, ", "))
        return
    end

    -- Otevři balíček (obejde kontrolu inventáře)
    local cards, err = openPack(packId)
    if err then
        TriggerClientEvent('chatMessage', src, "^1[Shootout]", {255, 0, 0}, "Chyba: " .. err)
        return
    end

    -- Dej karty hráči
    for _, cardId in ipairs(cards) do
        local card = Config.Cards[cardId]
        if card then
            local itemName = constructCardName(cardId)
            exports.vorp_inventory:addItem(src, itemName, 1)
        end
    end

    -- Informuj klienta (stejný event jako při normálním otevření)
    TriggerClientEvent('shootout:packOpened', src, { packId = packId, cards = cards })
    TriggerClientEvent('chatMessage', src, "^2[Shootout]", {0, 255, 0},
        "TEST: Otevřel jsi '" .. Config.Packs[packId].name .. "'. Karty: " .. table.concat(cards, ", "))

    print("^3[Shootout TEST] " .. GetPlayerName(src) .. " otevřel testovací balíček '" .. packId .. "'^0")
end, true) -- true = pouze admini (konzole + ACE perm shootout.testpack)

exports('OpenCardPack', function(src, packId)
    local cards, err = openPack(packId)
    if err then
        return { success = false, error = err }
    end

    -- Dej karty hráči přes vorp_inventory
    for _, cardId in ipairs(cards) do
        local card = Config.Cards[cardId]
        if card then
            local itemName = constructCardName(cardId)
            exports.vorp_inventory:addItem(src, itemName, 1)
        end
    end

    return { success = true, cards = cards }
end)

-- ---- SERVER EVENT ----
-- Spuštění: TriggerServerEvent('shootout:openPack', packId)
-- Odpověď:  shootout:packOpened  →  { cards = { cardId, ... } }
RegisterNetEvent('shootout:openPack')
AddEventHandler('shootout:openPack', function(packId)
    local src = source
    local pack = Config.Packs[packId]

    if not pack then
        TriggerClientEvent('chatMessage', src, "^1[Shootout]", {255, 0, 0}, "Neplatný balíček.")
        return
    end

    -- Zkontroluj, zda má hráč item balíčku v inventáři
    local hasItem = exports.vorp_inventory:getItemCount(src, pack.itemName) > 0
    if not hasItem then
        TriggerClientEvent('chatMessage', src, "^1[Shootout]", {255, 0, 0}, "Nemáš balíček '" .. pack.name .. "' v inventáři.")
        return
    end

    -- Odeber balíček
    exports.vorp_inventory:subItem(src, pack.itemName, 1)

    -- Vygeneruj karty
    local cards, err = openPack(packId)
    if err then
        TriggerClientEvent('chatMessage', src, "^1[Shootout]", {255, 0, 0}, "Chyba při otevírání balíčku.")
        return
    end

    -- Dej karty hráči
    for _, cardId in ipairs(cards) do
        local itemName = constructCardName(cardId)
        exports.vorp_inventory:addItem(src, itemName, 1)
    end

    -- Informuj klienta o obsahu balíčku
    TriggerClientEvent('shootout:packOpened', src, { packId = packId, cards = cards })

    print("^2[Shootout] " .. GetPlayerName(src) .. " otevřel balíček '" .. pack.name .. "'^0")
end)

-- Pomocná funkce – stejná jako na klientovi (server ji potřebuje pro jméno itemu)
function constructCardName(cardID)
    local card = Config.Cards[cardID]
    if card then
        return tostring(card.id .. "_" .. card.type .. "_" .. card.name:gsub(" ", "_"))
    end
    return nil
end

-- ==========================================
-- Přeposílání herních akcí (karta zahrána, útok, konec kola...)
RegisterNetEvent('shootout:sendAction')
AddEventHandler('shootout:sendAction', function(actionData)
    local src = source
    local opponent = ActiveGames[src]

    if opponent then
        -- Přeposlat data oponentovi
        TriggerClientEvent('shootout:receiveAction', opponent, actionData)
    end
end)

-- Ukončení hry při odpojení
AddEventHandler('playerDropped', function()
    local src = source

    -- Vyčistit aktivní hru
    local opponent = ActiveGames[src]
    if opponent then
        TriggerClientEvent('shootout:opponentLeft', opponent)
        ActiveGames[opponent] = nil
        ActiveGames[src] = nil
    end

    -- Vyčistit čekající výzvy (jako vyzývatel)
    for target, challenger in pairs(PendingDuels) do
        if challenger == src then
            PendingDuels[target] = nil
            TriggerClientEvent('chatMessage', target, "^1[Shootout]", {255, 0, 0}, "Výzva k duelu byla zrušena – hráč se odpojil.")
        end
    end

    -- Vyčistit čekající výzvy (jako vyzvaný)
    if PendingDuels[src] then
        PendingDuels[src] = nil
    end
end)