import { OverlapRecovery } from "./OverlapRecovery/OverlapRecovery";
import { LockAxisController } from "../LockAxisController";
import { GroundDetection } from "./GroundDetection/GroundDetection";
import { ReadonlyVehicleControllerSettings } from "../VehicleControllerSettings";
import { VehicleControllerLogger } from "../Utils/VehicleControllerLogger";
import { createProbe, getRayCastCollisionCharacterPosition, RayCastController } from "./CollisionHelpers/ProbeHelper";
import { Utils } from "../Utils/Utils";
import { CallbacksWrapper } from "../Utils/CallbacksWrapper";
import { GroundInfo } from "./GroundDetection/GroundInfo";

const FIX_OVERLAP_BOX_SIZE_SCALE = 4;
const DEFAULT_ROTATION = quat.angleAxis(0, vec3.up());

/**
 * Class handles collisions of vehicle so that it does not overlap with static colliders.
 */
export class CollisionsController {

    readonly overlapRecovery: OverlapRecovery;

    readonly groundDetection: GroundDetection;

    readonly characterCollider: ColliderComponent;

    private readonly rayCastController: RayCastController;

    private readonly lockAxisController: LockAxisController;

    private readonly shapeForShapeCast: CapsuleShape;

    private readonly logger: VehicleControllerLogger;

    constructor(settings: ReadonlyVehicleControllerSettings, rootSO: SceneObject,
        lockAxisController: LockAxisController, logger: VehicleControllerLogger,
        callbackWrapper: CallbacksWrapper) {
        this.lockAxisController = lockAxisController;
        this.logger = logger;
        this.shapeForShapeCast = Shape.createCapsuleShape();
        this.characterCollider = this.createCollider(settings, rootSO);
        this.groundDetection = new GroundDetection(settings, this.characterCollider, logger, lockAxisController, this.shapeForShapeCast, callbackWrapper);
        this.overlapRecovery = new OverlapRecovery(this.characterCollider, this.groundDetection, this.createFixOverlapsCollider(settings, rootSO), this.lockAxisController, this.shapeForShapeCast, logger, callbackWrapper);
        this.rayCastController = new RayCastController(this.shapeForShapeCast, callbackWrapper, createProbe({ static: true, skip: [this.characterCollider] }));
        this.updateShapeSizeAccordingToScale();
    }

    updateShapeSizeAccordingToScale(): void {
        this.characterCollider.getSceneObject()
            .getTransform()
            .setWorldRotation(DEFAULT_ROTATION);
        const scale = this.characterCollider.getSceneObject()
            .getTransform()
            .getWorldScale();
        const originalCapsuleShape = this.characterCollider.shape as CapsuleShape;
        this.shapeForShapeCast.axis = originalCapsuleShape.axis;
        this.shapeForShapeCast.length = originalCapsuleShape.length * scale.x;
        this.shapeForShapeCast.radius = originalCapsuleShape.radius * scale.x;
    }

    /**
     * Set whether collider should be visible.
     * @param enabled
     */
    setDebugDrawEnabled(enabled: boolean): void {
        this.characterCollider.debugDrawEnabled = !!enabled;
    }

    handleStaticCollidersConstraint(skipColliders: ColliderComponent[], previousPosition: vec3, nextPosition: vec3, onReady: (position: vec3) => void): void {
        skipColliders = [this.characterCollider, ...skipColliders].filter((obj) => !!obj);
        this.rayCastController.probe.filter.includeDynamic = false;
        this.rayCastController.probe.filter.skipColliders = skipColliders;
        this.rayCastController.shapeCastAll(previousPosition, nextPosition, (hits: RayCastHit[]) => {
            this.handleStaticCollidersConstraintRecursively(previousPosition, nextPosition, hits, onReady);
        });
    }

