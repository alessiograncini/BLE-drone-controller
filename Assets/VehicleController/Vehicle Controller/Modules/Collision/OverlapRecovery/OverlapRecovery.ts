import { AabbBuilder } from "../CollisionHelpers/AabbBuilder";
import { AabbOverlap } from "../CollisionHelpers/AabbOverlap";
import { createProbe, RayCastController } from "../CollisionHelpers/ProbeHelper";
import { OverlapFixer } from "./OverlapFixer";
import { GroundDetection } from "../GroundDetection/GroundDetection";
import { LockAxisController } from "../../LockAxisController";
import { VehicleControllerLogger } from "../../Utils/VehicleControllerLogger";
import { AabbInfo } from "../CollisionHelpers/AabbInfo";
import { CallbacksWrapper } from "../../Utils/CallbacksWrapper";
import { Utils } from "../../Utils/Utils";

interface OverlapRecoveryCache {
    colliders: ColliderComponent[];
    initialPosition: vec3;
    allPositions: vec3[];
    aabb: AabbInfo[];
    currentPosition: vec3;
}

export class OverlapRecovery {

    private readonly rayCastController: RayCastController;

    private readonly maxNumSteps: number = 15;

    private readonly overlapFixer: OverlapFixer;

    private colliders: ColliderComponent[] = [];

    constructor(private readonly characterCollider: ColliderComponent,
        private readonly groundDetection: GroundDetection,
        private readonly fixOverlapCollider: ColliderComponent,
        private readonly lockAxisController: LockAxisController,
        private readonly shapeForShapeCast: Shape,
        private readonly logger: VehicleControllerLogger,
        callbackWrapper: CallbacksWrapper) {
        this.rayCastController = new RayCastController(this.shapeForShapeCast, callbackWrapper, createProbe({ static: true, skip: [this.characterCollider] }));
        this.overlapFixer = new OverlapFixer(this.rayCastController, this.groundDetection, this.lockAxisController);
        this.initializeOverlapEvents();
    }

    fixOverlaps(pos: vec3, onReady: (position: vec3) => void): void {
        this.rayCastController.probe.filter.onlyColliders = [];
        const allColliders = this.getAllCollidersInScene();
        const cache: OverlapRecoveryCache = {
            initialPosition: pos,
            allPositions: [pos],
            colliders: allColliders,
            aabb: this.getAabb(allColliders),
            currentPosition: pos,
        };
        this.logger.logOverlapInfo(() => "INITIAL POSITION\n" + cache.initialPosition);
        this.nextFixOverlapStep(cache, onReady);
    }

    private nextFixOverlapStep(cache: OverlapRecoveryCache, onComplete: (position: vec3) => void, currentIteration: number = 0): void {
        const characterAabb = AabbBuilder.buildAabb(cache.currentPosition, this.characterCollider, 0.1);
        let overlappedAabb = this.filterOnlyOverlappedAabb(characterAabb, cache.aabb);
        const initialPosition = Utils.copyVec3(cache.currentPosition);

        if (currentIteration >= this.maxNumSteps) {
            this.tryToOverlapInDefaultDirectionsIfThereIsStillOverlap(cache, characterAabb, onComplete);
            return;
        }
        overlappedAabb = overlappedAabb.sort((a, b) => a.collider.getSceneObject()
            .name
            .localeCompare(b.collider.getSceneObject().name));
        this.logger.logOverlapInfo(() => "OVERLAPPED COLLIDERS : " + overlappedAabb.map((aabb) => aabb.collider.getSceneObject().name));
        this.rayCastController.probe.filter.onlyColliders = overlappedAabb.map((aabb) => aabb.collider);
        if (overlappedAabb.length === 0) {
            onComplete(cache.currentPosition);
            return;
        }
        this.overlapFixer.fixOverlapWithAabbRecursively(initialPosition, cache.currentPosition, characterAabb, overlappedAabb, cache.allPositions, (position) => {
            this.logger.logOverlapInfo(() => "NEW POSITION : " + position);
            const MAX_DISTANCE_DIFF = 1e-3;
            if (cache.allPositions[cache.allPositions.length - 1].distance(position) < MAX_DISTANCE_DIFF) {
                // position is same as previous - no changes
                onComplete(position);
                return;
            }
            if (cache.allPositions.some((pos) => pos.distance(position) < MAX_DISTANCE_DIFF)) {
                // position repeats - loop detected
                this.tryToOverlapInDefaultDirectionsIfThereIsStillOverlap(cache, characterAabb, onComplete);
                return;
            }
            cache.allPositions.push(position);
            cache.currentPosition = position;
            this.nextFixOverlapStep(cache, onComplete, currentIteration + 1);
        });
    }

