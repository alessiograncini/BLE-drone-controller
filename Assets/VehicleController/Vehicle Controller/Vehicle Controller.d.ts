declare class VehicleController extends BaseScriptComponent {
    move(direction: vec3): void
    stopMovement(): void
    setPosition(position: vec3): void
    getPosition(): vec3
    setRotation(rotation: quat): void
    getRotation(): quat
    getDirection(): vec3
    setSprintEnabled(enabled: boolean): void
    isSprinting(): boolean
    setMoveSpeed(speed: number): void
    getMoveSpeed(): number
    setSprintSpeed(speed: number): void
    getSprintSpeed(): number
    isGrounded(): boolean
    isMoving(): boolean
    getVelocity(): vec3
    setAutoFaceMovement(enabled: boolean): void
    getAutoFaceMovement(): boolean
    setAcceleration(value: number): void
    getAcceleration(): number
    setDeceleration(value: number): void
    getDeceleration(): number
    setShowCollider(value: boolean): void
    getShowCollider(): boolean
    get onCollisionEnter(): event1<CollisionEnterEventArgs, void>
    get onCollisionStay(): event1<CollisionEnterEventArgs, void>
    get onCollisionExit(): event1<CollisionEnterEventArgs, void>
    get onOverlapEnter(): event1<OverlapEnterEventArgs, void>
    get onOverlapStay(): event1<OverlapEnterEventArgs, void>
    get onOverlapExit(): event1<OverlapEnterEventArgs, void>
    setLockXAxis(enabled: boolean): void
    getLockXAxis(): boolean
    setLockYAxis(enabled: boolean): void
    getLockYAxis(): boolean
    setLockZAxis(enabled: boolean): void
    getLockZAxis(): boolean
    setFlightInput(intensity: number, jumpPressed: boolean): void
    getFlightState(): string
    getCurrentAltitude(): number
    getVerticalSpeed(): number
    emergencyLand(): void
    resetBasePosition(): void
}
