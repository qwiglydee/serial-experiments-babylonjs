import { Mesh, MeshBuilder } from "@babylonjs/core/Meshes";
import { Scene } from "@babylonjs/core/scene";

export interface ShapeParams {
    shape: string;
    size?: number;
}


export class ShapeFactory {
    scene: Scene;
    params: ShapeParams;

    constructor(scene: Scene, params: ShapeParams) {
        this.scene = scene;
        this.params = params;
        this.params.size ??= 1.0;
    }

    createMesh(): Mesh {
        switch (this.params.shape) {
            case 'cube':
                return MeshBuilder.CreateBox("cube", { size: this.params.size! }, this.scene);
            case 'sphere':
                return MeshBuilder.CreateSphere("sphere", { diameter: this.params.size!, segments: 6 }, this.scene);
            case 'diamond':
                return MeshBuilder.CreateIcoSphere("diamond", { radius: 0.5 * this.params.size!, subdivisions: 1 }, this.scene);
            default:
                throw Error("Unknown shape");
        }
    }
}