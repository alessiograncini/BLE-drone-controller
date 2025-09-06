export interface GroundInfo {
    ground: ColliderComponent;
    isCharacterOnGround: boolean;
    groundY: number;
    localPositionOnGround: vec3;
    groundSurfaceNormal: vec3;
    isZeroGround: boolean;
    isSteepGround: boolean;
}
