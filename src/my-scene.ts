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
import { Callout, Bridge, AnnotationGizmoBase } from "./annotations";
import { assertNonNull } from "./utils/asserts";
import { Observer } from "@babylonjs/core/Misc/observable";
import { applyStyles } from "./utils/styles";

const STYLES = {
    callout: {
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
        tag: {
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

class MyAnnotationGizmo extends AnnotationGizmoBase {
    
    constructor(scene: Scene, gui: AdvancedDynamicTexture) {
        super(scene, gui);

        this.anchors = {
            tc: new TransformNode("anchor-tc", this.scene),
            bc: new TransformNode("anchor-bc", this.scene),
        }

        this.callouts = {
            t: new Callout("callout-t"),
            b: new Callout("callout-b"),
        };

        this.bridges = {
            h: new Bridge("bridge-h")
        }

        this._initStyles(STYLES);
        this._addControls();

        this.bridges.h.anchor1 = this.callouts.t;
        this.bridges.h.anchor2 = this.callouts.b;
        this.callouts.t.linkWithMesh(this.anchors.tc);
        this.callouts.b.linkWithMesh(this.anchors.bc);
        this.callouts.t.linkOffsetX = STYLES.offset;
        this.callouts.b.linkOffsetX = STYLES.offset;
    }

    _update() {
        assertNonNull(this._attachedMesh);
        const bbox = this._attachedMesh.getBoundingInfo().boundingBox;

        // NB: local coords
        this.anchors.tc.position = new Vector3(bbox.center.x, bbox.maximum.y, bbox.center.z);
        this.anchors.bc.position = new Vector3(bbox.center.x, bbox.minimum.y, bbox.center.z);
        // NB: world, unrotated
        this.bridges.h.label.text = bbox.extendSizeWorld.y.toFixed(2);
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

    _anngizmo!: MyAnnotationGizmo;
    initGUI() {
        this.gui = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        this._anngizmo = new MyAnnotationGizmo(this.scene, this.gui);
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
        this._anngizmo.attachedMesh = this._picked;
    }

    unpick() {
        if (this._picked) this._picked.renderOutline = false;
        this._picked = null;
        this._anngizmo.attachedMesh = null;
    }
} 