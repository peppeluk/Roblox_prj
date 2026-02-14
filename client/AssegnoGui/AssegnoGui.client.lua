local player = game.Players.LocalPlayer
local gui = Instance.new("ScreenGui")
gui.Name = "AssegnoGui"
gui.Enabled = false
gui.ResetOnSpawn = false
gui.Parent = player:WaitForChild("PlayerGui")

-- Frame principale
local frame = Instance.new("Frame")
frame.Size = UDim2.new(0, 640, 0, 440)
frame.Position = UDim2.new(0.5, -320, 0.5, -220)
frame.BackgroundColor3 = Color3.fromRGB(245, 240, 230)
frame.BorderColor3 = Color3.fromRGB(90, 80, 70)
frame.BorderSizePixel = 2
frame.Parent = gui

-- Cornice interna
local inner = Instance.new("Frame")
inner.Size = UDim2.new(1, -16, 1, -16)
inner.Position = UDim2.new(0, 8, 0, 8)
inner.BackgroundColor3 = Color3.fromRGB(252, 248, 240)
inner.BorderColor3 = Color3.fromRGB(160, 150, 140)
inner.BorderSizePixel = 1
inner.Parent = frame

-- Logo banca (testo) + nome banca
local logoBox = Instance.new("Frame")
logoBox.Size = UDim2.new(0, 80, 0, 30)
logoBox.Position = UDim2.new(0, 10, 0, 10)
logoBox.BackgroundColor3 = Color3.fromRGB(30, 30, 30)
logoBox.BorderSizePixel = 0
logoBox.Parent = inner

local logoText = Instance.new("TextLabel")
logoText.Size = UDim2.new(1, 0, 1, 0)
logoText.Text = "ROBLOX"
logoText.TextScaled = true
logoText.Font = Enum.Font.GothamBlack
logoText.BackgroundTransparency = 1
logoText.TextColor3 = Color3.fromRGB(255, 255, 255)
logoText.Parent = logoBox

local titolo = Instance.new("TextLabel")
titolo.Size = UDim2.new(0, 260, 0, 30)
titolo.Position = UDim2.new(0, 100, 0, 78)
titolo.Text = "BANCA ROBLOX"
titolo.TextScaled = true
titolo.Font = Enum.Font.Garamond
titolo.BackgroundTransparency = 1
titolo.TextColor3 = Color3.fromRGB(40, 35, 30)
titolo.Parent = inner

local filialeLabel = Instance.new("TextLabel")
filialeLabel.Size = UDim2.new(0, 60, 0, 20)
filialeLabel.Position = UDim2.new(0, 100, 0, 108)
filialeLabel.Text = "Filiale"
filialeLabel.TextScaled = true
filialeLabel.Font = Enum.Font.Garamond
filialeLabel.BackgroundTransparency = 1
filialeLabel.TextColor3 = Color3.fromRGB(60, 55, 50)
filialeLabel.Parent = inner

local filiale = Instance.new("TextBox")
filiale.PlaceholderText = "Milano Centro"
filiale.Size = UDim2.new(0, 190, 0, 20)
filiale.Position = UDim2.new(0, 165, 0, 108)
filiale.Font = Enum.Font.Garamond
filiale.TextScaled = true
filiale.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
filiale.Parent = inner

-- Non trasferibile
local nonTrasferibile = Instance.new("TextLabel")
nonTrasferibile.Size = UDim2.new(0, 200, 0, 24)
nonTrasferibile.Position = UDim2.new(0, 420, 0, 10)
nonTrasferibile.Text = "NON TRASFERIBILE"
nonTrasferibile.TextScaled = true
nonTrasferibile.Font = Enum.Font.GothamBold
nonTrasferibile.BackgroundTransparency = 1
nonTrasferibile.TextColor3 = Color3.fromRGB(120, 20, 20)
nonTrasferibile.Parent = inner

-- Luogo e Data (editabili)
local luogoLabel = Instance.new("TextLabel")
luogoLabel.Size = UDim2.new(0, 55, 0, 20)
luogoLabel.Position = UDim2.new(0, 20, 0, 48)
luogoLabel.Text = "Luogo"
luogoLabel.TextScaled = true
luogoLabel.Font = Enum.Font.Garamond
luogoLabel.BackgroundTransparency = 1
luogoLabel.TextColor3 = Color3.fromRGB(60, 55, 50)
luogoLabel.Parent = inner

