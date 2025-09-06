import { getShapeType, ShapeType } from "./ShapeHelper";
import { AabbInfo } from "./AabbInfo";

/**
 * Collects aabb data of physic collider.
 */
export class AabbBuilder {

    static buildAabb(position: vec3, collider: ColliderComponent, offset: number = 0): AabbInfo {
        const shapeType = getShapeType(collider);
        const transform = collider.getSceneObject()
            .getTransform();
        const initialPosition = transform.getWorldPosition();
        if (position) {
            transform.setWorldPosition(position);
        }
        const points = this.getShapePoints(shapeType, collider, transform);
        if (points) {
            const aabbMin = new vec3(points.map((point) => point.x)
                .reduce((a, b) => Math.min(a, b)),
            points.map((point) => point.y)
                .reduce((a, b) => Math.min(a, b)),
            points.map((point) => point.z)
                .reduce((a, b) => Math.min(a, b)));
            const aabbMax = new vec3(points.map((point) => point.x)
                .reduce((a, b) => Math.max(a, b)),
            points.map((point) => point.y)
                .reduce((a, b) => Math.max(a, b)),
            points.map((point) => point.z)
                .reduce((a, b) => Math.max(a, b)));
            const width = aabbMax.x - aabbMin.x;
            const height = aabbMax.y - aabbMin.y;
            const depth = aabbMax.z - aabbMin.z;
            aabbMin.x += width * offset;
            aabbMin.y += height * offset;
            aabbMin.z += depth * offset;
            aabbMax.x -= width * offset;
            aabbMax.y -= height * offset;
            aabbMax.z -= depth * offset;
            transform.setWorldPosition(initialPosition);
            return new AabbInfo(collider, aabbMin, aabbMax, shapeType, transform, position);
        } else {
            transform.setWorldPosition(initialPosition);
            return null;
        }
    }

    private static getShapePoints(shapeType: ShapeType, collider: ColliderComponent, transform: Transform): vec3[] {
        const worldTransform = transform.getWorldTransform();
        const localAabb = this.getLocalAabb(shapeType, collider);
        if (localAabb) {
            return [
                worldTransform.multiplyPoint(new vec3(localAabb.aabbMin.x, localAabb.aabbMin.y, localAabb.aabbMin.z)),
                worldTransform.multiplyPoint(new vec3(localAabb.aabbMin.x, localAabb.aabbMin.y, localAabb.aabbMax.z)),
                worldTransform.multiplyPoint(new vec3(localAabb.aabbMin.x, localAabb.aabbMax.y, localAabb.aabbMin.z)),
                worldTransform.multiplyPoint(new vec3(localAabb.aabbMin.x, localAabb.aabbMax.y, localAabb.aabbMax.z)),
                worldTransform.multiplyPoint(new vec3(localAabb.aabbMax.x, localAabb.aabbMin.y, localAabb.aabbMin.z)),
                worldTransform.multiplyPoint(new vec3(localAabb.aabbMax.x, localAabb.aabbMin.y, localAabb.aabbMax.z)),
                worldTransform.multiplyPoint(new vec3(localAabb.aabbMax.x, localAabb.aabbMax.y, localAabb.aabbMin.z)),
                worldTransform.multiplyPoint(new vec3(localAabb.aabbMax.x, localAabb.aabbMax.y, localAabb.aabbMax.z)),
            ];
        } else {
            return null;
        }
    }

    static getLocalAabb(shapeType: ShapeType, collider: ColliderComponent): { aabbMin: vec3, aabbMax: vec3 } {
        if (collider.fitVisual) {
            const mesh = collider.getSceneObject()
                .getComponent("RenderMeshVisual");
            if (mesh) {
                const meshAabbMin = mesh.localAabbMin();
                const meshAabbMax = mesh.localAabbMax();
                return { aabbMin: meshAabbMin, aabbMax: meshAabbMax };
            }
        }
        const shape = collider.shape;
        switch (shapeType) {
            case ShapeType.Box:
                const boxShape = shape as BoxShape;
                const boxSize = boxShape.size;
                return { aabbMin: boxSize.uniformScale(-0.5), aabbMax: boxSize.uniformScale(0.5) };
            case ShapeType.Sphere:
                const sphereShape = shape as SphereShape;
                const sphereDiameter = sphereShape.radius * 2;
                const sphereSize = new vec3(sphereDiameter, sphereDiameter, sphereDiameter);
                return { aabbMin: sphereSize.uniformScale(-0.5), aabbMax: sphereSize.uniformScale(0.5) };
            case ShapeType.Capsule:
                const capsuleShape = shape as CapsuleShape;
                const capsuleDiameter = capsuleShape.radius * 2;
                const capsuleAxisLength = capsuleShape.radius * 2 + capsuleShape.length;
                const capsuleSize = new vec3(capsuleShape.axis === Axis.X ? capsuleAxisLength : capsuleDiameter,
                    capsuleShape.axis === Axis.Y ? capsuleAxisLength : capsuleDiameter,
                    capsuleShape.axis === Axis.Z ? capsuleAxisLength : capsuleDiameter);
                return { aabbMin: capsuleSize.uniformScale(-0.5), aabbMax: capsuleSize.uniformScale(0.5) };
            case ShapeType.Cylinder:
            case ShapeType.Cone:
                const cylinderConeShape = shape as CylinderShape;
                const cylinderConeDiameter = cylinderConeShape.radius * 2;
                const cylinderConeAxisLength = cylinderConeShape.length;
                const cylinderConeSize = new vec3(cylinderConeShape.axis === Axis.X ? cylinderConeAxisLength : cylinderConeDiameter,
                    cylinderConeShape.axis === Axis.Y ? cylinderConeAxisLength : cylinderConeDiameter,
                    cylinderConeShape.axis === Axis.Z ? cylinderConeAxisLength : cylinderConeDiameter);
                return { aabbMin: cylinderConeSize.uniformScale(-0.5), aabbMax: cylinderConeSize.uniformScale(0.5) };
            case ShapeType.Mesh:
                const meshShape = shape as MeshShape;
                const mesh = meshShape.mesh;
                if (!mesh) {
                    return null;
                }
                return { aabbMin: mesh.aabbMin, aabbMax: mesh.aabbMax };
            default:
                return null;
        }
    }
}
