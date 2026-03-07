-- ==========================================
-- FILE: server.lua
-- ==========================================

-- ==========================================
-- INICIALIZACE CORE
-- ==========================================

local VorpCore = {}

TriggerEvent("getCore", function(core)
    VorpCore = core
end)

math.randomseed(os.time())

-- ==========================================
-- STAVOVÉ PROMĚNNÉ
-- ==========================================

local ActiveGames  = {} -- { [source] = opponentSource }
local PendingDuels = {} -- { [targetSource] = challengerSource }
local playerDecks  = {} -- { [charID] = deckInventoryName }
local cards        = {} -- { [itemName] = maxStack }

local cardPoolByRarity = nil -- lazy-built lookup pro balíčky

-- ==========================================
-- UTILITY FUNKCE
-- ==========================================

local function debugPrint(text)
    if Config.Debug then
        print(text)
    end
end

local function GetName(src)
    return GetPlayerName(src) or "Unknown Cowboy"
end

function table.count(tbl)
    local count = 0
    for _ in pairs(tbl) do
        count = count + 1
    end
    return count
end

function Notify(playerId, message)
    TriggerClientEvent('notifications:notify', playerId, "Karty", message, 4000)
end

-- Sestaví název itemu karty (stejná logika jako na klientovi)
function constructCardName(cardID)
    local card = Config.Cards[cardID]
    if card then
        return tostring(card.id .. "_" .. card.type .. "_" .. card.name:gsub(" ", "_"))
    end
    return nil
end

-- ==========================================
-- INVENTÁŘ
-- ==========================================

function RegisterInventory(id, label, limit, allowItems, allowWeapons, shared, prefix, type, money, useWeight)
    debugPrint("Registruji inventář " .. id)

    local inventoryId = prefix .. tostring(id)
    local isRegistered = exports.vorp_inventory:isCustomInventoryRegistered(inventoryId)

    local data = {
        id                   = inventoryId,
        name                 = label,
        limit                = limit or 2000000,
        acceptWeapons        = allowWeapons or false,
        shared               = shared or true,
        ignoreItemStackLimit = true,
        whitelistItems       = allowItems,
        UsePermissions       = false,
        UseBlackList         = false,
        whitelistWeapons     = table.count(allowWeapons) > 0,
        useWeight            = useWeight or true,
        weight               = limit or 30,
        type                 = type or "chest",
        moneyLimit           = money or 0,
    }

    if isRegistered then
        debugPrint("Inventář " .. inventoryId .. " je již zaregistrovaný, aktualizuji")
        exports.vorp_inventory:updateCustomInventoryData(inventoryId, data)
    else
        exports.vorp_inventory:registerInventory(data)
    end

    local limitedItems   = {}
    local limitedWeapons = {}

    if table.count(allowWeapons) > 0 then
        for index, value in pairs(allowWeapons) do
            limitedWeapons[index:lower()] = value
        end
    end

    if table.count(allowItems) > 0 then
        for index, value in pairs(allowItems) do
            limitedItems[index] = value
        end
    end

    if table.count(allowItems) > 0 or table.count(limitedWeapons) > 0 then
        exports.vorp_inventory:updateCustomInventoryData(inventoryId, {
            limitedItems   = limitedItems,
            limitedWeapons = limitedWeapons,
        })
    end
end

-- ==========================================
-- SPUŠTĚNÍ RESOURCE
-- ==========================================

AddEventHandler("onResourceStart", function(resource)
    if resource ~= GetCurrentResourceName() then return end

    for _, card in pairs(Config.Cards) do
        local item = constructCardName(card.id)
        if item then
            cards[string.lower(item)] = 9999
        end
    end

    print("^2[Shootout] Karty načteny: " .. table.count(cards) .. "^0")
end)

-- ==========================================
-- BALÍČEK HRÁČE (DECK)
-- ==========================================

local function getPlayerDeck(source)
    local charID   = Player(source).state.Character.CharId
    local deckName = playerDecks[charID]
    if deckName then
        return exports.vorp_inventory:getCustomInventoryItems(deckName) or {}
    end
    return {}
