import { MovementController } from "./Modules/MovementController";
import { CollisionsController } from "./Modules/Collision/CollisionsController";
import { Utils } from "./Modules/Utils/Utils";
import {
  JoystickInputControl,
  JoystickInputControlConfig,
  JoystickPositionTypeConfig,
} from "./Modules/Input/Joystick/JoystickInputControl";
import { BasicMovementAnimationControllerConfig } from "./Modules/Animation/BasicMovement/BasicMovementAnimationControllerConfig";
import { BasicMovementAnimationController } from "./Modules/Animation/BasicMovement/BasicMovementAnimationController";
import { LockAxisController } from "./Modules/LockAxisController";
import { createProbe } from "./Modules/Collision/CollisionHelpers/ProbeHelper";
import { VehicleControllerSettings } from "./Modules/VehicleControllerSettings";
import { InputsValidator } from "./Modules/InputsValidator";
import { VehicleControllerLogger } from "./Modules/Utils/VehicleControllerLogger";
import { CallbacksWrapper } from "./Modules/Utils/CallbacksWrapper";
import { TransformUpdater } from "./Modules/TransformUpdater";
import { BitmojiMixamoAnimationIsEnabledChecker } from "./Modules/Utils/BitmojiMixamoAnimationIsEnabledChecker";

/**
 * Flight states for the vehicle
 */
export enum FlightState {
  Grounded = "grounded",
  Flying = "flying"
}

/**
 * VehicleController
 * Version 1.0.0
 *
 * The Vehicle Controller Component is a modular, customizable movement system designed to
 * support various gameplay formats, including third-person, first-person, side-scroller, and
 * top-down perspectives. It provides a non-physics-based movement model with optional physics
 * interactions, allowing for smooth, responsive controls without physics body dependencies.
 *
 *
 *
 * API:
 *
 * move(direction: vec3): void - Moves the vehicle in the specified direction. Y value will be ignored. To use this API to set vehicle direction manually, please set Input Control Type to None.
 * stopMovement(): void - Immediately stops vehicle movement.
 * setPosition(position: vec3): void - Teleports the vehicle to a specific world position.
 * getPosition(): vec3 - Returns the current world position of the vehicle.
 * setRotation(rotation: quat): void - Sets the vehicle's facing rotation. Will rotate vehicle only around y axis.
 * getRotation(): quat - Gets the vehicle's current rotation.
 * getDirection(): vec3 - Returns the current movement direction.
 * setSprintEnabled(enabled: boolean): void - If true, enables sprinting speed, disables otherwise.
 * isSprinting(): boolean - Returns true if sprint is currently active.
 * setMoveSpeed(speed: number): void - Sets the vehicle's base movement speed.
 * getMoveSpeed(): number - Returns the current base movement speed.
 * setSprintSpeed(speed: number): void - Sets the vehicle's sprint speed.
 * getSprintSpeed(): number - Returns the current sprint speed.
 * isGrounded(): boolean - Returns true if the vehicle is currently grounded.
 * isMoving(): boolean - Returns true if the vehicle is currently moving.
 * getVelocity(): vec3 - Returns the vehicle's current velocity vector.
 * setAutoFaceMovement(enabled: boolean): void - Enables or disables auto-facing toward movement direction.
 * getAutoFaceMovement(): boolean - Returns whether auto-facing movement is enabled.
 * setAcceleration(value: number): void - Sets the acceleration
 * getAcceleration(): number - Returns the acceleration
 * setDeceleration(value: number): void - Sets the deceleration
 * getDeceleration(): number - Returns the deceleration
 * setShowCollider(value: boolean): void - If true is set vehicle's collider is visible
 * getShowCollider(): boolean - Returns whether vehicle's collider is visible
 * setLockXAxis(enabled: boolean): void - Enables or disables movement along the X axis.
 * getLockXAxis(): boolean - Returns whether movement along the X axis is currently locked.
 * setLockYAxis(enabled: boolean): void - Enables or disables movement along the Y axis.
 * getLockYAxis(): boolean - Returns whether movement along the Y axis is currently locked.
 * setLockZAxis(enabled: boolean): void - Enables or disables movement along the Z axis.
 * getLockZAxis(): boolean - Returns whether movement along the Z axis is currently locked.
 *
 *
 *
 * API Events:
 *
 * onCollisionEnter: event1<CollisionEnterEventArgs, void> - Triggered when vehicle starts colliding with another collider.
 * onCollisionStay(): event1<CollisionEnterEventArgs, void> - Triggered while vehicle remains in collision.
 * onCollisionExit: event1<CollisionEnterEventArgs, void> - Triggered when vehicle exits a collision.
 * onOverlapEnter(): event1<OverlapEnterEventArgs, void> - Triggered when vehicle enters an overlap volume.
 * onOverlapStay(): event1<OverlapEnterEventArgs, void> - Triggered while vehicle remains in overlap volumes.
 * onOverlapExit(): event1<OverlapEnterEventArgs, void> - Triggered when vehicle exits an overlap volume.
 *
 */
@component
export class VehicleController extends BaseScriptComponent {
  @ui.group_start("Movement")
  @input
  @hint("Controls how fast the drone moves horizontally (cm/s)")
  @widget(new SpinBoxWidget(0))
  private moveSpeed: number = 150; // Reduced from 100 for better control

  @input
  @hint("Controls how fast the drone moves when sprinting (cm/s)")
  @widget(new SpinBoxWidget(0))
  private sprintSpeed: number = 250; // Reduced from 200

  @input
  @hint("Determines how quickly the drone reaches full horizontal speed")
  @widget(new SpinBoxWidget(0))
  private acceleration: number = 200; // Reduced from 100

  @input
  @hint("Defines how quickly the drone slows down when input stops")
  @widget(new SpinBoxWidget(0))
  private deceleration: number = 300; // Increased for better stopping

