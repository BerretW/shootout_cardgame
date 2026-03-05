-- ==========================================
-- FILE: client.lua
-- ==========================================
local display = false

-- Otevření UI a start hry
RegisterNetEvent('shootout:startMultiplayer')
AddEventHandler('shootout:startMultiplayer', function(data)
    SetDisplay(true)
    SendNUIMessage({
        type = "start_game",
        isFirst = data.isFirst,
        opponentName = data.opponentName
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
        status = bool,
    })
end

RegisterNUICallback("exit", function(data)
    SetDisplay(false)
    -- Tady by se mělo poslat info serveru, že jsi to vzdal
end)

-- JS pošle akci -> my ji pošleme serveru
RegisterNUICallback("sendAction", function(data, cb)
    TriggerServerEvent('shootout:sendAction', data)
    cb('ok')
end)


RegisterCommand("testgame", function(source, args)
    SetDisplay(true)
    SendNUIMessage({
        type = "start_singleplayer"
    })
    TriggerEvent('chat:addMessage', {
        color = {255, 255, 0},
        multiline = true,
        args = {"Shootout", "Spuštěn tréninkový režim proti Botovi."}
    })
end)