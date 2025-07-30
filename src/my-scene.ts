import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property, query } from "lit/decorators.js";

import { Engine } from "@babylonjs/core/Engines";
import { Scene } from "@babylonjs/core/scene";
import "@babylonjs/core/Helpers/sceneHelpers";
import { ArcRotateCamera } from "@babylonjs/core/Cameras";
import { AbstractMesh, Mesh, MeshBuilder, TransformNode } from "@babylonjs/core/Meshes";
import { UtilityLayerRenderer } from "@babylonjs/core/Rendering/utilityLayerRenderer";
import { Color3, Vector3 } from "@babylonjs/core/Maths";
import { BackgroundMaterial } from "@babylonjs/core/Materials";
import { AxesViewer } from "@babylonjs/core/Debug";

import { bubbleEvent } from "./utils/events";
import { KeyboardEventTypes, KeyboardInfo, PointerEventTypes, PointerInfo } from "@babylonjs/core/Events";
import { PickingInfo } from "@babylonjs/core/Collisions/pickingInfo";

import "@babylonjs/core/Rendering/outlineRenderer";
import { Nullable } from "@babylonjs/core/types";
import { AdvancedDynamicTexture } from "@babylonjs/gui/2D/advancedDynamicTexture";
import { Anchor, Bridge } from "./annotations";

const STYLES = {
    anchor: {
        width: "8px",
        height: "8px",
        color: "#FFFFFF",
        lineWidth: 1,
    },
    bridge: {
        line: {
            lineWidth: 3,
            color: "#FFFFFF",
        },
        pill: {
            widthInPixels: 32,
            heightInPixels: 20,
            cornerRadius: 10,
            background: "#FFFFFF",

        },
        label: {
            fontSizeInPixels: 12,
            paddingTopInPixels: 4, 
            paddingBottomInPixels: 4, 
            paddingLeftInPixels: 8,
            paddingRightInPixels: 8,
        }
    },
    offset: 128
}

function applyStyles(something: any, styles: any) {
    for(let prop in styles) {
        something[prop] = styles[prop];
    }
}


@customElement("my-scene")
export class MyScene extends LitElement {
    @property({ type: Number })
    groundsize: number = 8;

    static override styles = css`
        :host {
            display: block;
        } 

        canvas {
            width: 100%;
            height: 100%;
        }
    `

    @query("canvas")
    canvas!: HTMLCanvasElement;

    engine!: Engine;
    scene!: Scene;
    utils!: UtilityLayerRenderer;
    gui!: AdvancedDynamicTexture;

    override render() {
        return html`<canvas></canvas>`;
    }

    override update(changes: PropertyValues) {
        super.update(changes); // NB: refreshes html
        if (this.hasUpdated) {
            if (changes.has('groundsize')) this.updateGround();
        }
    }

    override firstUpdated() {
        this.initScene();
        this.initUtils();
        this.initGUI();
        this.createStuff();

        window.addEventListener("resize", () => this.engine.resize());
        this.engine.runRenderLoop(() => this.scene.render());

        this.scene.onReadyObservable.add(() => bubbleEvent(this, 'scene-ready', this.scene));
        if (this.scene.isReady()) this.scene.onReadyObservable.notifyObservers(this.scene); // may already be ready
    }

    initScene() {
        this.engine = new Engine(this.canvas, true);
        this.scene = new Scene(this.engine);
        this.scene.useRightHandedSystem = true;
        this.scene.createDefaultEnvironment({ groundSize: this.groundsize });
        this.scene.createDefaultLight(true);
        let camera = new ArcRotateCamera("camera", .375 * Math.PI, .375 * Math.PI, this.groundsize, Vector3.Zero(), this.scene);
        this.scene.switchActiveCamera(camera, true);

        this.scene.onPointerObservable.add((info: PointerInfo) => {
            if (info.type != PointerEventTypes.POINTERTAP || !info.pickInfo) return;
            if (info.pickInfo.pickedMesh) {
                this.onpick(<PointerEvent>info.event, <PickingInfo>info.pickInfo);
            } else {
                this.unpick();
            }
        });

        this.scene.onKeyboardObservable.add((info: KeyboardInfo) => {
            if (info.type == KeyboardEventTypes.KEYDOWN && info.event.code == 'Space' && this._picked) {
                this._picked.position = new Vector3(
                    (Math.random() - 0.5) * this.groundsize,
                    0,
                    (Math.random() - 0.5) * this.groundsize,
                )
                this._picked.scaling = Vector3.One().scale(Math.random() + 0.5);
                this._picked.computeWorldMatrix();
            }
        })
    }

    initUtils() {
        this.utils = UtilityLayerRenderer.DefaultUtilityLayer;
        this.createGrid(this.utils);
        new AxesViewer(this.utils.utilityLayerScene);
    }

