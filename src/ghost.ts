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

export interface GhostLink {
    target: AbstractMesh;
    master: AbstractMesh;
}

/**
 * Makes attached mesh to smoothly follow it's goal.
 */
export class GhostBehavior implements Behavior<GhostLink> {
    draggingRatio = 0.1;

    get name() {
        return "GhostBehavior";
    }

    init() { };

    _master: Nullable<AbstractMesh> = null;
    _target: Nullable<AbstractMesh> = null;
    _animatingPos: boolean = false;
    _animatingDim: boolean = false;

    attach(link: GhostLink) {
        this._master = link.master;
        this._target = link.target;
        this.reset();
        this._setupObservers();
    }

    detach() {
        this._removeObservers();
        this.reset();
        this._master = null;
        this._target = null;
    }

    reset() {
        assertNonNull(this._master);
        assertNonNull(this._target);
        this._target.position.copyFrom(this._master.position);
        this._target.scaling.copyFrom(this._master.scaling);
        this._animatingPos = false;
        this._animatingDim = false;
    }

    restart() {
        this._animatingPos = true;
        this._animatingDim = true;
    }

    _onRender: any;
    _onChange: any;
    _setupObservers() {
        assertNonNull(this._master);
        assertNonNull(this._target);
        this._onChange = this._master.onAfterWorldMatrixUpdateObservable.add(() => this.restart());
        this._onRender = this._target.getScene().onBeforeRenderObservable.add(() => this._animate());
    }

    _removeObservers() {
        if (this._onChange) this._onChange.remove();
        if (this._onRender) this._onRender.remove();
    }

    _animate() {
        // similar to dragging interpolation: current += (goal - current) * ratio
        assertNonNull(this._master);
        assertNonNull(this._target);

        if (this._animatingPos) {
            let delta = this._master.position.subtract(this._target.position).scale(this.draggingRatio);
            this._animatingPos = delta.length() > Epsilon;
            if (this._animatingPos) {
                this._target.position.addInPlace(delta);
            } else {
                this._target.position.copyFrom(this._master.position);
            }
        }

        if (this._animatingDim) {
            let delta = this._master.scaling.subtract(this._target.scaling).scale(this.draggingRatio);
            this._animatingDim = delta.length() > Epsilon;
            if (this._animatingDim) {
                this._target.scaling.addInPlace(delta);
            } else {
                this._target.scaling.copyFrom(this._master.scaling);
            }
        }
    }
}