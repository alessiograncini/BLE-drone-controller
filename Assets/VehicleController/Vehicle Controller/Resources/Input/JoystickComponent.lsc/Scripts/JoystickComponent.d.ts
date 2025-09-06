export declare enum JoystickComponentPositionConfig {
    Free = 0,
    Fixed = 1
}

export declare class JoystickComponentConfig {
    renderOrder: number;
    position: JoystickComponentPositionConfig;
}

export declare type Subscription = {
    dispose: () => void;
}

export declare interface IJoystickComponent {
    show(showWithAnimation?: boolean): void;
    hide(hideWithAnimation?: boolean): void;
    getDirection(): vec2;
    addOnDirectionChangeListener(listener: (direction: vec2) => void): Subscription;
    removeOnDirectionChangeListener(listener: (direction: vec2) => void): void;
}

export declare class JoystickComponent extends BaseScriptComponent implements IJoystickComponent {
    setConfig(config: JoystickComponentConfig): void;
    show(showWithAnimation?: boolean): void;
    hide(hideWithAnimation?: boolean): void;
    getDirection(): vec2;
    addOnDirectionChangeListener(listener: (direction: vec2) => void): Subscription;
    removeOnDirectionChangeListener(listener: (direction: vec2) => void): void;
}