  @input
  @hint("Defines the smallest movement distance before applying updates")
  private minMoveDistance: number = 0.01;

  @input
  @hint("Limits movement on steep inclines to prevent unnatural climbing")
  @widget(new SliderWidget(1, 90))
  private slopeLimit: number = 45;

  @input
  @hint(
    "Determines if the vehicle automatically rotates to match the movement direction"
  )
  private autoFaceMovementDirection: boolean = true;

  @input
  @showIf("autoFaceMovementDirection")
  @hint(
    "Defines how smoothly the vehicle rotates towards movement direction, from 0 to 1."
  )
  @widget(new SliderWidget(0, 1))
  private rotationSmoothing: number = 0.5;

  @ui.group_end
  @ui.separator
  @ui.group_start("Constraints")
  @input
  @hint("Disables movement along the X axis")
  private lockXAxis: boolean = false;

  @input
  @hint("Disables movement along the Y axis")
  private lockYAxis: boolean = false;

  @input
  @hint("Disables movement along the Z axis")
  private lockZAxis: boolean = false;

  @ui.group_end
  @ui.separator
  @ui.group_start("Input Control")
  @input
  private readonly enableTouchBlocking: boolean = true;

  @input("int")
  @widget(
    new ComboBoxWidget([
      new ComboBoxItem("None", 0),
      new ComboBoxItem("Joystick", 1),
    ])
  )
  private inputControlType: number = 0;

  @input
  @allowUndefined
  @showIf("inputControlType", 1)
  private trackingCamera: Camera;

  @input
  @showIf("inputControlType", 1)
  private readonly joystickConfig: JoystickInputControlConfig;

  @ui.group_end
  @ui.separator
  @ui.group_start("Flight Control")
  
  @ui.group_start("Vertical Movement")
  @input
  @hint("Maximum vertical speed for up/down movement (cm/s)")
  @widget(new SpinBoxWidget(0))
  private maxVerticalSpeed: number = 200; // Reduced for smoother control

  @input
  @hint("How fast the drone accelerates vertically (cm/s²)")
  @widget(new SpinBoxWidget(0))
  private verticalAcceleration: number = 150; // Slightly increased

  @input
  @hint("How fast the drone decelerates vertically (cm/s²)")
  @widget(new SpinBoxWidget(0))
  private verticalDeceleration: number = 200; // Slightly increased
  
  @ui.group_end
  @ui.group_start("Flight Limits")
  @input
  @hint("Maximum altitude the drone can reach (cm)")
  @widget(new SpinBoxWidget(0))
  private maxAltitude: number = 600; // Reduced for safer testing

  @input
  @hint("Distance from ground where automatic landing starts (cm)")
  @widget(new SpinBoxWidget(0))
  private autoLandingDistance: number = 25; // Slightly reduced
  
  @ui.group_end
  @ui.group_start("Flight Input")
  @input
  @hint("Default flight intensity when hover button is pressed (0.0 - 1.0)")
  @widget(new SliderWidget(0.0, 1.0, 0.05))
  private defaultFlightIntensity: number = 0.6; // Exposed for tuning
  
  @ui.group_end
  
  @input
  @hint("Bypass collision detection for free flight (drone mode)")
  bypassCollisionDetection: boolean = true;
  
  @input
  @hint("Bypass ground detection system (drone mode)")
  bypassGroundDetection: boolean = true;

  @ui.group_end
  @ui.separator
  @ui.group_start("Physics (Disabled in Drone Mode)")
  @input
  @hint("Controls how fast the vehicle falls (IGNORED IN DRONE MODE)")
  @widget(new SpinBoxWidget(undefined, 0))
  private gravity: number = -300;

  @input
  @hint("Determines how much movement influence the player has mid-air")
  @widget(new SliderWidget(0, 1))
  private airControl: number = 1;

  @input
  @hint("Makes vehicle controller collider visible (DISABLED IN DRONE MODE)")
  private showCollider: boolean = false;

  @input
  @hint("Enables a virtual ground plane at Y = 0 for simplified grounding")
  private groundIsZero: boolean = false;

  @input
  @hint("Ground detection distance (DISABLED IN DRONE MODE)")
  @widget(new SpinBoxWidget(0.01))
  private groundCheckDistance: number = 0;

  @input
  @hint("Step height for climbing (NOT NEEDED FOR DRONE)")
  @widget(new SpinBoxWidget(0))
  private stepHeight: number = 0;

  @input
  @hint("Collider capsule length (DISABLED IN DRONE MODE)")
  @widget(new SpinBoxWidget(0))
  private colliderHeight: number = 0;

  @input
  @hint("Collider capsule radius (DISABLED IN DRONE MODE)")
  @widget(new SpinBoxWidget(0))
  private colliderRadius: number = 0;

  @input
  @hint("Offset of capsule collider")
  private colliderCenter: vec3 = vec3.zero();

  @ui.group_end
  @ui.separator
  @ui.group_start("Animation")
  @input
  private readonly useAnimation: boolean = true;

  @ui.group_start("Animation Config")
  @showIf("useAnimation")
  @ui.group_start("Idle Animation")
  @input
  @label("Animation Asset")
  @allowUndefined
  private readonly idleAnimationAsset: AnimationAsset;

  @input
  @label("Playback Speed")
  @widget(new SpinBoxWidget(0))
  private readonly idlePlaybackSpeed: number = 1.0;

  @ui.group_end
  @ui.group_start("Move Animation")
  @input
  @label("Min Vehicle Speed")
  @widget(new SpinBoxWidget(0))
  readonly moveMinCharacterSpeed: number = 10;

  @input
  @label("Animation Asset")
  @allowUndefined
  private readonly moveAnimationAsset: AnimationAsset;

