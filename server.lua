-- ==========================================
-- FILE: server.lua
-- ==========================================
math.randomseed(os.time())

local ActiveGames = {}   -- { [source] = opponentSource }
local PendingDuels = {}  -- { [targetSource] = challengerSource }

-- Pomocná funkce pro bezpečné získání jména
local function GetName(src)
    return GetPlayerName(src) or "Unknown Cowboy"
end

-- Výzva k duelu
RegisterNetEvent('shootout:sendChallenge')
AddEventHandler('shootout:sendChallenge', function(target)
    local src = source
    target = tonumber(target)

    if not target or target == -1 then
        TriggerClientEvent('chatMessage', src, "^1[Shootout]", {255, 0, 0}, "Neplatné ID hráče.")
        return
    end

    if target == src then
        TriggerClientEvent('chatMessage', src, "^1[Shootout]", {255, 0, 0}, "Nemůžeš vyzvat sám sebe.")
        return
    end

    if not GetPlayerName(target) then
        TriggerClientEvent('chatMessage', src, "^1[Shootout]", {255, 0, 0}, "Hráč se nenachází ve městě (offline).")
        return
    end

    if ActiveGames[src] then
        TriggerClientEvent('chatMessage', src, "^1[Shootout]", {255, 0, 0}, "Ty už jsi ve hře! Nejprve ji dokonči.")
        return
    end

    if ActiveGames[target] then
        TriggerClientEvent('chatMessage', src, "^1[Shootout]", {255, 0, 0}, "Tento hráč již hraje jinou hru.")
        return
    end

    if PendingDuels[target] then
        TriggerClientEvent('chatMessage', src, "^1[Shootout]", {255, 165, 0}, "Tento hráč již má jinou nevyřízenou výzvu.")
        return
    end

    -- Uložíme výzvu
    PendingDuels[target] = src

    TriggerClientEvent('chatMessage', src, "^2[Shootout]", {0, 255, 0}, "Výzva odeslána hráči " .. GetName(target) .. ". Čekej na přijetí...")
    TriggerClientEvent('shootout:youAreChallenged', target, GetName(src))
    
    -- Timeout pro výzvu (volitelné, aby nezůstala viset věčně)
    SetTimeout(30000, function()
        if PendingDuels[target] == src then
            PendingDuels[target] = nil
            TriggerClientEvent('chatMessage', src, "^1[Shootout]", {255, 165, 0}, "Výzva vypršela.")
            TriggerClientEvent('chatMessage', target, "^1[Shootout]", {255, 165, 0}, "Výzva od " .. GetName(src) .. " vypršela.")
        end
    end)

    print("^3[Shootout] " .. GetName(src) .. " vyzval " .. GetName(target) .. "^0")
end)

-- Přijetí duelu
RegisterNetEvent('shootout:acceptDuel')
AddEventHandler('shootout:acceptDuel', function()
    local src = source
    local challenger = PendingDuels[src]

    if not challenger then
        TriggerClientEvent('chatMessage', src, "^1[Shootout]", {255, 0, 0}, "Nemáš žádnou aktivní výzvu.")
        return
    end

    -- Ověření, zda je vyzyvatel stále online a volný
    if not GetPlayerName(challenger) then
        TriggerClientEvent('chatMessage', src, "^1[Shootout]", {255, 0, 0}, "Vyzyvatel se odpojil.")
        PendingDuels[src] = nil
        return
    end

    if ActiveGames[challenger] then
        TriggerClientEvent('chatMessage', src, "^1[Shootout]", {255, 0, 0}, "Vyzyvatel už začal jinou hru.")
        PendingDuels[src] = nil
        return
    end

    -- Start hry
    PendingDuels[src] = nil
    ActiveGames[src] = challenger
    ActiveGames[challenger] = src

    -- Určení kdo začíná (náhodně)
    local coinFlip = math.random(1, 2)
    local player1Start = (coinFlip == 1)

    -- Odeslání startovního eventu oběma hráčům
    -- isFirst = true znamená, že hráč má první tah
    TriggerClientEvent('shootout:startMultiplayer', challenger, { 
        opponentName = GetName(src), 
        isFirst = player1Start 
    })
    
    TriggerClientEvent('shootout:startMultiplayer', src, { 
        opponentName = GetName(challenger), 
        isFirst = not player1Start 
    })

    print("^2[Shootout] Hra začala: " .. GetName(challenger) .. " vs " .. GetName(src) .. "^0")
end)

-- Přeposílání akcí (SYNCHRONIZACE)
RegisterNetEvent('shootout:sendAction')
AddEventHandler('shootout:sendAction', function(actionData)
    local src = source
    local opponent = ActiveGames[src]

    if opponent then
        -- Bezpečnostní kontrola, zda soupeř existuje
        if GetPlayerName(opponent) then
            TriggerClientEvent('shootout:receiveAction', opponent, actionData)
        else
            -- Soupeř spadl, ale server to ještě nezaregistroval přes playerDropped
            TriggerClientEvent('shootout:opponentLeft', src)
            ActiveGames[src] = nil
        end
    end
end)

-- Ukončení hry při odpojení
AddEventHandler('playerDropped', function()
    local src = source
    local name = GetName(src)

    -- 1. Pokud byl ve hře, informuj soupeře
    local opponent = ActiveGames[src]
    if opponent then
        TriggerClientEvent('shootout:opponentLeft', opponent)
        TriggerClientEvent('chatMessage', opponent, "^1[Shootout]", {255, 0, 0}, "Soupeř " .. name .. " se odpojil. Vyhrál jsi kontumačně.")
        ActiveGames[opponent] = nil
        ActiveGames[src] = nil
    end

    -- 2. Pokud někoho vyzýval (čekalo se na přijetí)
    for target, challenger in pairs(PendingDuels) do
        if challenger == src then
            PendingDuels[target] = nil
            TriggerClientEvent('chatMessage', target, "^1[Shootout]", {255, 0, 0}, "Hráč " .. name .. " zrušil výzvu (odpojen).")
        end
    end

    -- 3. Pokud byl vyzván
    if PendingDuels[src] then
        -- Tady není třeba nic posílat, challengerovi vyprší timeout nebo zjistí, že hráč není online při pokusu o opakování
        PendingDuels[src] = nil
    end
    
    print("^3[Shootout] Hráč " .. name .. " se odpojil. Data vyčištěna.^0")
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


