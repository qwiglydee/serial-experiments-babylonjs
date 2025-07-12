import { createContext } from "@lit/context";

import { Nullable } from "@babylonjs/core/types";
import { Scene } from "@babylonjs/core/scene";

export const sceneContext = createContext<Nullable<Scene>>(Symbol('Scene'));