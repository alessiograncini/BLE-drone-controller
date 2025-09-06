import {
    JoystickComponentPositionConfig,
} from "../../../Resources/Input/JoystickComponent.lsc/Scripts/JoystickComponentConfig";
import { JoystickComponent } from "../../../Resources/Input/JoystickComponent.lsc/Scripts/JoystickComponent";
import { JoystickComponentConfig } from "../../../Resources/Input/JoystickComponent.lsc/Scripts/JoystickComponentConfig";
import { UiCameraProvider } from "../UiCamera/UiCameraProvider";

export enum JoystickPositionTypeConfig {
    Free,
    Left,
    Right,
    Custom,
}

@typedef
export class JoystickInputControlConfig {
    @input("int")
    @widget(new ComboBoxWidget((() => ["Free", "Left", "Right", "Custom"].map((v, i) => new ComboBoxItem(v, i)))()))
    joystickPositionTypeConfig: JoystickPositionTypeConfig = 0;

    @input
    @showIf("joystickPositionTypeConfig", 3)
    joystickParent: SceneObject;

    @input
    @showIf("joystickPositionTypeConfig", 0)
    @hint("Interactive Area defines screen area where joystick may appear with Free position type. If configured, it appears only when a touch starts within this area. Otherwise, it can appear anywhere on screen.")
    @allowUndefined
    interactiveArea: InteractionComponent;

    @input
    @widget(new SliderWidget(0.1, 1))
    sensitivity: number = 0.96;

    @input
    @widget(new SliderWidget(0, 0.99))
    deadZone: number = 0.1;

    @input("int")
    renderOrder: number = 200;
}

export class JoystickInputControl {
    private readonly joystickComponent!: JoystickComponent;

    private uiCameraProvider: UiCameraProvider;

    constructor(private joystickInputControlConfig: JoystickInputControlConfig,
        private trackingCameraSO: SceneObject,
        private movablePlane = vec3.up()) {
        const positionConfig = joystickInputControlConfig.joystickPositionTypeConfig === JoystickPositionTypeConfig.Free ?
            JoystickComponentPositionConfig.Free : JoystickComponentPositionConfig.Fixed;

        const joystickConfig: JoystickComponentConfig = {
            renderOrder: this.joystickInputControlConfig.renderOrder,
            position: positionConfig,
            deadZone: this.joystickInputControlConfig.deadZone,
            sensitivity: this.sensitivity,
            interactiveArea: this.joystickInputControlConfig.interactiveArea,
        };

        const joystickParent = this.getJoystickParent();
        const joystickRoot = global.scene.createSceneObject("Joystick Root");
        joystickRoot.setParent(joystickParent);
        joystickRoot.layer = joystickParent.layer;
        joystickRoot.createComponent("ScreenTransform");
        this.joystickComponent = joystickRoot.createComponent(JoystickComponent.getTypeName());
        this.joystickComponent.setConfig(joystickConfig);
    }

    enable(): void {
        if (!isNull(this.joystickComponent)) {
            this.joystickComponent.enable();
        }
    }

    disable(): void {
        if (!isNull(this.joystickComponent)) {
            this.joystickComponent.disable();
        }
    }

    onDestroy(): void {
        if (!isNull(this.joystickComponent)) {
            this.joystickComponent.getSceneObject()
                .destroy();
        }
        if (!isNull(this.uiCameraProvider)) {
            this.uiCameraProvider.getSceneObject()
                .destroy();
        }
    }

    getDirection(): vec3 {
        if (!this.isActive()) {
            return null;
        }
        const joystickDirection = this.joystickComponent.getDirection();
        const cameraTransform = this.trackingCameraSO.getTransform();

        const rightDirection = cameraTransform.right.projectOnPlane(this.movablePlane)
            .normalize();

        const rotation = quat.lookAt(this.movablePlane, rightDirection.cross(this.movablePlane));
        const projectedDirection = rotation.multiplyVec3(new vec3(joystickDirection.x, joystickDirection.y, 0));

        return projectedDirection.uniformScale(-Math.sqrt(joystickDirection.length));
    }

    private get sensitivity(): number {
        return this.joystickInputControlConfig.sensitivity;
    }

    private getJoystickParent(): SceneObject {
        if (this.joystickInputControlConfig.joystickPositionTypeConfig === JoystickPositionTypeConfig.Custom) {
            return this.joystickInputControlConfig.joystickParent;
        }

        this.uiCameraProvider = UiCameraProvider.instance;
        const uiCameraLayout = this.uiCameraProvider.uiCameraLayout;

        switch (this.joystickInputControlConfig.joystickPositionTypeConfig) {
            case JoystickPositionTypeConfig.Left:
                return uiCameraLayout.leftInputControlSpace;
            case JoystickPositionTypeConfig.Right:
                return uiCameraLayout.rightInputControlSpace;
            case JoystickPositionTypeConfig.Free:
                return uiCameraLayout.leftInputControlSpace;
        }
    }

    private isActive(): boolean {
        return !isNull(this.joystickComponent)
            && !isNull(this.joystickComponent.getSceneObject())
            && this.joystickComponent.getSceneObject().enabled
            && this.joystickComponent.getSceneObject().isEnabledInHierarchy;
    }
}

@component
export class _Void extends BaseScriptComponent {}
