import { ShapeCastGroundDetection } from "./ShapeCastGroundDetection";
import { LockAxisController } from "../../LockAxisController";
import { DisabledGroundDetectionStrategy } from "./DisabledGroundDetectionStrategy";
import { ReadonlyVehicleControllerSettings } from "../../VehicleControllerSettings";
import { VehicleControllerLogger } from "../../Utils/VehicleControllerLogger";
import { CallbacksWrapper } from "../../Utils/CallbacksWrapper";
import { GroundInfo } from "./GroundInfo";

export interface GroundSearchSettings {
    initialPosition: vec3;
    nextPosition: vec3;
    skipStepHeight?: boolean;
    findSteepGround?: boolean;
    onlyColliders?: ColliderComponent[];
    searchForNextGroundY?: boolean;
}

export interface IGroundDetectionStrategy {
    reset(): void;
    initialize(pos: vec3, onReady: (pos: vec3) => void): void;
    getGroundCollider(): ColliderComponent;
    getSteepGroundCollider(): ColliderComponent;
    getGroundNormal(): vec3;
    checkGroundExists(): boolean;
    setCharacterPosition(pos: vec3): void;
    getNewWorldPositionOnGround(position: vec3): vec3;
    isOnSteepGround(): boolean;
    getSteepGroundNormal(): vec3;
    updateDirectionOnGround(direction: vec3): vec3;
    findGround(settings: GroundSearchSettings, onReady: (groundInfo: GroundInfo, nextGroundY: number) => void): void;
    findGroundAndApply(settings: GroundSearchSettings, onReady: () => void): void;
    applyGround(groundInfo: GroundInfo): void;
    getIsCharacterOnGround(): boolean;
    getGroundY(): number;
    getMinCharacterY(): number;
}

/**
 * Provides GroundDetection or mock depending on lock y axis.
 */
export class GroundDetection {

    private readonly shapeCastGroundDetection: ShapeCastGroundDetection;

    private readonly disabledGroundDetection: DisabledGroundDetectionStrategy;

    private wasYAxisLocked: boolean;

    constructor(settings: ReadonlyVehicleControllerSettings,
        characterCollider: ColliderComponent, logger: VehicleControllerLogger,
        private readonly lockAxisController: LockAxisController,
        shapeForShapeCast: Shape, callbackWrapper: CallbacksWrapper) {
        this.wasYAxisLocked = this.lockAxisController.lockYAxis;
        this.shapeCastGroundDetection = new ShapeCastGroundDetection(settings, characterCollider, lockAxisController, shapeForShapeCast, logger, callbackWrapper);
        this.disabledGroundDetection = new DisabledGroundDetectionStrategy();
    }

    reset(): void {
        this.strategy.reset();
    }

    initialize(pos: vec3, onReady: (pos: vec3) => void): void {
        this.strategy.initialize(pos, onReady);
    }

    getGroundCollider(): ColliderComponent {
        return this.strategy.getGroundCollider();
    }

    getSteepGroundCollider(): ColliderComponent {
        return this.strategy.getSteepGroundCollider();
    }

    getGroundNormal(): vec3 {
        return this.strategy.getGroundNormal();
    }

    checkGroundExists(): boolean {
        return this.strategy.checkGroundExists();
    }

    setCharacterPosition(pos: vec3): void {
        this.strategy.setCharacterPosition(pos);
    }

    getNewWorldPositionOnGround(position: vec3): vec3 {
        return this.strategy.getNewWorldPositionOnGround(position);
    }

    isOnSteepGround(): boolean {
        return this.strategy.isOnSteepGround();
    }

    getSteepGroundNormal(): vec3 {
        return this.strategy.getSteepGroundNormal();
    }

    updateDirectionOnGround(direction: vec3): vec3 {
        return this.strategy.updateDirectionOnGround(direction);
    }

    findGround(settings: GroundSearchSettings, onReady: (groundInfo: GroundInfo, nextGroundY: number) => void): void {
        this.strategy.findGround(settings, onReady);
    }

    findGroundAndApply(settings: GroundSearchSettings, onReady: () => void): void {
        this.strategy.findGroundAndApply(settings, onReady);
    }

    applyGround(groundInfo: GroundInfo): void {
        this.strategy.applyGround(groundInfo);
    }

    getIsCharacterOnGround(): boolean {
        return this.strategy.getIsCharacterOnGround();
    }

    getGroundY(): number {
        return this.strategy.getGroundY();
    }

    getMinCharacterY(): number {
        return this.strategy.getMinCharacterY();
    }

    private get strategy(): IGroundDetectionStrategy {
        if (this.lockAxisController.lockYAxis) {
            if (this.wasYAxisLocked) {
                this.wasYAxisLocked = false;
                this.shapeCastGroundDetection.reset();
            }
            return this.disabledGroundDetection;
        } else {
            this.wasYAxisLocked = true;
            return this.shapeCastGroundDetection;
        }
    }
}
