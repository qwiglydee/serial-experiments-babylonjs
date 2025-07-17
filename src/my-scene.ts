import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property, query } from "lit/decorators.js";

import { Engine } from "@babylonjs/core/Engines";
import { Scene } from "@babylonjs/core/scene";
import "@babylonjs/core/Helpers/sceneHelpers";
import { ArcRotateCamera } from "@babylonjs/core/Cameras";
import { Mesh, MeshBuilder, VertexData } from "@babylonjs/core/Meshes";
import { UtilityLayerRenderer } from "@babylonjs/core/Rendering/utilityLayerRenderer";
import { Color3, Vector3 } from "@babylonjs/core/Maths";
import { BackgroundMaterial, FresnelParameters, StandardMaterial } from "@babylonjs/core/Materials";
import { AxesViewer } from "@babylonjs/core/Debug";

import { bubbleEvent } from "./utils/events";
import { HemisphericLight } from "@babylonjs/core/Lights";

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
        super.update(changes); // NB: refreshes html
        if (this.hasUpdated) {
            if (changes.has('groundsize')) this.updateGround();
        }
    }

    override firstUpdated() {
        this.initScene();
        this.initUtils();
        this.createRoom();
        this.createStuff();

        window.addEventListener("resize", () => this.engine.resize());
        this.engine.runRenderLoop(() => this.scene.render());

        this.scene.onReadyObservable.add(() => bubbleEvent(this, 'scene-ready', this.scene));
        if (this.scene.isReady()) this.scene.onReadyObservable.notifyObservers(this.scene); // may already be ready
    }

    engine!: Engine;
    scene!: Scene;
    utils!: UtilityLayerRenderer;

    initScene() {
        this.engine = new Engine(this.canvas, true);
        this.scene = new Scene(this.engine);
        this.scene.useRightHandedSystem = true;

        this.scene.createDefaultEnvironment({ createGround: false });
        this.createLights();
        let camera = new ArcRotateCamera("camera", .375 * Math.PI, .375 * Math.PI, 0.5 * this.groundsize, Vector3.Zero(), this.scene);
        this.scene.switchActiveCamera(camera, true);

    }

    initUtils() {
        this.utils = UtilityLayerRenderer.DefaultUtilityLayer;
        this.createGrid(this.utils);
        new AxesViewer(this.scene);
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

        mesh = MeshBuilder.CreateCylinder("ball", { height: 1, diameterTop: 0 });
        mesh.position = new Vector3(2, 0.5, -2);
    }

    createLights() {
        let light
        light = new HemisphericLight("light0", new Vector3(0, 1, 1), this.scene);
        light.intensity = 0.625;
        light = new HemisphericLight("light1", new Vector3(0, -1, 1), this.scene);
        light.intensity = 0.375;
    }

    createRoom() {
        let room = MeshBuilder.CreateBox("room", {
            width: this.groundsize, depth: this.groundsize, height: 2,
            sideOrientation: VertexData.BACKSIDE,
        }, this.scene);
        room.position.y = 1;

        let mat = new StandardMaterial("walls", this.scene);
        mat.diffuseColor = Color3.White().scale(0.5);
        mat.alpha = 0;
        mat.opacityFresnelParameters = new FresnelParameters({
            isEnabled: true,
            power: 0.3,
            leftColor: Color3.Black(),
            rightColor: Color3.White(),
        })

        room.material = mat;
    }
} 