  @input
  @label("Playback Speed")
  @hint(
    "Playback speed for the animation when the vehicle speed is at its minimum."
  )
  @widget(new SpinBoxWidget(0))
  private readonly movePlaybackSpeed: number = 1.0;

  @ui.group_end
  @ui.group_start("Sprint Animation")
  @input
  @label("Min Vehicle Speed")
  @widget(new SpinBoxWidget(0))
  readonly sprintMinCharacterSpeed: number = 10;

  @input
  @label("Animation Asset")
  @allowUndefined
  private readonly sprintAnimationAsset: AnimationAsset;

  @input
  @label("Playback Speed")
  @hint(
    "Playback speed for the animation when the vehicle speed is at its minimum."
  )
  @widget(new SpinBoxWidget(0))
  private readonly sprintPlaybackSpeed: number = 1.0;

  @ui.group_end
  @ui.group_end
  @ui.group_end
  @ui.separator
  @input("bool", "true")
  @label("Print Warnings")
  private printWarningStatements: boolean;

  private readonly inputsValidator: InputsValidator;

  private animationController: BasicMovementAnimationController;

  private inputControl: JoystickInputControl;

  private readonly probe: Probe;

  private readonly lockAxisController: LockAxisController;

  private readonly movementController: MovementController;

  private readonly collisionsController: CollisionsController;

  private readonly settings: VehicleControllerSettings;

  private readonly logger: VehicleControllerLogger;

  private readonly callbackWrapper: CallbacksWrapper;

  private readonly transformUpdater: TransformUpdater;

  private updateEvent: UpdateEvent;

  private renderLayer: LayerSet = null;

  // Flight state management
  private flightState: FlightState = FlightState.Grounded;
  private verticalSpeed: number = 0;
  private basePosition: vec3 = null; // Don't initialize until we know the actual position
  private flightInput: number = 0; // 0-1 flight intensity
  private isJumpPressed: boolean = false;
  private flightTimer: number = 0;
  private basePositionSet: boolean = false;
  
  // External movement input (from VehicleSceneController)
  private externalMovementDirection: vec3 = vec3.zero();
  private externalSpeedModifier: number = 0;

  constructor() {
    super();
    this.callbackWrapper = new CallbacksWrapper(this);
    this.logger = new VehicleControllerLogger(
      this.printWarningStatements,
      null,
      () => this.movementController
    );
    this.inputsValidator = new InputsValidator(this.logger);
    this.validateInputs();
    
    // Check if we're in drone mode
    const isDroneMode = this.bypassCollisionDetection && this.bypassGroundDetection;
    
    this.settings = {
      moveSpeed: this.moveSpeed,
      sprintSpeed: this.sprintSpeed,
      acceleration: this.acceleration,
      deceleration: this.deceleration,
      minMoveDistance: this.minMoveDistance,
      autoFaceMovementDirection: this.autoFaceMovementDirection,
      rotationSmoothing: this.rotationSmoothing,
      lockXAxis: this.lockXAxis,
      lockYAxis: false, // Always enable Y-axis for flight
      lockZAxis: this.lockZAxis,
      showCollider: isDroneMode ? false : this.showCollider, // No collider in drone mode
      groundCheckDistance: isDroneMode ? 0 : this.groundCheckDistance, // No ground check in drone mode
      maxGroundAngle: this.slopeLimit,
      stepHeight: isDroneMode ? 0 : this.stepHeight, // No step height for drone
      groundIsZero: this.groundIsZero,
      colliderHeight: this.colliderHeight,
      colliderRadius: this.colliderRadius,
      colliderCenter: this.colliderCenter,
      gravity: isDroneMode ? 0 : this.gravity, // No gravity in drone mode
      airControl: this.airControl,
      sprintEnabled: false,
    };
    // Only initialize physics systems if not in drone mode
    if (!isDroneMode) {
      this.probe = createProbe({ static: true });
      this.lockAxisController = new LockAxisController(this.settings);
      this.collisionsController = new CollisionsController(
        this.settings,
        this.getSceneObject(),
        this.lockAxisController,
        this.logger,
        this.callbackWrapper
      );
      this.movementController = new MovementController(
        this.settings,
        this.lockAxisController,
        this.getSceneObject(),
        this.collisionsController.characterCollider,
        this.colliderCenter
      );
      this.collisionsController.setDebugDrawEnabled(this.showCollider);
      this.probe.filter.onlyColliders = [
        this.collisionsController.characterCollider,
      ];
      this.transformUpdater = new TransformUpdater(
        this.getSceneObject(),
        this.movementController,
        this.collisionsController,
        this.logger,
        this.lockAxisController
      );
      this.movementController.setInitialScale(
        this.transformUpdater.getInitialScale()
      );
    } else {
      // Minimal initialization for drone mode - no physics
      this.lockAxisController = new LockAxisController(this.settings);
      this.movementController = new MovementController(
        this.settings,
        this.lockAxisController,
        this.getSceneObject(),
        null, // No collider in drone mode
        vec3.zero()
      );
    }
  }

  protected onAwake() {
    this.updateEvent = this.createEvent("UpdateEvent");
    this.updateEvent.bind(this.onUpdate);
    this.onUpdate();

    this.createEvent("OnDestroyEvent").bind(this.onDestroy);
    this.createEvent("OnEnableEvent").bind(this.onEnable);
    this.createEvent("OnDisableEvent").bind(this.onDisable);

    this.updateRenderLayerIfNeeded();
    
    // Skip character animation system in drone mode
    const isDroneMode = this.bypassCollisionDetection && this.bypassGroundDetection;
    if (!isDroneMode) {
      this.initializeAnimationController();
      this.checkMixamoAnimationIsEnabledForBitmoji3D();
    }
    
    this.initializeInputControl();

    if (this.enableTouchBlocking) {
      global.touchSystem.touchBlocking = true;
    }
  }

