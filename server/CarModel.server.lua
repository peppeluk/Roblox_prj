local RunService = game:GetService("RunService")

local CAR_NAME = "Car"
local REVERSE_SPEED = 42
local TURN_RATE = math.rad(75)
local FLIP_DOT_THRESHOLD = 0.25
local FLIP_RECOVERY_DELAY = 1.2
local FLIP_RECOVERY_COOLDOWN = 2
local FLIP_RECOVERY_LIFT = 3.5
local MAX_RECOVERY_SPEED = 35
local SPAWN_FALLBACK_OFFSET = Vector3.new(-12, 0, 0)
local SPAWN_RAY_HEIGHT = 140
local SPAWN_RAY_DISTANCE = 400
local SPAWN_CLEARANCE = 2.8
local SPAWN_FREE_CHECK_STEPS = 8
local SPAWN_RAISE_STEP = 1.5

local oldCar = workspace:FindFirstChild(CAR_NAME)
if oldCar then
	oldCar:Destroy()
end

local function weldToBody(carBody, part)
	if part == carBody or not part:IsA("BasePart") then
		return
	end

	part.Anchored = false
	part.Massless = true

	local weld = Instance.new("WeldConstraint")
	weld.Part0 = carBody
	weld.Part1 = part
	weld.Parent = part
end

local function createPart(config, parent)
	local part = Instance.new("Part")
	part.Name = config.Name
	part.Size = config.Size
	part.Position = config.Position
	part.Material = config.Material or Enum.Material.SmoothPlastic
	part.Color = config.Color or Color3.fromRGB(255, 255, 255)
	part.Shape = config.Shape or Enum.PartType.Block
	part.CanCollide = config.CanCollide ~= false
	part.TopSurface = Enum.SurfaceType.Smooth
	part.BottomSurface = Enum.SurfaceType.Smooth
	part.Parent = parent
	return part
end

local function createWheel(car, name, position)
	local wheel = createPart({
		Name = name,
		Shape = Enum.PartType.Ball,
		Material = Enum.Material.Rubber,
		Size = Vector3.new(3, 3, 3),
		Position = position,
		Color = Color3.fromRGB(0, 0, 0),
	}, car)

	local rim = createPart({
		Name = "Rim_" .. name,
		Shape = Enum.PartType.Ball,
		Material = Enum.Material.Metal,
		Size = Vector3.new(2.2, 2.2, 2.2),
		Position = position,
		Color = Color3.fromRGB(150, 150, 150),
		CanCollide = false,
	}, car)

	local rimWeld = Instance.new("WeldConstraint")
	rimWeld.Part0 = wheel
	rimWeld.Part1 = rim
	rimWeld.Parent = rim

	return wheel
end

local function getSpawnBaseCFrame()
	local spawnPart = workspace:FindFirstChild("CarSpawn")
	if spawnPart and spawnPart:IsA("BasePart") then
		return spawnPart.CFrame
	end

	local citta = workspace:FindFirstChild("Citta")
	local strada = citta and citta:FindFirstChild("Strada")
	if strada and strada:IsA("BasePart") then
		local margin = 3
		local maxX = math.max(0, (strada.Size.X * 0.5) - margin)
		local maxZ = math.max(0, (strada.Size.Z * 0.5) - margin)
		local offsetX = math.clamp(SPAWN_FALLBACK_OFFSET.X, -maxX, maxX)
		local offsetZ = math.clamp(SPAWN_FALLBACK_OFFSET.Z, -maxZ, maxZ)
		return strada.CFrame * CFrame.new(offsetX, 0, offsetZ)
	end

	return CFrame.new(SPAWN_FALLBACK_OFFSET)
end

