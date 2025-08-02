import { BoundingBox } from "@babylonjs/core/Culling/boundingBox";
import { ICanvasRenderingContext } from "@babylonjs/core/Engines/ICanvas";
import { Color3, Vector2 as V2, Vector3 as V3 } from "@babylonjs/core/Maths/math";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Observer } from "@babylonjs/core/Misc/observable";
import { Scene } from "@babylonjs/core/scene";
import { Nullable } from "@babylonjs/core/types";
import { AdvancedDynamicTexture } from "@babylonjs/gui/2D/advancedDynamicTexture";
import { Container } from "@babylonjs/gui/2D/controls/container";
import { Control } from "@babylonjs/gui/2D/controls/control";
import { Line } from "@babylonjs/gui/2D/controls/line";
import { Rectangle } from "@babylonjs/gui/2D/controls/rectangle";
import { TextBlock } from "@babylonjs/gui/2D/controls/textBlock";
import { Measure } from "@babylonjs/gui/2D/measure";

import { applyStyles } from "./utils/styles";
import { assertNonNull } from "./utils/asserts";


export class Callout extends Control {
    override isFocusInvisible = true;
    override isHitTestVisible = false;
    override isPointerBlocker = false;
    override _clipContent = false;
    lineWidth: number = 1;
    lineDash: Array<number> = [5, 5];
    alpha0:number = 0.0;
    alpha1:number = 1.0;

    constructor(name: string, offset: V2) {
        super(name);
        this.isEnabled = false;
        this.isVisible = false;
        this.linkOffsetX = offset.x;
        this.linkOffsetY = offset.y;
    }
    
    protected override _applyStates(context: ICanvasRenderingContext): void {
        super._applyStates(context);
        context.lineWidth = this.lineWidth;
        context.setLineDash(this.lineDash);
    }

    _cachedProjectedPosition = V3.Zero();
    override _moveToProjectedPosition(position: V3) {
        if (position.equals(this._cachedProjectedPosition)) return;
        this._cachedProjectedPosition.copyFrom(position);
        super._moveToProjectedPosition(position);
    }

    _getGradient(context: ICanvasRenderingContext): CanvasGradient  {
        const gradient = context.createLinearGradient(
            this.centerX - this.linkOffsetXInPixels, this.centerY - this.linkOffsetYInPixels,
            this.centerX, this.centerY,
        )
        const color = Color3.FromHexString(this.color);
        const colorstr = `${color.r * 255},${color.g * 255},${color.b * 255}`;
        gradient.addColorStop(0, `rgba(${colorstr}, ${this.alpha0})`);
        gradient.addColorStop(1, `rgba(${colorstr}, ${this.alpha1})`);
        return gradient;
    }


    myoffsets() {
        const xOff = this.linkOffsetXInPixels, yOff = this.linkOffsetYInPixels;
        return {
            left: xOff > 0 ? xOff : 0,
            right: xOff < 0 ? -xOff : 0,
            top: yOff > 0 ? yOff : 0,
            bottom: yOff < 0 ? -yOff : 0,
        }
    }

    override _draw(context: ICanvasRenderingContext, invalidatedRectangle?: Nullable<Measure>): void {
        context.save();

        this._applyStates(context);

        context.beginPath();
        context.moveTo(this.centerX - this.linkOffsetXInPixels, this.centerY - this.linkOffsetYInPixels);
        context.lineTo(this.centerX, this.centerY);
        context.strokeStyle = this._getGradient(context);
        context.stroke();

        context.beginPath();
        // @ts-ignore
        context.ellipse(this.centerX, this.centerY, this._currentMeasure.width / 2, this._currentMeasure.height / 2, 0, 0, 2 * Math.PI);
        context.fill();

        context.restore();
    }

    // add extended line
    override invalidateRect() {
        this._transform();
        if (this.host && this.host.useInvalidateRectOptimization) {
            let tmpMeasure = new Measure(0, 0, 0, 0);
            this._currentMeasure.transformToRef(this._transformMatrix, tmpMeasure);
            Measure.CombineToRef(tmpMeasure, this._prevCurrentMeasureTransformedIntoGlobalSpace, tmpMeasure);

            const off = this.myoffsets();

            this.host.invalidateRect(
                Math.floor(tmpMeasure.left - off.left),
                Math.floor(tmpMeasure.top - off.top),
                Math.ceil(tmpMeasure.left + tmpMeasure.width + off.right),
                Math.ceil(tmpMeasure.top + tmpMeasure.height + off.bottom)
            );
        }
    }
}


export class Bridge extends Container {
    override isFocusInvisible = true;
    override isHitTestVisible = false;
    override isPointerBlocker = false;

    line: Line;
    tag: Rectangle;
    label: TextBlock;
    
