export enum ShapeType {
    Sphere = "Sphere",
    Box = "Box",
    Cone = "Cone",
    Capsule = "Capsule",
    Cylinder = "Cylinder",
    Mesh = "Mesh",
    Unsupported = "Unsupported",
}

export function getShapeType(collider: ColliderComponent): ShapeType {
    const shapeData = "" + collider.shape.getTypeName();
    if (shapeData.indexOf("Sphere") >= 0) {
        return ShapeType.Sphere;
    } else if (shapeData.indexOf("Box") >= 0) {
        return ShapeType.Box;
    } else if (shapeData.indexOf("Cone") >= 0) {
        return ShapeType.Cone;
    } else if (shapeData.indexOf("Capsule") >= 0) {
        return ShapeType.Capsule;
    } else if (shapeData.indexOf("Cylinder") >= 0) {
        return ShapeType.Cylinder;
    } else if (shapeData.indexOf("Mesh") >= 0) {
        return ShapeType.Mesh;
    } else {
        return ShapeType.Unsupported;
    }
}

export function getAxis(axis: Axis): string {
    switch (axis) {
        case Axis.X:
            return "x";
        case Axis.Y:
            return "y";
        case Axis.Z:
            return "z";
    }
}

export function getAxisDirection(axis: Axis): vec3 {
    switch (axis) {
        case Axis.X:
            return vec3.right();
        case Axis.Y:
            return vec3.up();
        case Axis.Z:
            return vec3.forward();
    }
}
