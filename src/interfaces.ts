import { PickingInfo } from "@babylonjs/core/Collisions/pickingInfo";
import { BoundingBox } from "@babylonjs/core/Culling/boundingBox";
import { Plane } from "@babylonjs/core/Maths";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Nullable } from "@babylonjs/core/types";


export interface IDroppinGround {
    plane: Plane;
    bounds: BoundingBox;

    /** map native event to pick point on the ground and check if i'ts in valid landing place */
    pickEvent(event: { clientX: number, clientY: number }): void;

    /** the last picking info with `picked.hit` == landing point is valid */
    picked: PickingInfo | null;
    /** validness of last pick */
    hit: boolean | null;

    /** handler to call when draggable enters valid landing zone */
    onpickenter: (pick: PickingInfo) => void;
    /** handler to call when draggable exits valid landing zone */
    onpickleave: (pick: PickingInfo) => void;
}


export interface IDroppinGizmo<FactoryType> {
    /** whatever machinery needed to create ghosts and entities */
    attachedFactory: Nullable<FactoryType>;

    /** move gizmo-ghost to the position on the ground */
    drag(pick: PickingInfo): void;
    /** drop entity in the position on the ground */
    drop(pick: PickingInfo): Mesh | null;
}


export interface ITargetableElement<DragDataType> {
    /** (simulated) dragging started somewhere on our page with the dragging data initiaized */
    _ondragstart(data: DragDataType): void;
    /** (simulated) dragging ended anywere on our page (dropped or cancelled) and the dragging data discarded */
    _ondragend(): void;

    /** (native) dragging enters scene's canvas */
    ondragenter(event: DragEvent): void;
    /** (native) dragging leaves scene's canvas */
    ondragleave(event: DragEvent): void;
    /** (native) dragging pointer moving over canvas (either over the ground or not) */
    ondragover(event: DragEvent): void;
    /** (native) dropping over canvas (either over the ground or not) */
    ondrop(event: DragEvent): void;

    /** (grounded) dragging ray enters valid landing ground */
    onpickenter(pick: PickingInfo): void;
    /** (grounded) dragging ray leaves valid landing ground */
    onpickleave(pick: PickingInfo): void;

    /** dragging ray over the ground */
    onpickdrag(picked: PickingInfo): void;
    /** dropping ray on the ground */
    onpickdrop(picked: PickingInfo): void;
}
