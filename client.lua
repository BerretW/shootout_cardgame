local display = false

RegisterCommand("shootout", function(source, args)
    SetDisplay(true)
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
end)

-- Callback pro ukončení tahu nebo hraní karty (zde by se posílalo info serveru)
RegisterNUICallback("action", function(data, cb)
    -- Zde by byla logika pro synchronizaci s druhým hráčem
    cb('ok')
end)