local function getSafeSpawnCFrame(car)
	local baseCFrame = getSpawnBaseCFrame()
	local basePosition = baseCFrame.Position
	local _, baseYaw, _ = baseCFrame:ToOrientation()

	local raycastParams = RaycastParams.new()
	raycastParams.FilterType = Enum.RaycastFilterType.Exclude
	raycastParams.FilterDescendantsInstances = { car }
	raycastParams.IgnoreWater = true

	local rayOrigin = basePosition + Vector3.new(0, SPAWN_RAY_HEIGHT, 0)
	local rayResult = workspace:Raycast(rayOrigin, Vector3.new(0, -SPAWN_RAY_DISTANCE, 0), raycastParams)
	local groundY = rayResult and rayResult.Position.Y or basePosition.Y
	local spawnCFrame = CFrame.new(basePosition.X, groundY + SPAWN_CLEARANCE, basePosition.Z) * CFrame.Angles(0, baseYaw, 0)

	local overlapParams = OverlapParams.new()
	overlapParams.FilterType = Enum.RaycastFilterType.Exclude
	overlapParams.FilterDescendantsInstances = { car }

	local _, boundsSize = car:GetBoundingBox()
	local checkSize = boundsSize + Vector3.new(0.6, 0.6, 0.6)

	for _ = 1, SPAWN_FREE_CHECK_STEPS do
		local overlaps = workspace:GetPartBoundsInBox(spawnCFrame, checkSize, overlapParams)
		if #overlaps == 0 then
			break
		end
		spawnCFrame += Vector3.new(0, SPAWN_RAISE_STEP, 0)
	end

	return spawnCFrame
end

