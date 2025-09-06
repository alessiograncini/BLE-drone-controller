# BLE Game Controller Drone Project

A Spectacles AR drone controller system that enables wireless BLE game controller input for immersive drone flight experiences. This project provides a complete drone flight simulation with customizable controls, smooth animations, and realistic flight physics.

## 🚁 Features

- **Wireless BLE Game Controller Support**: Connect any BLE-compatible game controller
- **Full 6DOF Movement**: Forward/back, left/right, up/down movement with smooth controls
- **Barrel Roll Flips**: Left and right 360° flips with RT/LT triggers
- **Continuous Hover Animation**: Realistic drone movement with customizable animation timing
- **Surface Placement**: Place drone on any detected surface in AR space
- **Configurable Flight Parameters**: Tune speed, acceleration, altitude limits, and more
- **Debug Information**: Real-time flight status and control feedback

## 🎮 Default Controls

| Control | Action |
|---------|--------|
| **Left Stick** | Horizontal movement (forward/back/left/right) |
| **A Button** | Hover/Ascend (hold to fly up, release to descend) |
| **RT Trigger** | Right barrel roll flip |
| **LT Trigger** | Left barrel roll flip |
| **X Button** | Emergency landing |
| **Y Button** | Rumble feedback test |

## 📁 Project Structure

```
Assets/
├── Scripts/
│   ├── VehicleSceneController.ts     # Main controller logic & input mapping
│   └── VehicleAnimationController.ts # Animation system
├── VehicleController/                # Core movement & flight physics
│   └── Vehicle Controller/
│       └── Vehicle Controller.ts     # Flight mechanics & parameters
└── GameController.lspkg/             # BLE controller interface
```

## 🛠️ Key Customization Scripts

### 1. VehicleSceneController.ts
**Purpose**: Main controller that handles input mapping, surface placement, and coordinates all drone systems.

**Key Areas for Customization**:

#### Adding New Button Controls
```typescript
// In onStart() method, add new button mappings:
this.gameController.onButtonStateChanged(
  ButtonStateKey.b, // New button
  this.onNewButtonPressed.bind(this)
);

// Then implement the handler:
private onNewButtonPressed(pressed: boolean) {
  if (pressed) {
    // Your custom action here
    print(`[VehicleSceneController] B BUTTON - Custom Action`);
  }
}
```

#### Available Button Keys
- `ButtonStateKey.a`, `ButtonStateKey.b`, `ButtonStateKey.x`, `ButtonStateKey.y`
- `ButtonStateKey.lt`, `ButtonStateKey.rt` (triggers)
- `ButtonStateKey.lb`, `ButtonStateKey.rb` (bumpers)
- `ButtonStateKey.dpadUp`, `ButtonStateKey.dpadDown`, etc.

#### Flip System Configuration
```typescript
// Flip control parameters (exposed in inspector)
@input("boolean")
enableFlipTesting: boolean = false; // Enable flip testing in editor

@input("float")
@widget(new SliderWidget(0.5, 3.0, 0.1))
flipDuration: number = 1.0; // Duration of flip animation
```

#### Movement Input Processing
The `handleMovement()` method processes joystick input:
```typescript
// Joystick values are in buttonState.lx, buttonState.ly
// Modify these calculations to change movement response
var moveSpeed = new vec2(
  Math.abs(buttonState.lx),
  Math.abs(buttonState.ly)
).distance(vec2.zero());

// Dead zone threshold (currently 0.15)
if (moveSpeed < 0.15) {
  moveSpeed = 0;
  moveDir = vec3.zero();
}
```

### 2. VehicleAnimationController.ts
**Purpose**: Manages drone animations and provides smooth visual feedback.

**Key Areas for Customization**:

#### Animation Timing
```typescript
// Exposed in inspector
@input
@widget(new SpinBoxWidget(0, undefined, 0.1))
@hint("Start time for hover animation in seconds")
hoverStartTime: number = 0.0;

@input
@widget(new SpinBoxWidget(0, undefined, 0.1))
@hint("End time for hover animation in seconds")
hoverEndTime: number = 5.0;
```

#### Adding New Animation States
```typescript
// 1. Add new animation clip variable
private newAnimationClip: AnimationClip = null;

// 2. Create the clip in createAllAnimationClips()
this.newAnimationClip = this.createLoopedClip(
  "NewAnimation", 
  this.hoverAnimation, 
  startTime, 
  endTime
);

// 3. Add public method to play it
playNewAnimation() {
  this.playLoopedAnimation(this.newAnimationClip);
}

// 4. Update syncWithFlightState() to use new animation
```

### 3. VehicleController/ System
**Purpose**: Core flight physics and movement parameters.