  //HACK: ADDED THESE
  setTargetSpeedModifier(value: number): void {
    this.externalSpeedModifier = value;
    this.movementController.setTargetSpeedModifier(value);
  }

  setInputType(inputType: number): void {
    this.inputControlType = inputType;
    this.initializeInputControl();
  }

  /**
   * Get the default flight intensity for external controllers
   */
  getDefaultFlightIntensity(): number {
    return this.defaultFlightIntensity;
  }

  /**
   * Set flight input intensity (0-1) for vertical movement
   * @param intensity - flight intensity from 0 (grounded) to 1 (max flight)
   * @param jumpPressed - whether jump button is currently pressed
   */
  setFlightInput(intensity: number, jumpPressed: boolean): void {
    this.assertNotDestroyed();
    const oldState = this.flightState;
    const oldJumpPressed = this.isJumpPressed;
    
    this.flightInput = Math.max(0, Math.min(1, intensity));
    this.isJumpPressed = jumpPressed;
    this.updateFlightState(getDeltaTime());
    
    // Log when state or button changes
    if (oldState !== this.flightState || oldJumpPressed !== this.isJumpPressed) {
      print(`[VehicleController] 🎮 Flight Update - State: ${this.flightState}, Button: ${jumpPressed ? 'PRESSED' : 'RELEASED'}, Intensity: ${intensity.toFixed(2)}`);
    }
  }

  /**
   * Get current flight state
   */
  getFlightState(): FlightState {
    this.assertNotDestroyed();
    return this.flightState;
  }

  /**
   * Get current altitude from base position
   */
  getCurrentAltitude(): number {
    this.assertNotDestroyed();
    
    // If base position not set yet, we're at ground level
    if (!this.basePosition || !this.basePositionSet) {
      return 0;
    }
    
    const altitude = Math.max(0, this.movementController.currentPosition.y - this.basePosition.y);
    
    // Debug altitude occasionally
    if (Math.floor(getTime() * 2) % 120 === 0) {
      print(`[VehicleController] Altitude: ${altitude.toFixed(1)}cm (Current Y: ${this.movementController.currentPosition.y.toFixed(1)}, Base Y: ${this.basePosition.y.toFixed(1)})`);
    }
    
    return altitude;
  }

  /**
   * Get current vertical speed
   */
  getVerticalSpeed(): number {
    this.assertNotDestroyed();
    return this.verticalSpeed;
  }

  /**
   * Force emergency landing
   */
  emergencyLand(): void {
    this.assertNotDestroyed();
    this.flightInput = 0;
    this.isJumpPressed = false;
    this.flightState = FlightState.Grounded;
  }

  /**
   * Reset the base position to current position (useful for debugging)
   */
  resetBasePosition(): void {
    this.assertNotDestroyed();
    this.basePosition = new vec3(
      this.movementController.currentPosition.x,
      this.movementController.currentPosition.y,
      this.movementController.currentPosition.z
    );
    this.basePositionSet = true;
    this.flightState = FlightState.Grounded;
    print(`[VehicleController] Base position reset to: ${this.basePosition.x.toFixed(1)}, ${this.basePosition.y.toFixed(1)}, ${this.basePosition.z.toFixed(1)}`);
  }

  //END HACK

  /**
   * Set direction in which character will move on next update.
   * Call move on each update, otherwise character will stop.
   * @param direction - direction vector, will be normalised, y is skipped
   */
  move(direction: vec3): void {
    this.assertNotDestroyed();
    if (direction) {
      direction = new vec3(direction.x, 0, direction.z);
      this.externalMovementDirection = direction;
    } else {
      this.externalMovementDirection = vec3.zero();
    }
    this.movementController.move(direction);
  }

  stopMovement(): void {
    this.assertNotDestroyed();
    this.movementController.reset();
    this.animationController && this.animationController.reset();
  }

  setPosition(position: vec3): void {
    this.assertNotDestroyed();
    if (!isNull(position)) {
      print(`[VehicleController] setPosition called with: X=${position.x.toFixed(1)}, Y=${position.y.toFixed(1)}, Z=${position.z.toFixed(1)}`);
      
      this.movementController.setPosition(position);
      
      // Check what movementController actually set
      const actualPos = this.movementController.currentPosition;
      print(`[VehicleController] After movementController.setPosition, currentPosition is: X=${actualPos.x.toFixed(1)}, Y=${actualPos.y.toFixed(1)}, Z=${actualPos.z.toFixed(1)}`);
      
      // In drone mode, immediately update the scene object transform to match
      const isDroneMode = this.bypassCollisionDetection && this.bypassGroundDetection;
      if (isDroneMode) {
        this.getSceneObject().getTransform().setWorldPosition(actualPos);
        print(`[VehicleController] Updated scene transform to match movement controller position`);
      }
      
      // Only reset ground detection if it exists (not in drone mode)
      if (this.collisionsController) {
        this.collisionsController.groundDetection.reset();
      }
      
      // ALWAYS update base position when setPosition is called (surface placement)
      // This ensures we use the surface placement position as ground reference
      this.basePosition = new vec3(position.x, position.y, position.z);
      this.basePositionSet = true;
      print(`[VehicleController] Base position UPDATED to surface placement: X=${this.basePosition.x.toFixed(1)}, Y=${this.basePosition.y.toFixed(1)}, Z=${this.basePosition.z.toFixed(1)}`);
      
      // Reset flight state to grounded when repositioned
      this.flightState = FlightState.Grounded;
      this.verticalSpeed = 0;
      print(`[VehicleController] Flight state reset to Grounded after surface placement`);
    }
  }

