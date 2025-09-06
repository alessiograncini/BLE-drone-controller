import { AabbBuilder } from "../CollisionHelpers/AabbBuilder";
import { createProbe, RayCastController } from "../CollisionHelpers/ProbeHelper";
import { GroundSurfaceValidator } from "./GroundSurfaceValidator";
import { ShapeCastGroundFinder } from "./ShapeCastGroundFinder";
import { LockAxisController } from "../../LockAxisController";
import { ReadonlyVehicleControllerSettings } from "../../VehicleControllerSettings";
import { VehicleControllerLogger } from "../../Utils/VehicleControllerLogger";
import { CallbacksWrapper } from "../../Utils/CallbacksWrapper";
import { GroundInfo } from "./GroundInfo";
import { IGroundDetectionStrategy, GroundSearchSettings } from "./GroundDetection";

export class ShapeCastGroundDetection implements IGroundDetectionStrategy {

    private readonly lockAxisController: LockAxisController;

    private readonly groundSurfaceValidator: GroundSurfaceValidator;

    private readonly characterCollider: ColliderComponent;

    private readonly rayCastController: RayCastController;

    private readonly currentGroundRayCastController: RayCastController;

    private readonly groundFinder: ShapeCastGroundFinder;

    private readonly logger: VehicleControllerLogger;

    /**
     * Ground on which vehicle stands and which is valid
     */
    private groundInfo: GroundInfo = null;

    /**
     * Ground on which vehicle stands and which is too step
     */
    private steepGroundInfo: GroundInfo = null;

    /**
     * Y of next ground below vehicle in case vehicle does not stand on ground
     */
    private nextGroundY: number = null;

    private wasInitialized: boolean = false;

    private readonly shapeSize: vec3;

    constructor(settings: ReadonlyVehicleControllerSettings,
        characterCollider: ColliderComponent, lockAxisController: LockAxisController,
        shapeForShapeCast: Shape, logger: VehicleControllerLogger, callbackWrapper: CallbacksWrapper) {
        this.lockAxisController = lockAxisController;
        this.logger = logger;
        this.characterCollider = characterCollider;
        this.rayCastController = new RayCastController(shapeForShapeCast, callbackWrapper, createProbe({ dynamic: true, static: true, skip: [this.characterCollider] }));
        this.currentGroundRayCastController = new RayCastController(shapeForShapeCast, callbackWrapper, createProbe({ dynamic: true, static: true, skip: [this.characterCollider] }));
        const aabb = AabbBuilder.buildAabb(characterCollider.getSceneObject()
            .getTransform()
            .getWorldPosition(),
        characterCollider);
        this.shapeSize = aabb.aabbMax.sub(aabb.aabbMin);
        this.groundSurfaceValidator = new GroundSurfaceValidator(settings, this.currentGroundRayCastController, this.shapeSize);
        this.groundFinder = new ShapeCastGroundFinder(settings, this.characterCollider, this.rayCastController, this.groundSurfaceValidator);
    }

    reset(): void {
        this.groundInfo = null;
        this.steepGroundInfo = null;
        this.nextGroundY = null;
        this.wasInitialized = false;
    }

    /**
     * Find initial ground in position
     */
    initialize(position: vec3, onReady: (position: vec3) => void): void {
        if (this.wasInitialized) {
            onReady(null);
        } else {
            this.findGroundAndApply({
                findSteepGround: true,
                initialPosition: position,
                nextPosition: position,
                skipStepHeight: true,
            }, () => {
                this.wasInitialized = true;
                if (this.groundInfo !== null) {
                    position.y = this.groundInfo.groundY;
                    this.setCharacterPosition(position);
                    onReady(position);
                } else {
                    onReady(null);
                }
            });
        }
    }

    getGroundCollider(): ColliderComponent {
        return this.groundInfo && this.groundInfo.ground;
    }

    getSteepGroundCollider(): ColliderComponent {
        return this.steepGroundInfo && this.steepGroundInfo.ground;
    }

    getGroundNormal(): vec3 {
        return this.groundInfo && this.groundInfo.groundSurfaceNormal;
    }

    checkGroundExists(): boolean {
        return !isNull(this.groundInfo) && (this.groundInfo.isZeroGround
            || this.groundSurfaceValidator.isExistingGround(this.groundInfo.ground));
    }

    /**
     * Sets current character position on ground in case ground moves
     */
    setCharacterPosition(pos: vec3): void {
        if (this.groundInfo && !this.groundInfo.isZeroGround) {
            const transform = this.groundInfo.ground.getSceneObject()
                .getTransform();
            const invertedWorldTransform = transform.getInvertedWorldTransform();
            const height = this.shapeSize.y;
            const bottomPos = new vec3(pos.x, pos.y - height / 2, pos.z);
            this.groundInfo.localPositionOnGround = invertedWorldTransform.multiplyPoint(bottomPos);
        } else {
            if (this.groundInfo) {
                this.groundInfo.localPositionOnGround = null;
            }
        }
    }

