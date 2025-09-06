export interface VehicleControllerSettings {
    moveSpeed: number;
    sprintSpeed: number;
    acceleration: number;
    deceleration: number;
    minMoveDistance: number;
    autoFaceMovementDirection: boolean;
    rotationSmoothing: number;
    lockXAxis: boolean;
    lockYAxis: boolean;
    lockZAxis: boolean;
    showCollider: boolean;
    groundCheckDistance: number;
    maxGroundAngle: number;
    stepHeight: number;
    groundIsZero: boolean;
    colliderHeight: number;
    colliderRadius: number;
    colliderCenter: vec3;
    gravity: number;
    airControl: number;
    sprintEnabled: boolean;
}

export interface ReadonlyVehicleControllerSettings {
    readonly moveSpeed: number;
    readonly sprintSpeed: number;
    readonly acceleration: number;
    readonly deceleration: number;
    readonly minMoveDistance: number;
    readonly autoFaceMovementDirection: boolean;
    readonly rotationSmoothing: number;
    readonly lockXAxis: boolean;
    readonly lockYAxis: boolean;
    readonly lockZAxis: boolean;
    readonly showCollider: boolean;
    readonly groundCheckDistance: number;
    readonly maxGroundAngle: number;
    readonly stepHeight: number;
    readonly groundIsZero: boolean;
    readonly colliderHeight: number;
    readonly colliderRadius: number;
    readonly colliderCenter: vec3;
    readonly gravity: number;
    readonly airControl: number;
    readonly sprintEnabled: boolean;
}
