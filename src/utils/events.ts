export function bubbleEvent<T>(that: HTMLElement, type: string, detail?: T) {
    that.dispatchEvent(new CustomEvent<T>(type, { detail, bubbles: true, composed: true }));
}

export function origTarget(event: Event) {
    return <HTMLElement>event.composedPath()[0];
}
