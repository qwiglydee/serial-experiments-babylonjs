import { Nullable } from "@babylonjs/core/types";
import { Vector3 } from "@babylonjs/core/Maths";
import { AbstractMesh, Mesh, TransformNode } from "@babylonjs/core/Meshes";
import { PointerDragBehavior } from "@babylonjs/core/Behaviors/Meshes";
import { UtilityLayerRenderer } from "@babylonjs/core/Rendering/utilityLayerRenderer";

import { assertNonNull } from "./utils/asserts";
import { Observable, Observer } from "@babylonjs/core/Misc/observable";
import { BoundingBox } from "@babylonjs/core/Culling/boundingBox";

export interface IBaseGizmo {
    attachedMesh: Nullable<AbstractMesh>;
    dragBehavior: PointerDragBehavior;
    onChangeObservable: Observable<any>;

    createDragging(): PointerDragBehavior;
    createHandle(): Mesh;
    createRig(): Vector3;

    onAttach(mesh: Nullable<AbstractMesh>): void;
    onGrab(point: Vector3): void;
    onDrag(point: Vector3, delta: Vector3, dragged: Vector3): void;
    onDrop(point: Vector3, dragged: Vector3): void;
}

/**
 * Gizmo with a handle.
 * 
 * Gizmo is abs positioning to center of attached mesh;
 * Handle is local positioned relative to attached dimensions/extent;
 */
export abstract class BaseGizmo implements IBaseGizmo {
    name: string;

    gizmoLayer: UtilityLayerRenderer;
    get gizmoScene() { return this.gizmoLayer.utilityLayerScene };

    dragBehavior: PointerDragBehavior;
    onChangeObservable: Observable<AbstractMesh>;

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
            this._dragged = Vector3.Zero();
            this.onGrab(info.dragPlanePoint)
        });
        this.dragBehavior.onDragObservable.add((info) => {
            this._dragged.addInPlace(info.delta);
            this.onDrag(info.dragPlanePoint, info.delta, this._dragged);
        });
        this.dragBehavior.onDragEndObservable.add((info) => {
            this.onDrop(info.dragPlanePoint, this._dragged)
        });

        this.onChangeObservable = new Observable();
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

    _dragged: Vector3 = Vector3.Zero();

    abstract onAttach(mesh: Nullable<AbstractMesh>): void;
    abstract onGrab(point: Vector3): void;
    abstract onDrag(point: Vector3, delta: Vector3, dragged: Vector3): void;
    abstract onDrop(point: Vector3, dragged: Vector3): void;

    _notifyChanges() {
        this.onChangeObservable.notifyObservers(this._attachedMesh!);
    }
}

/**
 * Gizmo to manipulate bounding box.
 * Mesh should be centered and not rotated.
 */
export abstract class BaseBoxGizmo extends BaseGizmo {
    origBox?: BoundingBox;
    _origScaling: Vector3 = Vector3.Zero();

    grabBox() {
        const bbox = this._attachedMesh!.getBoundingInfo().boundingBox;
        this.origBox = new BoundingBox(
            bbox.minimum,
            bbox.maximum,
            bbox.getWorldMatrix()
        );
        this._origScaling.copyFrom(this._attachedMesh!.scaling);
    }

    adjustBox(min: Vector3, max: Vector3) {
        const targBox = new BoundingBox(min, max);
        this._attachedMesh!.scaling = this._origScaling!.multiply(targBox.extendSizeWorld).divide(this.origBox!.extendSizeWorld);
        this._attachedMesh!.setAbsolutePosition(targBox.centerWorld);
        this._attachedMesh!.computeWorldMatrix();
    }
}