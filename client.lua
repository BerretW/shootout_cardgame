-- ==========================================
-- FILE: client.lua
-- ==========================================
local display = false

local function constructCardName(cardID)
    local card = Config.Cards[cardID]
    if card then
        return tostring(card.id .. "_" .. card.type .. "_" .. card.name:gsub(" ", "_"))
    else
        return "Unknown Card"
    end
end

local function isThisACard(itemName)
    for _, card in pairs(Config.Cards) do
        if constructCardName(card.id) == itemName then
            return card.id
        end
    end
    return nil
end

local function getMyCards()
    local inventory = exports.vorp_inventory:getInventoryItems()
    local myCards = {}
    for _, item in ipairs(inventory) do
        local cardID = isThisACard(item.name)
        if cardID then
            table.insert(myCards, Config.Cards[cardID]) -- Přidáme celou kartu, ne jen ID, pro pohodlnější práci v UI
        end
    end
    return myCards
end

-- Otevření UI a start hry
RegisterNetEvent('shootout:startMultiplayer')
AddEventHandler('shootout:startMultiplayer', function(data)
    SetDisplay(true)
    local MyCards = getMyCards()
    -- print(json.encode(MyCards))
    SendNUIMessage({
        type = "start_game",
        isFirst = data.isFirst,
        opponentName = data.opponentName,
        cards = Config.Cards,
        myCards = MyCards
    })
end)

-- Přijetí akce od soupeře
RegisterNetEvent('shootout:receiveAction')
AddEventHandler('shootout:receiveAction', function(data)
    SendNUIMessage({
        type = "enemy_action",
        action = data
    })
end)

-- Odpojení soupeře
RegisterNetEvent('shootout:opponentLeft')
AddEventHandler('shootout:opponentLeft', function()
    SendNUIMessage({
        type = "game_over",
        message = "Opponent disconnected!"
    })
end)

function SetDisplay(bool)
    display = bool
    SetNuiFocus(bool, bool)
    SendNUIMessage({
        type = "ui",
        status = bool
    })
end

AddEventHandler('onResourceStop', function(resourceName)
    if (GetCurrentResourceName() ~= resourceName) then
      return
    end
    SetNuiFocus(false, false)
end)

-- Zobrazení jedné karty na obrazovce (volitelně s allCards pro inicializaci DB)
function showCard(cardId)
    local card = Config.Cards[cardId]
    if not card then
        print("^1[Shootout] showCard: karta s ID " .. tostring(cardId) .. " neexistuje.^0")
        return
    end
    SetNuiFocus(true, true)
    SendNUIMessage({
        type     = "show_card",
        card     = card,
        allCards = Config.Cards,
    })
end

RegisterCommand("showcard", function(source, args)
    local cardId = tonumber(args[1])
    if not cardId then
        print("^1[Shootout] Použití: /showcard [ID karty]^0")
        return
    end
    showCard(cardId)
end)

RegisterNUICallback("closeCard", function(data, cb)
    -- NUI focus ponecháme pouze pokud je hra aktivní (display == true)
    if not display then
        SetNuiFocus(false, false)
    end
    cb('ok')
end)

-- Vylepšení callbacku exit
RegisterNUICallback("exit", function(data, cb)
    SetDisplay(false)
    SetNuiFocus(false, false)
    print("^1[Shootout] Hra ukončena klientem.^0")
    
    -- Informuj server, že hráč to vzdal (pokud je ve hře)
    -- TriggerServerEvent('shootout:surrender') -- Doporučuji implementovat na serveru
    
    cb('ok')
end)

-- JS pošle akci -> my ji pošleme serveru
RegisterNUICallback("sendAction", function(data, cb)
    TriggerServerEvent('shootout:sendAction', data)
    cb('ok')
end)

RegisterCommand("testgame", function(source, args)
    SetDisplay(true)
    local MyCards = getMyCards()
    print(json.encode(MyCards))
    SendNUIMessage({
        type = "start_singleplayer",
        cards = Config.Cards,
        myCards = MyCards,
        debug = true
    })
    TriggerEvent('chat:addMessage', {
        color = {255, 255, 0},
        multiline = true,
        args = {"Shootout", "Spuštěn tréninkový režim proti Botovi."}
    })
end)

local MIN_CARDS = 20

-- Příkaz /duel [ID] pro výzvu, nebo /duel ano pro přijetí
RegisterCommand("duel", function(source, args)
    local arg1 = args[1]

    if arg1 == "ano" then
        -- Přijetí výzvy
        local myCards = getMyCards()
        if #myCards < MIN_CARDS then
            TriggerEvent('chat:addMessage', {
                color = {255, 0, 0},
                args = {"Shootout", "Nemáš dostatek karet! Potřebuješ alespoň " .. MIN_CARDS .. " karet. Máš: " .. #myCards}
            })
            return
        end
        TriggerServerEvent('shootout:acceptDuel')
    else
        -- Výzva ke hře
        local target = tonumber(arg1)
        if not target then
            TriggerEvent('chat:addMessage', {
                color = {255, 165, 0},
                args = {"Shootout", "Použití: /duel [ID hráče] — nebo — /duel ano (pro přijetí výzvy)"}
            })
            return
        end
        local myCards = getMyCards()
        if #myCards < MIN_CARDS then
            TriggerEvent('chat:addMessage', {
                color = {255, 0, 0},
                args = {"Shootout", "Nemáš dostatek karet! Potřebuješ alespoň " .. MIN_CARDS .. " karet. Máš: " .. #myCards}
            })
            return
        end
        TriggerServerEvent('shootout:sendChallenge', target)
    end
end)

-- Výsledek otevřeného balíčku
RegisterNetEvent('shootout:packOpened')
AddEventHandler('shootout:packOpened', function(data)
    local pack = Config.Packs[data.packId]
    local packName = pack and pack.name or "Balíček"
    print("^2[Shootout] Otevřel jsi " .. packName .. "! Získané karty:")
    TriggerEvent('chat:addMessage', {
        color = {255, 215, 0},
        multiline = true,
        args = {"Shootout", "Otevřel jsi ^3" .. packName .. "^0! Získané karty:"}
    })

    for _, cardId in ipairs(data.cards) do
        local card = Config.Cards[cardId]
        if card then
            local rarityColor = "^0"
            if card.rarity == "Uncommon"  then rarityColor = "^2"
            elseif card.rarity == "Rare"      then rarityColor = "^4"
            elseif card.rarity == "Epic"      then rarityColor = "^5"
            elseif card.rarity == "Legendary" then rarityColor = "^3"
            end
            TriggerEvent('chat:addMessage', {
                color = {220, 220, 220},
                args = {"  →", rarityColor .. "[" .. card.rarity .. "] " .. card.name .. "^0 (" .. card.faction .. ")"}
            })
        end
    end
    SetNuiFocus(true, true)
    -- Pošli UI info o nových kartách (volitelné – pro animaci otevírání)
    SendNUIMessage({
        type     = "pack_opened",
        packId   = data.packId,
        cards    = data.cards,
        allCards = Config.Cards,
    })
end)

-- Notifikace o příchozí výzvě
RegisterNetEvent('shootout:youAreChallenged')
AddEventHandler('shootout:youAreChallenged', function(challengerName)
    TriggerEvent('chat:addMessage', {
        color = {255, 165, 0},
        multiline = true,
        args = {"Shootout", "^3" .. challengerName .. "^0 tě vyzval na duel karet! Napiš ^2/duel ano^0 pro přijetí. (Potřebuješ alespoň " .. MIN_CARDS .. " karet)"}
    })
end)
