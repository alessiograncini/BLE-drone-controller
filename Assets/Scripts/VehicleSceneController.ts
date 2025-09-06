import {
  PlacementMode,
  PlacementSettings,
} from "Surface Placement.lspkg/Scripts/PlacementSettings";

import { VehicleAnimationController } from "./VehicleAnimationController";
import { ButtonStateKey } from "GameController.lspkg/Scripts/ButtonState";
import { VehicleController, FlightState } from "VehicleController/Vehicle Controller/Vehicle Controller";
import { GameController } from "GameController.lspkg/GameController";
import { SurfacePlacementController } from "Surface Placement.lspkg/Scripts/SurfacePlacementController";

@component
export class VehicleSceneController extends BaseScriptComponent {
  @input
  @allowUndefined
  objectVisuals: SceneObject;

  @input vehicleController: VehicleController;
  @input vehicleAnimationController: VehicleAnimationController;
  @input cameraObj: SceneObject;

  @input("int")
  @widget(
    new ComboBoxWidget([
      new ComboBoxItem("Near Surface", 0),
      new ComboBoxItem("Horizontal", 1),
    ])
  )
  placementSettingMode: number = 0;

  // Note: Flight intensity is now controlled by the VehicleController's "defaultFlightIntensity" parameter

  @input("boolean")
  enableDebugInfo: boolean = false; // Show debug information

  @input
  @allowUndefined
  debugText: Text; // Optional text component for debug info

  // Flip control parameters
  @input("boolean")
  enableFlipTesting: boolean = false; // Enable flip testing in inspector

  @input("float")
  @widget(new SliderWidget(0.5, 3.0, 0.1))
  flipDuration: number = 1.0; // Duration of flip animation in seconds

  // Flight control variables
  private isHoverPressed: boolean = false; // IMPORTANT: Start with button released
  private lastFlightState: string = ""; // Track last flight state to avoid redundant animation syncing

  // Flip control variables
  private isFlipping: boolean = false;
  private flipStartTime: number = 0;
  private flipDirection: number = 1; // 1 for right flip, -1 for left flip
  private originalRotation: quat = quat.quatIdentity();

  private transform: Transform = null;
  private camTrans: Transform = null;

  private surfacePlacement: SurfacePlacementController =
    SurfacePlacementController.getInstance();

  private gameController: GameController = GameController.getInstance();

  onAwake() {
    this.camTrans = this.cameraObj.getTransform();
    this.transform = this.getSceneObject().getTransform();
    this.createEvent("OnStartEvent").bind(this.onStart.bind(this));
    this.objectVisuals.enabled = false;

    // Editor test - simulate hover button press and release
    if (global.deviceInfoSystem.isEditor()) {
      // Use TouchStart for press and TouchEnd for release
      this.createEvent("TouchStartEvent").bind(() => {
        // Button pressed
        this.isHoverPressed = true;
        print(`[VehicleSceneController] === EDITOR TOUCH START ===`);
        print(`[VehicleSceneController] Hover button PRESSED - drone should ASCEND`);
        this.updateVehicleFlightControl();
      });
      
      this.createEvent("TouchEndEvent").bind(() => {
        // Button released
        this.isHoverPressed = false;
        print(`[VehicleSceneController] === EDITOR TOUCH END ===`);
        print(`[VehicleSceneController] Hover button RELEASED - drone should DESCEND`);
        this.updateVehicleFlightControl();
      });
      
      // Alternative: Single tap toggles for quick testing
      this.createEvent("TapEvent").bind(() => {
        // Toggle for quick testing
        this.isHoverPressed = !this.isHoverPressed;
        print(`[VehicleSceneController] === EDITOR QUICK TAP ===`);
        print(`[VehicleSceneController] Hover button toggled to: ${this.isHoverPressed ? 'PRESSED (ascending)' : 'RELEASED (descending)'}`);
        this.updateVehicleFlightControl();
      });
      
      // Add keyboard controls for flip testing in editor
      if (this.enableFlipTesting) {
        // Use TouchStart events with different areas for flip testing
        print(`[VehicleSceneController] === FLIP TESTING ENABLED ===`);
        print(`[VehicleSceneController] Use RT/LT triggers or buttons to test flips`);
      }
    }
  }

  private onStart() {
    this.startPlacement();
    this.createEvent("UpdateEvent").bind(this.onUpdate.bind(this));
    this.gameController.scanForControllers();
    
    // Register button presses
    this.gameController.onButtonStateChanged(
      ButtonStateKey.a, // Hover button
      this.onHoverButtonChanged.bind(this)
    );
    this.gameController.onButtonStateChanged(
      ButtonStateKey.x, // Optional: Emergency land
      this.onEmergencyLand.bind(this)
    );
    this.gameController.onButtonStateChanged(
      ButtonStateKey.y, // Optional: Rumble feedback
      this.sendRumble.bind(this)
    );
    this.gameController.onButtonStateChanged(
      ButtonStateKey.rt,
      this.onFlipRightButton.bind(this)
    );
    this.gameController.onButtonStateChanged(
      ButtonStateKey.lt,
      this.onFlipLeftButton.bind(this)
    );
  }