    private tryToOverlapInDefaultDirectionsIfThereIsStillOverlap(cache: OverlapRecoveryCache, characterAabb: AabbInfo, onComplete: (position: vec3) => void): void {
        const newCharAabb = characterAabb.setPosition(cache.currentPosition);
        const overlappedAabb = this.filterOnlyOverlappedAabb(newCharAabb, cache.aabb);
        if (overlappedAabb.length === 0) {
            onComplete(cache.currentPosition);
        } else {
            this.logger.logOverlapInfo(() => "FIX OVERLAP IN DEFAULT DIRECTIONS");
            this.overlapFixer.fixOverlapInDefaultDirections(cache.initialPosition, cache.currentPosition, newCharAabb, cache.aabb, onComplete);
        }
    }

    private filterOnlyOverlappedAabb(characterAabb: AabbInfo, aabb: AabbInfo[]): AabbInfo[] {
        return aabb.filter((aabb) => AabbOverlap.isAabbOverlap(aabb, characterAabb));
    }

    private getAabb(colliders: ColliderComponent[]): AabbInfo[] {
        return colliders.map((collider) => AabbBuilder.buildAabb(null, collider))
            .filter((val) => !!val);
    }

    private getAllCollidersInScene(): ColliderComponent[] {
        return this.colliders.filter((collider) => {
            if (collider.getTypeName() === "BodyComponent") {
                return this.isPhysicBodyValid(collider as BodyComponent);
            } else {
                return this.isColliderValid(collider);
            }
        });
    }

    private isPhysicBodyValid(body: BodyComponent): boolean {
        return body.enabled && body !== this.characterCollider
            && body !== this.groundDetection.getGroundCollider()
            && body !== this.groundDetection.getSteepGroundCollider()
            && !body.intangible && !body.dynamic;
    }

    private isColliderValid(collider: ColliderComponent): boolean {
        return collider.enabled && collider !== this.characterCollider
            && collider !== this.groundDetection.getGroundCollider()
            && collider !== this.groundDetection.getSteepGroundCollider()
            && !collider.intangible
            && collider.getTypeName() !== "Physics.BodyComponent";
    }

    private initializeOverlapEvents(): void {
        this.fixOverlapCollider.onOverlapEnter.add((overlap) => {
            if (this.colliders.indexOf(overlap.overlap.collider) < 0) {
                this.colliders.push(overlap.overlap.collider);
            }
        });
        this.fixOverlapCollider.onCollisionEnter.add((collision) => {
            if (this.colliders.indexOf(collision.collision.collider) < 0) {
                this.colliders.push(collision.collision.collider);
            }
        });
        this.fixOverlapCollider.onOverlapExit.add((overlap) => {
            const index = this.colliders.indexOf(overlap.overlap.collider);
            if (index >= 0) {
                this.colliders.splice(index, 1);
            }
        });
        this.fixOverlapCollider.onCollisionExit.add((collision) => {
            const index = this.colliders.indexOf(collision.collision.collider);
            if (index >= 0) {
                this.colliders.splice(index, 1);
            }
        });
    }
}
