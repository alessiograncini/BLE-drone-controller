import { AabbInfo } from "../CollisionHelpers/AabbInfo";
import { getRayCastCollisionCharacterPosition, RayCastController } from "../CollisionHelpers/ProbeHelper";
import { DirectionsForFixingOverlapProvider } from "./DirectionsForFixingOverlapProvider";
import { GroundDetection } from "../GroundDetection/GroundDetection";
import { LockAxisController } from "../../LockAxisController";
import { AabbOverlap } from "../CollisionHelpers/AabbOverlap";
import { Utils } from "../../Utils/Utils";

export class OverlapFixer {

    constructor(private readonly rayCastController: RayCastController,
        private readonly groundDetection: GroundDetection,
        private readonly lockAxisController: LockAxisController) {}

    fixOverlapWithAabbRecursively(initialPosition: vec3, position: vec3, characterAabb: AabbInfo, aabb: AabbInfo[],
        allPositions: vec3[], onComplete: (position: vec3) => void, aabbIndex: number = 0): void {
        if (aabbIndex >= aabb.length) {
            onComplete(position);
            return;
        }
        this.fixOverlapWithAabb(initialPosition, position, characterAabb, aabb[aabbIndex], (position) => {
            this.fixOverlapWithAabbRecursively(initialPosition, position, characterAabb, aabb, allPositions, onComplete, aabbIndex + 1);
        });
    }

    fixOverlapInDefaultDirections(initialPosition: vec3, position: vec3, characterAabb: AabbInfo, aabb: AabbInfo[],
        onComplete: (position: vec3) => void): void {
        const directions = this.getDefaultDirections();
        this.checkDirectionsRecursively(position, directions, characterAabb, aabb, (newPositions) => {
            let resultPosition = initialPosition;
            if (newPositions.length > 0 && !newPositions.some((pos) => !pos)) {
                let newPositionsFiltered = newPositions.filter((pos) => !!pos);
                if (newPositionsFiltered.length > 0) {
                    let minNumOverlaps = aabb.length + 1;
                    let positions: vec3[] = [];
                    newPositionsFiltered.forEach((pos) => {
                        const charAabbInPosition = characterAabb.setPosition(pos);
                        const overlapped = aabb.filter((aabb) => AabbOverlap.isAabbOverlap(aabb, charAabbInPosition));
                        if (overlapped.length === minNumOverlaps) {
                            positions.push(pos);
                        } else if (overlapped.length < minNumOverlaps) {
                            minNumOverlaps = overlapped.length;
                            positions = [pos];
                        }
                    });
                    newPositionsFiltered = positions;

                    const closestPos = newPositionsFiltered
                        .reduce((a, b) => a.distance(initialPosition) < b.distance(initialPosition) ? a : b);
                    resultPosition = closestPos;
                } else {
                    resultPosition = initialPosition;
                }
            }
            onComplete(resultPosition);
        });
    }

    private fixOverlapWithAabb(initialPosition: vec3, position: vec3, characterAabb: AabbInfo, aabb: AabbInfo, onComplete: (position: vec3) => void): void {
        this.groundDetection.findGround({
            searchForNextGroundY: false,
            findSteepGround: false,
            skipStepHeight: false,
            onlyColliders: [aabb.collider],
            initialPosition,
            nextPosition: position,
        }, (groundInfo) => {
            if (groundInfo && groundInfo.isCharacterOnGround && groundInfo.ground === aabb.collider) {
                const newPos = new vec3(position.x, this.groundDetection.getGroundY(), position.z);
                this.groundDetection.applyGround(groundInfo);
                onComplete(newPos);
            } else {
                const directions = this.getDirections(position, aabb);
                const initPos = Utils.copyVec3(position);
                this.checkDirectionsRecursively(position, directions, characterAabb, [aabb], (newPositions) => {
                    let resultPosition = initPos;
                    if (newPositions.length > 0 && !newPositions.some((pos) => !pos)) {
                        const newPositionsFiltered = newPositions.filter((pos) => !!pos);
                        if (newPositionsFiltered.length > 0) {
                            const closestPos = newPositionsFiltered
                                .reduce((a, b) => a.distance(initPos) < b.distance(initPos) ? a : b);
                            resultPosition = closestPos;
                        } else {
                            resultPosition = initPos;
                        }

                    }
                    onComplete(resultPosition);
                });
            }
        });
    }

