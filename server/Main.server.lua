local clickDetector = workspace:WaitForChild("Assegno"):WaitForChild("ClickDetector")
local eventGui = game.ReplicatedStorage:WaitForChild("ApriAssegnoGui")
local checkEvent = game.ReplicatedStorage:WaitForChild("ControlloAssegno")

-- Variabile per tenere il punteggio dei giocatori
local punteggi = {}

-- Esempio assegno corretto (puoi aggiungere livelli o clienti diversi)
local esempioAssegno = {
    beneficiario = "Mario Rossi",
    importo = 1250
}

-- Click sull’assegno apre la GUI
clickDetector.MouseClick:Connect(function(player)
    eventGui:FireClient(player)
end)

-- Controllo dell’assegno inviato dal client
checkEvent.OnServerEvent:Connect(function(player, beneficiarioInput, importoInput)
    if not punteggi[player.UserId] then
        punteggi[player.UserId] = 0
    end

    local corretto = true
    local messaggio = ""

    if beneficiarioInput ~= esempioAssegno.beneficiario then
        corretto = false
        messaggio = messaggio .. "Beneficiario errato! "
    end

    if tonumber(importoInput) ~= esempioAssegno.importo then
        corretto = false
        messaggio = messaggio .. "Importo errato! "
    end

    if corretto then
        punteggi[player.UserId] = punteggi[player.UserId] + 10
        messaggio = "Assegno corretto! +10 punti. Totale: "..punteggi[player.UserId]
        print(player.Name.." ha compilato correttamente l’assegno. Punteggio totale: "..punteggi[player.UserId])
    else
        print(player.Name.." ha sbagliato: "..messaggio)
    end

    checkEvent:FireClient(player, corretto, messaggio)
end)