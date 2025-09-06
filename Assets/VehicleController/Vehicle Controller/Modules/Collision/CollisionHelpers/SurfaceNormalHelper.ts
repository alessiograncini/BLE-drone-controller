import { RayCastController } from "./ProbeHelper";

export interface SurfaceData {
    normal: vec3;
    actualPos: vec3;
}

/**
 * SurfaceNormalHelper helps to find normal of surface, because normal returned by shape
 * cast may be incorrect in case character's controller intersects surface not in its bottom point
 */
export class SurfaceNormalHelper {

    static getSurfaceData(rayCastController: RayCastController, collider: ColliderComponent, position: vec3,
        checkDistance: number, onReady: (data: SurfaceData) => void): void {
        rayCastController.probe.filter.onlyColliders = [collider];
        const start = position.add(new vec3(0, checkDistance, 0));
        const end = position.add(new vec3(0, -checkDistance, 0));
        rayCastController.rayCast(start, end, (hit) => {
            if (hit) {
                onReady({ normal: hit.normal, actualPos: hit.position });
            } else {
                onReady(null);
            }
        });
    }
}