local luogo = Instance.new("TextBox")
luogo.PlaceholderText = "Milano"
luogo.Size = UDim2.new(0, 140, 0, 20)
luogo.Position = UDim2.new(0, 80, 0, 48)
luogo.Font = Enum.Font.Garamond
luogo.TextScaled = true
luogo.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
luogo.Parent = inner

local dataLabel = Instance.new("TextLabel")
dataLabel.Size = UDim2.new(0, 40, 0, 20)
dataLabel.Position = UDim2.new(0, 240, 0, 48)
dataLabel.Text = "Data"
dataLabel.TextScaled = true
dataLabel.Font = Enum.Font.Garamond
dataLabel.BackgroundTransparency = 1
dataLabel.TextColor3 = Color3.fromRGB(60, 55, 50)
dataLabel.Parent = inner

local dataValue = Instance.new("TextBox")
dataValue.Size = UDim2.new(0, 110, 0, 20)
dataValue.Position = UDim2.new(0, 280, 0, 48)
dataValue.Text = os.date("%d/%m/%Y")
dataValue.TextScaled = true
dataValue.Font = Enum.Font.Code
dataValue.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
dataValue.Parent = inner

-- Dicitura fissa
local dicitura = Instance.new("TextLabel")
dicitura.Size = UDim2.new(0, 600, 0, 22)
dicitura.Position = UDim2.new(0, 10, 0, 136)
dicitura.Text = "A vista pagate per questo assegno bancario"
dicitura.TextScaled = true
dicitura.Font = Enum.Font.Garamond
dicitura.BackgroundTransparency = 1
dicitura.TextColor3 = Color3.fromRGB(60, 55, 50)
dicitura.Parent = inner

-- Beneficiario
local beneficiario = Instance.new("TextBox")
beneficiario.PlaceholderText = "Beneficiario"
beneficiario.Size = UDim2.new(0, 510, 0, 32)
beneficiario.Position = UDim2.new(0, 70, 0, 244)
beneficiario.Font = Enum.Font.Garamond
beneficiario.TextScaled = true
beneficiario.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
beneficiario.Parent = inner

local beneficiarioLabel = Instance.new("TextLabel")
beneficiarioLabel.Size = UDim2.new(0, 40, 0, 32)
beneficiarioLabel.Position = UDim2.new(0, 20, 0, 244)
beneficiarioLabel.Text = "A"
beneficiarioLabel.TextScaled = true
beneficiarioLabel.Font = Enum.Font.Garamond
beneficiarioLabel.BackgroundTransparency = 1
beneficiarioLabel.TextColor3 = Color3.fromRGB(60, 55, 50)
beneficiarioLabel.Parent = inner

-- Importo
local importo = Instance.new("TextBox")
importo.PlaceholderText = "Importo in cifre"
importo.Size = UDim2.new(0, 180, 0, 20)
importo.Position = UDim2.new(0, 460, 0, 48)
importo.Font = Enum.Font.Garamond
importo.TextScaled = true
importo.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
importo.Parent = inner

local importoLabel = Instance.new("TextLabel")
importoLabel.Size = UDim2.new(0, 160, 0, 20)
importoLabel.Position = UDim2.new(0, 400, 0, 48)
importoLabel.Text = "Euro (# 1.250,00 #)"
importoLabel.TextScaled = true
importoLabel.Font = Enum.Font.Garamond
importoLabel.BackgroundTransparency = 1
importoLabel.TextColor3 = Color3.fromRGB(60, 55, 50)
importoLabel.Parent = inner

-- Importo in lettere
local importoLettereLabel = Instance.new("TextLabel")
importoLettereLabel.Size = UDim2.new(0, 160, 0, 28)
importoLettereLabel.Position = UDim2.new(0, 20, 0, 196)
importoLettereLabel.Text = "Importo in lettere"
importoLettereLabel.TextScaled = true
importoLettereLabel.Font = Enum.Font.Garamond
importoLettereLabel.BackgroundTransparency = 1
importoLettereLabel.TextColor3 = Color3.fromRGB(60, 55, 50)
importoLettereLabel.Parent = inner