end

VorpCore.Callback.Register("shootout:getPlayerDeck", function(_source, cb)
    cb(getPlayerDeck(_source) or {})
end)

RegisterServerEvent("shootout:getPlayerDeck")
AddEventHandler("shootout:getPlayerDeck", function()
    local _source = source
    TriggerClientEvent("shootout:updateMyCards", _source, getPlayerDeck(_source) or {})
end)

-- ==========================================
-- MULTIPLAYER – DUELY
-- ==========================================

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

    PendingDuels[target] = src

    TriggerClientEvent('chatMessage', src, "^2[Shootout]", {0, 255, 0},
        "Výzva odeslána hráči " .. GetName(target) .. ". Čekej na přijetí...")
    TriggerClientEvent('shootout:youAreChallenged', target, GetName(src))

    -- Timeout – výzva vyprší po 30 sekundách
    SetTimeout(30000, function()
        if PendingDuels[target] == src then
            PendingDuels[target] = nil
            TriggerClientEvent('chatMessage', src,    "^1[Shootout]", {255, 165, 0}, "Výzva vypršela.")
            TriggerClientEvent('chatMessage', target, "^1[Shootout]", {255, 165, 0}, "Výzva od " .. GetName(src) .. " vypršela.")
        end
    end)

    print("^3[Shootout] " .. GetName(src) .. " vyzval " .. GetName(target) .. "^0")
end)

-- Přijetí duelu
RegisterNetEvent('shootout:acceptDuel')
AddEventHandler('shootout:acceptDuel', function()
    local src        = source
    local challenger = PendingDuels[src]

    if not challenger then
        TriggerClientEvent('chatMessage', src, "^1[Shootout]", {255, 0, 0}, "Nemáš žádnou aktivní výzvu.")
        return
    end

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

    -- Spuštění hry
    PendingDuels[src]       = nil
    ActiveGames[src]        = challenger
    ActiveGames[challenger] = src

    local player1Start = math.random(1, 2) == 1

    TriggerClientEvent('shootout:startMultiplayer', challenger, {
        opponentName = GetName(src),
        isFirst      = player1Start,
    })
    TriggerClientEvent('shootout:startMultiplayer', src, {
        opponentName = GetName(challenger),
        isFirst      = not player1Start,
    })

    print("^2[Shootout] Hra začala: " .. GetName(challenger) .. " vs " .. GetName(src) .. "^0")
end)

-- Přeposílání akcí mezi hráči
RegisterNetEvent('shootout:sendAction')
AddEventHandler('shootout:sendAction', function(actionData)
    local src      = source
    local opponent = ActiveGames[src]

    if not opponent then return end

    if GetPlayerName(opponent) then
        TriggerClientEvent('shootout:receiveAction', opponent, actionData)
    else
        -- Soupeř spadl dříve, než to server zaregistroval
        TriggerClientEvent('shootout:opponentLeft', src)
        ActiveGames[src] = nil
    end
end)

-- Úklid při odpojení hráče
AddEventHandler('playerDropped', function()
    local src  = source
    local name = GetName(src)

    -- Informuj soupeře ve hře
    local opponent = ActiveGames[src]
    if opponent then
        TriggerClientEvent('shootout:opponentLeft', opponent)
        TriggerClientEvent('chatMessage', opponent, "^1[Shootout]", {255, 0, 0},
            "Soupeř " .. name .. " se odpojil. Vyhrál jsi kontumačně.")
        ActiveGames[opponent] = nil
        ActiveGames[src]      = nil
    end

    -- Zruš nevyřízené výzvy, které src posílal
    for target, challenger in pairs(PendingDuels) do
        if challenger == src then
            PendingDuels[target] = nil
            TriggerClientEvent('chatMessage', target, "^1[Shootout]", {255, 0, 0},
                "Hráč " .. name .. " zrušil výzvu (odpojen).")
        end
    end

    -- Zruš výzvu, na kterou src čekal
    if PendingDuels[src] then
        PendingDuels[src] = nil
    end

    print("^3[Shootout] Hráč " .. name .. " se odpojil. Data vyčištěna.^0")
end)

