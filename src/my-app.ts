import { LitElement, nothing, PropertyValues } from "lit";
import { customElement } from "lit/decorators.js";

@customElement("my-app")
export class MyApp extends LitElement {
    override createRenderRoot() {
        return this;
    }

    override render() {
        return nothing;
    }

    override connectedCallback(): void {
        super.connectedCallback()
        console.debug("app initialized");
    }

    override firstUpdated(changes: PropertyValues): void {
        console.debug("app updated");
    }
} 