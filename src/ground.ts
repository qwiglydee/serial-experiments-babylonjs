import { Nullable } from "@babylonjs/core/types";
import { Plane, Vector3 } from "@babylonjs/core/Maths";
import { BoundingBox } from "@babylonjs/core/Culling/";
import { Scene } from "@babylonjs/core/scene";
import { PickingInfo } from "@babylonjs/core/Collisions";

import { IDroppinGround } from "./interfaces";


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
            new Vector3(+0.5 * groundsize, +0.5, +0.5 * groundsize)
        );
        this._rect = this.resize();
    }

    resize(): DOMRect {
        this._rect = <DOMRect>this.scene.getEngine().getRenderingCanvasClientRect();
        return this._rect;
    }

    _eventRay(event: { clientX: number; clientY: number; }) {
        // NB: no check for OOB
        const screenX = event.clientX - this._rect.left;
        const screenY = event.clientY - this._rect.top;
        return this.scene.createPickingRay(screenX, screenY, null, this.scene.activeCamera);
    }

    pickEvent(event: { clientX: number; clientY: number; }) {
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