    handleCollidersConstraintWhileFalling(skipColliders: ColliderComponent[], previousPosition: vec3, nextPosition: vec3,
        onReady: (position: vec3) => void): void {
        skipColliders = [this.characterCollider, ...skipColliders].filter((obj) => !!obj);
        this.rayCastController.probe.filter.includeDynamic = true;
        this.rayCastController.probe.filter.skipColliders = skipColliders;
        this.rayCastController.shapeCastAll(previousPosition, nextPosition, (hits: RayCastHit[]) => {
            this.handleCollidersConstraintWhileFallingRecursively(previousPosition, nextPosition, hits, onReady);
        });
    }

    private handleStaticCollidersConstraintRecursively(previousPosition: vec3, nextPosition: vec3, hits: RayCastHit[],
        onReady: (position: vec3) => void, hitIndex: number = 0): void {
        if (hitIndex >= hits.length) {
            onReady(nextPosition);
            return;
        }
        const hit = hits[hitIndex];
        this.handleColliderConstraint(false, previousPosition, nextPosition, hit, (position, shouldStop) => {
            if (shouldStop) {
                onReady(position);
            } else {
                this.handleStaticCollidersConstraintRecursively(previousPosition, nextPosition, hits, onReady, hitIndex + 1);
            }
        });
    }

    private handleCollidersConstraintWhileFallingRecursively(previousPosition: vec3, nextPosition: vec3,
        hits: RayCastHit[], onReady: (position: vec3) => void, hitIndex: number = 0): void {
        if (hitIndex >= hits.length) {
            onReady(nextPosition);
            return;
        }
        const hit = hits[hitIndex];
        this.logger.logColliderConstraints(() => "HIT WHILE FALLING : " + hit.collider.getSceneObject().name + "\n");
        this.handleColliderConstraint(true, previousPosition, nextPosition, hit, (position, shouldStop) => {
            if (shouldStop) {
                onReady(position);
            } else {
                this.handleCollidersConstraintWhileFallingRecursively(previousPosition, nextPosition, hits, onReady, hitIndex + 1);
            }
        });
    }

    private handleColliderConstraint(shouldHandleDynamic: boolean,
        previousPosition: vec3, nextPosition: vec3, hit: RayCastHit,
        onReady: (position: vec3, shouldStop: boolean) => void): void {
        this.logger.logColliderConstraints(() => "HIT WHILE FALLING : " + hit.collider.getSceneObject().name + "\n");
        const isDynamic = Utils.isColliderDynamic(hit.collider);
        if (isDynamic) {
            if (shouldHandleDynamic) {
                // Stop only if it is ground, otherwise dynamic collider will be pushed if overlapped with character
                this.groundDetection.findGround({
                    initialPosition: previousPosition,
                    nextPosition: nextPosition,
                    skipStepHeight: false,
                    findSteepGround: true,
                    onlyColliders: [hit.collider],
                    searchForNextGroundY: false,
                }, (groundInfo: GroundInfo) => {
                    if (groundInfo && groundInfo.ground === hit.collider) {
                        this.logger.logColliderConstraints(() => "HIT GROUND : " + hit.collider.getSceneObject().name + "\n");
                        this.groundDetection.applyGround(groundInfo);
                        onReady(getRayCastCollisionCharacterPosition(previousPosition, nextPosition, hit), true);
                    } else {
                        onReady(nextPosition, false);
                    }
                });
            } else {
                onReady(nextPosition, false);
            }
        } else {
            // Stop if collided with static collider
            this.groundDetection.findGround({
                initialPosition: previousPosition,
                nextPosition: nextPosition,
                skipStepHeight: false,
                findSteepGround: false,
                onlyColliders: [hit.collider],
                searchForNextGroundY: false,
            }, (groundInfo) => {
                if (groundInfo) {
                    this.logger.logColliderConstraints(() => "HIT GROUND : " + hit.collider.getSceneObject().name + "\n");
                    this.groundDetection.applyGround(groundInfo);
                    nextPosition.y = this.groundDetection.getGroundY();
                    // collided with ground, check other colliders
                    onReady(nextPosition, false);
                } else {
                    this.logger.logColliderConstraints(() => "HIT STATIC COLLIDER : " + hit.collider.getSceneObject().name + "\n");
                    const direction = nextPosition.sub(previousPosition);
                    const isOnGround = this.groundDetection.getIsCharacterOnGround();
                    let normal = new vec3(hit.normal.x, isOnGround ? 0 : hit.normal.y, hit.normal.z);
                    if (normal.length > Utils.EPS && normal.angleTo(direction) > Math.PI / 2) {
                        normal = normal.normalize();
                        let projectedDirection = direction.projectOnPlane(normal);
                        if (this.groundDetection.getIsCharacterOnGround()) {
                            projectedDirection = projectedDirection.projectOnPlane(this.groundDetection.getGroundNormal());
                        }
                        if (isOnGround) {
                            projectedDirection.y = 0;
                        }
                        projectedDirection = this.lockAxisController.updateDirection(projectedDirection);
                        const MIN_DIRECTION_LENGTH = 1e-4;
                        if (projectedDirection.length > MIN_DIRECTION_LENGTH) {
                            projectedDirection = projectedDirection.normalize()
                                .uniformScale(direction.length);
                            const newNextPosition = previousPosition.add(projectedDirection);
                            this.rayCastController.shapeCast(previousPosition, newNextPosition, (hit: RayCastHit) => {
                                if (hit) {
                                    const position = projectedDirection.uniformScale(hit.t)
                                        .add(previousPosition);
                                    onReady(position, true);
                                } else {
                                    onReady(newNextPosition, false);
                                }
                            });
                        } else {
                            onReady(previousPosition, true);
                        }
                    } else {
                        onReady(nextPosition, false);
                    }
                }
            });
        }
    }

