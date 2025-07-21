import { Nullable } from "@babylonjs/core/types";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths";
import { AbstractMesh, Mesh, TransformNode } from "@babylonjs/core/Meshes";
import { PointerDragBehavior } from "@babylonjs/core/Behaviors/Meshes";
import { UtilityLayerRenderer } from "@babylonjs/core/Rendering/utilityLayerRenderer";

import { assertNonNull } from "./utils/asserts";
import { Observer } from "@babylonjs/core/Misc/observable";

export interface IBasicGizmo {
    attachedMesh: Nullable<AbstractMesh>;
    dragBehavior: PointerDragBehavior;

    createDragging(): PointerDragBehavior;
    createHandle(): Mesh;
    createRig(): Vector3;

    onAttach(mesh: Nullable<AbstractMesh>): void;
    onGrab(point: Vector3): void;
    onDrag(point: Vector3, delta: Vector3): void;
    onDrop(point: Vector3, travelled: Vector3): void;
}

/**
 * Gizmo with a handle.
 * 
 * Gizmo is abs positioning to center of attached mesh;
 * Handle is local positioned relative to attached dimensions/extent;
 */
export abstract class BasicGizmo implements IBasicGizmo {
    name: string;

    gizmoLayer: UtilityLayerRenderer;
    get gizmoScene() { return this.gizmoLayer.utilityLayerScene };

    dragBehavior: PointerDragBehavior;

    _root: TransformNode;
    _attachedMesh: Nullable<AbstractMesh> = null;
    _handleMesh: Mesh;
    _handleRig: Vector3;

    constructor(name: string, layer: UtilityLayerRenderer) {
        this.name = name;
        this.gizmoLayer = layer;

        this._root = new TransformNode(name, this.gizmoLayer.utilityLayerScene);
        // this._root.rotationQuaternion = Quaternion.Identity();

        this._handleMesh = this.createHandle();
        this._handleMesh.setEnabled(false);
        this._handleMesh.parent = this._root;

        this._handleRig = this.createRig();

        this.dragBehavior = this.createDragging();
        this.dragBehavior.enabled = false;
        this.dragBehavior.attach(this._handleMesh);

        this.dragBehavior.onDragStartObservable.add((info) => {
            this._travelled = Vector3.Zero();
            this.onGrab(info.dragPlanePoint)
        });
        this.dragBehavior.onDragObservable.add((info) => {
            this._travelled.addInPlace(info.delta);
            this.onDrag(info.dragPlanePoint, info.delta);
        });
        this.dragBehavior.onDragEndObservable.add((info) => {
            this.onDrop(info.dragPlanePoint, this._travelled)
        });
    }

    get attachedMesh() {
        return this._attachedMesh;
    }

    set attachedMesh(target: Nullable<AbstractMesh>) {
        if (this._attachedMesh === target) return;
        if (this._attachedMesh !== null) this._detach();

        this._attachedMesh = target;

        if (this._attachedMesh !== null) this._attach();
        else this._detach();

        this.onAttach(this._attachedMesh);
    }

    abstract createDragging(): PointerDragBehavior;
    abstract createHandle(): Mesh;
    abstract createRig(): Vector3;

    _followObserver?: Observer<TransformNode>;

    _attach() {
        assertNonNull(this._attachedMesh);
        this._update();
        this._handleMesh.setEnabled(true);
        this.dragBehavior.enabled = true;
        this._followObserver = this._attachedMesh.onAfterWorldMatrixUpdateObservable.add(() => {
            if (!this.dragBehavior.dragging || !this.dragBehavior.moveAttached) {
                this._update();
            }
        });
    }

    reset() {
        this._update();
    }

    _detach() {
        if (this._followObserver) this._followObserver.remove();
        this.dragBehavior.enabled = false;
        this._handleMesh.setEnabled(false);
    }

    _update() {
        assertNonNull(this._attachedMesh);
        const bbox = this._attachedMesh.getBoundingInfo().boundingBox;

        let scale = Vector3.One();
        // this._attachedMesh.getWorldMatrix().decompose(scale, this._root.rotationQuaternion!, this._root.position, undefined);
        // this._root.rotationQuaternion!.normalize();
        this._attachedMesh.getWorldMatrix().decompose(scale, undefined, this._root.position, undefined);

        this._handleMesh.position.copyFrom(bbox.extendSize.multiply(this._handleRig).multiply(scale))._isDirty;
    }

    _travelled: Vector3 = Vector3.Zero();

    abstract onAttach(mesh: Nullable<AbstractMesh>): void;
    abstract onGrab(point: Vector3): void;
    abstract onDrag(point: Vector3, delta: Vector3): void;
    abstract onDrop(point: Vector3, travelled: Vector3): void;
} 