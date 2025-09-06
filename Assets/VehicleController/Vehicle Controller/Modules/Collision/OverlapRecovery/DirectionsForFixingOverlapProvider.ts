import { getAxis, getAxisDirection, ShapeType } from "../CollisionHelpers/ShapeHelper";
import { AabbInfo } from "../CollisionHelpers/AabbInfo";
import { Utils } from "../../Utils/Utils";

export class DirectionsForFixingOverlapProvider {

    private static boxLocalDirections: vec3[] = [vec3.left(), vec3.right(), vec3.forward(), vec3.back(),
        vec3.up(), vec3.down()];

    static getDirections(characterPosition: vec3, aabb: AabbInfo): vec3[] {
        const worldTransform = aabb.transform.getWorldTransform();
        const invertedTransform = aabb.transform.getInvertedWorldTransform();
        const localCharacterPosition = invertedTransform.multiplyPoint(characterPosition);
        const localDirections = this.getLocalDirectionsForShape(localCharacterPosition, aabb.collider, aabb.shapeType);
        return localDirections.map((direction) => worldTransform.multiplyDirection(direction));
    }

    private static getLocalDirectionsForShape(localCharacterPosition: vec3,
        collider: ColliderComponent, colliderShape: ShapeType): vec3[] {
        switch (colliderShape) {
            case ShapeType.Sphere:
                return this.getSphereLocalDirections(localCharacterPosition);
            case ShapeType.Box:
                return this.getBoxLocalDirections();
            case ShapeType.Cylinder:
            case ShapeType.Cone:
                return this.getCylinderAndConeLocalDirections(localCharacterPosition, collider);
            case ShapeType.Capsule:
                return this.getCapsuleDirections(localCharacterPosition, collider);
            case ShapeType.Mesh:
                return this.getMeshDirections(localCharacterPosition, collider);
            default:
                return [];
        }
    }

    private static getSphereLocalDirections(pos: vec3): vec3[] {
        return [
            pos, // sphere center is in 0,0,0
        ];
    }

    private static getBoxLocalDirections(): vec3[] {
        return this.boxLocalDirections;
    }

    private static getCylinderAndConeLocalDirections(pos: vec3, collider: ColliderComponent): vec3[] {
        const shape = collider.shape as CylinderShape | ConeShape;

        const pushToSideDirection = Utils.copyVec3(pos);
        const axis = getAxis(shape.axis);
        pushToSideDirection[axis] = 0;

        const pushAlongAxisPositiveDirection = getAxisDirection(shape.axis);
        const pushAlongAxisNegativeDirection = getAxisDirection(shape.axis)
            .uniformScale(-1);

        const pushAlongTangent1 = pushToSideDirection.cross(pushAlongAxisPositiveDirection);
        const pushAlongTangent2 = pushAlongTangent1.uniformScale(-1);

        return [pushToSideDirection, pushAlongAxisPositiveDirection, pushAlongAxisNegativeDirection,
            pushAlongTangent1, pushAlongTangent2];
    }

    private static getCapsuleDirections(pos: vec3, collider: ColliderComponent): vec3[] {
        const shape = collider.shape as CapsuleShape;
        const length = shape.length;
        const axis = getAxis(shape.axis);

        const direction1 = Utils.copyVec3(pos);
        direction1[axis] -= -length / 2;

        const direction2 = Utils.copyVec3(pos);
        direction2[axis] -= length / 2;

        const direction3 = Utils.copyVec3(pos);
        direction3[axis] = 0;

        return [direction1, direction2, direction3];
    }

    private static getMeshDirections(localPosition: vec3, collider: ColliderComponent): vec3[] {
        const shape = collider.shape as MeshShape;
        if (shape.mesh) {
            const aabbMin = shape.mesh.aabbMin;
            const aabbMax = shape.mesh.aabbMax;
            const center = aabbMax.add(aabbMin)
                .uniformScale(0.5);
            const direction = localPosition.sub(center);
            direction.y = 0;
            return [direction];
        } else {
            return [];
        }
    }
}