local importoLettere = Instance.new("TextBox")
importoLettere.PlaceholderText = "Milleduecentocinquanta/00"
importoLettere.Size = UDim2.new(0, 450, 0, 30)
importoLettere.Position = UDim2.new(0, 190, 0, 196)
importoLettere.Font = Enum.Font.Garamond
importoLettere.TextScaled = true
importoLettere.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
importoLettere.Parent = inner

-- Firma
local firmaLabel = Instance.new("TextLabel")
firmaLabel.Size = UDim2.new(0, 60, 0, 28)
firmaLabel.Position = UDim2.new(0, 450, 0, 290)
firmaLabel.Text = "Firma"
firmaLabel.TextScaled = true
firmaLabel.Font = Enum.Font.Garamond
firmaLabel.BackgroundTransparency = 1
firmaLabel.TextColor3 = Color3.fromRGB(60, 55, 50)
firmaLabel.Parent = inner

local firma = Instance.new("TextBox")
firma.PlaceholderText = "Firma"
firma.Size = UDim2.new(0, 180, 0, 28)
firma.Position = UDim2.new(0, 450, 0, 318)
firma.Font = Enum.Font.Garamond
firma.TextScaled = true
firma.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
firma.Parent = inner

-- Bottone conferma
local conferma = Instance.new("TextButton")
conferma.Text = "Conferma"
conferma.Size = UDim2.new(0, 260, 0, 44)
conferma.Position = UDim2.new(0, 190, 0, 360)
conferma.BackgroundColor3 = Color3.fromRGB(230, 220, 205)
conferma.BorderColor3 = Color3.fromRGB(120, 110, 100)
conferma.Parent = inner

-- Label messaggio
local msgLabel = Instance.new("TextLabel")
msgLabel.Size = UDim2.new(0, 520, 0, 32)
msgLabel.Position = UDim2.new(0, 60, 0, 328)
msgLabel.TextScaled = true
msgLabel.BackgroundTransparency = 1
msgLabel.TextColor3 = Color3.fromRGB(0,0,0)
msgLabel.Text = ""
msgLabel.Parent = inner

-- Eventi remoti
local apriEvent = game.ReplicatedStorage:WaitForChild("ApriAssegnoGui")
local checkEvent = game.ReplicatedStorage:WaitForChild("ControlloAssegno")

-- Timer
local timerLabel = Instance.new("TextLabel")
timerLabel.Size = UDim2.new(0, 140, 0, 22)
timerLabel.Position = UDim2.new(0, 420, 0, 136)
timerLabel.TextScaled = true
timerLabel.BackgroundTransparency = 1
timerLabel.TextColor3 = Color3.fromRGB(0,0,0)
timerLabel.Text = ""
timerLabel.Parent = inner

local timerTime = 15 -- secondi
local timerActive = false

local function startTimer()
    timerTime = 15
    timerActive = true
    timerLabel.Text = "Tempo: "..timerTime.."s"
    while timerActive and timerTime > 0 do
        wait(1)
        timerTime = timerTime - 1
        timerLabel.Text = "Tempo: "..timerTime.."s"
    end
    if timerTime <= 0 then
        msgLabel.Text = "Tempo scaduto!"
        msgLabel.TextColor3 = Color3.fromRGB(200,0,0)
        gui.Enabled = false
        timerActive = false
    end
end

-- Mostra GUI
apriEvent.OnClientEvent:Connect(function()
    gui.Enabled = true
    beneficiario.Text = ""
    importo.Text = ""
    msgLabel.Text = ""
    startTimer()
end)

-- Conferma
conferma.MouseButton1Click:Connect(function()
    if timerActive then
        checkEvent:FireServer(beneficiario.Text, importo.Text)
        timerActive = false
        gui.Enabled = false
    end
end)

-- Riceve feedback dal server
checkEvent.OnClientEvent:Connect(function(corretto, messaggio)
    gui.Enabled = true
    msgLabel.Text = messaggio
    msgLabel.TextColor3 = corretto and Color3.fromRGB(0,150,0) or Color3.fromRGB(200,0,0)
end)
