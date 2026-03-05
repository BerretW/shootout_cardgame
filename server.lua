-- ==========================================
-- FILE: server.lua
-- ==========================================
local ActiveGames = {} -- Ukládá páry hráčů: { [source] = opponentSource }

-- Příkaz pro vyzvání hráče: /duel [ID]
RegisterCommand("duel", function(source, args)
    local target = tonumber(args[1])
    if target and target ~= source and GetPlayerName(target) then
        -- Uložíme session pro oba směry
        ActiveGames[source] = target
        ActiveGames[target] = source
        
        -- Oznámíme oběma start
        TriggerClientEvent('shootout:startMultiplayer', source, { opponentName = GetPlayerName(target), isFirst = true })
        TriggerClientEvent('shootout:startMultiplayer', target, { opponentName = GetPlayerName(source), isFirst = false })
        
        print("^2[Shootout] Hra začala: " .. GetPlayerName(source) .. " vs " .. GetPlayerName(target) .. "^0")
    else
        TriggerClientEvent('chatMessage', source, "^1[System]", {255, 0, 0}, "Hráč nenalezen nebo jsi zadal sebe.")
    end
end)

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
    local opponent = ActiveGames[src]
    if opponent then
        TriggerClientEvent('shootout:opponentLeft', opponent)
        ActiveGames[opponent] = nil
        ActiveGames[src] = nil
    end
end)