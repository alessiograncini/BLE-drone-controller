import { ReadonlyVehicleControllerSettings } from "./VehicleControllerSettings";

export class LockAxisController {

    settings: ReadonlyVehicleControllerSettings;

    constructor(settings: ReadonlyVehicleControllerSettings) {
        this.settings = settings;
    }

    get lockXAxis(): boolean {
        return this.settings.lockXAxis;
    }

    get lockYAxis(): boolean {
        return this.settings.lockYAxis;
    }

    get lockZAxis(): boolean {
        return this.settings.lockZAxis;
    }

    getAvailableHorizontalDirections(): vec3[] {
        const directions: vec3[] = [];
        if (!this.settings.lockXAxis) {
            directions.push(vec3.right(), vec3.left());
        }
        if (!this.settings.lockZAxis) {
            directions.push(vec3.forward(), vec3.back());
        }
        if (this.settings.lockXAxis && this.settings.lockZAxis && !this.settings.lockYAxis) {
            directions.push(vec3.up(), vec3.down());
        }
        return directions;
    }

    updateDirection(direction: vec3): vec3 {
        if (this.settings.lockXAxis) {
            direction.x = 0;
        }
        if (this.settings.lockYAxis) {
            direction.y = 0;
        }
        if (this.settings.lockZAxis) {
            direction.z = 0;
        }
        return direction;
    }
}
