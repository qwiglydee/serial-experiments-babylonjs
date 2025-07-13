# BabylonJS snippets

My snippets and solutions for [BabylonJS](https://babylonjs.com/).

The code exploits modern web-components approach with [Lit library](https://lit.dev/) and [Modern Web toolchain](https://modern-web.dev/)

---- 

Intrtpolating `ArcRotateCamera` to new a target, the same way as setting vector target, but smoothly.

```typescript
function interpolateTarget(camera: ArcRotateCamera, newtarget: Vector3);
```