    _anchorNodes: { [key: string]: TransformNode } = {};
    _anchors: { [key: string]: Anchor } = {};
    _bridges: { [key: string]: Bridge } = {};
    initGUI() {
        this.gui = AdvancedDynamicTexture.CreateFullscreenUI("UI");

        this._anchorNodes = {
            t: new TransformNode("anchor-t"),
            b: new TransformNode("anchor-b"),
            l: new TransformNode("anchor-l"),
            r: new TransformNode("anchor-r"),
        }

        this._anchors.h1 = new Anchor("anchor-h1");
        applyStyles(this._anchors.h1, STYLES.anchor);
        this.gui.addControl(this._anchors.h1);
        this._anchors.h1.linkWithMesh(this._anchorNodes.t);
        this._anchors.h1.linkOffsetX = STYLES.offset;

        this._anchors.h2 = new Anchor("anchor-h2");
        applyStyles(this._anchors.h2, STYLES.anchor);
        this.gui.addControl(this._anchors.h2);
        this._anchors.h2.linkWithMesh(this._anchorNodes.b);
        this._anchors.h2.linkOffsetX = STYLES.offset;

        this._bridges.h = new Bridge("bridge-h");
        this.gui.addControl(this._bridges.h);
        applyStyles(this._bridges.h.line, STYLES.bridge.line);
        applyStyles(this._bridges.h.pill, STYLES.bridge.pill);
        applyStyles(this._bridges.h.label, STYLES.bridge.label);
        this._bridges.h.anchor1 = this._anchors.h1;
        this._bridges.h.anchor2 = this._anchors.h2;

        this._anchors.w1 = new Anchor("anchor-w1");
        applyStyles(this._anchors.w1, STYLES.anchor);
        this.gui.addControl(this._anchors.w1);
        this._anchors.w1.linkWithMesh(this._anchorNodes.l);
        this._anchors.w1.linkOffsetY = STYLES.offset;

        this._anchors.w2 = new Anchor("anchor-h2");
        applyStyles(this._anchors.w2, STYLES.anchor);
        this.gui.addControl(this._anchors.w2);
        this._anchors.w2.linkWithMesh(this._anchorNodes.r);
        this._anchors.w2.linkOffsetY = STYLES.offset;

        this._bridges.w = new Bridge("bridge-w");
        this.gui.addControl(this._bridges.w);
        applyStyles(this._bridges.w.line, STYLES.bridge.line);
        applyStyles(this._bridges.w.pill, STYLES.bridge.pill);
        applyStyles(this._bridges.w.label, STYLES.bridge.label);
        this._bridges.w.anchor1 = this._anchors.w1;
        this._bridges.w.anchor2 = this._anchors.w2;
    }

    annotateMesh(mesh: AbstractMesh) {
        const bbox = mesh.getBoundingInfo().boundingBox;
        this._anchorNodes.l.position = new Vector3(bbox.minimumWorld.x, bbox.minimumWorld.y, bbox.centerWorld.z);
        this._anchorNodes.r.position = new Vector3(bbox.maximumWorld.x, bbox.minimumWorld.y, bbox.centerWorld.z);
        this._anchorNodes.t.position = new Vector3(bbox.centerWorld.x, bbox.maximumWorld.y, bbox.centerWorld.z);
        this._anchorNodes.b.position = new Vector3(bbox.centerWorld.x, bbox.minimumWorld.y, bbox.centerWorld.z);

        this._bridges.h.label.text = (bbox.extendSizeWorld.y * 2).toFixed(2);
        this._bridges.w.label.text = (bbox.extendSizeWorld.x * 2).toFixed(2);
        Object.entries(this._anchors).forEach(([n, e]) => e.isVisible = true);
        Object.entries(this._bridges).forEach(([n, e]) => e.isVisible = true);
    }

    clearAnnotations() {
        Object.entries(this._anchors).forEach(([n, e]) => e.isVisible = false);
        Object.entries(this._bridges).forEach(([n, e]) => e.isVisible = false);
    }

    _gridMesh!: Mesh;
    createGrid(layer: UtilityLayerRenderer) {
        const scene = layer.utilityLayerScene;

        this._gridMesh = new Mesh("grid");
        this._gridMesh.scaling.x = 0.125;
        this._gridMesh.scaling.z = 0.125;

        const maj = 8;
        const dim = this.groundsize * maj / 2;
        let majlines: Array<Array<Vector3>> = [], minlines: Array<Array<Vector3>> = [];
        for (let i = -dim; i <= dim; i++) {
            let lines = (i % maj == 0) ? majlines : minlines;
            lines.push([new Vector3(-dim, 0, i), new Vector3(+dim, 0, i)])
            lines.push([new Vector3(i, 0, -dim), new Vector3(i, 0, +dim)])
        }

        let majMesh = MeshBuilder.CreateLineSystem("grid.maj", { lines: majlines }, scene);
        majMesh.isPickable = false;
        majMesh.material = new BackgroundMaterial("grid.maj", scene)
        majMesh.material.alpha = 0.25;
        majMesh.parent = this._gridMesh;

        let minMesh = MeshBuilder.CreateLineSystem("grid.min", { lines: minlines }, scene);
        minMesh.isPickable = false;
        minMesh.material = new BackgroundMaterial("grid.min", scene)
        minMesh.material.alpha = 0.125;
        minMesh.parent = this._gridMesh;
    }

    updateGround() {
        this._gridMesh.dispose();
        this.createGrid(this.utils);
    }

    createStuff() {
        let mesh: Mesh;

        mesh = MeshBuilder.CreateBox("box", {});
        mesh.position = new Vector3(-1, 0.5, -1);

        mesh = MeshBuilder.CreateSphere("ball", {});
        mesh.position = new Vector3(-2, 0.5, 2);

        mesh = MeshBuilder.CreateCylinder("cone", { diameterTop: 0 });
        mesh.position = new Vector3(2, 1, -2);
    }


    _picked: Nullable<Mesh> = null;

    onpick(event: PointerEvent, pickinfo: PickingInfo) {
        if (this._picked) this.unpick();
        this._picked = <Mesh>pickinfo.pickedMesh!;
        console.debug("picked", this._picked.name, pickinfo.pickedPoint);
        this.annotateMesh(this._picked);
    }

    unpick() {
        if (this._picked) this._picked.renderOutline = false;
        this._picked = null;
        this.clearAnnotations();
    }
} 