  private sendRumble(pressed: boolean) {
    if (pressed) {
      this.gameController.sendRumble(15, 8);
    }
  }

  private onHoverButtonChanged(pressed: boolean) {
    this.isHoverPressed = pressed;
    print(`[VehicleSceneController] A BUTTON - ${pressed ? 'PRESSED' : 'RELEASED'}`);
    
    // Update the VehicleController with hover button state
    this.updateVehicleFlightControl();
  }

  private onEmergencyLand(pressed: boolean) {
    if (pressed) {
      print(`[VehicleSceneController] X BUTTON - EMERGENCY LANDING`);
      this.vehicleController.emergencyLand();
      this.isHoverPressed = false;
    }
  }

  private onFlipRightButton(pressed: boolean) {
    if (pressed) {
      // In editor, only allow if testing is enabled; on device, always allow
      if (global.deviceInfoSystem.isEditor() && !this.enableFlipTesting) {
        print(`[VehicleSceneController] Flip testing disabled - enable 'enableFlipTesting' to test flips`);
        return;
      }
      this.startFlip(1); // Right flip
    }
  }

  private onFlipLeftButton(pressed: boolean) {
    if (pressed) {
      // In editor, only allow if testing is enabled; on device, always allow
      if (global.deviceInfoSystem.isEditor() && !this.enableFlipTesting) {
        print(`[VehicleSceneController] Flip testing disabled - enable 'enableFlipTesting' to test flips`);
        return;
      }
      this.startFlip(-1); // Left flip
    }
  }


  private startFlip(direction: number) {
    // Don't start a new flip if already flipping
    if (this.isFlipping) {
      print(`[VehicleSceneController] Already flipping - ignoring flip request`);
      return;
    }

    this.isFlipping = true;
    this.flipStartTime = getTime();
    this.flipDirection = direction;
    this.originalRotation = this.transform.getWorldRotation();
    
    const directionText = direction > 0 ? "RIGHT" : "LEFT";
    print(`[VehicleSceneController] 🔄 Starting ${directionText} flip - duration: ${this.flipDuration}s`);
  }

