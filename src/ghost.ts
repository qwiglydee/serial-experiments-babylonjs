import { Scene } from "@babylonjs/core/scene";
import { Epsilon, Vector3 } from "@babylonjs/core/Maths";
import { AbstractMesh, CreateLineSystem, LinesMesh, TransformNode } from "@babylonjs/core/Meshes";
import { BoundingInfo } from "@babylonjs/core/Culling/boundingInfo";
import { Behavior } from "@babylonjs/core/Behaviors";
import { Nullable } from "@babylonjs/core/types";
import { assertNonNull } from "./utils/asserts";

const BOXPOINTS = [
    new Vector3(0.0, 0.0, 0.0),
    // front
    new Vector3(-.5, -.5, +.5),
    new Vector3(-.5, +.5, +.5),
    new Vector3(+.5, +.5, +.5),
    new Vector3(+.5, -.5, +.5),
    // back 
    new Vector3(+.5, -.5, -.5),
    new Vector3(+.5, +.5, -.5),
    new Vector3(-.5, +.5, -.5),
    new Vector3(-.5, -.5, -.5),
]

/**
 * Lines of box edges, size: 1
 */
export function CreateFrameMesh(name: string, options: object, scene: Scene): LinesMesh {
    return CreateLineSystem(name, {
        lines: [
            [BOXPOINTS[1], BOXPOINTS[2]],
            [BOXPOINTS[2], BOXPOINTS[3]],
            [BOXPOINTS[3], BOXPOINTS[4]],
            [BOXPOINTS[4], BOXPOINTS[1]],
            [BOXPOINTS[5], BOXPOINTS[6]],
            [BOXPOINTS[6], BOXPOINTS[7]],
            [BOXPOINTS[7], BOXPOINTS[8]],
            [BOXPOINTS[8], BOXPOINTS[5]],
            [BOXPOINTS[1], BOXPOINTS[8]],
            [BOXPOINTS[2], BOXPOINTS[7]],
            [BOXPOINTS[3], BOXPOINTS[6]],
            [BOXPOINTS[4], BOXPOINTS[5]],
        ],
        ...options
    }, scene);
}

/**
 * Empty pseudo-mesh with bounding box of position ± scaling
 */
export class Ghost extends AbstractMesh {
    constructor(name: string, scene: Scene) {
        super(name, scene);
    }

    override refreshBoundingInfo(): AbstractMesh {
        const min = this.position.add(this.scaling.scale(-0.5)), max = this.position.add(this.scaling.scale(+0.5));
        if (!this._boundingInfo) {
            this._boundingInfo = new BoundingInfo(min, max);
        } else {
            this._boundingInfo.reConstruct(min, max);
        }
        this._updateBoundingInfo();
        return this;
    }

    // fill up AbstractMesh
    _positions = null;
    geometry = null;
    copyVerticesData() { }
}

/**
 * Makes attached mesh to smoothly follow it's goal.
 */
export class GhostBehavior implements Behavior<TransformNode> {
    goal: Nullable<AbstractMesh> = null;
    draggingRatio = 0.1;

    get name() {
        return "GhostBehavior";
    }

    init() { };

    attached: Nullable<TransformNode> = null;
    _animatingPos: boolean = false;
    _animatingDim: boolean = false;

    attach(target: TransformNode) {
        this.attached = target;
        this.reset();
        this._setupObserver();
    }

    detach() {
        this._removeObserver();
        this.reset();
        this.attached = null;
    }

    reset() {
        assertNonNull(this.goal);
        assertNonNull(this.attached);
        this._animatingPos = false;
        this._animatingDim = false;
        this.attached.position.copyFrom(this.goal.position);
        this.attached.scaling.copyFrom(this.goal.scaling);
    }

    restart() {
        this._animatingPos = true;
        this._animatingDim = true;
    }

    _onBeforeRender: any;
    _setupObserver() {
        const scene = this.attached!.getScene();
        this._onBeforeRender = scene.onBeforeRenderObservable.add(() => this._animate())
    }

    _removeObserver() {
        const scene = this.attached!.getScene();
        if (this._onBeforeRender) scene.onBeforeRenderObservable.remove(this._onBeforeRender);
    }

    _animate() {
        // similar to dragging interpolation:
        // current += (target - current) * ratio
        assertNonNull(this.goal);
        assertNonNull(this.attached);
        if (this._animatingPos) {
            let delta = this.goal.position.subtract(this.attached.position).scale(this.draggingRatio);
            this._animatingPos = delta.length() > Epsilon;
            if (this._animatingPos) {
                this.attached.position.addInPlace(delta);
            } else {
                this.attached.position.copyFrom(this.goal.position);
            }
        }

        if (this._animatingDim) {
            let delta = this.goal.scaling.subtract(this.attached.scaling).scale(this.draggingRatio);
            this._animatingDim = delta.length() > Epsilon;
            if (this._animatingDim) {
                this.attached.scaling.addInPlace(delta);
            } else {
                this.attached.scaling.copyFrom(this.goal.scaling);
            }
        }
    }
}