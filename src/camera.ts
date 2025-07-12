import { ArcRotateCamera, ComputeAlpha, ComputeBeta } from "@babylonjs/core/Cameras";
import { Vector3 } from "@babylonjs/core/Maths";

export function interpolateTarget(camera: ArcRotateCamera, newtarget: Vector3) {
    // the same math as in ArcRotateCamera.rebuildAnglesAndRadius
    let vector = camera.position.subtract(newtarget);
    let radius = vector.length();
    if (radius === 0) radius = 0.0001;
    let alpha = ComputeAlpha(vector);
    let beta = ComputeBeta(vector.y, radius);

    const alphaCorrectionTurns = Math.round((camera.alpha - alpha) / (2.0 * Math.PI));
    alpha += alphaCorrectionTurns * 2.0 * Math.PI;

    camera.interpolateTo(alpha, beta, radius, newtarget);
}
