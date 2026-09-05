import * as THREE from 'three';

// One membrane carries the vascular anatomy and its broad musical contractions.
const bellDeformation = `
  uniform float uTime;uniform float uBass;uniform float uMid;uniform float uTreble;uniform float uForce;uniform float uThreat;
  vec3 deformBell(vec3 p,float along,float angle){
    along=clamp(along,0.,1.);
    float clench=uThreat*uThreat*(3.-2.*uThreat);
    float drive=1.+uForce*.16;
    float contraction=min(1.3,(clench*.85+uBass*.3)*drive);
    float skirt=pow(along,3.);
    float asymmetry=.8+.2*sin(angle*3.+.7);
    float drift=.025*sin(uTime*.36-along*3.)*(1.-clench*.5);
    p.xz*=1.+drift*along+uForce*.012*along-contraction*(.065+.28*along)*asymmetry;
    p.y+=skirt*(.035+uMid*.10+uTreble*.035)*sin(angle*8.+uTime*.28)*(1.-clench*.45);
    p.y+=contraction*(.20+.30*skirt)*asymmetry;
    return p;
  }`;

// The camera ribbons and anatomical folds share displacement, with no lighting modulation.
const tendrilDeformation = `
  uniform float uTime;uniform float uEnergy;uniform float uForce;uniform float uMid;uniform float uTreble;
  uniform float uThreat;uniform float uReach;uniform float uBass;uniform vec3 uWatcher;
  vec3 deformTendril(vec3 p,float along,float phase){
    along=clamp(along,0.,1.);
    float bend=pow(along,1.25),tip=pow(along,2.5);
    float clench=uThreat*uThreat*(3.-2.*uThreat);
    float drive=1.+uForce*.22;
    float chosen=.3+.7*pow(max(.5+.5*sin(phase*2.3+.4),0.),3.);
    float music=min(1.4,uEnergy*.5+uForce*.35+uBass*.25);
    float held=1.-clench*.35;
    p.xz*=1.+uBass*.06-clench*(.16+.23*bend);
    p.x+=bend*held*(.10+music*.95)*sin(along*5.5-uTime*.64+phase);
    p.z+=bend*held*(.08+music*.74)*cos(along*6.5-uTime*.55+phase);
    p.y+=clench*drive*(.08+bend*(.70+chosen*.65));
    p-=uWatcher*clench*bend*(.20+chosen*.38)*drive;
    float reach=uReach*chosen;
    p+=uWatcher*tip*(reach*(3.65+uForce*.42)+uBass*.30*chosen);
    vec3 sideways=vec3(uWatcher.z,0.,-uWatcher.x);
    p+=sideways*tip*reach*sin(phase*1.7)*1.45*drive;
    p.y+=reach*(tip*.60+pow(along,7.)*.80);
    // A broad traveling bend lashes the released arms without changing their light.
    float lash=sin(along*7.-uTime*1.15+phase)*bend*reach*held;
    p+=sideways*lash*.48*drive;
    p.xz+=vec2(sin(along*10.-uTime*.48+phase*2.),cos(along*8.-uTime*.42+phase))*uMid*.22*bend*held;
    p+=sideways*pow(along,4.)*uTreble*.16*sin(along*9.-uTime*.5+phase);
    return p;
  }`;

