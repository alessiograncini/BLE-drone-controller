import { VehicleController } from "../../Vehicle Controller";

/**
 * CallbacksWrapper wraps callbacks so that they are not executed in case component
 * was disabled or destroyed.
 */
export class CallbacksWrapper {

    private readonly rootSO: SceneObject;

    constructor(private readonly component: VehicleController) {
        this.rootSO = this.component.getSceneObject();
    }

    wrap(cb: (...args: any[]) => any): (...args: any[]) => any {
        return (...args: any[]) => {
            if (!this.isDestroyedOrDisabled()) {
                return cb(...args);
            }
        };
    }

    private isDestroyedOrDisabled(): boolean {
        return isNull(this.component) || isNull(this.rootSO)
            || !this.component.enabled || !this.rootSO.enabled || !this.rootSO.isEnabledInHierarchy;
    }
}
