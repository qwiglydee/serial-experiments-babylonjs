import { createContext } from "@lit/context";

import { Nullable } from "@babylonjs/core/types";
import { Scene } from "@babylonjs/core/scene";

import { ShapeParams } from "./factory";

export const sceneContext = createContext<Nullable<Scene>>(Symbol('Scene'));

export const draggingContext = createContext<Nullable<ShapeParams>>(Symbol('dragging'));