  getPosition(): vec3 {
    this.assertNotDestroyed();
    return Utils.copyVec3(this.movementController.currentPosition);
  }

  setRotation(rotation: quat): void {
    this.assertNotDestroyed();
    if (!isNull(rotation)) {
      this.movementController.setRotation(rotation);
    }
  }

  getRotation(): quat {
    this.assertNotDestroyed();
    return this.movementController.getRotation();
  }

  getDirection(): vec3 {
    this.assertNotDestroyed();
    const direction = this.movementController.getNextDirection() || vec3.zero();
    return Utils.copyVec3(direction);
  }

  /**
   * If enabled is true enable sprint movement instead of walking
   * (character walks by default), otherwise disable sprint movement
   * and switch to walking.
   * For sprint sprintSpeed is used; for walking - moveSpeed.
   * @param enabled
   */
  setSprintEnabled(enabled: boolean): void {
    this.assertNotDestroyed();
    this.settings.sprintEnabled = this.inputsValidator.validateBoolean(enabled);
  }

  /**
   * Get flag whether sprint movement instead of walking is enabled.
   */
  isSprinting(): boolean {
    this.assertNotDestroyed();
    return this.settings.sprintEnabled;
  }

  setMoveSpeed(speed: number): void {
    this.assertNotDestroyed();
    this.settings.moveSpeed = this.inputsValidator.validateNonNegativeNumber(
      "Move Speed",
      speed
    );
  }

  getMoveSpeed(): number {
    this.assertNotDestroyed();
    return this.settings.moveSpeed;
  }

  setSprintSpeed(speed: number): void {
    this.assertNotDestroyed();
    this.settings.sprintSpeed = this.inputsValidator.validateNonNegativeNumber(
      "Sprint Speed",
      speed
    );
  }

  getSprintSpeed(): number {
    this.assertNotDestroyed();
    return this.settings.sprintSpeed;
  }

  isGrounded(): boolean {
    this.assertNotDestroyed();
    // In drone mode, use flight state instead of ground detection
    if (!this.collisionsController) {
      return this.flightState === FlightState.Grounded;
    }
    return !!this.collisionsController.groundDetection.getIsCharacterOnGround();
  }

  isMoving(): boolean {
    this.assertNotDestroyed();
    return this.movementController.isMoving();
  }

  getVelocity(): vec3 {
    this.assertNotDestroyed();
    return this.movementController.getVelocity();
  }

  setAutoFaceMovement(enabled: boolean): void {
    this.assertNotDestroyed();
    this.settings.autoFaceMovementDirection =
      this.inputsValidator.validateBoolean(enabled);
  }

  getAutoFaceMovement(): boolean {
    this.assertNotDestroyed();
    return this.settings.autoFaceMovementDirection;
  }

  setAcceleration(value: number): void {
    this.assertNotDestroyed();
    this.settings.acceleration = this.inputsValidator.validateNonNegativeNumber(
      "Acceleration",
      value
    );
  }

  getAcceleration(): number {
    this.assertNotDestroyed();
    return this.settings.acceleration;
  }

  setDeceleration(value: number): void {
    this.assertNotDestroyed();
    this.settings.deceleration = this.inputsValidator.validateNonNegativeNumber(
      "Deceleration",
      value
    );
  }

  getDeceleration(): number {
    this.assertNotDestroyed();
    return this.settings.deceleration;
  }

  /**
   * Enable or disable collider.
   * @param value
   */
  setShowCollider(value: boolean): void {
    this.assertNotDestroyed();
    this.settings.showCollider = this.inputsValidator.validateBoolean(value);
    // Only set debug draw if collision controller exists
    if (this.collisionsController) {
      this.collisionsController.setDebugDrawEnabled(this.settings.showCollider);
    }
  }

  /**
   * Get flag if collider is shown.
   */
  getShowCollider(): boolean {
    this.assertNotDestroyed();
    return this.settings.showCollider;
  }

  get onCollisionEnter(): event1<CollisionEnterEventArgs, void> {
    this.assertNotDestroyed();
    // Return null event in drone mode
    if (!this.collisionsController) return null;
    return this.collisionsController.characterCollider.onCollisionEnter;
  }

  get onCollisionStay(): event1<CollisionEnterEventArgs, void> {
    this.assertNotDestroyed();
    // Return null event in drone mode
    if (!this.collisionsController) return null;
    return this.collisionsController.characterCollider.onCollisionStay;
  }

  get onCollisionExit(): event1<CollisionEnterEventArgs, void> {
    this.assertNotDestroyed();
    // Return null event in drone mode
    if (!this.collisionsController) return null;
    return this.collisionsController.characterCollider.onCollisionExit;
  }

  get onOverlapEnter(): event1<OverlapEnterEventArgs, void> {
    this.assertNotDestroyed();
    // Return null event in drone mode
    if (!this.collisionsController) return null;
    return this.collisionsController.characterCollider.onOverlapEnter;
  }

  get onOverlapStay(): event1<OverlapEnterEventArgs, void> {
    this.assertNotDestroyed();
    // Return null event in drone mode
    if (!this.collisionsController) return null;
    return this.collisionsController.characterCollider.onOverlapStay;
  }

  get onOverlapExit(): event1<OverlapEnterEventArgs, void> {
    this.assertNotDestroyed();
    // Return null event in drone mode
    if (!this.collisionsController) return null;
    return this.collisionsController.characterCollider.onOverlapExit;
  }

  setLockXAxis(enabled: boolean): void {
    this.assertNotDestroyed();
    this.settings.lockXAxis = this.inputsValidator.validateBoolean(enabled);
  }

  getLockXAxis(): boolean {
    this.assertNotDestroyed();
    return this.settings.lockXAxis;
  }

