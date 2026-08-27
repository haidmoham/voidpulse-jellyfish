import * as THREE from "three";

interface PointerPosition {
  x: number;
  y: number;
}

const ORBIT_SENSITIVITY = 0.005;
const ZOOM_SENSITIVITY = 0.0015;

export class OrbitCameraController {
  private readonly target = new THREE.Vector3();
  private readonly orbit: THREE.Spherical;
  private readonly cameraOrbit = new THREE.Spherical();
  private readonly pointers = new Map<number, PointerPosition>();
  private distance: number;
  private previousPinchDistance: number | null = null;
  private elapsed = 0;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly element: HTMLElement,
    private readonly minimumDistance = 3.8,
    private readonly maximumDistance = 12,
  ) {
    this.distance = camera.position.length();
    this.orbit = new THREE.Spherical().setFromVector3(camera.position);
    this.updateCamera(0);
  }

  connect(): void {
    this.element.addEventListener("pointerdown", this.handlePointerDown);
    this.element.addEventListener("pointermove", this.handlePointerMove);
    this.element.addEventListener("pointerup", this.handlePointerEnd);
    this.element.addEventListener("pointercancel", this.handlePointerEnd);
    this.element.addEventListener("lostpointercapture", this.handlePointerEnd);
    this.element.addEventListener("wheel", this.handleWheel, { passive: false });
  }

  update(dt: number, driftAmount: number): void {
    this.elapsed += dt;
    this.updateCamera(driftAmount);
  }

  dispose(): void {
    this.element.removeEventListener("pointerdown", this.handlePointerDown);
    this.element.removeEventListener("pointermove", this.handlePointerMove);
    this.element.removeEventListener("pointerup", this.handlePointerEnd);
    this.element.removeEventListener("pointercancel", this.handlePointerEnd);
    this.element.removeEventListener("lostpointercapture", this.handlePointerEnd);
    this.element.removeEventListener("wheel", this.handleWheel);
    this.pointers.clear();
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;

    event.preventDefault();
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    this.element.setPointerCapture(event.pointerId);
    this.previousPinchDistance = this.pinchDistance();
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    const previous = this.pointers.get(event.pointerId);
    if (!previous) return;

    event.preventDefault();
    const next = { x: event.clientX, y: event.clientY };
    this.pointers.set(event.pointerId, next);

    if (this.pointers.size === 1) {
      this.orbit.theta -= (next.x - previous.x) * ORBIT_SENSITIVITY;
      this.orbit.phi -= (next.y - previous.y) * ORBIT_SENSITIVITY;
    } else {
      const nextDistance = this.pinchDistance();
      if (nextDistance !== null && this.previousPinchDistance !== null) {
        this.zoom(this.previousPinchDistance - nextDistance);
      }
      this.previousPinchDistance = nextDistance;
    }

    this.updateCamera(0);
  };

  private readonly handlePointerEnd = (event: PointerEvent): void => {
    if (!this.pointers.delete(event.pointerId)) return;

    if (this.element.hasPointerCapture(event.pointerId)) {
      this.element.releasePointerCapture(event.pointerId);
    }
    this.previousPinchDistance = this.pinchDistance();
  };

  private readonly handleWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.zoom(event.deltaY);
    this.updateCamera(0);
  };

  private zoom(deltaY: number): void {
    this.distance = THREE.MathUtils.clamp(
      this.distance * Math.exp(deltaY * ZOOM_SENSITIVITY),
      this.minimumDistance,
      this.maximumDistance,
    );
  }

  private pinchDistance(): number | null {
    if (this.pointers.size !== 2) return null;

    const [first, second] = [...this.pointers.values()];
    return Math.hypot(first.x - second.x, first.y - second.y);
  }

  private updateCamera(driftAmount: number): void {
    const drift = THREE.MathUtils.clamp(driftAmount, 0, 1) * 0.012;
    const theta = this.orbit.theta + Math.sin(this.elapsed * 0.11) * drift;
    const phi = this.orbit.phi + Math.sin(this.elapsed * 0.17) * drift * 0.45;
    this.cameraOrbit.set(
      this.distance,
      THREE.MathUtils.clamp(phi, 0.01, Math.PI - 0.01),
      theta,
    );

    this.orbit.makeSafe();
    this.camera.position.setFromSpherical(this.cameraOrbit).add(this.target);
    this.camera.lookAt(this.target);
  }
}