local function createCar()
	local car = Instance.new("Model")
	car.Name = CAR_NAME
	car.Parent = workspace

	local carBody = createPart({
		Name = "CarBody",
		Material = Enum.Material.SmoothPlastic,
		Size = Vector3.new(3.8, 1.2, 10),
		Position = Vector3.new(0, 1, 0),
		Color = Color3.fromRGB(255, 0, 0),
	}, car)

	createPart({
		Name = "Hood",
		Size = Vector3.new(3.8, 0.8, 4),
		Position = Vector3.new(0, 1.8, -5.5),
		Color = Color3.fromRGB(220, 0, 0),
	}, car)

	createPart({
		Name = "Roof",
		Size = Vector3.new(3.2, 0.8, 3),
		Position = Vector3.new(0, 2.5, -0.5),
		Color = Color3.fromRGB(255, 0, 0),
	}, car)

	createPart({
		Name = "Trunk",
		Size = Vector3.new(3.8, 0.8, 3.5),
		Position = Vector3.new(0, 1.8, 5.5),
		Color = Color3.fromRGB(220, 0, 0),
	}, car)

	createPart({
		Name = "Spoiler",
		Size = Vector3.new(0.3, 2, 3.5),
		Position = Vector3.new(0, 2, 7),
		Color = Color3.fromRGB(50, 50, 50),
		CanCollide = false,
	}, car)

	createPart({
		Name = "FrontBumper",
		Material = Enum.Material.Plastic,
		Size = Vector3.new(4, 0.6, 1),
		Position = Vector3.new(0, 1.2, -7),
		Color = Color3.fromRGB(50, 50, 50),
	}, car)

	createPart({
		Name = "LeftHeadlight",
		Shape = Enum.PartType.Ball,
		Material = Enum.Material.Neon,
		Size = Vector3.new(0.6, 0.6, 0.5),
		Position = Vector3.new(-1.5, 1.5, -7.5),
		Color = Color3.fromRGB(255, 255, 150),
		CanCollide = false,
	}, car)

	createPart({
		Name = "RightHeadlight",
		Shape = Enum.PartType.Ball,
		Material = Enum.Material.Neon,
		Size = Vector3.new(0.6, 0.6, 0.5),
		Position = Vector3.new(1.5, 1.5, -7.5),
		Color = Color3.fromRGB(255, 255, 150),
		CanCollide = false,
	}, car)

	createPart({
		Name = "RearBumper",
		Material = Enum.Material.Plastic,
		Size = Vector3.new(4, 0.6, 1),
		Position = Vector3.new(0, 1.2, 8),
		Color = Color3.fromRGB(50, 50, 50),
	}, car)

	local wheelPositions = {
		Vector3.new(-2.2, 0.8, -4),
		Vector3.new(2.2, 0.8, -4),
		Vector3.new(-2.2, 0.8, 4),
		Vector3.new(2.2, 0.8, 4),
	}

	for i, pos in ipairs(wheelPositions) do
		createWheel(car, "Wheel_" .. i, carBody.Position + pos)
	end

	local driverSeat = Instance.new("VehicleSeat")
	driverSeat.Name = "DriverSeat"
	driverSeat.Size = Vector3.new(2, 1.5, 2)
	driverSeat.Position = carBody.Position + Vector3.new(-1.2, 1, 0)
	driverSeat.CanCollide = true
	driverSeat.Parent = car

	local passengerSeat = Instance.new("VehicleSeat")
	passengerSeat.Name = "PassengerSeat"
	passengerSeat.Size = Vector3.new(2, 1.5, 2)
	passengerSeat.Position = carBody.Position + Vector3.new(1.2, 1, 0)
	passengerSeat.CanCollide = true
	passengerSeat.Parent = car

	local reverseVelocity = Instance.new("BodyVelocity")
	reverseVelocity.Name = "ReverseVelocity"
	reverseVelocity.MaxForce = Vector3.new(1e7, 0, 1e7)
	reverseVelocity.P = 30000
	reverseVelocity.Velocity = Vector3.zero
	reverseVelocity.Parent = carBody

	local turnGyro = Instance.new("BodyGyro")
	turnGyro.Name = "TurnGyro"
	turnGyro.MaxTorque = Vector3.new(0, 1e7, 0)
	turnGyro.P = 25000
	turnGyro.D = 600
	turnGyro.CFrame = carBody.CFrame
	turnGyro.Parent = carBody

	for _, child in ipairs(car:GetChildren()) do
		if child:IsA("BasePart") then
			weldToBody(carBody, child)
		end
	end

	car.PrimaryPart = carBody

	pcall(function()
		carBody:SetNetworkOwner(nil)
	end)

	local spawnCFrame = getSafeSpawnCFrame(car)
	car:PivotTo(spawnCFrame)
	carBody.AssemblyLinearVelocity = Vector3.zero
	carBody.AssemblyAngularVelocity = Vector3.zero
	turnGyro.CFrame = carBody.CFrame

	local function getControllingSeat()
		if driverSeat.Occupant then
			return driverSeat
		end
		if passengerSeat.Occupant then
			return passengerSeat
		end
		return nil
	end

	local flippedSince = nil
	local nextRecoveryAllowedAt = 0

	local function getFlatForward()
		local flatForward = Vector3.new(carBody.CFrame.LookVector.X, 0, carBody.CFrame.LookVector.Z)
		if flatForward.Magnitude < 1e-4 then
			return Vector3.new(0, 0, -1)
		end
		return flatForward.Unit
	end

	local function recoverIfFlipped(now)
		local upDot = carBody.CFrame.UpVector:Dot(Vector3.yAxis)
		local speed = carBody.AssemblyLinearVelocity.Magnitude
		local isFlipped = upDot < FLIP_DOT_THRESHOLD and speed <= MAX_RECOVERY_SPEED

		if isFlipped then
			if not flippedSince then
				flippedSince = now
			end
		else
			flippedSince = nil
		end

		if not flippedSince then
			return
		end

		if now < nextRecoveryAllowedAt or (now - flippedSince) < FLIP_RECOVERY_DELAY then
			return
		end

		local forward = getFlatForward()
		local recoverPosition = carBody.Position + Vector3.new(0, FLIP_RECOVERY_LIFT, 0)
		local recoverCFrame = CFrame.lookAt(recoverPosition, recoverPosition + forward, Vector3.yAxis)

		reverseVelocity.Velocity = Vector3.zero
		car:PivotTo(recoverCFrame)
		carBody.AssemblyLinearVelocity = Vector3.zero
		carBody.AssemblyAngularVelocity = Vector3.zero
		turnGyro.CFrame = recoverCFrame

		flippedSince = nil
		nextRecoveryAllowedAt = now + FLIP_RECOVERY_COOLDOWN
	end

	RunService.Heartbeat:Connect(function(deltaTime)
		if not car.Parent then
			return
		end

		recoverIfFlipped(os.clock())

		local seat = getControllingSeat()
		if not seat then
			reverseVelocity.Velocity = Vector3.zero
			turnGyro.CFrame = carBody.CFrame
			return
		end

		-- Variante richiesta: W guida in retromarcia (S ignorato).
		local reverseInput = math.max(0, seat.ThrottleFloat)
		local steerInput = seat.SteerFloat

		reverseVelocity.Velocity = (-carBody.CFrame.LookVector) * (REVERSE_SPEED * reverseInput)

		local flatLook = getFlatForward()

		local baseOrientation = CFrame.lookAt(carBody.Position, carBody.Position + flatLook, Vector3.yAxis)
		local reverseTurn = CFrame.Angles(0, steerInput * TURN_RATE * reverseInput * deltaTime, 0)
		turnGyro.CFrame = baseOrientation * reverseTurn
	end)

	return car
end

createCar()
