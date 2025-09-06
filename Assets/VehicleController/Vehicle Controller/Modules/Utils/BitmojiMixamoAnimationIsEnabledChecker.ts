import { VehicleController } from "../../Vehicle Controller";
import { VehicleControllerLogger } from "./VehicleControllerLogger";

interface IBitmoji3D extends ScriptComponent {
    mixamoAnimation: boolean;
}

const NUM_FRAMES_TO_SKIP_BEFORE_CHECKING_BITMOJI = 5;

/**
 * Class skips several frames and checks that Bitmoji 3D component (if it is present) on the same
 * SceneObject has Adapt to Mixamo so that Vehicle controller animations work correctly.
 */
export class BitmojiMixamoAnimationIsEnabledChecker {

    private skipFrames: number = NUM_FRAMES_TO_SKIP_BEFORE_CHECKING_BITMOJI;

    checkIsMixamoEnabled(so: SceneObject, logger: VehicleControllerLogger, onComplete: () => void): void {
        this.skipFrames--;
        if (this.skipFrames <= 0) {
            onComplete();
            so.getComponents("ScriptComponent")
                .forEach((scriptComponent) => {
                    if (this.isBitmoji3DComponent(scriptComponent)) {
                        const bitmoji3D = scriptComponent as IBitmoji3D;
                        if (!bitmoji3D.mixamoAnimation) {
                            logger.printWarning("Adapt to Mixamo should be enabled for Bitmoji 3D component");
                        }
                    }
                });
        }
    }

    private isBitmoji3DComponent(scriptComponent: ScriptComponent): boolean {
        const bitmoji3D = scriptComponent as IBitmoji3D;
        return !isNull(bitmoji3D.mixamoAnimation);
    }
}
