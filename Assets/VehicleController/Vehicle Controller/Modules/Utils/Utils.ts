export type Disposable = {
    dispose: () => void;
}

export namespace Utils {

    export const EPS: number = 1e-6;

    export function degreesToRadians(degrees: number) {
        return degrees / 180 * Math.PI;
    }

    export function isColliderDynamic(collider: ColliderComponent): boolean {
        return collider.getTypeName() === "Physics.BodyComponent"
            && (collider as BodyComponent).dynamic;
    }

    export function copyVec3(obj: vec3): vec3 {
        return new vec3(obj.x, obj.y, obj.z);
    }

    export function* flatSubtree(rootSO: SceneObject): Generator<SceneObject> {
        yield rootSO;
        for (const child of rootSO.children) {
            yield* flatSubtree(child);
        }
    }

    export function assignRenderLayerRecursively(rootSO: SceneObject, layer: LayerSet): void {
        for (const child of Utils.flatSubtree(rootSO)) {
            child.layer = layer;
        }
    }

    export function startTween(hostingScript: ScriptComponent,
        time: number,
        progressCallback: (percentage: number) => void,
        onCompleteCallback?: () => void,
        onDisposeCallback?: () => void): Disposable {
        time = Math.max(time, 0);
        const updateEvent = hostingScript.createEvent("UpdateEvent");

        const dispose = () => {
            hostingScript.removeEvent(updateEvent);
            updateEvent.enabled = false;
            onDisposeCallback?.();
        };

        let elapsedTime = 0;
        updateEvent.bind(event => {
            elapsedTime += event.getDeltaTime();
            if (elapsedTime >= time) {
                progressCallback(1);
                onCompleteCallback?.();
                dispose();
            } else {
                progressCallback(elapsedTime / time);
            }
        });
        progressCallback(0);
        return { dispose };
    }

    export function delay(hostingScript: ScriptComponent, time: number, onCompleteCallback: () => void): Disposable {
        const event = hostingScript.createEvent("DelayedCallbackEvent");
        const dispose = () => {
            hostingScript.removeEvent(event);
            event.enabled = false;
        };
        event.bind(() => {
            onCompleteCallback();
            dispose();
        });
        event.reset(time);
        return { dispose };
    }

    export class CompositeDisposable {
        private disposables = new Set<Disposable>();

        add(...disposables: Disposable[]): void {
            for (const disposable of disposables) {
                this.disposables.add(disposable);
            }
        }

        dispose(): void {
            const toDispose = this.disposables;
            this.disposables = new Set();
            for (const disposable of toDispose) {
                disposable.dispose();
            }
        }
    }
}
