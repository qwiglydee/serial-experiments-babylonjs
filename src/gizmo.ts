import { PickingInfo } from "@babylonjs/core/Collisions/pickingInfo";
import { StandardMaterial } from "@babylonjs/core/Materials";
import { Color3, Plane, Vector2, Vector3 } from "@babylonjs/core/Maths/math";
import { Mesh, MeshBuilder } from "@babylonjs/core/Meshes";
import { UtilityLayerRenderer } from "@babylonjs/core/Rendering/utilityLayerRenderer";
import { Scene } from "@babylonjs/core/scene";
import { ShapeFactory, ShapeParams } from "./factory";
import { Nullable } from "@babylonjs/core/types";
import { assertNonNull } from "./utils/assert";


export interface GroundConstraints {
    radius: number;
}

export interface IAimingGizmo {
    factory: Nullable<ShapeFactory>;
    constraints: Nullable<GroundConstraints>;

    /** create picking ray and check ground intersection and constraints, `PickingInfo.hit` == validness */
    pick(event: { clientX: number, clientY: number }): PickingInfo;

    /** initialize and start dragging gizmo */
    grab(pick: PickingInfo): void;

    /** move gizmo or hide when invalid */
    drag(pick: PickingInfo): void;

    /** stop dragging, create and position new shape */
    drop(pick: PickingInfo): Mesh | null;

    /** cancel dragging */
    cancel(): void;
}

export class AimingGizmo implements IAimingGizmo {
    layer: UtilityLayerRenderer;
    scene: Scene;
    factory: Nullable<ShapeFactory> = null;
    constraints: Nullable<GroundConstraints> = null;
    groundplane: Plane;

    _canvas: HTMLElement;
    _ghostMesh: Nullable<Mesh> = null;

    constructor(layer: UtilityLayerRenderer) {
        this.layer = layer;
        this.scene = layer.originalScene;
        this.groundplane = Plane.FromPositionAndNormal(Vector3.Zero(), Vector3.Up());

        this._canvas = <HTMLCanvasElement>this.scene.getEngine().getRenderingCanvas();
    }

    _eventCoords(event: { clientX: number, clientY: number }) {
        const rect = this._canvas.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    _eventRay(event: { clientX: number, clientY: number }) {
        let { x, y } = this._eventCoords(event);
        return this.scene.createPickingRay(x, y, null, this.scene.activeCamera);
    }

    pick(event: { clientX: number, clientY: number }): PickingInfo {
        assertNonNull(this.constraints);
        let pick = new PickingInfo();

        pick.ray = this._eventRay(event);
        let dist: number | null = pick.ray.intersectsPlane(this.groundplane);
        if (!dist) return pick;

        pick.pickedPoint = pick.ray.origin.add(pick.ray.direction.scale(dist));
        let radius = Vector3.Distance(Vector3.Zero(), pick.pickedPoint);
        if (this.constraints && radius > this.constraints.radius) return pick;

        pick.hit = true;

        return pick;
    }

    grab(pick: PickingInfo) {
        assertNonNull(this.factory);
        this._ghostMesh = this.factory.createGhost();
        this.drag(pick);
    }

    drag(pick: PickingInfo) {
        if (!this._ghostMesh) return;
        this._ghostMesh.setEnabled(pick.hit);
        if (pick.hit) this._ghostMesh.position.copyFrom(pick.pickedPoint!);
    }

    drop(pick: PickingInfo): Mesh | null {
        assertNonNull(this.factory);
        if (!pick.hit) return null;
        const mesh = this.factory.createEntity();
        mesh.position.copyFrom(pick.pickedPoint!);
        this.cancel();
        return mesh;
    }

    cancel() {
        this._ghostMesh?.dispose();
        this._ghostMesh = null;
    }
}