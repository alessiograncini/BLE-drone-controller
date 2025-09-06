import { Event } from "./Event";
import { JoystickComponentConfig, JoystickComponentPositionConfig } from "./JoystickComponentConfig";

const APPEAR_ANIMATION_TIME = 0.2;
const MIN_SHOW_HIDE_ANIMATION_SCALE = 0.95;
const MAX_SHOW_HIDE_ANIMATION_SCALE = 1;

type Disposable = {
    dispose: () => void;
}

export type Subscription = Disposable

export interface IJoystickComponent {

    setConfig(config: JoystickComponentConfig): void;

    show(showWithAnimation?: boolean): void;

    hide(hideWithAnimation?: boolean): void;

    getDirection(): vec2;

    addOnDirectionChangeListener(listener: (data: { direction: vec2 }) => void): Subscription;

    removeOnDirectionChangeListener(listener: (data: { direction: vec2 }) => void): void;

    addOnDirectionUpdateListener(listener: (data: { direction: vec2 }) => void): Subscription;

    removeOnDirectionUpdateListener(listener: (data: { direction: vec2 }) => void): void;
}

@component
export class JoystickComponent extends BaseScriptComponent implements IJoystickComponent {
    @input
    private config: JoystickComponentConfig;
    @input
    private readonly controlDotPrefab: ObjectPrefab;
    @input
    private readonly controlPlatePrefab: ObjectPrefab;
    @input
    private readonly releaseJoystickAnimationLerpFactor: number = 0.5;

    private get isFreePosition() {
        return this.config.position === JoystickComponentPositionConfig.Free;
    }

    private readonly myST!: ScreenTransform;
    private controlPlateInteractionComponent: InteractionComponent;
    private controlDotST!: ScreenTransform;

    private interactingTouchId: number = null;
    private lastDirection: vec2 = vec2.zero();

    private opacityController: { setOpacity: (opacity: number) => void };
    private animationDisposable: Disposable = null;
    private touchEventsDisposable: Disposable = null;

    private readonly directionChangeEvent = new Event<{ direction: vec2 }>();
    private readonly directionUpdateEvent = new Event<{ direction: vec2, deltaTime: number }>();

    private get controlPlateObject() {
        return this.controlPlateInteractionComponent?.getSceneObject();
    }

    private get controlDotObject() {
        return this.controlDotST?.getSceneObject();
    }

    constructor() {
        super();
        this.myST = this.getSceneObject()
            .getComponent("ScreenTransform") ??
            this.getSceneObject()
                .createComponent("ScreenTransform");
    }

    setConfig(config: JoystickComponentConfig): void {
        this.config = config;
        setRenderLayerAndRenderOrderForWholeHierarchy(this.getSceneObject(),
            this.getSceneObject().layer,
            this.config.renderOrder);
        this.clearTouchEvents();
        this.observeTouchEvents();
        this.reset();
    }

    reset(): void {
        this.interactingTouchId = null;
        this.lastDirection = vec2.zero();
        this.animationDisposable?.dispose();
        this.controlDotST?.anchors.setCenter(vec2.zero());
        if (this.isFreePosition) {
            this.opacityController?.setOpacity(0);
            if (this.controlPlateObject) {
                this.controlPlateObject.enabled = false;
            }
            if (this.controlDotObject) {
                this.controlDotObject.enabled = false;
            }
        } else {
            this.opacityController?.setOpacity(1);
        }
    }

    enable(): void {
        if (this.controlPlateObject) {
            this.controlPlateObject.enabled = true;
        }
        if (this.controlDotObject) {
            this.controlDotObject.enabled = true;
        }
    }

    disable(): void {
        if (this.controlPlateObject) {
            this.controlPlateObject.enabled = false;
        }
        if (this.controlDotObject) {
            this.controlDotObject.enabled = false;
        }
    }