-- ==========================================
-- SYSTÉM BALÍČKŮ KARET
-- ==========================================

-- Vrátí číselný index rarity (pro porovnání "alespoň X nebo vyšší")
local function rarityIndex(rarity)
    for i, r in ipairs(Config.RarityOrder) do
        if r == rarity then return i end
    end
    return 0
end

-- Náhodně vybere raritu dle vah balíčku
local function rollRarity(weights)
    local roll       = math.random(1, 100)
    local cumulative = 0
    for _, rarity in ipairs(Config.RarityOrder) do
        cumulative = cumulative + (weights[rarity] or 0)
        if roll <= cumulative then
            return rarity
        end
    end
    return "Common"
end

-- Sestaví lookup tabulku karet dle rarity (lazy, bez tokenů)
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

-- Otevře balíček a vrátí seznam cardID; nebo nil + chybovou zprávu
local function openPack(packId)
    buildCardPool()

    local pack = Config.Packs[packId]
    if not pack then
        return nil, "Neznámý typ balíčku: " .. tostring(packId)
    end

    local result        = {}
    local guaranteedSlot = pack.guaranteedRarity and math.random(1, pack.cardCount) or nil

    for i = 1, pack.cardCount do
        local rarity

        if i == guaranteedSlot then
            -- Slot musí být alespoň garantovaná rarита
            local minIdx  = rarityIndex(pack.guaranteedRarity)
            local eligible = {}
            for _, r in ipairs(Config.RarityOrder) do
                if rarityIndex(r) >= minIdx and #cardPoolByRarity[r] > 0 then
                    table.insert(eligible, r)
                end
            end
            rarity = eligible[math.random(#eligible)]
        else
            rarity = rollRarity(pack.rarityWeights)
        end

        local pool = cardPoolByRarity[rarity]
        if not pool or #pool == 0 then
            pool = cardPoolByRarity["Common"] -- fallback
        end

        table.insert(result, pool[math.random(#pool)])
    end

    return result, nil
end

-- Otevře balíček pro hráče (s kontrolou inventáře)
local function OpenPackID(src, packId)
    local pack = Config.Packs[packId]
    if not pack then
        TriggerClientEvent('chatMessage', src, "^1[Shootout]", {255, 0, 0}, "Neplatný balíček.")
        return
    end

    if exports.vorp_inventory:getItemCount(src, nil, pack.itemName) <= 0 then
        TriggerClientEvent('chatMessage', src, "^1[Shootout]", {255, 0, 0},
            "Nemáš balíček '" .. pack.name .. "' v inventáři.")
        return
    end

    exports.vorp_inventory:subItem(src, pack.itemName, 1)

    local openedCards, err = openPack(packId)
    if err then
        TriggerClientEvent('chatMessage', src, "^1[Shootout]", {255, 0, 0}, "Chyba při otevírání balíčku.")
        return
    end

    for _, cardId in ipairs(openedCards) do
        exports.vorp_inventory:addItem(src, constructCardName(cardId), 1)
    end

    TriggerClientEvent('shootout:packOpened', src, { packId = packId, cards = openedCards })
    print("^2[Shootout] " .. GetPlayerName(src) .. " otevřel balíček '" .. pack.name .. "'^0")
end

-- ==========================================
-- PŘÍKAZY
-- ==========================================

-- /testpack [starter|standard|premium|legendary]
RegisterCommand("testpack", function(src, args)
    local packId = args[1]

    if not packId then
        local types = {}
        for id, pack in pairs(Config.Packs) do
            table.insert(types, string.format("  %s – %s (%d karet, garantováno: %s)",
                id, pack.name, pack.cardCount, pack.guaranteedRarity or "–"))
        end
        table.sort(types)
        TriggerClientEvent('chatMessage', src, "^3[Shootout]", {255, 165, 0}, "Použití: /testpack <typ>")
        for _, line in ipairs(types) do
            TriggerClientEvent('chatMessage', src, "^3[Shootout]", {255, 165, 0}, line)
        end
        return
    end

    if not Config.Packs[packId] then
        local validIds = {}
        for id in pairs(Config.Packs) do table.insert(validIds, id) end
        table.sort(validIds)
        TriggerClientEvent('chatMessage', src, "^1[Shootout]", {255, 0, 0},
            "Neznámý typ balíčku '" .. packId .. "'. Dostupné: " .. table.concat(validIds, ", "))
        return
    end

    local openedCards, err = openPack(packId)
    if err then
        TriggerClientEvent('chatMessage', src, "^1[Shootout]", {255, 0, 0}, "Chyba: " .. err)
        return
    end

    for _, cardId in ipairs(openedCards) do
        if Config.Cards[cardId] then
            exports.vorp_inventory:addItem(src, constructCardName(cardId), 1)
        end
    end

    TriggerClientEvent('shootout:packOpened', src, { packId = packId, cards = openedCards })
    TriggerClientEvent('chatMessage', src, "^2[Shootout]", {0, 255, 0},
        "TEST: Otevřel jsi '" .. Config.Packs[packId].name .. "'. Karty: " .. table.concat(openedCards, ", "))

    print("^3[Shootout TEST] " .. GetPlayerName(src) .. " otevřel testovací balíček '" .. packId .. "'^0")
end, true) -- true = pouze admini (ACE perm shootout.testpack)

-- ==========================================
-- EXPORTY
-- ==========================================

-- exports['shootout_cardgame']:OpenCardPack(source, packId)
-- Vrací: { success, cards } nebo { success = false, error }
exports('OpenCardPack', function(src, packId)
    local openedCards, err = openPack(packId)
    if err then
        return { success = false, error = err }
    end

    for _, cardId in ipairs(openedCards) do
        if Config.Cards[cardId] then
            exports.vorp_inventory:addItem(src, constructCardName(cardId), 1)
        end
    end

    return { success = true, cards = openedCards }
end)

-- ==========================================
-- POUŽITÍ ITEMU (vorp_inventory)
-- ==========================================

RegisterServerEvent("vorp_inventory:useItem")
AddEventHandler("vorp_inventory:useItem", function(data)
    local _source  = source
    local itemName = data.item

    exports.vorp_inventory:getItemByMainId(_source, data.id, function(itemData)
        if not itemData then return end

        local charID = Player(_source).state.Character.CharId

        -- Použití balíčku karet (deck)
        for _, deck in pairs(Config.Decks) do
            if itemName == deck.item then
                print(json.encode(itemData, { indent = true }))

                if not itemData.metadata.id then
                    itemData.metadata.id = charID .. "_" .. os.time()
                    exports.vorp_inventory:setItemMetadata(_source, itemData.id, itemData.metadata, 1)
                end

                RegisterInventory(itemData.metadata.id, deck.name, deck.limit, cards, {}, true, "deck_", "chest", 0, false)
                exports.vorp_inventory:openInventory(_source, "deck_" .. itemData.metadata.id)
                playerDecks[charID] = "deck_" .. itemData.metadata.id
                Notify(_source, "Otevřel jsi balíček karet '" .. deck.name .. "'. A nastavil jako tvůj herní balíček.")
                return
            end
        end

        -- Použití karty
        for _, card in pairs(Config.Cards) do
            if itemName == constructCardName(card.id) then
                Notify(_source, "Použil jsi kartu '" .. card.name .. "'.")
                TriggerClientEvent('shootout:showCard', _source, card.id)
                exports.vorp_inventory:closeInventory(_source)
                return
            end
        end

        -- Použití booster balíčku
        for packId, pack in pairs(Config.Packs) do
            if itemName == pack.itemName then
                Notify(_source, "Použil jsi balíček '" .. pack.name .. "'.")
                exports.vorp_inventory:closeInventory(_source)
                OpenPackID(_source, packId)
                return
            end
        end
    end)
end)
