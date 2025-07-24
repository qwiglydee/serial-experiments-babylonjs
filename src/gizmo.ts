import { PickingInfo } from "@babylonjs/core/Collisions/pickingInfo";
import { StandardMaterial } from "@babylonjs/core/Materials";
import { Color3, Plane, Vector2, Vector3 } from "@babylonjs/core/Maths/math";
import { Mesh, MeshBuilder } from "@babylonjs/core/Meshes";
import { UtilityLayerRenderer } from "@babylonjs/core/Rendering/utilityLayerRenderer";
import { Scene } from "@babylonjs/core/scene";
import { ShapeFactory, ShapeParams } from "./factory";
import { Nullable } from "@babylonjs/core/types";
import { assertNonNull } from "./utils/assert";
import { BoundingBox } from "@babylonjs/core/Culling/boundingBox";


export interface IFactory {
    createGhost(scene: Scene): Mesh;
    createEntity(scene: Scene): Mesh;
}

export interface IDroppinGround {
    plane: Plane;
    bounds: BoundingBox;

    pick(event: { clientX: number, clientY: number }): PickingInfo;
}

export interface IDroppinGizmo<IFactory> {
    attachedFactory: Nullable<IFactory>;

    drag(pick: PickingInfo): void;
    drop(pick: PickingInfo): Mesh | null;
}

export class DroppinGround implements IDroppinGround {
    plane: Plane;
    bounds: BoundingBox;
    scene: Scene;
    _rect: DOMRect;

    constructor(scene: Scene, plane: Plane, groundsize: number) {
        this.scene = scene;
        this.plane = plane;
        this.bounds = new BoundingBox(
            new Vector3(-0.5 * groundsize, -0.5, -0.5 * groundsize),
            new Vector3(+0.5 * groundsize, +0.5, +0.5 * groundsize),
        )
        this._rect = <DOMRect>this.scene.getEngine().getRenderingCanvasClientRect(); // should be updated on resize
    }

    _eventRay(event: { clientX: number, clientY: number }) {
        const screenX = event.clientX - this._rect.left;
        const screenY = event.clientY - this._rect.top;
        return this.scene.createPickingRay(screenX, screenY, null, this.scene.activeCamera);
    }

    pick(event: { clientX: number, clientY: number }): PickingInfo {
        let pick = new PickingInfo();

        pick.ray = this._eventRay(event);
        let dist: number | null = pick.ray.intersectsPlane(this.plane);

        if (dist) {
            pick.pickedPoint = pick.ray.origin.add(pick.ray.direction.scale(dist));
            pick.hit = this.bounds.intersectsPoint(pick.pickedPoint);
        }

        return pick;
    }
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
        if (pick.hit && pick.pickedPoint) this._ghostMesh.position.copyFrom(pick.pickedPoint);
    }

    drop(pick: PickingInfo): Mesh | null {
        if (!pick.hit) return null;
        assertNonNull(this._factory);
        const mesh = this._factory.createEntity(this.gizmoLayer.originalScene);
        mesh.position.copyFrom(pick.pickedPoint!);
        this._detach();
        return mesh;
    }
}