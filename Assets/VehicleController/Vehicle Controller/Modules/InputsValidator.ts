import { VehicleController } from "../Vehicle Controller";
import { VehicleControllerLogger } from "./Utils/VehicleControllerLogger";

const MIN_VALUE_POSITIVE_NUMBER = 1e-4;

/**
 * InputsValidator has methods to validate component inputs and API arguments,
 * prints messages in case there is a problem.
 */
export class InputsValidator {

    constructor(private readonly logger: VehicleControllerLogger) {}

    validateSceneObjectInScreenHierarchy(so: SceneObject): boolean {
        return so.getComponent("ScreenTransform")
            && so.getComponent("ScreenTransform")
                .isInScreenHierarchy();
    }

    validateNonNull<T>(name: string, value: T, defaultValue: T = null): T {
        if (isNull(value)) {
            this.logger.printWarning(name + " should be set");
            return defaultValue;
        }
        return value;
    }

    validateNonNegativeNumber(name: string, value: number): number {
        if (isNull(value)) {
            this.logger.printWarning(name + " can not be null or undefined");
            return 0;
        }
        if (value < 0) {
            this.logger.printWarning(name + " can not be less than 0");
        }
        return Math.abs(value);
    }

    validateNonPositiveNumber(name: string, value: number): number {
        if (isNull(value)) {
            this.logger.printWarning(name + " can not be null or undefined");
            return 0;
        }
        if (value > 0) {
            this.logger.printWarning(name + " can not be bigger than 0");
        }
        return -Math.abs(value);
    }

    validatePositiveNumber(name: string, value: number): number {
        value = this.validateNonNegativeNumber(name, value);
        if (Math.abs(value) <= MIN_VALUE_POSITIVE_NUMBER) {
            this.logger.printWarning(name + " can not be equal to 0");
            return MIN_VALUE_POSITIVE_NUMBER;
        }
        return value;
    }

    validateBoolean(value: boolean): boolean {
        return !!value;
    }

    validateAirControl(value: number): number {
        value = this.validateNonNegativeNumber("Air Control", value);
        return Math.min(1, Math.max(0, value));
    }
}