    show(showWithAnimation: boolean = true) {
        this.disposeAnimation();
        this.controlPlateObject.enabled = true;
        this.controlDotObject.enabled = true;
        if (showWithAnimation) {
            this.showAnimation();
        } else {
            this.opacityController.setOpacity(this.isFreePosition ? 0 : 1);
        }
    }

    hide(hideWithAnimation: boolean = true) {
        this.disposeAnimation();
        const disable = () => {
            this.controlPlateObject.enabled = false;
            this.controlDotObject.enabled = false;
        };
        hideWithAnimation ? this.hideAnimation(disable) : disable();
    }

    getDirection(): vec2 {
        return this.applySensitivityToDirection();
    }

    addOnDirectionChangeListener(listener: (data: { direction: vec2 }) => void): Subscription {
        this.directionChangeEvent.add(listener);
        return { dispose: () => this.directionChangeEvent.remove(listener) };
    }

    removeOnDirectionChangeListener(listener: (data: { direction: vec2 }) => void): void {
        this.directionChangeEvent.remove(listener);
    }

    addOnDirectionUpdateListener(listener: (data: { direction: vec2, deltaTime: number }) => void): Subscription {
        this.directionUpdateEvent.add(listener);
        return { dispose: () => this.directionChangeEvent.remove(listener) };
    }

    removeOnDirectionUpdateListener(listener: (data: { direction: vec2, deltaTime: number }) => void): void {
        this.directionUpdateEvent.remove(listener);
    }

    private onDestroy(): void {
        this.clearTouchEvents();
        this.controlPlateObject?.destroy();
        this.controlDotObject?.destroy();
    }

    protected onAwake() {
        this.instantiateScene();
        this.setupPlateExtentsDotAreaIfNeeded();

        this.observeTouchEvents();

        const dotAlignmentUpdateEvent = this.createEvent("UpdateEvent");
        dotAlignmentUpdateEvent.bind(this.dotAlignmentUpdate.bind(this));

        const updateEvent = this.createEvent("UpdateEvent");
        updateEvent.bind((event) => {
            this.directionUpdateEvent.trigger({
                direction: this.applySensitivityToDirection(),
                deltaTime: event.getDeltaTime(),
            });
        });

        this.createEvent("OnDisableEvent")
            .bind(() => this.reset());
        this.createEvent("OnDestroyEvent")
            .bind(() => this.onDestroy());
    }

    private instantiateScene() {
        this.controlPlateInteractionComponent = this.controlPlatePrefab
            .instantiate(this.getSceneObject())
            .getComponent("InteractionComponent");
        this.controlDotST = this.controlDotPrefab
            .instantiate(this.getSceneObject())
            .getComponent("ScreenTransform");
        this.opacityController = createOpacityController([this.getSceneObject()]);
        setRenderLayerAndRenderOrderForWholeHierarchy(this.getSceneObject(),
            this.getSceneObject().layer,
            this.config.renderOrder);
    }

    private showAnimation() {
        this.controlDotObject.enabled = true;
        this.controlPlateObject.enabled = true;
        this.disposeAnimation();
        const scale = this.getTransform()
            .getLocalScale();
        this.animationDisposable = startTween(this, APPEAR_ANIMATION_TIME, p => {
            this.opacityController.setOpacity(p);
            this.getTransform()
                .setLocalScale(scale.uniformScale(MIN_SHOW_HIDE_ANIMATION_SCALE
                + (MAX_SHOW_HIDE_ANIMATION_SCALE - MIN_SHOW_HIDE_ANIMATION_SCALE) * p));
        }, () => {
            this.getTransform()
                .setLocalScale(scale);
        });
    }

    private hideAnimation(onDispose?: () => void) {
        this.disposeAnimation();
        const scale = this.getTransform()
            .getLocalScale();
        this.animationDisposable = startTween(this, APPEAR_ANIMATION_TIME, p => {
            this.opacityController.setOpacity(1 - p);
            this.getTransform()
                .setLocalScale(scale.uniformScale(MAX_SHOW_HIDE_ANIMATION_SCALE
                - (MAX_SHOW_HIDE_ANIMATION_SCALE - MIN_SHOW_HIDE_ANIMATION_SCALE) * p));
        }, () => {
            this.getTransform()
                .setLocalScale(scale);
            onDispose?.();
        }, () => {
            this.controlDotObject.enabled = false;
            this.controlPlateObject.enabled = false;
        });
    }

