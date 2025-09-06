import { CallbacksWrapper } from "../../Utils/CallbacksWrapper";

const SHAPE_ROTATION: quat = quat.angleAxis(0, vec3.zero());

export interface CreateProbeConfig {
    dynamic?: boolean;
    static?: boolean;
    intangible?: boolean;
    skip?: ColliderComponent[];
}

export class RayCastController {

    constructor(private readonly shapeForShapeCast: Shape,
        private readonly callbackWrapper: CallbacksWrapper,
        readonly probe: Probe) {}

    shapeCast(start: vec3, end: vec3, cb: (hit: RayCastHit) => void): void {
        this.probe.shapeCast(this.shapeForShapeCast, start, SHAPE_ROTATION, end, SHAPE_ROTATION, this.callbackWrapper.wrap(cb));
    }

    shapeCastAll(start: vec3, end: vec3, cb: (hit: RayCastHit[]) => void): void {
        this.probe.shapeCastAll(this.shapeForShapeCast, start, SHAPE_ROTATION, end, SHAPE_ROTATION, this.callbackWrapper.wrap((hits: RayCastHit[]) => {
            cb(hits.sort((a, b) => a.t - b.t));
        }));
    }

    rayCast(start: vec3, end: vec3, cb: (hit: RayCastHit) => void): void {
        this.probe.rayCast(start, end, this.callbackWrapper.wrap(cb));
    }

    rayCastAll(start: vec3, end: vec3, cb: (hits: RayCastHit[]) => void): void {
        this.probe.rayCastAll(start, end, this.callbackWrapper.wrap((hits: RayCastHit[]) => {
            cb(hits.sort((a, b) => a.t - b.t));
        }));
    }
}

export function createProbe(config: CreateProbeConfig): Probe {
    const probe = Physics.createGlobalProbe();
    probe.filter.includeDynamic = !!config.dynamic;
    probe.filter.includeStatic = !!config.static;
    probe.filter.includeIntangible = !!config.intangible;
    probe.filter.skipColliders = config.skip || [];
    return probe;
}

export function getRayCastCollisionCharacterPosition(start: vec3, end: vec3, hit: RayCastHit): vec3 {
    return end.sub(start)
        .uniformScale(hit.t)
        .add(start);
}
