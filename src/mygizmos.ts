import { Vector3 } from "@babylonjs/core/Maths";
import { PointerDragBehavior } from "@babylonjs/core/Behaviors/Meshes/pointerDragBehavior";
import { BackgroundMaterial } from "@babylonjs/core/Materials";
import { AbstractMesh, MeshBuilder } from "@babylonjs/core/Meshes";

import { BaseBoxGizmo, BaseGizmo } from "./gizmo";
import { BoundingBox } from "@babylonjs/core/Culling/boundingBox";

export class MyMovingGizmo extends BaseGizmo {

    createDragging() {
        const behavior = new PointerDragBehavior({ dragAxis: Vector3.Up() });
        behavior.moveAttached = true;
        behavior.updateDragPlane = false;
        return behavior;
    }

    createHandle() {
        const handle = MeshBuilder.CreateIcoSphere(`${this.name}.handle`, { radius: 0.1, subdivisions: 2 }, this.gizmoScene);
        handle.material = new BackgroundMaterial("handle", this.gizmoScene);
        return handle;
    }

    createRig() {
        return new Vector3(0, -1, 0);
    }

    onAttach(mesh: AbstractMesh) {
        console.debug(this.name, "attaching", mesh?.name);
    }

    onGrab(point: Vector3): void {
        console.debug(this.name, "grabbing", this.attachedMesh!.name, point.toString());
    }

    onDrag(point: Vector3, delta: Vector3, dragged: Vector3): void {
        // console.debug(this.name, "dragging", this.attachedMesh!.name, delta.toString());
    }

    onDrop(point: Vector3, dragged: Vector3) {
        console.debug(this.name, "dropping", this.attachedMesh!.name, dragged.toString());
        this._attachedMesh!.position.addInPlace(dragged);
        this.reset();
    }
}


export class MyScalingGizmo extends BaseBoxGizmo {

    sizelimits = { min: 0.2, max: 2.0 };

    createDragging() {
        const behavior = new PointerDragBehavior({ dragAxis: Vector3.Up() });
        behavior.moveAttached = true;
        behavior.updateDragPlane = false;
        return behavior;
    }

    createHandle() {
        const handle = MeshBuilder.CreateIcoSphere(`${this.name}.handle`, { radius: 0.1, subdivisions: 2 }, this.gizmoScene);
        handle.material = new BackgroundMaterial("handle", this.gizmoScene);
        return handle;
    }

    createRig() {
        return new Vector3(0, 1, 0);
    }

    onAttach(mesh: AbstractMesh) {
        console.debug(this.name, "attaching", mesh?.name);
    }

    onGrab(point: Vector3): void {
        console.debug(this.name, "grabbing", this.attachedMesh!.name, point.toString());
        this.grabBox();
    }

    onDrag(point: Vector3, delta: Vector3, dragged: Vector3): void {
        // console.debug(this.name, "dragging", this.attachedMesh!.name, delta.toString());

        const base = this.origBox!.minimumWorld;
        let edge = this.origBox!.maximumWorld.add(dragged);

        // clamp
        edge.y = Math.max(base.y + this.sizelimits.min, Math.min(base.y + this.sizelimits.max, edge.y));

        this.adjustBox(base, edge);
    }

    onDrop(point: Vector3, dragged: Vector3) {
        console.debug(this.name, "dropping", this.attachedMesh!.name, dragged.toString());
        this.reset();
    }
}