    private checkDirectionsRecursively(position: vec3, directions: vec3[], characterAabb: AabbInfo, aabb: AabbInfo[],
        onComplete: (newPositions: vec3[]) => void, directionIndex: number = 0, newPositions: vec3[] = []): void {
        if (directionIndex >= directions.length) {
            onComplete(newPositions);
            return;
        }
        this.checkDirection(position, directions[directionIndex], characterAabb, aabb, (newPosition) => {
            newPositions.push(newPosition);
            this.checkDirectionsRecursively(position, directions, characterAabb, aabb, onComplete, directionIndex + 1, newPositions);
        });
    }

    private checkDirection(position: vec3, direction: vec3, characterAabb: AabbInfo, aabb: AabbInfo[],
        onComplete: (newPosition: vec3) => void): void {
        this.shapeCastInDirection(position, direction, characterAabb, aabb, (newPos, hit) => {
            if (newPos && hit) {
                const actualDirection = newPos.sub(position);
                if (actualDirection.length > Utils.EPS) {
                    const crossProduct = actualDirection.cross(direction);
                    if (crossProduct.length <= Utils.EPS) {
                        const isSameDirectionInAxis = (a: number, b: number) => (Math.abs(a) <= Utils.EPS && Math.abs(b) <= Utils.EPS)
                            || ((a < 0) === (b < 0));
                        const isSameDirection = isSameDirectionInAxis(actualDirection.x, direction.x)
                            && isSameDirectionInAxis(actualDirection.y, direction.y)
                            && isSameDirectionInAxis(actualDirection.z, direction.z);
                        if (!isSameDirection) {
                            // skip, because it will move character closer to object, there is no overlap
                            onComplete(null);
                        } else {
                            onComplete(newPos);
                        }
                    } else {
                        onComplete(newPos);
                    }
                } else {
                    onComplete(newPos);
                }
            } else {
                onComplete(newPos);
            }
        });
    }

    private shapeCastInDirection(position: vec3, direction: vec3, characterAabb: AabbInfo, aabb: AabbInfo[],
        onReady: (newPos: vec3, hit: RayCastHit) => void): void {
        const SIZE_OFFSET = 1;
        const totalRaySize = aabb.map((aabb) => aabb.size)
            .reduce((a, b) => a + b)
            + characterAabb.size + SIZE_OFFSET;
        const END_OFFSET = 1;
        const end = position.add(direction.uniformScale(-1 * END_OFFSET));
        const start = end.add(direction.uniformScale(totalRaySize));
        this.rayCastController.probe.filter.onlyColliders = aabb.map((aabb) => aabb.collider);
        this.rayCastController.shapeCast(start, end, (hit) => {
            if (hit) {
                onReady(getRayCastCollisionCharacterPosition(start, end, hit), hit);
            } else {
                onReady(null, null);
            }
        });
    }

    private getDirections(characterPosition: vec3, aabb: AabbInfo): vec3[] {
        const normal = this.groundDetection.getGroundNormal();
        let directions = DirectionsForFixingOverlapProvider.getDirections(characterPosition, aabb)
            .map((dir) => {
                if (this.groundDetection.getIsCharacterOnGround() && normal) {
                    return dir.projectOnPlane(normal);
                } else {
                    return dir;
                }
            })
            .map((dir) => this.lockAxisController.updateDirection(dir));
        let isZeroDirection = false;
        for (let i = 0; i < directions.length; i++) {
            if (directions[i].length < Utils.EPS) {
                isZeroDirection = true;
                break;
            }
        }
        if (isZeroDirection) {
            const defaultDirections = this.lockAxisController.getAvailableHorizontalDirections()
                .map((dir) => {
                    if (normal) {
                        return dir.projectOnPlane(normal);
                    } else {
                        return dir;
                    }
                })
                .map((dir) => this.lockAxisController.updateDirection(dir));
            directions.push(...defaultDirections);
        }
        directions = directions
            .filter((dir) => dir.length > Utils.EPS)
            .map((dir) => dir.normalize());
        return directions;
    }

    private getDefaultDirections(): vec3[] {
        const normal = this.groundDetection.getGroundNormal();
        const directions = this.lockAxisController.getAvailableHorizontalDirections()
            .map((dir) => {
                if (this.groundDetection.getIsCharacterOnGround() && normal) {
                    return dir.projectOnPlane(normal);
                } else {
                    return dir;
                }
            })
            .map((dir) => this.lockAxisController.updateDirection(dir))
            .filter((dir) => dir.length > Utils.EPS)
            .map((dir) => dir.normalize());
        return directions;
    }
}