  setLockYAxis(enabled: boolean): void {
    this.assertNotDestroyed();
    this.settings.lockYAxis = this.inputsValidator.validateBoolean(enabled);
  }

  getLockYAxis(): boolean {
    this.assertNotDestroyed();
    return this.settings.lockYAxis;
  }

  setLockZAxis(enabled: boolean): void {
    this.assertNotDestroyed();
    this.settings.lockZAxis = this.inputsValidator.validateBoolean(enabled);
  }

  getLockZAxis(): boolean {
    this.assertNotDestroyed();
    return this.settings.lockZAxis;
  }

  private onDestroy = () => {
    if (!isNull(this)) {
      if (this.inputControl) {
        this.inputControl.onDestroy();
      }
    }
  };

  private onEnable = () => {
    if (this.inputControl) {
      this.inputControl.enable();
    }
    // Only reset ground detection if it exists
    if (this.collisionsController) {
      this.collisionsController.groundDetection.reset();
    }
  };

  private onDisable = () => {
    if (this.inputControl) {
      this.inputControl.disable();
    }
  };

  private updateRenderLayerIfNeeded(): void {
    if (this.getSceneObject().layer !== this.renderLayer) {
      this.renderLayer = this.getSceneObject().layer;
      Utils.assignRenderLayerRecursively(
        this.getSceneObject(),
        this.renderLayer
      );
    }
  }

  private onUpdate = () => {
    this.logger.clear();
    
    const deltaTime = getDeltaTime();
    
    // Update flight timer
    this.flightTimer += deltaTime;
    
    // Store current movement direction for horizontal movement while flying
    let movementDirection = vec3.zero();
    
    // Handle input for horizontal movement
    if (this.inputControlType === 1) {
      // Use joystick input
      const inputControlDirection = this.getInputControlDirection();
      movementDirection = inputControlDirection;
      this.movementController.move(inputControlDirection);
      this.movementController.setTargetSpeedModifier(
        inputControlDirection.length
      );
    } else {
      // Use external movement input (from VehicleSceneController)
      movementDirection = this.externalMovementDirection;
    }
    
    // DRONE MODE: Bypass physics when flying (or always if flags are set)
    const shouldBypassPhysics = this.bypassCollisionDetection && this.bypassGroundDetection;
    
    if (shouldBypassPhysics || this.flightState !== FlightState.Grounded) {
      // FREE FLIGHT MODE - No physics constraints
      
      // Apply horizontal movement manually using proper speed calculation
      if (movementDirection.length > 0.01) {
        // Use the actual moveSpeed from settings (cm/s) and apply speed modifier
        const speedModifier = this.inputControlType === 1 ? movementDirection.length : this.externalSpeedModifier;
        const baseSpeed = this.settings.moveSpeed; // cm/s
        const actualSpeed = baseSpeed * speedModifier * getDeltaTime(); // cm per frame
        
        const horizontalOffset = movementDirection.normalize().uniformScale(actualSpeed);
        this.movementController.currentPosition = this.movementController.currentPosition.add(
          new vec3(horizontalOffset.x, 0, horizontalOffset.z)
        );
        
        // Debug horizontal movement occasionally
        if (Math.floor(this.flightTimer * 2) % 60 === 0) {
          print(`[VehicleController] 🏃 Horizontal Movement - Dir: X=${movementDirection.x.toFixed(2)}, Z=${movementDirection.z.toFixed(2)}, Speed: ${actualSpeed.toFixed(1)} cm/frame (${baseSpeed}cm/s * ${speedModifier.toFixed(2)})`);
        }
      }
      
      // Update vertical movement for flight
      this.updateVerticalMovement(getDeltaTime());
      
      // Directly set the transform position, bypassing ALL physics systems
      const worldPos = this.movementController.currentPosition;
      this.getSceneObject().getTransform().setWorldPosition(worldPos);
      
      // Handle rotation if needed
      if (this.settings.autoFaceMovementDirection && movementDirection.length > 0.01) {
        const lookDir = new vec3(movementDirection.x, 0, movementDirection.z).normalize();
        const currentRot = this.getSceneObject().getTransform().getWorldRotation();
        const targetRot = quat.lookAt(lookDir, vec3.up());
        // Smooth rotation
        const smoothedRot = quat.slerp(currentRot, targetRot, getDeltaTime() * this.settings.rotationSmoothing);
        this.getSceneObject().getTransform().setWorldRotation(smoothedRot);
      }
      
      // Skip all physics updates when in drone mode
      if (shouldBypassPhysics) {
        return; // Exit early - no physics processing at all
      }
    } else {
      // GROUND MODE - Use normal physics (only when truly grounded and physics not bypassed)
      
      // Update vertical movement (for settling to ground)
      this.updateVerticalMovement(getDeltaTime());
      
      // Use the normal transform updater for ground movement (if it exists)
      this.waitForAllUpdatesToBeFinished(() => {
        this.updateRenderLayerIfNeeded();
        if (this.transformUpdater) {
          this.transformUpdater.update();
        }
      });
    }
  };

  private waitForAllUpdatesToBeFinished(onComplete: () => void): void {
    // In drone mode, we don't have a probe - just call the callback directly
    if (!this.probe) {
      onComplete();
      return;
    }
    
    // Ray casts are performed after simulation update, which occurs after script Update but prior to LateUpdate.
    this.probe.rayCast(
      this.colliderCenter.add(vec3.up()),
      this.colliderCenter,
      this.callbackWrapper.wrap(onComplete)
    );
  }

