import { FreeCamera } from "@babylonjs/core/Cameras";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths";
import { Scene } from "@babylonjs/core/scene";

export function addSphericalPanningCameraToScene(scene: Scene, canvas: HTMLCanvasElement) {
    // Set cursor to grab.
    scene.defaultCursor = "grab";

    // Add the actual camera to the scene.  Since we are going to be controlling it manually,
    // we don't attach any inputs directly to it.
    // NOTE: We position the camera at origin in this case, but it doesn't have to be there.
    // Spherical panning should work just fine regardless of the camera's position.
    var camera = new FreeCamera("camera", Vector3.Zero(), scene);

    // Ensure the camera's rotation quaternion is initialized correctly.
    camera.rotationQuaternion = Quaternion.Identity();

    // The spherical panning math has singularities at the poles (up and down) that cause
    // the orientation to seem to "flip."  This is undesirable, so this method helps reject
    // inputs that would cause this behavior.
        // @ts-ignore
    var isNewForwardVectorTooCloseToSingularity = v => {
        const TOO_CLOSE_TO_UP_THRESHOLD = 0.99;
        return Math.abs(Vector3.Dot(v, Vector3.Up())) > TOO_CLOSE_TO_UP_THRESHOLD;
    }

    // Local state variables which will be used in the spherical pan method; declared outside 
    // because they must persist from frame to frame.
    var ptrX = 0;
    var ptrY = 0;
    var inertiaX = 0;
    var inertiaY = 0;

    // Variables internal to spherical pan, declared here just to avoid reallocating them when
    // running.
    var priorDir = new Vector3();
    var currentDir = new Vector3();
    var rotationAxis = new Vector3();
    var rotationAngle = 0;
    var rotation = new Quaternion();
    var newForward = new Vector3();
    var newRight = new Vector3();
    var newUp = new Vector3();
    var matrix = Matrix.Identity();

    // The core pan method.
    // Intuition: there exists a rotation of the camera that brings priorDir to currentDir.
    // By concatenating this rotation with the existing rotation of the camera, we can move
    // the camera so that the cursor appears to remain over the same point in the scene, 
    // creating the feeling of smooth and responsive 1-to-1 motion.
    var pan = (currX: number, currY: number) => {
        // Helper method to convert a screen point (in pixels) to a direction in view space.
        // @ts-ignore
        var getPointerViewSpaceDirectionToRef = (x, y, ref) => {
            Vector3.UnprojectToRef(
                new Vector3(x, y, 0), 
                canvas.width, 
                canvas.height,
                Matrix.Identity(),
                Matrix.Identity(), 
                camera.getProjectionMatrix(),
                ref);
            ref.normalize();
        }

        // Helper method that computes the new forward direction.  This was split into its own
        // function because, near the singularity, we may to do this twice in a single frame
        // in order to reject inputs that would bring the forward vector too close to vertical.
        
        // @ts-ignore
        var computeNewForward = (x, y) => {
            getPointerViewSpaceDirectionToRef(ptrX, ptrY, priorDir);
            getPointerViewSpaceDirectionToRef(x, y, currentDir);

            Vector3.CrossToRef(priorDir, currentDir, rotationAxis);

            // If the magnitude of the cross-product is zero, then the cursor has not moved
            // since the prior frame and there is no need to do anything.
            if (rotationAxis.lengthSquared() > 0) {
                rotationAngle = Vector3.GetAngleBetweenVectors(priorDir, currentDir, rotationAxis);
                Quaternion.RotationAxisToRef(rotationAxis, -rotationAngle, rotation);

                // Order matters here.  We create the new forward vector by applying the new rotation 
                // first, then apply the camera's existing rotation.  This is because, since the new
                // rotation is computed in view space, it only makes sense for a camera that is
                // facing forward.
                newForward.set(0, 0, 1);
                newForward.rotateByQuaternionToRef(rotation, newForward);
                newForward.rotateByQuaternionToRef(camera.rotationQuaternion, newForward);

                return !isNewForwardVectorTooCloseToSingularity(newForward);
            }

            return false;
        }

        // Compute the new forward vector first using the actual input, both X and Y.  If this results
        // in a forward vector that would be too close to the singularity, recompute using only the
        // new X input, repeating the Y input from the prior frame.  If either of these computations
        // succeeds, construct the new rotation matrix using the result.
        if (computeNewForward(currX, currY) || computeNewForward(currX, ptrY)) {
            // We manually compute the new right and up vectors to ensure that the camera 
            // only has pitch and yaw, never roll.  This dependency on the world-space
            // vertical axis is what causes the singularity described above.
            Vector3.CrossToRef(Vector3.Up(), newForward, newRight);
            Vector3.CrossToRef(newForward, newRight, newUp);

            // Create the new world-space rotation matrix from the computed forward, right, 
            // and up vectors.
            matrix.setRowFromFloats(0, newRight.x, newRight.y, newRight.z, 0);
            matrix.setRowFromFloats(1, newUp.x, newUp.y, newUp.z, 0);
            matrix.setRowFromFloats(2, newForward.x, newForward.y, newForward.z, 0);

            Quaternion.FromRotationMatrixToRef(matrix.getRotationMatrix(), camera.rotationQuaternion);
        }
    };

    // The main panning loop, to be run while the pointer is down.
    var sphericalPan = () => {
        pan(scene.pointerX, scene.pointerY);

        // Store the state variables for use in the next frame.
        inertiaX = scene.pointerX - ptrX;
        inertiaY = scene.pointerY - ptrY;
        ptrX = scene.pointerX;
        ptrY = scene.pointerY;
    }

    // The inertial panning loop, to be run after the pointer is released until inertia
    // runs out, or until the pointer goes down again, whichever happens first.  Essentially
    // just pretends to provide a decreasing amount of input based on the last observed input,
    // removing itself once the input becomes negligible.
    const INERTIA_DECAY_FACTOR = 0.9;
    const INERTIA_NEGLIGIBLE_THRESHOLD = 0.5;
    var inertialPanObserver: any;
    var inertialPan = () => {
        if (Math.abs(inertiaX) > INERTIA_NEGLIGIBLE_THRESHOLD || Math.abs(inertiaY) > INERTIA_NEGLIGIBLE_THRESHOLD) {
            pan(ptrX + inertiaX, ptrY + inertiaY);

            inertiaX *= INERTIA_DECAY_FACTOR;
            inertiaY *= INERTIA_DECAY_FACTOR;
        }
        else {
            scene.onBeforeRenderObservable.remove(inertialPanObserver);
        }
    };

    // Enable/disable spherical panning depending on click state.  Note that this is an 
    // extremely simplistic way to do this, so it gets a little janky on multi-touch.
    var sphericalPanObserver: any;
    var pointersDown = 0;
    scene.onPointerDown = () => {
        pointersDown += 1;
        if (pointersDown !== 1) {
            return;
        }

        // Disable inertial panning.
        scene.onBeforeRenderObservable.remove(inertialPanObserver);

        // Switch cursor to grabbing.
        scene.defaultCursor = "grabbing";

        // Store the current pointer position to clean out whatever values were left in
        // there from prior iterations.
        ptrX = scene.pointerX;
        ptrY = scene.pointerY;
        
        // Enable spherical panning.
        sphericalPanObserver = scene.onBeforeRenderObservable.add(sphericalPan);
    }
    scene.onPointerUp = () => {
        pointersDown -= 1;
        if (pointersDown !== 0) {
            return;
        }

        // Switch cursor to grab.
        scene.defaultCursor = "grab";

        // Disable spherical panning.
        scene.onBeforeRenderObservable.remove(sphericalPanObserver);

        // Enable inertial panning.
        inertialPanObserver = scene.onBeforeRenderObservable.add(inertialPan);
    }
};