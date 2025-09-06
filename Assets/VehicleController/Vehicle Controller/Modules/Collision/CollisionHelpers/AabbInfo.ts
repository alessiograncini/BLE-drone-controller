import { ShapeType } from "./ShapeHelper";

/**
 * Aabb data of physic collider.
 */
export class AabbInfo {

    readonly collider: ColliderComponent;

    readonly aabbMin: vec3;

    readonly aabbMax: vec3;

    readonly shapeType: ShapeType;

    readonly transform: Transform;

    private _size: number = null;

    private readonly _position: vec3;

    constructor(collider: ColliderComponent, aabbMin: vec3, aabbMax: vec3,
        shapeType: ShapeType, transform: Transform, position: vec3) {
        this.collider = collider;
        this.aabbMin = aabbMin;
        this.aabbMax = aabbMax;
        this.shapeType = shapeType;
        this.transform = transform;
        this._position = position;
    }

    get position(): vec3 {
        return this._position;
    }

    setPosition(pos: vec3): AabbInfo {
        const offset = pos.sub(this._position);
        const aabbMin = this.aabbMin.add(offset);
        const aabbMax = this.aabbMax.add(offset);
        return new AabbInfo(this.collider, aabbMin, aabbMax, this.shapeType, this.transform, pos);
    }

    get size(): number {
        if (isNull(this._size)) {
            this._size = this.aabbMax.sub(this.aabbMin).length;
        }
        return this._size;
    }
}