    constructor(name: string, anchor1: Control, anchor2: Control, label?: string) {
        super(name);
        this.isEnabled = false;
        this.isVisible = false;

        this.line = new Line();
        this.addControl(this.line);

        this.tag = new Rectangle();
        this.tag.adaptWidthToChildren = true;
        this.tag.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.tag.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        this.addControl(this.tag);

        this.label = new TextBlock();
        this.label.resizeToFit = true;
        this.label.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        this.label.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        this.label.text = label ?? "";
        this.tag.addControl(this.label);

        this.anchor1 = anchor1;
        this.anchor2 = anchor2;
    }

    _anc1?: Control;
    _anc2?: Control;
    get anchor1(): Control | undefined { return this._anc1; }
    set anchor1(anc: Control) {
        this._anc1 = anc;
        this._anc1.onDirtyObservable.add(() => this.markAsDirty())
    }
    get anchor2(): Control | undefined { return this._anc2; }
    set anchor2(anc: Control) {
        this._anc2 = anc;
        this._anc2.onDirtyObservable.add(() => this.markAsDirty())
    }

    override _layout(parentMeasure: Measure, context: ICanvasRenderingContext): boolean {
        const a1 = this._anc1!, a2 = this._anc2!;
        this.line.x1 = a1.centerX;
        this.line.y1 = a1.centerY;
        this.line.x2 = a2.centerX;
        this.line.y2 = a2.centerY;

        const midX = (a1.centerX + a2.centerX) / 2;
        const midY = (a1.centerY + a2.centerY) / 2;
        this.tag.leftInPixels = midX - this.tag.widthInPixels / 2;
        this.tag.topInPixels = midY - this.tag.heightInPixels / 2;

        return super._layout(parentMeasure, context);
    }
}


export abstract class AnnotationGizmoBase {
    scene: Scene;
    host: AdvancedDynamicTexture;

    _attachedMesh: Nullable<AbstractMesh> = null;

    anchors: {[key: string]: TransformNode} = {};
    callouts: {[key: string]: Callout} = {};
    bridges: {[key: string]: Bridge} = {};

    constructor(scene: Scene, host: AdvancedDynamicTexture) {
        this.scene = scene;
        this.host = host;
    }

    _initStyles(styles: { callout: any, bridge: any}) {
        for(let [_, c] of Object.entries(this.callouts)) applyStyles(c, styles.callout);
        for(let [_, c] of Object.entries(this.bridges)) applyStyles(c, styles.bridge);
    }

    _addControls() {
        for(let [_, c] of Object.entries(this.callouts)) this.host.addControl(c);
        for(let [_, c] of Object.entries(this.bridges)) this.host.addControl(c);
    }

    _linkAnchors() {
        for(let k in this.anchors) {
            assertNonNull(this.callouts.hasOwnProperty(k));
            this.callouts[k].linkWithMesh(this.anchors[k]);
        }
    }

    _visible: boolean = false;
    get isVisible(): boolean {
        return this._visible;
    }

    set isVisible(enabled: boolean) {
        for(let [_, b] of Object.entries(this.bridges)) { 
            b.isVisible = enabled; 
            b.anchor1!.isVisible = enabled;
            b.anchor2!.isVisible = enabled;
        }
    }

    get attachedMesh(): Nullable<AbstractMesh> {
        return this._attachedMesh;
    }

    set attachedMesh(mesh: Nullable<AbstractMesh>) {
        if (mesh === this._attachedMesh) return;
        if (this._attachedMesh !== null &&  mesh !== null) this._detach();
        
        this._attachedMesh = mesh;
        if (mesh) this._attach();
        else this._detach();
    }

    measuredMesh: Nullable<AbstractMesh> = null;

    _observerM?: Observer<any>;
    _observerV?: Observer<any>;
    _attach() {
        assertNonNull(this._attachedMesh);
        for(let [_, n] of Object.entries(this.anchors)) { n.parent = this._attachedMesh; }
        this._observerM = this._attachedMesh.onAfterWorldMatrixUpdateObservable.add(() => this._update());
        this._observerV = this._attachedMesh.onEnabledStateChangedObservable.add((enabled) => this.isVisible = enabled);
        this._update();
        this.isVisible = true;
    }

    _detach() {
        this.isVisible = true;
        if (this._observerM) this._observerM.remove();
        if (this._observerV) this._observerV.remove();
    }

    _update() {
        assertNonNull(this._attachedMesh);
        let bbox = this._attachedMesh.getBoundingInfo().boundingBox;
        this._updateBox(bbox);
        if (this.measuredMesh) bbox = this.measuredMesh.getBoundingInfo().boundingBox
        this._updateLabels(bbox);
    }

    abstract _updateBox(bbox: BoundingBox): void;
    abstract _updateLabels(bbox: BoundingBox): void;
}