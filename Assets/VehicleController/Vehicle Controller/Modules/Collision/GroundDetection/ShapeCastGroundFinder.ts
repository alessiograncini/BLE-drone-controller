import { AabbBuilder } from "../CollisionHelpers/AabbBuilder";
import { AabbInfo } from "../CollisionHelpers/AabbInfo";
import { GroundInfo } from "./GroundInfo";
import { getRayCastCollisionCharacterPosition, RayCastController } from "../CollisionHelpers/ProbeHelper";
import { GroundSurfaceValidator } from "./GroundSurfaceValidator";
import { ReadonlyVehicleControllerSettings } from "../../VehicleControllerSettings";
import { GroundSearchSettings } from "./GroundDetection";
import { Utils } from "../../Utils/Utils";

const ZERO_GROUND_Y = 0;

interface GroundFinderCache {
    initialGround?: GroundInfo;
    characterPosition?: vec3;
    rayStart?: vec3;
    rayEnd?: vec3;
    hits?: RayCastHit[];
    characterAabb?: AabbInfo;
    isOnZeroGround?: boolean;
}

export class ShapeCastGroundFinder {

    private readonly zeroGroundYForShape: number;

    constructor(private readonly settings: ReadonlyVehicleControllerSettings,
        private readonly characterCollider: ColliderComponent,
        private readonly rayCastController: RayCastController,
        private readonly groundSurfaceValidator: GroundSurfaceValidator) {
        this.zeroGroundYForShape = ZERO_GROUND_Y + this.settings.colliderHeight / 2 + this.settings.colliderRadius;
    }

    findGround(currentGroundInfo: GroundInfo, settings: GroundSearchSettings,
        onReady: (groundInfo: GroundInfo, nextGroundY: number) => void): void {
        const searchForNextGroundY = settings.searchForNextGroundY;
        this.rayCastController.probe.filter.onlyColliders = settings.onlyColliders || [];

        const cache: GroundFinderCache = {};
        cache.initialGround = currentGroundInfo;
        cache.characterPosition = Utils.copyVec3(settings.nextPosition);
        cache.isOnZeroGround = this.isOnZeroGround(settings.nextPosition);
        cache.characterAabb = AabbBuilder.buildAabb(settings.nextPosition, this.characterCollider);
        const OFFSET = 1;
        cache.characterAabb.aabbMin.y -= OFFSET;

        this.rayCastAllColliders(cache, settings, (hits) => {
            cache.hits = hits;
            settings.searchForNextGroundY = false;
            this.checkGroundHitsRecursively(cache, settings, (groundInfo) => {
                if (groundInfo) {
                    onReady(groundInfo, null);
                } else {
                    if (cache.isOnZeroGround) {
                        onReady(this.createZeroGroundInfo(), null);
                    } else {
                        settings.searchForNextGroundY = searchForNextGroundY;
                        this.tryToFindNextGroundY(cache, settings, (y) => onReady(null, y));
                    }
                }
            });
        });
    }

    private tryToFindNextGroundY(cache: GroundFinderCache, settings: GroundSearchSettings, onReady: (y: number) => void): void {
        if (!settings.searchForNextGroundY) {
            onReady(null);
            return;
        }
        this.checkGroundHitsRecursively(cache, settings, (_, nextGroundY) => {
            if (this.settings.groundIsZero && (isNull(nextGroundY) || nextGroundY < this.zeroGroundYForShape)) {
                onReady(this.zeroGroundYForShape);
            } else {
                onReady(nextGroundY);
            }
        });
    }

    private rayCastAllColliders(cache: GroundFinderCache, settings: GroundSearchSettings, onReady: (hits: RayCastHit[]) => void): void {
        cache.rayStart = Utils.copyVec3(settings.nextPosition);
        cache.rayEnd = cache.rayStart.add(vec3.down()
            .uniformScale(this.settings.groundCheckDistance));
        cache.rayStart.y += Math.abs(this.settings.groundCheckDistance);
        this.rayCastController.shapeCastAll(cache.rayStart, cache.rayEnd, onReady);
    }

    private checkGroundHitsRecursively(cache: GroundFinderCache, settings: GroundSearchSettings,
        onReady: (ground: GroundInfo, nextGroundY: number) => void, hitIndex: number = 0): void {
        if (hitIndex >= cache.hits.length) {
            onReady(null, null);
            return;
        }
        this.checkGroundHit(settings, cache, cache.hits[hitIndex], (groundInfo, nextGroundY) => {
            if (groundInfo) {
                onReady(groundInfo, nextGroundY);
            } else {
                this.checkGroundHitsRecursively(cache, settings, onReady, hitIndex + 1);
            }
        });
    }

    private checkGroundHit(settings: GroundSearchSettings, cache: GroundFinderCache,
        hit: RayCastHit, onComplete: (groundInfo: GroundInfo, nextGroundY: number) => void): void {
        const groundY = cache.rayStart.y + (cache.rayEnd.y - cache.rayStart.y) * hit.t;
        if (groundY < this.zeroGroundYForShape && cache.isOnZeroGround) {
            onComplete(this.createZeroGroundInfo(), null);
            return;
        }
        this.groundSurfaceValidator.isValidGroundSurface(cache.initialGround,
            settings.findSteepGround,
            settings.initialPosition,
            hit,
            cache.characterAabb,
            cache.rayStart,
            cache.rayEnd,
            cache.characterPosition,
            settings.searchForNextGroundY,
            settings.skipStepHeight,
            (wasFound, angleCheckData) => {
                if (wasFound) {
                    if (settings.searchForNextGroundY) {
                        const nextGroundY = angleCheckData ? angleCheckData.actualPos.y : getRayCastCollisionCharacterPosition(cache.rayStart, cache.rayEnd, hit).y;
                        onComplete(null, nextGroundY);
                    } else {
                        const groundFound = !angleCheckData.isSteep
                            || (settings.findSteepGround && !Utils.isColliderDynamic(hit.collider));
                        if (groundFound) {
                            const groundInfo: GroundInfo = {
                                ground: hit.collider,
                                groundY,
                                isCharacterOnGround: true,
                                localPositionOnGround: null,
                                groundSurfaceNormal: angleCheckData.normal,
                                isZeroGround: false,
                                isSteepGround: angleCheckData.isSteep,
                            };
                            onComplete(groundInfo, null);
                        } else {
                            onComplete(null, null);
                        }
                    }
                } else {
                    onComplete(null, null);
                }
            });
    }

    private isOnZeroGround(start: vec3): boolean {
        const OFFSET = 1;
        return this.settings.groundIsZero && start.y <= this.zeroGroundYForShape + OFFSET;
    }

    private createZeroGroundInfo(): GroundInfo {
        return {
            ground: null,
            groundY: this.zeroGroundYForShape,
            isCharacterOnGround: true,
            localPositionOnGround: null,
            groundSurfaceNormal: vec3.up(),
            isZeroGround: true,
            isSteepGround: false,
        };
    }
}