    private clearTouchEvents(): void {
        this.touchEventsDisposable?.dispose();
    }

    private observeTouchEvents() {
        const allDisposable: Disposable[] = [];
        if (this.isFreePosition) {
            this.opacityController.setOpacity(0);
            const freePositionTouchStartCallback = (touchPosition: vec2, touchId: number) => {
                if (this.interactingTouchId === null) {
                    this.showAnimation();
                    this.myST.anchors.setCenter(this.myST.screenPointToParentPoint(touchPosition));
                    this.onTouchStart(touchId, touchPosition);
                }
            };
            if (this.config.interactiveArea) {
                const eventRegistration = this.config.interactiveArea.onTouchStart.add((eventData) => {
                    freePositionTouchStartCallback(eventData.position, eventData.touchId);
                });
                allDisposable.push({
                    dispose: () => this.config.interactiveArea.onTouchStart.remove(eventRegistration),
                });
            } else {
                const touchStart = this.createEvent("TouchStartEvent");
                touchStart.bind((eventData) => freePositionTouchStartCallback(eventData.getTouchPosition(), eventData.getTouchId()));
                allDisposable.push(createSceneEventDisposable(this, touchStart));
            }
        } else {
            const eventRegistration = this.controlPlateInteractionComponent.onTouchStart.add(eventData =>
                this.onTouchStart(eventData.touchId, eventData.position));
            allDisposable.push({
                dispose: () => this.controlPlateInteractionComponent.onTouchStart.remove(eventRegistration),
            });
        }

        const touchMove = this.createEvent("TouchMoveEvent");
        touchMove.bind(this.onTouchMove.bind(this));
        allDisposable.push(createSceneEventDisposable(this, touchMove));

        const touchEnd = this.createEvent("TouchEndEvent");
        touchEnd.bind(this.onTouchEnd.bind(this));
        allDisposable.push(createSceneEventDisposable(this, touchEnd));

        this.touchEventsDisposable = {
            dispose: () => allDisposable.forEach((obj) => obj.dispose()),
        };
    }

    private dotAlignmentUpdate(event: UpdateEvent) {
        const deltaTime = event.getDeltaTime();
        const FPS_FACTOR = 30;
        const factor = Math.pow(this.releaseJoystickAnimationLerpFactor, deltaTime * FPS_FACTOR);
        this.controlDotST.anchors.setCenter(vec2.lerp(this.controlDotST.anchors.getCenter(), this.lastDirection, factor));
    }

    private onTouchStart(touchId: number, touchPosition: vec2) {
        if (this.interactingTouchId === null) {
            this.interactingTouchId = touchId;
            this.updateDirectionFromTouchPosition(touchPosition);
        }
    }

    private onTouchMove(event: TouchMoveEvent) {
        if (event.getTouchId() === this.interactingTouchId) {
            this.updateDirectionFromTouchPosition(event.getTouchPosition());
        }
    }

    private onTouchEnd(event: TouchEndEvent) {
        if (event.getTouchId() === this.interactingTouchId) {
            this.interactingTouchId = null;
            this.onDirectionChange(vec2.zero());
            if (this.isFreePosition) {
                this.hideAnimation();
            }
        }
    }

    private updateDirectionFromTouchPosition(position: vec2) {
        const localPosition = this.controlDotST.screenPointToParentPoint(position);
        this.onDirectionChange(localPosition.lengthSquared > 1 ? localPosition.normalize() : localPosition);
    }

