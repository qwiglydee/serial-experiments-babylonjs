import { PickingInfo } from "@babylonjs/core/Collisions/pickingInfo";
import { BackgroundMaterial, StandardMaterial } from "@babylonjs/core/Materials";
import { Color3, Plane, Vector2, Vector3 } from "@babylonjs/core/Maths/math";
import { Mesh, MeshBuilder } from "@babylonjs/core/Meshes";
import { UtilityLayerRenderer } from "@babylonjs/core/Rendering/utilityLayerRenderer";
import { Scene } from "@babylonjs/core/scene";
import { ShapeFactory, ShapeParams } from "./factory";
import { Nullable } from "@babylonjs/core/types";
import { assertNonNull } from "./utils/assert";
import { BoundingBox } from "@babylonjs/core/Culling/boundingBox";
import { IDroppinGizmo, IDroppinGround } from "./interfaces";


export interface IFactory {
    createGhost(scene: Scene): Mesh;
    createEntity(scene: Scene): Mesh;
}


export class DroppinGround implements IDroppinGround {
    plane: Plane;
    bounds: BoundingBox;
    scene: Scene;
    picked: Nullable<PickingInfo> = null;

    _rect: DOMRect;

    constructor(scene: Scene, plane: Plane, groundsize: number) {
        this.scene = scene;
        this.plane = plane;
        this.bounds = new BoundingBox(
            new Vector3(-0.5 * groundsize, -0.5, -0.5 * groundsize),
            new Vector3(+0.5 * groundsize, +0.5, +0.5 * groundsize),
        )
        this._rect = this.resize();
    }

    resize(): DOMRect {
        this._rect = <DOMRect>this.scene.getEngine().getRenderingCanvasClientRect();
        return this._rect;
    }

    _eventRay(event: { clientX: number, clientY: number }) {
        // NB: no check for OOB
        const screenX = event.clientX - this._rect.left;
        const screenY = event.clientY - this._rect.top;
        return this.scene.createPickingRay(screenX, screenY, null, this.scene.activeCamera);
    }

    pickEvent(event: { clientX: number, clientY: number }) {
        this.picked = new PickingInfo();
        let dist: number | null = null;

        this.picked.ray = this._eventRay(event);

        if (this.picked.ray) {
            dist = this.picked.ray.intersectsPlane(this.plane);
            this.picked.pickedPoint = dist ? this.picked.ray!.origin.add(this.picked.ray!.direction.scale(dist)) : null;
        }

        if (this.picked.pickedPoint) {
            this.picked.hit = this.bounds.intersectsPoint(this.picked.pickedPoint);
        }

        this.hit = this.picked.hit;
    }

    _hit: Nullable<boolean> = null;
    get hit(): Nullable<boolean> {
        return this._hit;
    }

    set hit(val: boolean) {
        if (val && !this._hit) this.onpickenter(this.picked!);
        if (!val && this._hit) this.onpickleave(this.picked!);
        this._hit = val;
    }

    onpickenter = (pick: PickingInfo) => { };
    onpickleave = (pick: PickingInfo) => { };

}

export class DroppinGizmo implements IDroppinGizmo<ShapeFactory> {
    gizmoLayer: UtilityLayerRenderer;

    _ghostMesh: Nullable<Mesh> = null;
    _factory: Nullable<ShapeFactory> = null;

    constructor(layer: UtilityLayerRenderer) {
        this.gizmoLayer = layer;
    }

    get attachedFactory(): Nullable<ShapeFactory> {
        return this._factory;
    }

    set attachedFactory(factory: ShapeFactory | null) {
        this._factory = factory;
        if (factory) this._attach(); else this._detach();
    }

    _attach() {
        this._ghostMesh = this._factory!.createGhost(this.gizmoLayer.utilityLayerScene);
        this._ghostMesh.setEnabled(false);
    }

    _detach() {
        if (this._ghostMesh) { this._ghostMesh.dispose(); this._ghostMesh = null; }
    }

    drag(pick: PickingInfo) {
        assertNonNull(this._ghostMesh);
        this._ghostMesh.setEnabled(pick.hit);
        if (!pick.hit || !pick.pickedPoint) return;
        this._ghostMesh.position.copyFrom(pick.pickedPoint);
    }

    drop(pick: PickingInfo): Mesh | null {
        assertNonNull(this._factory);
        if (!pick.hit || !pick.pickedPoint) return null;
        const mesh = this._factory.createEntity(this.gizmoLayer.originalScene);
        mesh.position.copyFrom(pick.pickedPoint!);
        this._detach();
        return mesh;
    }
}