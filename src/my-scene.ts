import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property, query } from "lit/decorators.js";

import { Engine } from "@babylonjs/core/Engines";
import { Scene } from "@babylonjs/core/scene";
import "@babylonjs/core/Helpers/sceneHelpers";
import { ArcRotateCamera } from "@babylonjs/core/Cameras";
import { Mesh, MeshBuilder } from "@babylonjs/core/Meshes";
import { UtilityLayerRenderer } from "@babylonjs/core/Rendering/utilityLayerRenderer";
import { Color3, Plane, Vector3 } from "@babylonjs/core/Maths";
import { BackgroundMaterial, StandardMaterial } from "@babylonjs/core/Materials";
import { PickingInfo } from "@babylonjs/core/Collisions";
import { AxesViewer } from "@babylonjs/core/Debug";

import { bubbleEvent } from "./utils/events";
import { ShapeParams, ShapeFactory } from "./factory";
import { AimingGizmo, GroundConstraints } from "./gizmo";
import { consume } from "@lit/context";
import { draggingContext } from "./context";
import { Nullable } from "@babylonjs/core";
import { assertNonNull } from "./utils/assert";

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

    @query("canvas") canvas!: HTMLCanvasElement;

    override render() {
        return html`<canvas></canvas>`;
    }

    override update(changes: PropertyValues) {
        super.update(changes); // NB: may redraw html
        if (this.hasUpdated) {
            if (changes.has('groundsize')) this.updateGround();
        }
    }

    override firstUpdated() {
        this.initScene();
        this.initUtils();
        this.initDragging();

        window.addEventListener("resize", () => this.engine.resize());
        this.scene.onReadyObservable.add(() => bubbleEvent(this, 'scene-ready', this.scene))
        this.engine.runRenderLoop(() => this.scene.render());
    }

    engine!: Engine;
    scene!: Scene;
    utils!: UtilityLayerRenderer;

    initScene() {
        this.engine = new Engine(this.canvas, true);
        this.scene = new Scene(this.engine);
        this.scene.useRightHandedSystem = true;

        this.scene.createDefaultEnvironment({ groundSize: this.groundsize });
        this.scene.createDefaultLight(true);
        this.scene.createDefaultCamera(true, true, true);
        let camera = <ArcRotateCamera>this.scene.activeCamera;
        camera.alpha = .375 * Math.PI;
        camera.beta = .375 * Math.PI;
        camera.radius = this.groundsize;
    }

    initUtils() {
        this.utils = UtilityLayerRenderer.DefaultUtilityLayer;
        this.createGrid(this.utils);
        new AxesViewer(this.scene);
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

    @consume({ context: draggingContext, subscribe: true })
    draggingData: Nullable<ShapeParams> = null;

    gizmo!: AimingGizmo;

    initDragging() {
        const target = this.canvas;

        target.addEventListener('dragenter', (event: DragEvent) => {
            event.preventDefault();
            assertNonNull(this.draggingData);
            this.gizmo.constraints = { radius: 0.5 * this.groundsize }; // NB: should be set before picking
            this.gizmo.factory = new ShapeFactory(this.scene, this.draggingData);
            const pick = this.gizmo.pick(event);
            console.debug("myscene", event.type, pick.hit, pick.pickedPoint, this.draggingData);
            this.gizmo.grab(pick);
        });

        target.addEventListener('dragover', (event: DragEvent) => {
            event.preventDefault();
            const pick = this.gizmo.pick(event);
            // console.debug("myscene", event.type, pick.hit, pick.pickedPoint);
            this.gizmo.drag(pick);
        });

        target.addEventListener('drop', (event: DragEvent) => {
            event.preventDefault();
            const pick = this.gizmo.pick(event);
            console.debug("myscene", event.type, pick.hit, pick.pickedPoint, this.draggingData);
            if (!pick.hit) return;
            this.gizmo.drop(pick);
        });

        target.addEventListener('dragleave', (event: DragEvent) => {
            console.debug("myscene", event.type);
            this.gizmo.cancel();
        });

        // this may happen enywere
        target.ownerDocument.body.addEventListener('dragend', (event: DragEvent) => {
            console.debug("body", event.type);
            this.gizmo.cancel();
        });
    }
}