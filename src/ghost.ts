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
 * Makes satellite mesh to mimic target's position and scaling with interpolation.
 * FIXME: mimic bounding dimensions instead
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

    _animatingPos: boolean = false;
    _animatingDim: boolean = false;

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

    reset() {
        assertNonNull(this.attachedMesh);
        assertNonNull(this._ghostMesh);
        this._ghostMesh.position.copyFrom(this.attachedMesh.position);
        this._ghostMesh.scaling.copyFrom(this.attachedMesh.scaling);
        this._animatingPos = false;
        this._animatingDim = false;
    }

    interpolate() {
        this._animatingPos = true;
        this._animatingDim = true;
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

        if (this._animatingPos) {
            let delta = this.attachedMesh.position.subtract(this._ghostMesh.position).scale(this.draggingRatio);
            this._animatingPos = delta.length() > Epsilon;
            if (this._animatingPos) {
                this._ghostMesh.position.addInPlace(delta);
            } else {
                this._ghostMesh.position.copyFrom(this.attachedMesh.position);
            }
        }

        if (this._animatingDim) {
            let delta = this.attachedMesh.scaling.subtract(this._ghostMesh.scaling).scale(this.draggingRatio);
            this._animatingDim = delta.length() > Epsilon;
            if (this._animatingDim) {
                this._ghostMesh.scaling.addInPlace(delta);
            } else {
                this._ghostMesh.scaling.copyFrom(this.attachedMesh.scaling);
            }
        }
    }
}