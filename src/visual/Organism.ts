import * as THREE from 'three';

// The organism owns GPU resources. Audio can drive energy without owning its clock.
export class Organism {
  readonly group = new THREE.Group();
  private readonly uniforms = { uTime: { value: 0 }, uEnergy: { value: 0 }, uTreble:{value:0}, uOnset:{value:0}, uForce:{value:0} };
  private readonly resources: (THREE.BufferGeometry | THREE.Material)[] = [];
  private seed = 61231;

  constructor() {
    this.group.name = 'pelagic-organism';
    this.createBell();
    this.createTendrils();
  }

  private random(): number {
    this.seed = (1664525 * this.seed + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  private material(vertexShader: string, fragmentShader: string, extra: Record<string, THREE.IUniform> = {}): THREE.ShaderMaterial {
    const material = new THREE.ShaderMaterial({
      uniforms: { ...this.uniforms, ...extra }, vertexShader, fragmentShader,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    this.resources.push(material);
    return material;
  }

  private createBell(): void {
    const vertex = `
      uniform float uTime; uniform float uEnergy; uniform float uForce;
      varying vec2 vUv; varying vec3 vNormal; varying vec3 vView;
      void main() {
        vUv = uv;
        vec3 p = position;
        float skirt = pow(uv.y, 3.0);
        float pulse = sin(uTime * .62 - uv.y * 4.0);
        p.xz *= 1.0 + .025 * pulse * uv.y + uEnergy * .025 + uForce*.045*uv.y;
        p.y += skirt * (.075+uForce*.085) * sin(uv.x * 75.398 + uTime * .75);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`;
    const fragment = `
      uniform float uTime; uniform float uEnergy; uniform float uLayer; uniform float uTreble;
      varying vec2 vUv; varying vec3 vNormal; varying vec3 vView;
      float wave(float x) { return .5 + .5 * sin(x); }
      void main() {
        float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.2);
        float longitude = pow(wave(vUv.x * 603.1858 + sin(vUv.y * 17.0 - uTime * .15) * .8), 42.0);
        float major = pow(wave(vUv.x * 100.531 + sin(vUv.y * 6.0) * .35), 55.0);
        float latitude = pow(wave(vUv.y * 370.0 + sin(vUv.x * 75.398) * 1.6), 26.0);
        float cells = longitude * latitude;
        float edge = smoothstep(.94, 1.0, vUv.y);
        float tissue = .017 + .065 * fresnel + longitude * .17 + major * .22 + cells * .19;
        tissue *= smoothstep(.0, .07, vUv.y);
        float travelling = pow(wave(vUv.y * 13.0 - uTime * .8), 9.0);
        vec3 ice = vec3(.13, .65, 1.15);
        vec3 violet = vec3(.45, .20, .9);
        vec3 color = mix(violet, ice, smoothstep(.05, .9, vUv.y));
        color += vec3(.10, .25, .32) * travelling;
        color = mix(color, vec3(1.5, .55, .17), major * .40 * (1.0 - vUv.y));
        // Narrow luminous vessels trace the rim. Their fixed colors describe
        // temperature; only the smooth current inside each vessel moves.
        float angle = vUv.x * 6.2831853;
        float vesselY = vUv.y + .007 * sin(angle * 16.0) + .004 * sin(angle * 31.0);
        float vesselA = exp(-pow((vesselY - .975) / .0045, 2.0));
        float vesselB = exp(-pow((vesselY - .928) / .0035, 2.0));
        float vesselC = exp(-pow((vesselY - .866) / .0025, 2.0));
        float current = .72 + .28 * sin(angle * 5.0 - uTime * .38 + vUv.y * 19.0);
        float hot = pow(wave(angle * 3.0 + .9), 8.0);
        vec3 rimColor = mix(vec3(.06, 1.25, 2.4), vec3(3.2, .85, .15), hot);
        vec3 vessels = rimColor * vesselA + vec3(.9, .17, 2.8) * vesselB + vec3(.12, .9, 1.8) * vesselC;
        float capillary = (vesselA + vesselB + vesselC) * current * uLayer;
        float alpha = tissue * uLayer * .48 + edge * .08 + capillary * .21;
        color += vessels * current * uLayer * (1.45 + uEnergy*.75 + uTreble*.45);
        gl_FragColor = vec4(color * (1.0 + fresnel * .65 + uEnergy * .3), alpha);
      }`;
    for (let shell = 0; shell < 3; shell++) {
      const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
      const columns = 256, rows = 80;
      for (let j = 0; j <= rows; j++) {
        const v = j / rows, theta = v * Math.PI * .5;
        for (let i = 0; i <= columns; i++) {
          const u = i / columns, a = u * Math.PI * 2;
          const scallop = 1 + .013 * Math.cos(a * 16) * v * v;
          const r = Math.sin(theta) * (2.05 - shell * .075) * scallop;
          positions.push(Math.cos(a) * r, .36 + Math.cos(theta) * (1.86 - shell * .075), Math.sin(a) * r);
          uvs.push(u, v);
          if (j < rows && i < columns) {
            const k = j * (columns + 1) + i;
            indices.push(k, k + 1, k + columns + 1, k + 1, k + columns + 2, k + columns + 1);
          }
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices); geometry.computeVertexNormals();
      this.resources.push(geometry);
      this.group.add(new THREE.Mesh(geometry, this.material(vertex, fragment, { uLayer: { value: shell === 0 ? 1 : .30 } })));
    }
  }

  private createTendrils(): void {
    const vertex = `
      uniform float uTime; uniform float uEnergy; uniform float uOnset; uniform float uForce;
      attribute float aAlong; attribute float aPhase; attribute vec3 aColor;
      varying float vAlong; varying float vPhase; varying vec3 vColor;
      void main() {
        vec3 p = position;
        float bend = pow(aAlong, 1.25);
        p.x += bend * (1.+uForce*2.4) * (.19 * sin(aAlong * 5.0 - uTime * .32 + aPhase) + .13 * sin(uTime * .21 + aPhase));
        p.z += bend * (1.+uForce*2.1) * .22 * cos(aAlong * 6.0 - uTime * .28 + aPhase);
        p.y += bend*uForce*.24*sin(aAlong*9.-uTime*.5+aPhase);
        p.y += .045 * sin(uTime * .62 + aPhase) * (1.0-aAlong);
        p.xz *= 1.0 + uEnergy * .04 + uForce*.1*bend + uOnset*.08*bend;
        vAlong = aAlong; vPhase = aPhase; vColor = aColor;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(15.0 / -mv.z, 1.0, 3.0);
      }`;
    const fragment = `
      uniform float uTime; uniform float uEnergy; uniform float uTreble;
      varying float vAlong; varying float vPhase; varying vec3 vColor;
      void main() {
        float signal = pow(.5 + .5 * sin(vAlong * 24.0 - uTime * .9 + vPhase), 15.0);
        float fade = pow(1.0 - vAlong, .3);
        gl_FragColor = vec4(vColor * (.65 + signal * (.9+uTreble*.55) + uEnergy * .55), fade * .40);
      }`;
    const positions: number[] = [], along: number[] = [], phases: number[] = [], colors: number[] = [];
    const dustPos: number[] = [], dustAlong: number[] = [], dustPhase: number[] = [], dustColor: number[] = [];
    // Shared shape functions keep the ribbons, hairlines, and pearls attached.
    const point = (t: number, angle: number, length: number, phase: number, radius: number): THREE.Vector3 => {
      const spread = radius * (1 - .38 * Math.sin(t * Math.PI));
      const curl = t * t;
      return new THREE.Vector3(
        Math.cos(angle) * spread + Math.sin(t * 8 + phase) * (.08 + curl * .42) + Math.sin(t * 3 + phase) * t * .6,
        .34 - t * length,
        Math.sin(angle) * spread + Math.cos(t * 7 + phase) * (.05 + curl * .35),
      );
    };
    for (let arm = 0; arm < 144; arm++) {
      const angle = (arm / 144) * Math.PI * 2;
      const phase = this.random() * Math.PI * 2;
      const length = 2.35 + this.random() * 3.55;
      const radius = 1.75 + this.random() * .26;
      const amber = arm % 13 === 0;
      const color = amber ? [1.35, .42, .12] : arm % 3 === 0 ? [.42, .27, 1.15] : [.10, .73, 1.2];
      for (let j = 0; j < 100; j++) {
        for (const t of [j / 100, (j + 1) / 100]) {
          const p = point(t, angle, length, phase, radius);
          positions.push(p.x, p.y, p.z); along.push(t); phases.push(phase); colors.push(...color);
        }
        if (j % 4 === 0 && arm % 2 === 0) {
          const t = (j + this.random()) / 100, p = point(t, angle, length, phase, radius);
          dustPos.push(p.x, p.y, p.z); dustAlong.push(t); dustPhase.push(phase); dustColor.push(...color);
        }
      }
    }
    const geometry = (p: number[], a: number[], ph: number[], c: number[]): THREE.BufferGeometry => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
      geo.setAttribute('aAlong', new THREE.Float32BufferAttribute(a, 1));
      geo.setAttribute('aPhase', new THREE.Float32BufferAttribute(ph, 1));
      geo.setAttribute('aColor', new THREE.Float32BufferAttribute(c, 3));
      this.resources.push(geo); return geo;
    };
    this.group.add(new THREE.LineSegments(geometry(positions, along, phases, colors), this.material(vertex, fragment)));
    this.group.add(new THREE.Points(geometry(dustPos, dustAlong, dustPhase, dustColor), this.material(vertex, `
      uniform float uTime;
      varying float vAlong; varying float vPhase; varying vec3 vColor;
      void main() {
        float d = length(gl_PointCoord - .5) * 2.0;
        if (d > 1.0) discard;
        float flicker = .45 + .55 * pow(.5 + .5 * sin(vAlong * 45.0 - uTime * 1.1 + vPhase), 5.0);
        gl_FragColor = vec4(vColor * 1.8, pow(1.0 - d, 1.5) * flicker);
      }`)));

    for (let arm = 0; arm < 12; arm++) {
      const angle = arm / 12 * Math.PI * 2 + .19;
      const phase = arm * 1.73, length = 3.6 + this.random() * 2.2;
      const p: number[] = [], a: number[] = [], ph: number[] = [], c: number[] = [], index: number[] = [];
      const sides = 6, steps = 150;
      for (let j = 0; j <= steps; j++) {
        const t = j / steps, center = point(t, angle, length, phase, 1.36);
        // A twisted elliptical cross section gives each oral arm a silk-like edge.
        const twist = t * 17 + phase;
        const width = (.055 + .09 * Math.pow(Math.sin(t * 13 + phase), 2)) * Math.pow(1-t, .7) + .002;
        for (let k = 0; k < sides; k++) {
          const ring = k / sides * Math.PI * 2;
          const x = Math.cos(ring) * width, z = Math.sin(ring) * width * .20;
          p.push(center.x + Math.cos(twist)*x - Math.sin(twist)*z, center.y, center.z + Math.sin(twist)*x + Math.cos(twist)*z);
          a.push(t); ph.push(phase);
          c.push(.20 + .18 * Math.sin(t * 7 + phase), .37 + .24 * Math.sin(t * 4), 1.15);
          if (j < steps) { const q = j * sides + k, n = j * sides + (k + 1) % sides; index.push(q,n,q+sides,n,n+sides,q+sides); }
        }
      }
      const geo = geometry(p,a,ph,c); geo.setIndex(index);
      this.group.add(new THREE.Mesh(geo, this.material(vertex, fragment)));
    }
  }

  update(time: number, energy: number, treble=0, onset=0, force=0): void {
    this.uniforms.uTime.value = time;
    this.uniforms.uEnergy.value = THREE.MathUtils.clamp(energy, 0, 1);
    this.uniforms.uTreble.value=THREE.MathUtils.clamp(treble,0,1);
    this.uniforms.uOnset.value=THREE.MathUtils.clamp(onset,0,1);
    this.uniforms.uForce.value=THREE.MathUtils.clamp(force,0,3);
  }

  dispose(): void {
    for (const resource of this.resources) resource.dispose();
    this.group.clear();
  }
}