  private updateFlip() {
    if (!this.isFlipping) return;

    const elapsed = getTime() - this.flipStartTime;
    const progress = Math.min(elapsed / this.flipDuration, 1.0);
    
    // Use smooth easing for natural flip motion
    const easedProgress = this.easeInOutCubic(progress);
    
    // Calculate Z-axis rotation (360 degrees = 2π radians)
    const flipAngle = easedProgress * Math.PI * 2 * this.flipDirection;
    
    // Create rotation around local Z-axis
    const flipRotation = quat.angleAxis(flipAngle, vec3.forward());
    
    // Apply flip rotation to original rotation
    const newRotation = this.originalRotation.multiply(flipRotation);
    this.transform.setWorldRotation(newRotation);
    
    // Check if flip is complete
    if (progress >= 1.0) {
      this.isFlipping = false;
      // Ensure we end at exact original rotation
      this.transform.setWorldRotation(this.originalRotation);
      
      const directionText = this.flipDirection > 0 ? "RIGHT" : "LEFT";
      print(`[VehicleSceneController] ✅ ${directionText} flip completed`);
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  startPlacement() {
    this.objectVisuals.enabled = false;
    var placementSettings = new PlacementSettings(PlacementMode.HORIZONTAL);
    if (this.placementSettingMode == 0) {
      placementSettings = new PlacementSettings(
        PlacementMode.NEAR_SURFACE,
        true, // use surface adjustment widget
        vec3.zero(), // offset in cm of widget from surface center
        this.onSliderUpdated.bind(this) // callback from widget height changes
      );
    }
    this.surfacePlacement.startSurfacePlacement(
      placementSettings,
      (pos, rot) => {
        this.onSurfaceDetected(pos, rot);
      }
    );
  }

  resetPlacement() {
    this.surfacePlacement.stopSurfacePlacement();
    this.startPlacement();
  }

  private onSliderUpdated(pos: vec3) {
    this.transform.setWorldPosition(pos);
  }

  private onSurfaceDetected(pos: vec3, rot: quat) {
    print(`[VehicleSceneController] Surface detected at position: X=${pos.x.toFixed(1)}, Y=${pos.y.toFixed(1)}, Z=${pos.z.toFixed(1)}`);
    
    this.objectVisuals.enabled = true;
    this.transform.setWorldRotation(rot);
    
    // Set position through VehicleController - it will handle transform sync in drone mode
    this.vehicleController.setPosition(pos);
    
    // Log the actual drone position after setting it
    const dronePos = this.transform.getWorldPosition();
    print(`[VehicleSceneController] Drone transform position after placement: X=${dronePos.x.toFixed(1)}, Y=${dronePos.y.toFixed(1)}, Z=${dronePos.z.toFixed(1)}`);
    
    // Check what the VehicleController thinks the position is
    const vcPos = this.vehicleController.getPosition();
    print(`[VehicleSceneController] VehicleController position: X=${vcPos.x.toFixed(1)}, Y=${vcPos.y.toFixed(1)}, Z=${vcPos.z.toFixed(1)}`);
    
    // Check base position and altitude
    const altitude = this.vehicleController.getCurrentAltitude();
    print(`[VehicleSceneController] VehicleController altitude: ${(altitude/100).toFixed(2)}m`);
    
    this.vehicleController.setInputType(
      global.deviceInfoSystem.isEditor() ? 1 : 0
    );
    
    // Ensure drone starts grounded with no flight input
    this.isHoverPressed = false;
    this.vehicleController.setFlightInput(0, false);
    print(`[VehicleSceneController] Drone placed at Y=${pos.y.toFixed(1)} - starting in GROUNDED state`);
  }

  private onUpdate() {
    this.handleMovement();
    // Update flight control and animations every frame
    this.updateVehicleFlightControl();
    // Update flip animation if active
    this.updateFlip();
  }

  private handleMovement() {
    var buttonState = this.gameController.getButtonState();
    if (!buttonState) {
      return;
    }

    // Calculate movement from joystick
    var moveSpeed = new vec2(
      Math.abs(buttonState.lx),
      Math.abs(buttonState.ly)
    ).distance(vec2.zero()); // 0 - 1

    var joystickMoveDirection = new vec3(
      buttonState.lx,
      0,
      buttonState.ly
    ).normalize();

    // Convert joystick input into world space relative to camera's facing direction
    var moveDir = this.camTrans
      .getWorldTransform()
      .multiplyDirection(joystickMoveDirection)
      .normalize();

    if (moveSpeed < 0.15) {
      moveSpeed = 0;
      moveDir = vec3.zero();
    }

    // Apply movement to vehicle controller (horizontal movement only)
    this.vehicleController.move(moveDir);
    this.vehicleController.setTargetSpeedModifier(moveSpeed);
    
    // Debug movement input occasionally
    if (moveSpeed > 0.1 && Math.floor(getTime() * 4) % 60 === 0) {
      print(`[VehicleSceneController] 🎮 Movement - LX: ${buttonState.lx.toFixed(2)}, LY: ${buttonState.ly.toFixed(2)}, Speed: ${moveSpeed.toFixed(2)}`);
      print(`[VehicleSceneController] 🎮 Direction - X: ${moveDir.x.toFixed(2)}, Z: ${moveDir.z.toFixed(2)}`);
    }
  }


  /**
   * Update VehicleController with current flight control state
   */
  private updateVehicleFlightControl() {
    // Get flight intensity from VehicleController settings
    const flightIntensity = this.isHoverPressed ? this.vehicleController.getDefaultFlightIntensity() : 0;
    
    // Enhanced debug output
    if (this.isHoverPressed) {
      print(`[VehicleSceneController] 🚁 BUTTON HELD - Sending flight input: intensity=${flightIntensity}, pressed=${this.isHoverPressed}`);
    }
    
    // Send flight input to VehicleController (this controls vertical movement)
    this.vehicleController.setFlightInput(flightIntensity, this.isHoverPressed);
    
    // Get the flight state as a string for animation sync
    const flightStateEnum = this.vehicleController.getFlightState();
    let flightState = "grounded";
    switch(flightStateEnum) {
      case FlightState.Grounded: flightState = "grounded"; break;
      case FlightState.Flying: flightState = "flying"; break;
    }
    
    // Sync animations with flight state (only when state changes)
    if (flightState !== this.lastFlightState) {
      print(`[VehicleSceneController] Flight state changed: ${this.lastFlightState} -> ${flightState}`);
      this.vehicleAnimationController.syncWithFlightState(flightState);
      this.lastFlightState = flightState;
    }
    
    // Update debug info
    if (this.enableDebugInfo && this.debugText) {
      const altitude = this.vehicleController.getCurrentAltitude();
      const verticalSpeed = this.vehicleController.getVerticalSpeed();
      
      this.debugText.text = `Drone Flight Status\n` +
                           `==================\n` +
                           `State: ${flightState}\n` +
                           `Altitude: ${(altitude / 100).toFixed(2)} m\n` +
                           `Vertical Speed: ${verticalSpeed.toFixed(1)} cm/s\n` +
                           `A Button: ${this.isHoverPressed ? 'HELD' : 'RELEASED'}\n` +
                           `Flight Power: ${(flightIntensity * 100).toFixed(0)}%`;
    }
  }
}
