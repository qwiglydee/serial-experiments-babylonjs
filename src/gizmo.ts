import { PickingInfo } from "@babylonjs/core/Collisions/pickingInfo";
import { Mesh } from "@babylonjs/core/Meshes";
import { UtilityLayerRenderer } from "@babylonjs/core/Rendering/utilityLayerRenderer";
import { Scene } from "@babylonjs/core/scene";
import { Nullable } from "@babylonjs/core/types";

import { ShapeFactory } from "./factory";
import { IDroppinGizmo } from "./interfaces";
import { assertNonNull } from "./utils/assert";


export interface IFactory {
    createGhost(scene: Scene): Mesh;
    createEntity(scene: Scene): Mesh;
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
        if (!pick.hit || !pick.pickedPoint) return;
        this._ghostMesh.position.copyFrom(pick.pickedPoint);
    }

    drop(pick: PickingInfo): Mesh | null {
        assertNonNull(this._factory);
        if (!pick.hit || !pick.pickedPoint) return null;
        if (!pick.hit || !pick.pickedPoint) return null;
        const mesh = this._factory.createEntity(this.gizmoLayer.originalScene);
        mesh.position.copyFrom(pick.pickedPoint!);
        this._detach();
        return mesh;
    }
}