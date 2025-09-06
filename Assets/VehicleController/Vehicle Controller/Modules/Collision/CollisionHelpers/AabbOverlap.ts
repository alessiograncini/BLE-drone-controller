import { AabbInfo } from "./AabbInfo";
import { Utils } from "../../Utils/Utils";

/**
 * Checks if two aabb overlap.
 */
export class AabbOverlap {

    static isAabbOverlap(aabb1: AabbInfo, aabb2: AabbInfo): boolean {
        const checkAxis = (axis: string, aabb1: AabbInfo, aabb2: AabbInfo) => {
            return this.isPointInsideSegment(aabb1.aabbMin[axis], aabb1.aabbMax[axis], aabb2.aabbMin[axis], true, false)
                || this.isPointInsideSegment(aabb1.aabbMin[axis], aabb1.aabbMax[axis], aabb2.aabbMax[axis], false, true)
                || this.isPointInsideSegment(aabb2.aabbMin[axis], aabb2.aabbMax[axis], aabb1.aabbMin[axis], true, false)
                || this.isPointInsideSegment(aabb2.aabbMin[axis], aabb2.aabbMax[axis], aabb1.aabbMax[axis], false, true);
        };
        return aabb1 && aabb2 && aabb1.aabbMin && aabb2.aabbMin && aabb1.aabbMax && aabb2.aabbMax
            && checkAxis("x", aabb1, aabb2) && checkAxis("y", aabb1, aabb2) && checkAxis("z", aabb1, aabb2);
    }

    private static isPointInsideSegment(segmentMin: number, segmentMax: number, point: number,
        includeMin: boolean, includeMax: boolean): boolean {
        return segmentMin < point && point < segmentMax
            || (includeMin && Math.abs(segmentMin - point) < Utils.EPS)
            || (includeMax && Math.abs(segmentMax - point) < Utils.EPS);
    }
}