    /**
     * Creates capsule collider for vehicle.
     */
    private createCollider(settings: ReadonlyVehicleControllerSettings, parentSO: SceneObject): ColliderComponent {
        const root = global.scene.createSceneObject("Vehicle Controller Collider");
        root.setParent(parentSO);
        const transform = root.getTransform();
        transform.setLocalPosition(settings.colliderCenter);
        transform.setLocalScale(vec3.one());
        transform.setLocalRotation(DEFAULT_ROTATION);
        const colliderComponent = root.createComponent("ColliderComponent");
        const capsule = Shape.createCapsuleShape();
        capsule.length = settings.colliderHeight;
        capsule.radius = settings.colliderRadius;
        capsule.axis = Axis.Y;
        colliderComponent.shape = capsule;
        colliderComponent.fitVisual = false;
        colliderComponent.debugDrawEnabled = settings.showCollider;
        colliderComponent.filter = Physics.Filter.create();
        return colliderComponent;
    }

    /**
     * Creates bigger box collider for overlap events to collect all colliders around vehicle
     * to fix overlaps with them.
     */
    private createFixOverlapsCollider(settings: ReadonlyVehicleControllerSettings, parentSO: SceneObject): ColliderComponent {
        const root = global.scene.createSceneObject("Vehicle Controller Collider To Fix Overlaps");
        root.setParent(parentSO);
        const transform = root.getTransform();
        transform.setLocalPosition(vec3.zero());
        transform.setLocalScale(vec3.one());
        transform.setLocalRotation(DEFAULT_ROTATION);
        const colliderComponent = root.createComponent("ColliderComponent");
        const box = Shape.createBoxShape();
        const size = settings.colliderHeight + settings.colliderRadius * 2;
        box.size = vec3.one()
            .uniformScale(size * FIX_OVERLAP_BOX_SIZE_SCALE);
        colliderComponent.shape = box;
        colliderComponent.fitVisual = false;
        colliderComponent.intangible = true;
        colliderComponent.debugDrawEnabled = false;
        return colliderComponent;
    }
}
