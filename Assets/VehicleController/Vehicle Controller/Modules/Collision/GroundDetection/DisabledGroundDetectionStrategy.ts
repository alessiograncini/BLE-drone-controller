import { GroundInfo } from "./GroundInfo";
import { IGroundDetectionStrategy, GroundSearchSettings } from "./GroundDetection";

/**
 * GroundDetectionLockYAxis mocks GroundDetection in case y axis is locked to disable
 * ground detection.
 */
export class DisabledGroundDetectionStrategy implements IGroundDetectionStrategy {

    private characterPosition: vec3;

    reset(): void {
        this.characterPosition = null;
    }

    initialize(pos: vec3, onReady: (pos: vec3) => void): void {
        onReady(null);
    }

    getGroundCollider(): ColliderComponent {
        return null;
    }

    getSteepGroundCollider(): ColliderComponent {
        return null;
    }

    getGroundNormal(): vec3 {
        return vec3.up();
    }

    checkGroundExists(): boolean {
        return true;
    }

    setCharacterPosition(pos: vec3): void {
        this.characterPosition = pos;
    }

    getNewWorldPositionOnGround(): vec3 {
        return null;
    }

    isOnSteepGround(): boolean {
        return false;
    }

    getSteepGroundNormal(): vec3 {
        return vec3.up();
    }

    updateDirectionOnGround(direction: vec3): vec3 {
        return direction.mult(new vec3(1, 0, 1));
    }

    findGround(settings: GroundSearchSettings, onReady: (groundInfo: GroundInfo, nextGroundY: number) => void): void {
        onReady(null, null);
    }

    findGroundAndApply(settings: GroundSearchSettings, onReady: () => void): void {
        onReady();
    }

    applyGround(groundInfo: GroundInfo): void {

    }

    getIsCharacterOnGround(): boolean {
        return true;
    }

    getGroundY(): number {
        return this.characterPosition ? this.characterPosition.y : null;
    }

    getMinCharacterY(): number {
        return this.characterPosition ? this.characterPosition.y : null;
    }
}