    private onDirectionChange(direction: vec2) {
        const withinDeadZone = direction.lengthSquared < Math.pow(this.config.deadZone, 2);
        this.lastDirection = withinDeadZone ? vec2.zero() : direction;
        this.directionChangeEvent.trigger({ direction: this.applySensitivityToDirection() });
    }

    private setupPlateExtentsDotAreaIfNeeded() {
        const plateImage = this.controlPlateObject.getComponent("Image");
        if (!plateImage.extentsTarget) {
            const extentsTarget = global.scene.createSceneObject("plateImageExtentsTarget");
            extentsTarget.setParent(this.controlPlateObject);
            plateImage.extentsTarget = extentsTarget.createComponent("ScreenTransform");
        }
        this.controlDotObject.setParent(plateImage.extentsTarget.getSceneObject());
    }

    private disposeAnimation() {
        this.animationDisposable?.dispose();
        this.animationDisposable = null;
    }

    private applySensitivityToDirection(): vec2 {
        return this.lastDirection.uniformScale(this.config.sensitivity);
    }
}

// Extensions

function* flatSubtree(rootSO: SceneObject): IterableIterator<SceneObject> {
    yield rootSO;
    for (const child of rootSO.children) {
        yield* flatSubtree(child);
    }
}

function* flatSubtreeMaterialPasses(rootSO: SceneObject): IterableIterator<Pass> {
    for (const child of flatSubtree(rootSO)) {
        for (const materialMeshVisual of child.getComponents("MaterialMeshVisual")) {
            for (const material of materialMeshVisual.materials) {
                for (let i = 0; i < material.getPassCount(); ++i) {
                    yield material.getPass(i);
                }
            }
        }
    }
}

function setRenderLayerAndRenderOrderForWholeHierarchy(so: SceneObject, layer: LayerSet, renderOrder: number): void {
    for (const child of flatSubtree(so)) {
        child.layer = layer;
        for (const visual of child.getComponents("Visual")) {
            visual.setRenderOrder(renderOrder);
        }
    }
}

function createOpacityController(rootsSO: SceneObject[]) {
    const opacitySetters: Array<(opacity: number) => void> = [];
    for (const root of rootsSO) {
        for (const pass of flatSubtreeMaterialPasses(root)) {
            const setter = createOpacitySetter(pass);
            setter && opacitySetters.push(setter);
        }
    }

    function createOpacitySetter(pass: Pass): null | ((opacity: number) => void) {
        return fromFloat("opacity") ?? fromFloat("alpha") ?? fromColor("baseColor");

        function fromColor(propertyName: string) {
            if (pass[propertyName] == null) {
                return null;
            }
            const initial = pass[propertyName].w;
            return (value: number) => {
                const color = pass[propertyName];
                color.w = initial * value;
                pass[propertyName] = color;
            };
        }

        function fromFloat(propertyName: string) {
            if (pass[propertyName] == null) {
                return null;
            }
            const initial = pass[propertyName];
            return (value: number) => {
                pass[propertyName] = initial * value;
            };
        }
    }

    return {
        setOpacity(opacity: number) {
            for (const setter of opacitySetters) {
                setter(opacity);
            }
        },
    };
}

function startTween(hostingScript: ScriptComponent,
    time: number,
    progressCallback: (percentage: number) => void,
    onDispose?: () => void,
    onComplete?: () => void): { dispose: () => void } {
    const dispose = () => {
        hostingScript.removeEvent(updateEvent);
        onDispose?.();
    };
    const updateEvent = hostingScript.createEvent("UpdateEvent");
    let elapsedTime = 0;
    updateEvent.bind(event => {
        elapsedTime += event.getDeltaTime();
        if (elapsedTime >= time) {
            progressCallback(1);
            onComplete?.();
            dispose();
        } else {
            progressCallback(elapsedTime / time);
        }
    });
    progressCallback(0);
    return { dispose };
}

function createSceneEventDisposable(script: ScriptComponent, event: SceneEvent): Disposable {
    return {
        dispose: () => {
            event.enabled = false;
            script.removeEvent(event);
        },
    };
}
