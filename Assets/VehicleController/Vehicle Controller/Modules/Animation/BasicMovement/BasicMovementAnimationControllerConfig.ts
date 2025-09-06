export interface AnimationClipConfig {
    readonly animationAsset: AnimationAsset;
    readonly playbackSpeed: number;
}

export interface MoveAnimationConfig {
    readonly minCharacterSpeed: number;
    readonly animationAsset: AnimationAsset;
    readonly playbackSpeed: number;
}

export interface BasicMovementAnimationControllerConfig {
    readonly idleAnimation: AnimationClipConfig;
    readonly moveAnimationConfigs: MoveAnimationConfig[];
}

@component
export class _Void extends BaseScriptComponent {}
