import { Scene } from "@babylonjs/core/scene";
import { Epsilon, Vector3 } from "@babylonjs/core/Maths";
import { AbstractMesh, CreateLineSystem, LinesMesh, TransformNode } from "@babylonjs/core/Meshes";
import { BoundingInfo } from "@babylonjs/core/Culling/boundingInfo";
import { Behavior } from "@babylonjs/core/Behaviors";
import { Nullable } from "@babylonjs/core/types";
import { assertNonNull } from "./utils/asserts";
import { Observer } from "@babylonjs/core/Misc/observable";

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
 * Empty mesh that mimics target bounding box.
 * Places itself at center of bounding box and scales up;
 * 
 * NB: it has to be abstractmesh so it can be passed t gizmos and stuff
 */
export class BoundingGhost extends AbstractMesh {
    _extendSize!: Vector3;

    constructor(name: string, scene: Scene, target: AbstractMesh) {
        super(name, scene);
        this.mimic(target);
    }

    mimic(target: AbstractMesh) {
        const bbox = target.getBoundingInfo().boundingBox
        this.position = bbox.center;
        this._extendSize = bbox.extendSize;
        this.refreshBoundingInfo();
    }

    get dimensions() {
        return this._extendSize.scale(2);
    }

    set dimensions(dim: Vector3) {
        this._extendSize = dim.scale(0.5);
        this.refreshBoundingInfo();
    }

    override refreshBoundingInfo(): AbstractMesh {
        const min = this.position.add(this._extendSize), max = this.position.add(this._extendSize);
        this._boundingInfo = new BoundingInfo(min, max);
        this._boundingInfoIsDirty = false;
        return this;
    }

    // fill up AbstractMesh
    _positions = null;
    geometry = null;
    copyVerticesData() { }
}

/**
 * Makes satellite mesh to mimic target's position and dimension with interpolation.
 * The ghost mesh should be locally 1x1x1
 * TODO: rotation
 */
export class GhostBehavior implements Behavior<AbstractMesh> {
    draggingRatio = 0.1;

    get name() {
        return "Ghost";
    }

    attachedMesh: Nullable<AbstractMesh> = null;
    _ghostMesh: Nullable<AbstractMesh> = null;

    get ghostMesh(): Nullable<AbstractMesh> {
        return this._ghostMesh;
    }

    set ghostMesh(mesh: AbstractMesh) {
        this._ghostMesh = mesh;
        if (this.attachedMesh) this.reset();
    }

    _goalPos: Nullable<Vector3> = null;
    _goalDim: Nullable<Vector3> = null;

    init() {
        assertNonNull(this._ghostMesh);
    };

    attach(target: AbstractMesh, ghost?: AbstractMesh) {
        if (ghost) this.ghostMesh = ghost;
        this.attachedMesh = target;
        this.reset();
        this._setupObservers();
        this._ghostMesh!.setEnabled(true);
    }

    detach() {
        this._ghostMesh!.setEnabled(false);
        this._removeObservers();
        this.attachedMesh = null
    }

    _getGoal() {
        assertNonNull(this.attachedMesh);
        return {
            pos: this.attachedMesh.absolutePosition,
            dim: this.attachedMesh.getBoundingInfo().boundingBox.extendSizeWorld.scale(2)
        }
    }

    reset() {
        const { pos, dim } = this._getGoal();
        this._ghostMesh!.position.copyFrom(pos);
        this._ghostMesh!.scaling.copyFrom(dim);
        this._goalPos = null;
        this._goalDim = null;
    }

    interpolate() {
        const { pos, dim } = this._getGoal();
        this._goalPos = pos;
        this._goalDim = dim;
    }

    _onRender?: Observer<any>;
    _onChange?: Observer<any>;
    _setupObservers() {
        assertNonNull(this._ghostMesh);
        assertNonNull(this.attachedMesh);
        this._onChange = this.attachedMesh.onAfterWorldMatrixUpdateObservable.add(() => this.interpolate());
        this._onRender = this._ghostMesh.getScene().onBeforeRenderObservable.add(() => this._interpolating());
    }

    _removeObservers() {
        if (this._onChange) this._onChange.remove();
        if (this._onRender) this._onRender.remove();
    }

    _interpolating() {
        // similar to dragging interpolation: current += (goal - current) * ratio
        assertNonNull(this._ghostMesh);
        assertNonNull(this.attachedMesh);

        if (this._goalPos !== null) {
            let delta = this._goalPos.subtract(this._ghostMesh.position).scale(this.draggingRatio);
            if (delta.length() > Epsilon) {
                this._ghostMesh.position.addInPlace(delta);
            } else {
                this._ghostMesh.position.copyFrom(this._goalPos);
                this._goalPos = null;
            }
        }

        if (this._goalDim !== null) {
            let delta = this._goalDim.subtract(this._ghostMesh.scaling).scale(this.draggingRatio);
            if (delta.length() > Epsilon) {
                this._ghostMesh.scaling.addInPlace(delta);
            } else {
                this._ghostMesh.scaling.copyFrom(this._goalDim);
                this._goalDim = null;
            }
        }
    }
}