**Key Parameters** (exposed in inspector):

#### Movement Settings
- **Move Speed**: Horizontal movement speed (150 cm/s default)
- **Sprint Speed**: Fast movement speed (250 cm/s default)
- **Acceleration/Deceleration**: How quickly drone starts/stops

#### Flight Control
- **Max Vertical Speed**: Up/down movement speed (200 cm/s default)
- **Max Altitude**: Flight ceiling (600 cm default)
- **Default Flight Intensity**: Hover power (0.6 = 60% power)
- **Vertical Acceleration/Deceleration**: How quickly drone climbs/descends

## 🎯 Common Customizations

### Adding a New Action Button

1. **Map the button** in `VehicleSceneController.ts`:
```typescript
this.gameController.onButtonStateChanged(
  ButtonStateKey.b,
  this.onSpecialAction.bind(this)
);
```

2. **Implement the action**:
```typescript
private onSpecialAction(pressed: boolean) {
  if (pressed) {
    // Trigger special animation
    this.vehicleAnimationController.playSpecialAnimation();
    
    // Or modify flight behavior
    this.vehicleController.setSpecialMode(true);
    
    // Or add visual effects
    this.gameController.sendRumble(20, 10);
  }
}
```

### Creating Custom Flight Modes

1. **Add mode parameter** in `VehicleController.ts`:
```typescript
@input("int")
@widget(new ComboBoxWidget([
  new ComboBoxItem("Normal", 0),
  new ComboBoxItem("Sport", 1),
  new ComboBoxItem("Cinematic", 2)
]))
private flightMode: number = 0;
```

2. **Modify movement calculations** based on mode:
```typescript
// In movement calculation
const speedMultiplier = this.flightMode === 1 ? 1.5 : // Sport mode
                       this.flightMode === 2 ? 0.7 : // Cinematic mode
                       1.0; // Normal mode

const actualSpeed = baseSpeed * speedMultiplier * speedModifier * getDeltaTime();
```

### Adding Gesture Controls

1. **Use additional triggers** for gesture sequences:
```typescript
// Track button sequence for gestures
private gestureSequence: string[] = [];

private onGestureButton(button: string, pressed: boolean) {
  if (pressed) {
    this.gestureSequence.push(button);
    
    // Check for gesture patterns
    if (this.gestureSequence.join(',') === 'lt,rt,lt,rt') {
      this.performSpecialGesture();
      this.gestureSequence = []; // Reset
    }
    
    // Limit sequence length
    if (this.gestureSequence.length > 4) {
      this.gestureSequence.shift();
    }
  }
}
```

## 🔧 Configuration Tips

### Tuning Flight Feel

1. **For Smoother Movement**: Reduce `moveSpeed` and increase `acceleration`
2. **For Snappier Response**: Increase `deceleration` and reduce `acceleration`
3. **For Slower Climbing**: Reduce `maxVerticalSpeed` and `verticalAcceleration`
4. **For Gentler Flips**: Increase `flipDuration` in VehicleSceneController

### Animation Customization

1. **Faster Hover Animation**: Reduce `hoverEndTime` or increase playback speed
2. **Different Animation Sections**: Adjust `hoverStartTime` and `hoverEndTime` to use different parts of your animation asset
3. **Static Poses**: Set `playbackSpeed = 0.0` for frozen frame animations

### Debug Information

Enable debug output by setting `enableDebugInfo = true` in VehicleSceneController to see:
- Real-time flight status
- Controller input values
- Animation state changes
- Movement calculations

## 🚀 Getting Started

1. **Import the project** into Spectacles Lens Studio
2. **Assign your drone model** to the VehicleSceneController
3. **Set your hover animation** in VehicleAnimationController
4. **Pair your BLE controller** and test in preview
5. **Adjust parameters** in the inspector to match your desired flight feel
6. **Test on device** for full BLE controller support

## 📝 Notes

- **Editor Testing**: Use touch/tap events when `enableFlipTesting` is enabled
- **BLE Controllers**: Full controller support requires device testing (not available in Lens Studio preview)
- **Surface Placement**: Drone automatically places on detected AR surfaces
- **Performance**: All movement calculations are optimized for real-time AR performance

## 🎨 Extending the System

This system is designed to be modular and extensible. You can:

- Add new animation states for different flight modes
- Implement complex gesture recognition
- Create custom flight patterns and autopilot modes
- Add multiplayer synchronization for shared AR experiences
- Integrate with other AR objects and interactions

The core architecture separates concerns cleanly:
- **VehicleSceneController**: Input handling and high-level logic
- **VehicleAnimationController**: Visual feedback and animations  
- **VehicleController**: Core physics and movement mechanics

This separation makes it easy to modify one aspect without affecting others.