    /**
     * Updates character position in case ground moves
     */
    getNewWorldPositionOnGround(pos: vec3): vec3 {
        if (this.groundInfo && this.groundInfo.localPositionOnGround && this.groundInfo.ground && !this.groundInfo.isZeroGround) {
            const transform = this.groundInfo.ground.getSceneObject()
                .getTransform();
            const worldTransform = transform.getWorldTransform();
            const worldBottomPos = worldTransform.multiplyPoint(this.groundInfo.localPositionOnGround);
            const height = this.shapeSize.y;
            worldBottomPos.y += height / 2;
            if (this.lockAxisController.lockXAxis) {
                worldBottomPos.x = pos.x;
            }
            if (this.lockAxisController.lockYAxis) {
                worldBottomPos.y = pos.y;
            }
            if (this.lockAxisController.lockZAxis) {
                worldBottomPos.z = pos.z;
            }
            return worldBottomPos;
        } else {
            return null;
        }
    }

    isOnSteepGround(): boolean {
        return !!this.steepGroundInfo;
    }

    getSteepGroundNormal(): vec3 {
        return this.steepGroundInfo && this.steepGroundInfo.groundSurfaceNormal;
    }

    updateDirectionOnGround(direction: vec3): vec3 {
        if (direction && this.groundInfo && this.groundInfo.groundSurfaceNormal) {
            return direction.projectOnPlane(this.groundInfo.groundSurfaceNormal);
        } else {
            return direction;
        }
    }

    findGround(settings: GroundSearchSettings, onReady: (groundInfo: GroundInfo, nextGroundY: number) => void): void {
        this.groundFinder.findGround(this.groundInfo, settings, onReady);
    }

    findGroundAndApply(settings: GroundSearchSettings, onReady: () => void): void {
        this.groundFinder.findGround(this.groundInfo, settings, (groundInfo, nextGroundY) => {
            if (groundInfo) {
                this.setGroundInfo(groundInfo);
            } else {
                this.setGroundInfo(null);
                this.nextGroundY = nextGroundY;
            }
            onReady();
        });
    }

    applyGround(groundInfo: GroundInfo): void {
        this.setGroundInfo(groundInfo);
    }

    getIsCharacterOnGround(): boolean {
        return this.groundInfo && this.groundInfo.isCharacterOnGround;
    }

    getGroundY(): number {
        return this.groundInfo && this.groundInfo.groundY;
    }

    getMinCharacterY(): number {
        return this.nextGroundY;
    }

    private setGroundInfo(groundInfo: GroundInfo): void {
        if (!groundInfo) {
            this.logger.logGroundInfo(() => "NO GROUND");
        } else {
            if (!groundInfo.isSteepGround) {
                if (groundInfo.isZeroGround) {
                    this.logger.logGroundInfo(() => "ZERO GROUND");
                } else {
                    this.logger.logGroundInfo(() => "GROUND : " + groundInfo.ground.getSceneObject().name);
                }
            } else {
                this.logger.logGroundInfo(() => "STEEP GROUND : " + groundInfo.ground.getSceneObject().name);
            }
        }
        const previousGround = this.groundInfo && this.groundInfo.ground;
        if (previousGround && previousGround.filter) {
            previousGround.filter.skipColliders = previousGround.filter.skipColliders.filter((obj) => obj !== this.characterCollider);
            this.characterCollider.filter.skipColliders = this.characterCollider.filter.skipColliders.filter((obj) => obj !== previousGround);
        }
        const previousSteepGround = this.steepGroundInfo && this.steepGroundInfo.ground;
        if (previousSteepGround && previousSteepGround.filter) {
            previousSteepGround.filter.skipColliders = previousSteepGround.filter.skipColliders.filter((obj) => obj !== this.characterCollider);
            this.characterCollider.filter.skipColliders = this.characterCollider.filter.skipColliders.filter((obj) => obj !== previousSteepGround);
        }
        this.steepGroundInfo = null;
        this.groundInfo = null;
        this.nextGroundY = null;
        if (groundInfo) {
            if (groundInfo.isSteepGround) {
                this.steepGroundInfo = groundInfo;
            } else {
                this.groundInfo = groundInfo;
            }
            if (groundInfo.ground) {
                this.characterCollider.filter.skipColliders = [...this.characterCollider.filter.skipColliders, groundInfo.ground];
                groundInfo.ground.filter = groundInfo.ground.filter || Physics.Filter.create();
                groundInfo.ground.filter.skipColliders = [...groundInfo.ground.filter.skipColliders, this.characterCollider];
            }
        }
    }
}