  private initializeAnimationController() {
    // Disable character animation system in drone mode
    const isDroneMode = this.bypassCollisionDetection && this.bypassGroundDetection;
    
    if (this.useAnimation && !isDroneMode) {
      const animationConfig: BasicMovementAnimationControllerConfig = {
        idleAnimation: {
          animationAsset: this.idleAnimationAsset,
          playbackSpeed: this.idlePlaybackSpeed,
        },
        moveAnimationConfigs: [
          {
            minCharacterSpeed: this.moveMinCharacterSpeed,
            animationAsset: this.moveAnimationAsset,
            playbackSpeed: this.movePlaybackSpeed,
          },
          {
            minCharacterSpeed: this.sprintMinCharacterSpeed,
            animationAsset: this.sprintAnimationAsset,
            playbackSpeed: this.sprintPlaybackSpeed,
          },
        ],
      };
      this.animationController = new BasicMovementAnimationController(
        animationConfig,
        this.getSceneObject()
      );
      this.animationController.bindSpeedProvider(this.movementController);
    }
  }

  private getInputControlDirection(): vec3 {
    return this.inputControl?.getDirection() ?? vec3.zero();
  }

  private initializeInputControl() {
    if (this.inputControlType === 1) {
      this.inputControl = new JoystickInputControl(
        this.joystickConfig,
        this.trackingCamera.getSceneObject()
      );
    }
  }

  private checkMixamoAnimationIsEnabledForBitmoji3D(): void {
    if (this.useAnimation) {
      const checker = new BitmojiMixamoAnimationIsEnabledChecker();
      const updateEvent = this.createEvent("UpdateEvent");
      updateEvent.bind(() => {
        checker.checkIsMixamoEnabled(
          this.getSceneObject(),
          this.logger,
          () => (updateEvent.enabled = false)
        );
      });
    }
  }

  private validateInputs(): void {
    // Check if we're in drone mode
    const isDroneMode = this.bypassCollisionDetection && this.bypassGroundDetection;
    
    this.moveSpeed = this.inputsValidator.validateNonNegativeNumber(
      "Move Speed",
      this.moveSpeed
    );
    this.sprintSpeed = this.inputsValidator.validateNonNegativeNumber(
      "Sprint Speed",
      this.sprintSpeed
    );
    this.acceleration = this.inputsValidator.validateNonNegativeNumber(
      "Acceleration",
      this.acceleration
    );
    this.deceleration = this.inputsValidator.validateNonNegativeNumber(
      "Deceleration",
      this.deceleration
    );
    this.minMoveDistance = this.inputsValidator.validateNonNegativeNumber(
      "Min Move Distance",
      this.minMoveDistance
    );
    this.autoFaceMovementDirection = this.inputsValidator.validateBoolean(
      this.autoFaceMovementDirection
    );
    this.rotationSmoothing = this.inputsValidator.validateNonNegativeNumber(
      "Rotation Smoothing",
      this.rotationSmoothing
    );
    this.lockXAxis = this.inputsValidator.validateBoolean(this.lockXAxis);
    this.lockYAxis = this.inputsValidator.validateBoolean(this.lockYAxis);
    this.lockZAxis = this.inputsValidator.validateBoolean(this.lockZAxis);
    this.showCollider = this.inputsValidator.validateBoolean(this.showCollider);
    
    // Skip validation for physics parameters in drone mode
    if (!isDroneMode) {
      this.groundCheckDistance = this.inputsValidator.validatePositiveNumber(
        "Ground Check Distance",
        this.groundCheckDistance
      );
      this.slopeLimit = this.inputsValidator.validatePositiveNumber(
        "Slope Limit",
        this.slopeLimit
      );
      this.stepHeight = this.inputsValidator.validatePositiveNumber(
        "Step Height",
        this.stepHeight
      );
      this.colliderHeight = this.inputsValidator.validateNonNegativeNumber(
        "Collider Height",
        this.colliderHeight
      );
      this.colliderRadius = this.inputsValidator.validatePositiveNumber(
        "Collider Radius",
        this.colliderRadius
      );
      this.gravity = this.inputsValidator.validateNonPositiveNumber(
        "Gravity",
        this.gravity
      );
    } else {
      // In drone mode, set physics parameters to safe defaults
      this.stepHeight = 0;
      this.groundCheckDistance = 0;
      this.colliderRadius = 0.1; // Minimal collider
      this.colliderHeight = 0.1; // Minimal collider
      this.gravity = 0;
    }
    
    this.groundIsZero = this.inputsValidator.validateBoolean(this.groundIsZero);
    this.colliderCenter = this.inputsValidator.validateNonNull(
      "Collider Center",
      this.colliderCenter,
      vec3.zero()
    );
    this.airControl = this.inputsValidator.validateAirControl(this.airControl);
    if (this.inputControlType === 1) {
      if (!this.trackingCamera) {
        this.logger.printWarning(
          "Set Tracking Camera to input to use joystick"
        );
        this.inputControlType = 0;
      }
      if (!this.joystickConfig) {
        this.logger.printWarning("Joystick config is missing");
        this.inputControlType = 0;
      } else {
        if (
          this.joystickConfig.joystickPositionTypeConfig ===
          JoystickPositionTypeConfig.Custom
        ) {
          if (!this.joystickConfig.joystickParent) {
            this.logger.printWarning(
              "Custom joystick position type requires a parent object. " +
                "Set Joystick Parent to input to use joystick"
            );
            this.inputControlType = 0;
          } else {
            if (
              !this.inputsValidator.validateSceneObjectInScreenHierarchy(
                this.joystickConfig.joystickParent
              )
            ) {
              this.logger.printWarning(
                "Joystick Parent should be in screen hierarchy to use joystick"
              );
              this.inputControlType = 0;
            }
          }
        }
      }
    }
    if (this.useAnimation) {
      this.inputsValidator.validateNonNull(
        "Idle Animation Asset",
        this.idleAnimationAsset
      );
      this.inputsValidator.validateNonNull(
        "Move Animation Asset",
        this.moveAnimationAsset
      );
      this.inputsValidator.validateNonNull(
        "Sprint Animation Asset",
        this.sprintAnimationAsset
      );
    }
  }

