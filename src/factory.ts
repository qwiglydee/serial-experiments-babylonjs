import { BackgroundMaterial, Material, StandardMaterial } from "@babylonjs/core/Materials";
import { Color3 } from "@babylonjs/core/Maths";
import { Mesh, MeshBuilder } from "@babylonjs/core/Meshes";
import { Scene } from "@babylonjs/core/scene";

export interface ShapeParams {
    shape: string;
    size?: number;
}


export class ShapeFactory {
    params: ShapeParams;

    constructor(params: ShapeParams) {
        this.params = params;
        this.params.size ??= 1.0;
    }

    createMesh(scene: Scene): Mesh {
        switch (this.params.shape) {
            case 'cube':
                return MeshBuilder.CreateBox("cube", { size: this.params.size! }, scene);
            case 'sphere':
                return MeshBuilder.CreateSphere("sphere", { diameter: this.params.size!, segments: 6 }, scene);
            case 'diamond':
                return MeshBuilder.CreateIcoSphere("diamond", { radius: 0.5 * this.params.size!, subdivisions: 1 }, scene);
            default:
                throw Error("Unknown shape");
        }
    }

    createEntity(scene: Scene): Mesh {
        const mesh = this.createMesh(scene);
        return mesh;
    }

    createGhost(scene: Scene): Mesh {
        const mesh = this.createMesh(scene);
        mesh.material = new BackgroundMaterial("ghost", scene);
        mesh.material.wireframe = true;
        mesh.material.alpha = 0.125;
        return mesh;
    }
}