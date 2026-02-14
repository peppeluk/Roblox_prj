local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")
local Workspace = game:GetService("Workspace")

local localPlayer = Players.LocalPlayer
local camera = Workspace.CurrentCamera

local DEFAULT_DISTANCE = 11
local CAMERA_HEIGHT = 2.5
local MIN_DISTANCE = 4
local MAX_DISTANCE = 18
local MIN_PITCH = math.rad(-55)
local MAX_PITCH = math.rad(35)
local DEFAULT_PITCH = math.rad(-10)
local MOUSE_SENSITIVITY = 0.0035
local GAMEPAD_SENSITIVITY = 2.3
local GAMEPAD_DEADZONE = 0.15
local MOUSE_WHEEL_STEP = 1.2
local GAMEPAD_ZOOM_SPEED = 14
local ZOOM_LERP_SPEED = 12
local COLLISION_PADDING = 0.6

local yaw = 0
local pitch = DEFAULT_PITCH
local targetDistance = DEFAULT_DISTANCE
local currentDistance = DEFAULT_DISTANCE
local rightMouseDown = false
local gamepadLook = Vector2.zero
local leftTriggerValue = 0
local rightTriggerValue = 0

local function clampPitch(value)
	return math.clamp(value, MIN_PITCH, MAX_PITCH)
end

local function clampDistance(value)
	return math.clamp(value, MIN_DISTANCE, MAX_DISTANCE)
end

local function getRoot(character)
	if not character then
		return nil
	end
	return character:FindFirstChild("HumanoidRootPart")
end

local function getTriggerValue(input)
	local pos = input.Position
	local value = math.max(math.abs(pos.Z), math.abs(pos.X), math.abs(pos.Y))
	return math.clamp(value, 0, 1)
end

local function setTargetDistance(value)
	targetDistance = clampDistance(value)
end

local function resetBehindCharacter()
	local root = getRoot(localPlayer.Character)
	if not root then
		yaw = 0
		pitch = DEFAULT_PITCH
		return
	end

	local look = root.CFrame.LookVector
	yaw = math.atan2(-look.X, -look.Z)
	pitch = DEFAULT_PITCH
end

local function setMouseLookActive(isActive)
	rightMouseDown = isActive
	if isActive then
		UserInputService.MouseBehavior = Enum.MouseBehavior.LockCurrentPosition
	else
		UserInputService.MouseBehavior = Enum.MouseBehavior.Default
	end
end

UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then
		return
	end

	if input.UserInputType == Enum.UserInputType.MouseButton2 then
		setMouseLookActive(true)
		return
	end

	if input.UserInputType == Enum.UserInputType.Gamepad1 then
		if input.KeyCode == Enum.KeyCode.ButtonR3 then
			resetBehindCharacter()
		elseif input.KeyCode == Enum.KeyCode.ButtonL2 then
			leftTriggerValue = 1
		elseif input.KeyCode == Enum.KeyCode.ButtonR2 then
			rightTriggerValue = 1
		end
	end
end)

UserInputService.InputEnded:Connect(function(input)
	if input.UserInputType == Enum.UserInputType.MouseButton2 then
		setMouseLookActive(false)
		return
	end

	if input.UserInputType == Enum.UserInputType.Gamepad1 then
		if input.KeyCode == Enum.KeyCode.ButtonL2 then
			leftTriggerValue = 0
		elseif input.KeyCode == Enum.KeyCode.ButtonR2 then
			rightTriggerValue = 0
		end
	end
end)

UserInputService.InputChanged:Connect(function(input, gameProcessed)
	if gameProcessed then
		return
	end

	if input.UserInputType == Enum.UserInputType.MouseMovement and rightMouseDown then
		yaw -= input.Delta.X * MOUSE_SENSITIVITY
		pitch = clampPitch(pitch + input.Delta.Y * MOUSE_SENSITIVITY)
		return
	end

	if input.UserInputType == Enum.UserInputType.MouseWheel then
		setTargetDistance(targetDistance - (input.Position.Z * MOUSE_WHEEL_STEP))
		return
	end

	if input.UserInputType == Enum.UserInputType.Gamepad1 then
		if input.KeyCode == Enum.KeyCode.Thumbstick2 then
			gamepadLook = Vector2.new(input.Position.X, input.Position.Y)
		elseif input.KeyCode == Enum.KeyCode.ButtonL2 then
			leftTriggerValue = getTriggerValue(input)
		elseif input.KeyCode == Enum.KeyCode.ButtonR2 then
			rightTriggerValue = getTriggerValue(input)
		end
	end
end)

local function getLookInput(dt)
	local look = gamepadLook
	if look.Magnitude < GAMEPAD_DEADZONE then
		return
	end

	yaw -= look.X * GAMEPAD_SENSITIVITY * dt
	pitch = clampPitch(pitch - look.Y * GAMEPAD_SENSITIVITY * dt)
end

local raycastParams = RaycastParams.new()
raycastParams.FilterType = Enum.RaycastFilterType.Exclude
raycastParams.IgnoreWater = true

local function updateCamera(dt)
	local character = localPlayer.Character
	local root = getRoot(character)
	if not root then
		return
	end

	getLookInput(dt)
	setTargetDistance(targetDistance + ((leftTriggerValue - rightTriggerValue) * GAMEPAD_ZOOM_SPEED * dt))
	currentDistance += (targetDistance - currentDistance) * math.min(1, ZOOM_LERP_SPEED * dt)

	camera.CameraType = Enum.CameraType.Scriptable

	local target = root.Position + Vector3.new(0, CAMERA_HEIGHT, 0)
	local rotation = CFrame.Angles(0, yaw, 0) * CFrame.Angles(pitch, 0, 0)
	local wantedOffset = rotation:VectorToWorldSpace(Vector3.new(0, 0, currentDistance))
	local wantedPosition = target + wantedOffset

	raycastParams.FilterDescendantsInstances = { character }
	local hit = Workspace:Raycast(target, wantedOffset, raycastParams)
	if hit then
		wantedPosition = hit.Position - wantedOffset.Unit * COLLISION_PADDING
	end

	camera.CFrame = CFrame.lookAt(wantedPosition, target, Vector3.yAxis)
end

if localPlayer.Character then
	task.defer(resetBehindCharacter)
end
localPlayer.CharacterAdded:Connect(function()
	task.defer(resetBehindCharacter)
end)

RunService:BindToRenderStep("OrbitCameraControl", Enum.RenderPriority.Camera.Value + 1, updateCamera)
