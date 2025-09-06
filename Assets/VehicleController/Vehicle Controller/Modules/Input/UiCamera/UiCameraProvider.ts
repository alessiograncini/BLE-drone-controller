import { UiCameraLayout } from "./UiCameraLayout";
import { Utils } from "../../Utils/Utils";
import assignRenderLayerRecursively = Utils.assignRenderLayerRecursively;

@component
export class UiCameraProvider extends BaseScriptComponent {
    @input
    private readonly uiCameraPrefab: ObjectPrefab;

    static get instance(): UiCameraProvider {
        return UiCameraProvider._instance ?? UiCameraProvider.instantiate();
    }

    readonly renderLayer = LayerSet.makeUnique();

    readonly uiCameraLayout: UiCameraLayout;

    addUiElement(uiElementSO: SceneObject, parent: SceneObject): void {
        assignRenderLayerRecursively(uiElementSO, this.renderLayer);
        uiElementSO.setParent(parent);
    }

    private constructor() {
        super();
        UiCameraProvider._instance = this;

        const uiCameraObject = this.uiCameraPrefab.instantiate(this.getSceneObject());
        this.uiCameraLayout = uiCameraObject.getComponent(UiCameraLayout.getTypeName());
        const uiCamera = this.uiCameraLayout.uiCamera;

        assignRenderLayerRecursively(this.getSceneObject(), this.renderLayer);
        uiCamera.renderLayer = this.renderLayer;

        uiCamera.renderTarget = global.scene.liveTarget;
    }

    private static instantiate(): UiCameraProvider {
        const scriptObject = global.scene.createSceneObject("UI Camera Provider");
        UiCameraProvider._instance = scriptObject.createComponent(UiCameraProvider.getTypeName());
        return UiCameraProvider._instance;
    }

    private static _instance: any;
}
