import { Utils } from "./Utils/Utils";
import { LockAxisController } from "./LockAxisController";
import { ReadonlyVehicleControllerSettings } from "./VehicleControllerSettings";

/**
 * Class controls speed, position and rotation of vehicle.
 */
export class MovementController {

    private readonly lockAxisController: LockAxisController;

    private readonly colliderT: Transform;

    private readonly rootT: Transform;

    private readonly settings: ReadonlyVehicleControllerSettings;

    private readonly colliderOffset: vec3;

    private initialScale: vec3 = vec3.one();

    private targetSpeedModifier: number = 1;

    private currentSpeed: number = 0;

    private direction: vec3 = null;

    private previousPosition: vec3 = null;

    private previousDirection: vec3 = vec3.zero();

    private speedY: number = 0;

    private _currentPosition: vec3;

    constructor(setting: ReadonlyVehicleControllerSettings, lockAxisController: LockAxisController,
        rootSO: SceneObject, collider: ColliderComponent, colliderOffset: vec3) {
        this.settings = setting;
        this.lockAxisController = lockAxisController;
        this.colliderOffset = colliderOffset;
        
        // Handle drone mode where collider might be null
        if (collider) {
            this.colliderT = collider.getSceneObject().getTransform();
            this.currentPosition = this.colliderT.getWorldPosition();
        } else {
            // No collider in drone mode - use root transform
            this.colliderT = rootSO.getTransform();
            this.currentPosition = rootSO.getTransform().getWorldPosition();
        }
        
        this.rootT = rootSO.getTransform();
    }

    setInitialScale(scale: vec3): void {
        this.initialScale = scale;
    }

    get currentPosition(): vec3 {
        return this._currentPosition;
    }

    set currentPosition(pos: vec3) {
        this._currentPosition = pos;
    }

    reset(): void {
        this.speedY = 0;
        this.currentPosition = this.colliderT.getWorldPosition();
        this.targetSpeedModifier = 1;
        this.currentSpeed = 0;
        this.direction = null;
        this.previousPosition = null;
        this.previousDirection = null;
    }

    isMoving(): boolean {
        return this.getVelocity().length > Utils.EPS;
    }

    getVelocity(): vec3 {
        const horizontalDirection = (this.direction || this.previousDirection || vec3.zero()).uniformScale(this.currentSpeed);
        horizontalDirection.y = this.speedY;
        return horizontalDirection;
    }

    /**
     * Set direction in which character will move on next update.
     * Call move on each update, otherwise character will stop.
     * @param direction - direction vector, will be normalised, y is skipped
     */
    move(direction: vec3): void {
        this.direction = direction;
        if (this.isDirectionValid()) {
            this.previousDirection = null;
        }
        this.lockAxisIfNeeded();
        if (this.isDirectionValid()) {
            this.direction = direction.normalize();
        }
    }

    getNextDirection(): vec3 {
        return this.direction || this.previousDirection;
    }

    /**
     * @param targetSpeedModifier - speed modifier, default is 1, represents how string should we align to targetSpeed
     */
    setTargetSpeedModifier(targetSpeedModifier: number): void {
        this.targetSpeedModifier = targetSpeedModifier;
    }

    getSpeed(): number {
        return this.currentSpeed;
    }

    getDirection(): vec3 {
        return this.direction ?? vec3.zero();
    }

    setPosition(position: vec3): void {
        // Apply collider offset only if both offset and scale are defined
        if (this.colliderOffset && this.initialScale) {
            this.rootT.setWorldPosition(position.sub(this.colliderOffset.uniformScale(this.initialScale.x)));
        } else {
            // No offset needed - set position directly
            this.rootT.setWorldPosition(position);
        }
        this.currentPosition = position;
    }

    updateCharacterY(y: number): void {
        if (!isNull(y)) {
            const pos = this.currentPosition;
            pos.y = y;
        }
    }

    getPosition(): vec3 {
        return this.colliderT.getWorldPosition();
    }

    /**
     * Call on update event.
     * @param deltaTime - delta time of update event.
     */
    update(deltaTime: number, onComplete: () => void): void {
        this.previousPosition = this.currentPosition;
        this.updateSpeed(deltaTime);
        this.updatePosition(deltaTime, () => {
            this.updateRotation();
            onComplete();
        });
    }

    clearDirection(): void {
        if (this.isDirectionValid()) {
            this.previousDirection = this.direction;
        }
        this.direction = null;
    }

    updateInAir(deltaTime: number, onComplete: () => void): void {
        this.previousPosition = this.currentPosition;
        if (this.direction) {
            this.direction = this.direction.uniformScale(this.settings.airControl);
        }
        this.updateSpeed(deltaTime);
        this.updatePosition(deltaTime, () => {
            this.updateRotation();
            onComplete();
        });
    }

