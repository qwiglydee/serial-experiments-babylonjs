import { Vector3 } from "@babylonjs/core/Maths";
import { PointerDragBehavior } from "@babylonjs/core/Behaviors/Meshes/pointerDragBehavior";
import { BackgroundMaterial } from "@babylonjs/core/Materials";
import { AbstractMesh, MeshBuilder } from "@babylonjs/core/Meshes";

import { BasicGizmo } from "./gizmo";

export class MyMovingGizmo extends BasicGizmo {

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

    onDrag(point: Vector3, delta: Vector3): void {
        console.debug(this.name, "dragging", this.attachedMesh!.name, delta.toString());
        // this._attachedMesh!.position.addInPlace(delta);
    }

    onDrop(point: Vector3, travelled: Vector3) {
        console.debug(this.name, "dropping", this.attachedMesh!.name, travelled.toString());
        this._attachedMesh!.position.addInPlace(travelled); // world/local ???
        this.reset();
    }
}

