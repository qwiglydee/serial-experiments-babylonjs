import { css, html, LitElement, nothing, PropertyValues } from "lit";
import { customElement, state } from "lit/decorators.js";
import { consume } from "@lit/context";

import { Nullable } from "@babylonjs/core/types";
import { Scene } from "@babylonjs/core/scene";

import { sceneContext } from "./context";

@customElement("my-something")
export class MySomething extends LitElement {
    @consume({ context: sceneContext, subscribe: true })
    @state()
    scene: Nullable<Scene> = null;

    static override styles = [
        css`
            :host {
                display: block;
                position: absolute;
                z-index: 10;
                width: 100%;
                height: auto;
                bottom: 0;
                border: 1px solid magenta;
            }
        `
    ]

    override render() {
        if (this.scene === null) return html`something going`;
        return html`something ready`;
    }

    override update(changed: PropertyValues) {
        if (changed.has('scene') && this.scene !== null) this.init();
        super.update(changed);
    }

    override firstUpdated(changes: PropertyValues): void {
        console.debug("something created");
    }

    init() {
        console.debug("something got scene", this.scene);
    }
} 