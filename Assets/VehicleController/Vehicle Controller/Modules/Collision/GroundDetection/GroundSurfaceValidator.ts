import { AabbBuilder } from "../CollisionHelpers/AabbBuilder";
import { AabbInfo } from "../CollisionHelpers/AabbInfo";
import { AabbOverlap } from "../CollisionHelpers/AabbOverlap";
import { SurfaceNormalHelper } from "../CollisionHelpers/SurfaceNormalHelper";
import { GroundInfo } from "./GroundInfo";
import { ReadonlyVehicleControllerSettings } from "../../VehicleControllerSettings";
import { Utils } from "../../Utils/Utils";
import { getRayCastCollisionCharacterPosition, RayCastController } from "../CollisionHelpers/ProbeHelper";

export interface GroundSurfaceData {
    normal: vec3;
    actualPos: vec3;
    isSteep: boolean;
}

export class GroundSurfaceValidator {

    constructor(private readonly settings: ReadonlyVehicleControllerSettings,
        private readonly currentGroundRayCastController: RayCastController,
        private readonly shapeSize: vec3) {}

    isExistingGround(ground: ColliderComponent): boolean {
        const wasNotDestroyedOrDisabled = !isNull(ground)
            && ground.enabled && ground.getSceneObject().enabled
            && ground.getSceneObject().isEnabledInHierarchy;

        if (wasNotDestroyedOrDisabled) {
            const transform = ground.getTransform();
            const scale = transform.getWorldScale();
            if (Math.abs(scale.x) <= Utils.EPS
                || Math.abs(scale.y) <= Utils.EPS
                || Math.abs(scale.z) <= Utils.EPS) {
                return false;
            } else {
                return true;
            }
        } else {
            return false;
        }
    }

    isValidGroundSurface(groundInfo: GroundInfo, findSteepGround: boolean, initPos: vec3, hit: RayCastHit, characterAabb: AabbInfo, start: vec3, end: vec3,
        charPos: vec3, checkIsBelow: boolean, skipStepHeight: boolean, onReady: (isValid: boolean, surfaceData: GroundSurfaceData) => void): void {
        if (!this.isExistingGround(hit.collider)) {
            onReady(false, null);
            return;
        }
        const intersection = getRayCastCollisionCharacterPosition(start, end, hit);
        this.isAngleCorrect(findSteepGround, hit, intersection, (surfaceData) => {
            const isAngleCorrect = !!surfaceData;
            if (!isAngleCorrect) {
                onReady(false, null);
                return;
            }
            const groundY = surfaceData ? surfaceData.actualPos.y
                : intersection.y;
            const OFFSET = 1;
            const isBelow = Math.abs(groundY - charPos.y) < OFFSET || groundY <= charPos.y;
            const isStepHeightCorrect = skipStepHeight || (groundY <= initPos.y
                || (groundInfo !== null && groundInfo.isCharacterOnGround
                    && Math.abs(groundY - initPos.y) < this.settings.stepHeight));

            const isOverlap = () => {
                const aabb = AabbBuilder.buildAabb(null, hit.collider);
                return AabbOverlap.isAabbOverlap(aabb, characterAabb);
            };

            const isValid = ((checkIsBelow && isBelow) || (isStepHeightCorrect || hit.collider === groundInfo?.ground))
                && isOverlap();
            if (!isValid) {
                onReady(false, null);
                return;
            }
            const MAX_GROUND_OFFSET = 2;
            const isOnGround = charPos.y <= groundY || Math.abs(charPos.y - groundY) < MAX_GROUND_OFFSET;

            if (isOnGround) {
                if (groundInfo && groundInfo.ground === hit.collider) {
                    onReady(true, surfaceData);
                } else {
                    this.checkIfIsOutsideObject(charPos, groundY, hit.collider, (isOutside) => {
                        const isValid = !isOutside;
                        onReady(isValid, isValid ? surfaceData : null);
                    });
                }
            } else {
                onReady(false, null);
            }
        });
    }

    private checkIfIsOutsideObject(charPos: vec3, newY: number, collider: ColliderComponent,
        onReady: (isOutside: boolean) => void): void {
        this.currentGroundRayCastController.probe.filter.onlyColliders = [collider];
        const end = new vec3(charPos.x, newY, charPos.z);
        this.currentGroundRayCastController.shapeCast(charPos, end, (hit) => {
            if (hit) {
                onReady(hit.t > Utils.EPS);
            } else {
                onReady(false);
            }
        });
    }

    private isAngleCorrect(findSteepGround: boolean, hit: RayCastHit, pos: vec3,
        onReady: (data: GroundSurfaceData) => void): void {
        SurfaceNormalHelper.getSurfaceData(this.currentGroundRayCastController, hit.collider, hit.position, this.settings.groundCheckDistance, (surfaceData) => {
            if (surfaceData) {
                const angleSurface = surfaceData.normal.angleTo(vec3.up());
                surfaceData.actualPos.y += this.shapeSize.y / 2;
                const isSteep = angleSurface >= Utils.degreesToRadians(this.settings.maxGroundAngle);
                const data = { normal: surfaceData.normal, actualPos: surfaceData.actualPos, isSteep };
                if (findSteepGround) {
                    onReady(data);
                } else {
                    const result = !isSteep ? data : null;
                    onReady(result);
                }
            } else {
                const angleNormal = hit.normal.angleTo(vec3.up());
                const isSteep = angleNormal >= Utils.degreesToRadians(this.settings.maxGroundAngle);
                const data = { normal: hit.normal, actualPos: pos, isSteep };
                if (findSteepGround) {
                    onReady(data);
                } else {
                    const result = !isSteep ? data : null;
                    onReady(result);
                }
            }
        });
    }
}
