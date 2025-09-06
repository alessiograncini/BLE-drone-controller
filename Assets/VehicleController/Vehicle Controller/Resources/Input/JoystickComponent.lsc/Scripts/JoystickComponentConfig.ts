export enum JoystickComponentPositionConfig {
    Free,
    Fixed
}

@typedef
export class JoystickComponentConfig {
    @input
    renderOrder: number = 100;
    @input("int")
    @widget(new ComboBoxWidget([new ComboBoxItem("Free", 0), new ComboBoxItem("Fixed", 1)]))
    position: JoystickComponentPositionConfig = 0;
    @input
    @showIf("position", 0)
    @hint("Interactive Area defines screen area where joystick may appear with Free position type. If configured, it appears only when a touch starts within this area. Otherwise, it can appear anywhere on screen.")
    @allowUndefined
    interactiveArea: InteractionComponent;
    @input
    @widget(new SliderWidget(0, 0.99))
    deadZone: number = 0.2;
    @input
    sensitivity: number = 0.96;
}

@component
export class Void extends BaseScriptComponent {}
