import { LitElement, nothing, PropertyValues } from "lit";
import { customElement } from "lit/decorators.js";
import { provide } from "@lit/context";

import { Nullable } from "@babylonjs/core/types";
import { Scene } from "@babylonjs/core/scene";

import { sceneContext } from "./context";

@customElement("my-app")
export class MyApp extends LitElement {
    @provide({ context: sceneContext })
    scene: Nullable<Scene> = null;

    override createRenderRoot() {
        return this;
    }

    override render() {
        return nothing;
    }

    override connectedCallback(): void {
        super.connectedCallback();

        // @ts-ignore the event typing
        this.addEventListener('scene-ready', (e: CustomEvent<Scene>) => { this.scene = e.detail; });
    }

    override firstUpdated(changes: PropertyValues): void {
        console.debug("app created");
    }
} 