  private assertNotDestroyed(): void {
    if (isNull(this)) {
      throw new Error("Object is null - component was destroyed");
    }
  }

  /**
   * Update flight state based on input and current state
   */
  private updateFlightState(deltaTime: number): void {
    // Don't update flight state if base position isn't set yet
    if (!this.basePositionSet || !this.basePosition) {
      return;
    }
    
    const currentAltitude = this.getCurrentAltitude();
    
    switch (this.flightState) {
      case FlightState.Grounded:
        // Start flying when jump is pressed
        if (this.isJumpPressed) {
          this.flightState = FlightState.Flying;
          this.flightTimer = 0;
          this.verticalSpeed = 0;
          print(`[VehicleController] Taking off - transitioning to Flying`);
        }
        break;
        
      case FlightState.Flying:
        // Land when very close to ground and descending
        if (!this.isJumpPressed && currentAltitude <= 5.0) { // Within 5cm of ground
          this.flightState = FlightState.Grounded;
          this.verticalSpeed = 0;
          this.flightTimer = 0;
          
          // Snap to ground (only if basePosition is set)
          if (this.basePosition && this.movementController.currentPosition) {
            const currentPos = this.movementController.currentPosition;
            currentPos.y = this.basePosition.y;
            this.movementController.currentPosition = currentPos;
          }
          
          print(`[VehicleController] Landed - drone grounded`);
        }
        break;
    }
  }

  /**
   * Update vertical movement based on flight state
   */
  private updateVerticalMovement(deltaTime: number): void {
    // Don't auto-initialize base position - wait for setPosition() from surface placement
    if (!this.basePositionSet || !this.basePosition) {
      // Skip vertical movement until base position is properly set
      return;
    }
    
    const currentPos = this.movementController.currentPosition;
    const currentAltitude = this.getCurrentAltitude();
    
    // Debug log every second
    if (Math.floor(getTime()) % 60 === 0) {
      print(`[VehicleController] UpdateVertical - State: ${this.flightState}, Button: ${this.isJumpPressed}, VSpeed: ${this.verticalSpeed.toFixed(1)}, Alt: ${(currentAltitude/100).toFixed(2)}m`);
    }
    
    switch (this.flightState) {
      case FlightState.Grounded:
        // Keep drone at ground level
        this.verticalSpeed = 0;
        // Keep at base position (only if both positions are valid)
        if (this.basePosition && currentPos) {
          // Force drone to exact base position when grounded
          currentPos.y = this.basePosition.y;
          this.movementController.currentPosition = currentPos;
          
          // In drone mode, also update scene transform immediately
          const isDroneMode = this.bypassCollisionDetection && this.bypassGroundDetection;
          if (isDroneMode) {
            this.getSceneObject().getTransform().setWorldPosition(currentPos);
          }
        }
        break;
        
      case FlightState.Flying:
        if (this.isJumpPressed) {
          // BUTTON HELD - ASCEND
          const targetVerticalSpeed = this.maxVerticalSpeed * this.flightInput * 0.8; // 80% of max for controlled flight
          
          // Smooth acceleration to target speed
          const speedDiff = targetVerticalSpeed - this.verticalSpeed;
          if (Math.abs(speedDiff) > 1) {
            const accel = speedDiff > 0 ? this.verticalAcceleration : this.verticalDeceleration;
            this.verticalSpeed += Math.sign(speedDiff) * Math.min(Math.abs(speedDiff), accel * deltaTime);
          }
          
          // Apply upward movement if under max altitude
          if (currentAltitude < this.maxAltitude) {
            currentPos.y += this.verticalSpeed * deltaTime;
            this.movementController.currentPosition = currentPos;
            
            // Log occasionally
            if (Math.floor(this.flightTimer * 2) % 30 === 0) {
              print(`[VehicleController] ⬆️ ASCENDING - Speed: ${this.verticalSpeed.toFixed(1)}, Alt: ${(currentAltitude/100).toFixed(2)}m`);
            }
          } else {
            // At max altitude - hover
            this.verticalSpeed *= 0.9; // Dampen speed
            if (Math.abs(this.verticalSpeed) < 1) this.verticalSpeed = 0;
            print(`[VehicleController] MAX ALTITUDE REACHED - Hovering at ${(currentAltitude/100).toFixed(2)}m`);
          }
        } else {
          // BUTTON RELEASED - DESCEND (until we get close to ground, then Landing state takes over)
          // Apply controlled descent - consistent downward speed
          const targetDescentSpeed = -this.maxVerticalSpeed * 0.35; // 35% of max speed for controlled descent
          
          // Smooth transition to descent speed (always negative)
          if (this.verticalSpeed > targetDescentSpeed) {
            // We're going up or not descending fast enough - accelerate downward
            this.verticalSpeed -= this.verticalDeceleration * deltaTime;
            if (this.verticalSpeed < targetDescentSpeed) {
              this.verticalSpeed = targetDescentSpeed;
            }
          }
          
          // Apply downward movement
          currentPos.y += this.verticalSpeed * deltaTime;
          
          // Safety check - don't go below base position (landing state should handle this)
          if (this.basePosition && currentPos.y <= this.basePosition.y) {
            currentPos.y = this.basePosition.y;
            this.verticalSpeed = 0;
          }
          
          this.movementController.currentPosition = currentPos;
          
          // Log occasionally
          if (Math.floor(this.flightTimer * 2) % 30 === 0) {
            print(`[VehicleController] ⬇️ DESCENDING - Speed: ${this.verticalSpeed.toFixed(1)}, Alt: ${(currentAltitude/100).toFixed(2)}m`);
          }
        }
        break;
    }
  }
}
