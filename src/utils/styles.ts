export function applyStyles(something: any, styles?: any) {
    if (!styles) return;
    for(let [k, v] of Object.entries(styles)) {
        if (v && v.constructor.name == 'Object') applyStyles(something[k], v);
        else something[k] = v;
    }
}