// The organism owns GPU resources. Audio can drive energy without owning its clock.
export class Organism {
  readonly group = new THREE.Group();
  private readonly uniforms = { uTime: { value: 0 }, uEnergy: { value: 0 }, uTreble:{value:0}, uOnset:{value:0}, uForce:{value:0}, uMid:{value:0}, uBass:{value:0}, uPalette:{value:0}, uThreat:{value:0}, uReach:{value:0}, uWatcher:{value:new THREE.Vector3(0,0,1)}, uViewportHeight:{value:1000} };
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
    fragmentShader='uniform float uPalette;\n'+fragmentShader.replace(/}\s*$/,`
      vec3 original=gl_FragColor.rgb;
      vec3 ritual=vec3(original.g*1.3+original.r*.65,original.g*.16+original.r*.09,original.b*.18);
      vec3 venom=vec3(original.g*.54+original.r*.2,original.g*1.2+original.r*.4,original.b*.28);
      // Leave exposure headroom where many translucent filaments overlap.
      gl_FragColor.rgb=mix(original,mix(ritual,venom,step(1.5,uPalette)),step(.5,uPalette))*.55;
      // A non-finite source pixel must not enter the bloom render targets.
      if(any(isnan(gl_FragColor))||any(isinf(gl_FragColor)))gl_FragColor=vec4(0.);
      gl_FragColor.a=clamp(gl_FragColor.a,0.,1.);
    }`);
    const material = new THREE.ShaderMaterial({
      uniforms: { ...this.uniforms, ...extra }, vertexShader, fragmentShader,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      forceSinglePass:true,
      blending: THREE.AdditiveBlending,
    });
    this.resources.push(material);
    return material;
  }

  private createBell(): void {
    const vertex = `
      ${bellDeformation}
      varying vec2 vUv; varying vec3 vNormal; varying vec3 vView;
      void main() {
        vUv = uv;
        vec3 p = deformBell(position,uv.y,uv.x*6.2831853);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vec3 surfaceNormal=normalMatrix*normal;
        vNormal=surfaceNormal/max(length(surfaceNormal),.0001);
        vView=-mv.xyz/max(length(mv.xyz),.0001);
        gl_Position = projectionMatrix * mv;
      }`;
    const fragment = `
      uniform float uLayer;
      varying vec2 vUv; varying vec3 vNormal; varying vec3 vView;
      float wave(float x) { return .5 + .5 * sin(x); }
      float vein(float phase,float width){
        float distanceToLine=abs(fract(phase/6.2831853+.5)-.5);
        float footprint=max(fwidth(phase)/6.2831853,.002);
        return (1.-smoothstep(width,width+footprint,distanceToLine))*width/(width+footprint*.5);
      }
      void main() {
        vec3 surfaceNormal=vNormal/max(length(vNormal),.0001);
        vec3 viewDirection=vView/max(length(vView),.0001);
        float fresnel=pow(clamp(1.-abs(dot(surfaceNormal,viewDirection)),0.,1.),2.2);
        float longitude = vein(vUv.x * 150.7964 + sin(vUv.y * 13.0) * .8,.065);
        float major = vein(vUv.x * 100.531 + sin(vUv.y * 6.0) * .35,.065);
        float latitude = vein(vUv.y * 75.398 + sin(vUv.x * 50.265) * 1.2,.070);
        float cells = longitude * latitude;
        float edge = smoothstep(.94, 1.0, vUv.y);
        float tissue = .017 + .065 * fresnel + longitude * .17 + major * .22 + cells * .19;
        tissue *= smoothstep(.0, .07, vUv.y);
        float anatomy = .5+.5*sin(vUv.y*11.+sin(vUv.x*18.));
        vec3 ice = vec3(.10, 1.18, .83);
        vec3 violet = vec3(.38, .065, .28);
        vec3 color = mix(violet, ice, smoothstep(.05, .9, vUv.y));
        color += vec3(.04, .17, .08) * anatomy;
        color = mix(color, vec3(1.9, .09, .12), major * .65 * (1.0 - vUv.y));
        float nerves=vein(vUv.x*100.531+sin(vUv.y*17.)*1.4,.060);
        tissue += nerves*.048;
        // Fixed vessels widen to the pixel footprint to limit shimmer as the dome moves.
        float angle = vUv.x * 6.2831853;
        float vesselY = vUv.y + .007 * sin(angle * 16.0) + .004 * sin(angle * 31.0);
        float pixelWidth=max(fwidth(vesselY),.001);
        float vesselA = 1.-smoothstep(.0045,.0045+pixelWidth,abs(vesselY-.975));
        float vesselB = 1.-smoothstep(.0035,.0035+pixelWidth,abs(vesselY-.928));
        float vesselC = 1.-smoothstep(.0025,.0025+pixelWidth,abs(vesselY-.866));
        float current = .72;
        float hot = pow(max(wave(angle * 3.0 + .9),0.), 8.0);
        vec3 rimColor = mix(vec3(.08, 2.1, 1.4), vec3(3.1, .10, .12), hot);
        vec3 vessels = rimColor * vesselA + vec3(1.8, .055, .20) * vesselB + vec3(.40, 1.6, .62) * vesselC;
        float capillary = (vesselA + vesselB + vesselC) * current * uLayer;
        float alpha = tissue * uLayer * .64 + edge * .08 + capillary * .26;
        color += vessels * current * uLayer * 1.10;
        gl_FragColor = vec4(color * (.82 + fresnel * .48), alpha);
      }`;
    for (let shell = 0; shell < 1; shell++) {
      const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
      const columns = 192, rows = 64;
      for (let j = 0; j <= rows; j++) {
        const v = j / rows, theta = v * Math.PI * .5;
        for (let i = 0; i <= columns; i++) {
          const u = i / columns, a = u * Math.PI * 2;
          const scallop = 1 + .045 * Math.cos(a * 16) * v * v;
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
      const membrane=this.material(vertex,fragment,{uLayer:{value:1}});
      membrane.side=THREE.FrontSide;
      this.group.add(new THREE.Mesh(geometry,membrane));
    }
  }

  private createTendrils(): void {
    const vertex = `
      ${tendrilDeformation}
      attribute float aAlong; attribute float aPhase; attribute vec3 aColor;
      varying float vAlong; varying float vPhase; varying vec3 vColor;
      void main() {
        vec3 p=deformTendril(position,aAlong,aPhase);
        vAlong = aAlong; vPhase = aPhase; vColor = aColor;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
      }`;
    const positions: number[] = [], along: number[] = [], phases: number[] = [], colors: number[] = [];
    const previous:number[]=[],next:number[]=[],sides:number[]=[],indices:number[]=[];
    // One indexed ribbon batch replaces thin lines and detached point sprites.
    const point = (t: number, angle: number, length: number, phase: number, radius: number): THREE.Vector3 => {
      const spread = radius * (1 - .36 * Math.sin(t * Math.PI));
      const curl = t * t;
      return new THREE.Vector3(
        Math.cos(angle) * spread + Math.sin(t * 9 + phase) * (.08 + curl * .58) + Math.sin(t * 3 + phase) * t * .85,
        .34 - t * length,
        Math.sin(angle) * spread + Math.cos(t * 7 + phase) * (.05 + curl * .35),
      );
    };
    const filamentCount=64,filamentSteps=80;
    for (let arm = 0; arm < filamentCount; arm++) {
      const angle = (arm / filamentCount) * Math.PI * 2;
      const phase = this.random() * Math.PI * 2;
      const length = 2.8 + this.random() * 3.1;
      const radius = 1.75 + this.random() * .26;
      const amber = arm % 13 === 0;
      const color = amber ? [1.8, .075, .17] : arm % 3 === 0 ? [.28, .72, .22] : [.035, 1.1, .69];
      for (let j=0;j<=filamentSteps;j++){
        const t=j/filamentSteps,p=point(t,angle,length,phase,radius);
        const before=point(Math.max(0,t-1/filamentSteps),angle,length,phase,radius);
        const after=point(Math.min(1,t+1/filamentSteps),angle,length,phase,radius);
        const base=positions.length/3;
        for(const side of [-1,1]){
          positions.push(p.x,p.y,p.z);previous.push(before.x,before.y,before.z);next.push(after.x,after.y,after.z);
          along.push(t);phases.push(phase);colors.push(...color);sides.push(side);
        }
        if(j<filamentSteps)indices.push(base,base+1,base+2,base+1,base+3,base+2);
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
    const filamentGeo=geometry(positions,along,phases,colors);
    filamentGeo.setAttribute('aPrevious',new THREE.Float32BufferAttribute(previous,3));
    filamentGeo.setAttribute('aNext',new THREE.Float32BufferAttribute(next,3));
    filamentGeo.setAttribute('aSide',new THREE.Float32BufferAttribute(sides,1));
    filamentGeo.setIndex(indices);
    const filamentMaterial=this.material(`
      ${tendrilDeformation}
      uniform float uViewportHeight;
      attribute float aAlong;attribute float aPhase;attribute vec3 aColor;
      attribute vec3 aPrevious;attribute vec3 aNext;attribute float aSide;
      varying float vAlong;varying vec3 vColor;varying float vAcross;
      void main(){
        vec4 current=modelViewMatrix*vec4(deformTendril(position,aAlong,aPhase),1.);
        vec4 before=modelViewMatrix*vec4(deformTendril(aPrevious,max(0.,aAlong-.0125),aPhase),1.);
        vec4 after=modelViewMatrix*vec4(deformTendril(aNext,min(1.,aAlong+.0125),aPhase),1.);
        vec2 tangent=after.xy/max(.1,-after.z)-before.xy/max(.1,-before.z);
        vec2 perpendicular=vec2(-tangent.y,tangent.x)/max(length(tangent),.00001);
        float pixelWorld=2.*max(.1,-current.z)/(projectionMatrix[1][1]*max(uViewportHeight,1.));
        float halfWidth=max(.021*(1.-aAlong*.45),pixelWorld*1.45);
        current.xy+=perpendicular*aSide*halfWidth;
        vAlong=aAlong;vColor=aColor;vAcross=aSide;
        gl_Position=projectionMatrix*current;
      }`, `
      varying float vAlong;varying vec3 vColor;varying float vAcross;
      void main(){
        float softEdge=1.-smoothstep(.18,1.,abs(vAcross));
        float endFade=1.-smoothstep(.88,1.,vAlong);
        gl_FragColor=vec4(vColor*.54,softEdge*endFade*.43);
      }`);
    const filaments=new THREE.Mesh(filamentGeo,filamentMaterial);
    filaments.frustumCulled=false;
    this.group.add(filaments);

    for (let arm = 0; arm < 12; arm++) {
      const angle = arm / 12 * Math.PI * 2 + .19;
      const phase = arm * 1.73, length = 3.6 + this.random() * 2.2 + (arm%4===0?.65:0);
      const p: number[] = [], a: number[] = [], ph: number[] = [], c: number[] = [], index: number[] = [], edges:number[]=[];
      const sides = 6, steps = 150;
      for (let j = 0; j <= steps; j++) {
        const t = j / steps, center = point(t, angle, length, phase, 1.36);
        // Broad dark folds add anatomy without adding a second layer of light.
        const twist = t * (arm%4===0?11:14) + phase;
        const width = (.085 + .105 * Math.pow(Math.sin(t * 9 + phase), 2)) * Math.pow(1-t, .7) + .002;
        for (let k = 0; k < sides; k++) {
          const ring = k / sides * Math.PI * 2;
          const x = Math.cos(ring) * width, z = Math.sin(ring) * width * .20;
          p.push(center.x + Math.cos(twist)*x - Math.sin(twist)*z, center.y, center.z + Math.sin(twist)*x + Math.cos(twist)*z);
          a.push(t); ph.push(phase);
          edges.push(Math.abs(Math.cos(ring)));
          c.push(.12 + .10 * Math.sin(t * 7 + phase), .82 + .24 * Math.sin(t * 4), .52);
          if (j < steps) { const q = j * sides + k, n = j * sides + (k + 1) % sides; index.push(q,n,q+sides,n,n+sides,q+sides); }
        }
      }
      const geo = geometry(p,a,ph,c); geo.setIndex(index);
      geo.setAttribute('aRim',new THREE.Float32BufferAttribute(edges,1));
      const ribbonVertex='attribute float aRim;varying float vRim;\n'+vertex.replace('vAlong = aAlong;','vRim=aRim;vAlong = aAlong;');
      const ribbonMaterial=this.material(ribbonVertex,`
        varying float vAlong;varying float vPhase;varying vec3 vColor;varying float vRim;
        void main(){
          float rim=smoothstep(.73,.99,vRim);
          float fold=.5+.5*sin(vAlong*13.+vPhase);
          vec3 shadow=vec3(.007,.027,.018)+vec3(.012,.019,.008)*fold;
          vec3 skin=mix(shadow,vColor*.78,rim);
          float fade=1.-smoothstep(.90,1.,vAlong);
          gl_FragColor=vec4(skin,mix(.86,.68,rim)*fade);
        }`);
      ribbonMaterial.blending=THREE.NormalBlending;
      const ribbon=new THREE.Mesh(geo,ribbonMaterial);
      // Fixed layering prevents translucent folds from swapping order as the camera orbits.
      ribbon.renderOrder=20+arm;
      this.group.add(ribbon);
    }
  }

  setViewportHeight(height:number):void {
    if(Number.isFinite(height)&&height>0)this.uniforms.uViewportHeight.value=height;
  }

  setPalette(preset:'abyss'|'ritual'|'venom'):void {
    this.uniforms.uPalette.value=preset==='ritual'?1:preset==='venom'?2:0;
  }

  /** Supply a direction from the organism toward the camera, in scene coordinates. */
  setWatcher(direction:THREE.Vector3):void {
    if(Number.isFinite(direction.lengthSq())&&direction.lengthSq()>.0001){
      this.uniforms.uWatcher.value.copy(direction).normalize();
    }
  }

  update(time: number, energy: number, treble=0, onset=0, force=0, mid=0, bass=energy, threat=0, reach=0): void {
    this.uniforms.uTime.value = time;
    this.uniforms.uEnergy.value = THREE.MathUtils.clamp(energy, 0, 1);
    this.uniforms.uTreble.value=THREE.MathUtils.clamp(treble,0,1);
    this.uniforms.uOnset.value=THREE.MathUtils.clamp(onset,0,1);
    this.uniforms.uForce.value=THREE.MathUtils.clamp(force,0,3);
    this.uniforms.uMid.value=THREE.MathUtils.clamp(mid,0,1);
    this.uniforms.uBass.value=THREE.MathUtils.clamp(bass,0,1);
    this.uniforms.uThreat.value=Number.isFinite(threat)?THREE.MathUtils.clamp(threat,0,1):0;
    this.uniforms.uReach.value=Number.isFinite(reach)?THREE.MathUtils.clamp(reach,0,1):0;
  }

  dispose(): void {
    for (const resource of this.resources) resource.dispose();
    this.group.clear();
  }
}
