@component
export class UiCameraLayout extends BaseScriptComponent {
    @input
    readonly uiCamera: Camera;

    @input
    readonly leftInputControlSpace: SceneObject;

    @input
    readonly rightInputControlSpace: SceneObject;
}