    applyGravity(deltaTime: number, minY: number): void {
        if (this.lockAxisController.lockYAxis) {
            return;
        }
        const pos = this.currentPosition;
        this.speedY += this.settings.gravity * deltaTime;
        pos.y += this.speedY * deltaTime;
        if (minY !== null) {
            pos.y = Math.max(pos.y, minY);
        }
        this.currentPosition = pos;
    }

    clearGravity(): void {
        this.speedY = 0;
    }

    setRotation(rotation: quat): void {
        this.rootT.setWorldRotation(rotation);
        this.ensureRotationIsCorrect();
    }

    getRotation(): quat {
        this.ensureRotationIsCorrect();
        return this.rootT.getWorldRotation();
    }

    private ensureRotationIsCorrect(): void {
        // character controller can rotate only around y axis
        const forward = this.rootT.forward;
        forward.y = 0;
        this.rootT.setWorldRotation(quat.lookAt(forward, vec3.up()));
    }

    private updateSpeed(deltaTime: number): void {
        const targetSpeed = this.getTargetSpeed();
        const maxSpeed = this.currentSpeed + this.settings.acceleration * deltaTime;
        const minSpeed = this.currentSpeed - this.settings.deceleration * deltaTime;
        this.currentSpeed = MathUtils.clamp(targetSpeed, minSpeed, maxSpeed);
    }

    private getTargetSpeed(): number {
        if (this.isDirectionValid()) {
            return this.settings.sprintEnabled
                ? this.settings.sprintSpeed
                : this.settings.moveSpeed * this.targetSpeedModifier;
        } else {
            return 0;
        }
    }

    private updatePosition(deltaTime: number, onComplete: () => void) {
        const direction = this.isDirectionValid() ? this.direction : this.previousDirection;
        if (direction) {
            const offset = direction.uniformScale(this.currentSpeed * deltaTime);
            if (offset.length >= this.settings.minMoveDistance) {
                const nextPosition = this.previousPosition.add(offset);
                this.currentPosition = nextPosition;
                onComplete();
            } else {
                onComplete();
            }
        } else {
            onComplete();
        }
    }

    private updateRotation(): void {
        if (this.settings.autoFaceMovementDirection) {
            const currentPosition = this.currentPosition;
            let targetDirection = currentPosition.sub(this.previousPosition);
            targetDirection.y = 0;
            if (targetDirection.length > Utils.EPS) {
                targetDirection = targetDirection.normalize();
                let currentDirection = this.rootT.forward;
                currentDirection.y = 0;
                currentDirection = currentDirection.normalize();
                const smoothing = Math.min(1, Math.max(0, this.settings.rotationSmoothing));
                const direction = this.interpolateRotationDirection(currentDirection, targetDirection, smoothing);
                const isDirectionInvalid = isNaN(direction.x) || isNaN(direction.y) || isNaN(direction.z);
                if (!isDirectionInvalid) {
                    this.rootT.setWorldRotation(quat.lookAt(direction, vec3.up()));
                    return;
                }
            }
        }
        const direction = this.rootT.forward;
        direction.y = 0;
        this.rootT.setWorldRotation(quat.lookAt(direction, vec3.up()));
    }

    private interpolateRotationDirection(currentDirection: vec3, targetDirection: vec3, smoothing: number): vec3 {
        if (currentDirection.cross(targetDirection).length < Utils.EPS) {
            if (Math.abs(currentDirection.x - targetDirection.x) < Utils.EPS
                && Math.abs(currentDirection.z - targetDirection.z) < Utils.EPS) {
                return targetDirection;
            } else {
                const angleTarget = (Math.PI * 2 + (Math.atan2(targetDirection.z, targetDirection.x) % (Math.PI * 2))) % (Math.PI * 2);
                const angleCurrent = (Math.PI * 2 + (Math.atan2(currentDirection.z, currentDirection.x) % (Math.PI * 2))) % (Math.PI * 2);
                const angle = angleCurrent * (1 - smoothing) + angleTarget * smoothing;
                return new vec3(Math.cos(angle), 0, Math.sin(angle));
            }
        }
        return vec3.slerp(currentDirection, targetDirection, 1 - smoothing);
    }

    private isDirectionValid(): boolean {
        return this.direction && this.direction.length > Utils.EPS;
    }

    private lockAxisIfNeeded(): void {
        if (this.direction) {
            this.direction = this.lockAxisController.updateDirection(this.direction);
        }
    }
}
