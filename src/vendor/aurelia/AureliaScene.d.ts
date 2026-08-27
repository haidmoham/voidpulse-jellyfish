import type * as THREE from "three";

export class AureliaScene {
  readonly renderer: {
    domElement: HTMLCanvasElement;
    setPixelRatio(value: number): void;
    setSize(width: number, height: number, updateStyle?: boolean): void;
    dispose(): void;
  };
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  init(): Promise<void>;
  resize(width: number, height: number, pixelRatio: number): void;
  update(delta: number, elapsed: number): Promise<void>;
  dispose(): void;
}
