import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";

import { ArcRotateCamera } from "@babylonjs/core/Cameras";
import { PickingInfo } from "@babylonjs/core/Collisions/pickingInfo";
import { AxesViewer } from "@babylonjs/core/Debug";
import { Engine } from "@babylonjs/core/Engines";
import { KeyboardEventTypes, KeyboardInfo, PointerEventTypes, PointerInfo } from "@babylonjs/core/Events";
import "@babylonjs/core/Helpers/sceneHelpers";
import { BackgroundMaterial } from "@babylonjs/core/Materials";
import { Color3, Vector3 } from "@babylonjs/core/Maths";
import { Mesh, MeshBuilder } from "@babylonjs/core/Meshes";
import "@babylonjs/core/Rendering/outlineRenderer";
import { UtilityLayerRenderer } from "@babylonjs/core/Rendering/utilityLayerRenderer";
import { Scene } from "@babylonjs/core/scene";
import { Nullable } from "@babylonjs/core/types";
import { consume } from "@lit/context";

import { draggingContext } from "./context";
import { ShapeFactory, ShapeParams } from "./factory";
import { AimingGizmo } from "./gizmo";
import { assertNonNull } from "./utils/assert";
import { bubbleEvent } from "./utils/events";

@customElement("my-scene")
export class MyScene extends LitElement {
    @property({ type: Number })
    groundsize: number = 8;

    @consume({ context: draggingContext, subscribe: true })
    @state()
    draggingData: Nullable<ShapeParams> = null;

    static override styles = css`
        :host {
            display: block;
        } 

        canvas {
            width: 100%;
            height: 100%;
        }
    `

    @query("canvas") canvas!: HTMLCanvasElement;

    override render() {
        return html`<canvas></canvas>`;
    }

    override update(changes: PropertyValues) {
        super.update(changes); // NB: refreshes html
        if (this.hasUpdated) {
            if (changes.has('groundsize')) this.updateGround();
            if (changes.has('draggingData')) this.ondragging();
        }
    }

    override firstUpdated() {
        this.initScene();
        this.initUtils();
        this.createStuff();

        window.addEventListener("resize", () => this.engine.resize());
        this.engine.runRenderLoop(() => this.scene.render());

        this.scene.onReadyObservable.add(() => bubbleEvent(this, 'scene-ready', this.scene));
        if (this.scene.isReady()) this.scene.onReadyObservable.notifyObservers(this.scene); // may already be ready
    }

    engine!: Engine;
    scene!: Scene;

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

    utils!: UtilityLayerRenderer;
    gizmo!: AimingGizmo;

    initUtils() {
        this.utils = UtilityLayerRenderer.DefaultUtilityLayer;
        this.createGrid(this.utils);
        new AxesViewer(this.utils.utilityLayerScene);
        this.gizmo = new AimingGizmo(this.utils);
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
        this._picked.renderOutline = true;
        this._picked.outlineColor = Color3.White();
        this._picked.outlineWidth = 0.05;
    }

    unpick() {
        if (this._picked) this._picked.renderOutline = false;
        this._picked = null;
    }

    ondragging = () => {
        // this.draggingData updated
        console.debug("myscene.draggingData=", this.draggingData);
        if (this.draggingData) {
            this.gizmo.factory = new ShapeFactory(this.scene, this.draggingData!);
            this.gizmo.constraints = { radius: 0.5 * this.groundsize };
        } else {
            this.gizmo.cancel();
            this.gizmo.factory = null;
            this.gizmo.constraints = null;
        }
    }

    override ondragenter = (event: DragEvent) => {
        event.preventDefault();
        assertNonNull(this.draggingData);
        const pick = this.gizmo.pick(event);
        console.debug("myscene", event.type, pick.hit, pick.pickedPoint, this.draggingData);
        this.gizmo.grab(pick);
    }

    override ondragleave = (event: DragEvent) => {
        console.debug("myscene", event.type);
        this.gizmo.cancel();
    };

    override ondragover = (event: DragEvent) => {
        event.preventDefault();
        const pick = this.gizmo.pick(event);
        // console.debug("myscene", event.type, pick.hit, pick.pickedPoint);
        this.gizmo.drag(pick);
    }

    override ondrop = (event: DragEvent) => {
        event.preventDefault();
        const pick = this.gizmo.pick(event);
        console.debug("myscene", event.type, pick.hit, pick.pickedPoint, this.draggingData);
        if (!pick.hit) return;
        this.gizmo.drop(pick);
    }

}