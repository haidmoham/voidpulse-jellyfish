import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Organism } from '../visual/Organism';
import { Singularity } from '../visual/Singularity';
import { Cosmos } from '../visual/Cosmos';
import { normalizeSignal, silentSource } from '../core/Signal';
import type { SignalSource } from '../core/Signal';

export class VoidpulseApp {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(42,1,.1,160);
  private readonly renderer = new THREE.WebGLRenderer({antialias:false,alpha:true,powerPreference:'high-performance'});
  private readonly composer:EffectComposer;
  private readonly bloom:UnrealBloomPass;
  private readonly lens:ShaderPass;
  private readonly controls:OrbitControls;
  private readonly organism=new Organism();
  private readonly singularity=new Singularity();
  private readonly cosmos=new Cosmos();
  private readonly motionQuery=matchMedia('(prefers-reduced-motion: reduce)');
  private source:SignalSource=silentSource;
  private time=0;
  private last=0;
  private frameId=0;
  private disposed=false;
  private running=!this.motionQuery.matches;
  private automatic=true;
  private view='encounter';
  private impulse=0;
  private energy=0;
  private treble=0;
  private onset=0;
  private intensity=1.6;
  private force=0;
  private frames=0;
  private slowFrames=0;
  private quality=1;
  private mobile=innerWidth<700;
  private readonly center=new THREE.Vector3();
  private readonly rim=new THREE.Vector3();
  private readonly right=new THREE.Vector3();

  private constructor(private readonly root:HTMLElement){
    this.renderer.domElement.className='experience-canvas';
    this.renderer.domElement.setAttribute('aria-label','an orbitable luminous jellyfish surrounding a black hole');
    this.renderer.domElement.setAttribute('role','img');
    this.renderer.setClearColor(0x020309,0);
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=.9;
    root.prepend(this.renderer.domElement);
    this.scene.add(this.organism.group,this.singularity.group,this.cosmos.group);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);
    this.controls.enableDamping=true;
    this.controls.dampingFactor=.055;
    this.controls.enablePan=false;
    this.controls.minDistance=5.2;
    this.controls.maxDistance=24;
    this.controls.minPolarAngle=.3;
    this.controls.maxPolarAngle=2.6;
    this.controls.rotateSpeed=.45;
    this.controls.zoomSpeed=.65;
    this.controls.addEventListener('start',this.onInteract);
    this.composer=new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene,this.camera));
    this.bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.4,.5,.72);
    this.composer.addPass(this.bloom);
    this.lens=new ShaderPass({
      uniforms:{tDiffuse:{value:null},center:{value:new THREE.Vector2(.5,.5)},radius:{value:.1},aspect:{value:1},time:{value:0}},
      vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`uniform sampler2D tDiffuse;uniform vec2 center;uniform float radius;uniform float aspect;uniform float time;varying vec2 vUv;
      void main(){
        vec2 delta=vUv-center;delta.x*=aspect;float d=length(delta);float r=radius;
        float bend=exp(-max(d-r,0.)/max(r*.45,.001))*.035*r*smoothstep(r*.98,r*1.2,d);
        vec2 dir=delta/max(d,.001);dir.x/=aspect;
        vec2 uv=vUv-dir*bend;
        vec3 color=texture2D(tDiffuse,uv).rgb;
        float fringe=exp(-abs(d-r*1.06)/max(r*.08,.001))*.0007;
        color.r=texture2D(tDiffuse,uv+dir*fringe).r;
        color.b=texture2D(tDiffuse,uv-dir*fringe).b;
        float vignette=1.-.31*pow(length((vUv-.5)*vec2(1.,.85)),1.4);
        float grain=fract(sin(dot(gl_FragCoord.xy+mod(time,30.),vec2(12.9898,78.233)))*43758.5453)-.5;
        float atmosphere=exp(-length(delta*vec2(.85,1.05))*5.5);
        float cloud=.6+.2*sin(delta.x*23.+sin(delta.y*17.))+.2*sin(delta.y*31.+delta.x*7.);
        color+=vec3(.0007,.0006,.0022)*atmosphere*cloud;
        color*=vignette;color+=grain*.00025;
        color*=smoothstep(r*.96,r*.99,d);
        gl_FragColor=vec4(max(color,vec3(0.)),1.);
      }`,
    });
    this.composer.addPass(this.lens);
    this.composer.addPass(new OutputPass());
    this.setView('encounter');
    this.resize();
  }

  static async create(root:HTMLElement):Promise<VoidpulseApp>{return new VoidpulseApp(root);}

  start():void{
    window.addEventListener('resize',this.resize,{passive:true});
    document.addEventListener('visibilitychange',this.visibility);
    this.motionQuery.addEventListener('change',this.motionChanged);
    this.renderer.domElement.addEventListener('dblclick',this.pulse);
    this.renderer.domElement.addEventListener('webglcontextlost',this.contextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored',this.contextRestored);
    this.last=performance.now();
    this.frameId=requestAnimationFrame(this.frame);
  }

  /** Audio supplies measurements without owning the scene or animation clock. */
  setSignalSource(source:SignalSource):void{if(this.source!==source)this.source.dispose?.();this.source=source;}

  setView(view:string):void{
    this.view=view;
    const mobile=innerWidth<700;
    if(view==='horizon'){
      this.camera.position.set(.2,1.1,mobile?11.4:7.5);
      this.controls.target.set(0,.35,0);
    }else{
      this.camera.position.set(0,1.0,mobile?18.2:15.2);
      this.controls.target.set(0,-1.2,0);
    }
    this.automatic=true;
    this.controls.update();
  }

  get isRunning():boolean{return this.running;}
  setIntensity(value:number):void{this.intensity=Number.isFinite(value)?THREE.MathUtils.clamp(value,0,3):1.6;}
  toggleMotion():boolean{this.running=!this.running;return this.running;}
  pulse=():void=>{if(this.running)this.impulse=1;};

  private readonly onInteract=():void=>{this.automatic=false;};
  private readonly motionChanged=():void=>{
    this.impulse=0;this.energy=0;this.treble=0;this.onset=0;this.running=!this.motionQuery.matches;
    this.root.dispatchEvent(new CustomEvent('motion-change'));
  };
  private readonly resize=():void=>{
    const width=innerWidth,height=innerHeight;
    if(this.mobile!==(width<700)){this.mobile=width<700;this.setView(this.view);}
    const ratio=Math.min(devicePixelRatio||1,width<700?1.45:1.7)*this.quality;
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(width,height,false);
    this.composer.setPixelRatio(ratio);
    this.composer.setSize(width,height);
    this.camera.aspect=width/height;
    this.camera.setViewOffset(width,height,width<700?0:-width*.075,0,width,height);
    this.camera.updateProjectionMatrix();
    this.lens.uniforms.aspect.value=width/height;
  };

  private readonly visibility=():void=>{
    cancelAnimationFrame(this.frameId);
    if(!document.hidden&&!this.disposed){this.last=performance.now();this.frameId=requestAnimationFrame(this.frame);}
  };

  private readonly frame=(now:number):void=>{
    if(this.disposed||document.hidden)return;
    const raw=(now-this.last)/1000,dt=Math.min(raw,.05);this.last=now;
    const animated=this.running;
    this.impulse*=Math.exp(-dt*1.35);
    const signal=normalizeSignal(this.source.sample(this.time));
    if(animated)this.time+=dt*(1+signal.energy*this.intensity*.75);
    const lightIntensity=Math.min(1,this.intensity);
    const targetEnergy=animated?Math.min(1,(signal.energy*.75+signal.bass*.45+this.impulse*.8)*lightIntensity):0;
    this.energy=THREE.MathUtils.damp(this.energy,targetEnergy,6,dt);
    this.treble=THREE.MathUtils.damp(this.treble,animated?signal.treble*lightIntensity:0,5,dt);
    this.onset=THREE.MathUtils.damp(this.onset,animated?signal.onset*lightIntensity:0,5,dt);
    const targetForce=animated?Math.min(3,(signal.energy*.8+signal.bass*.6+signal.onset*.9+this.impulse)*this.intensity):0;
    this.force=THREE.MathUtils.damp(this.force,targetForce,targetForce>this.force?8:3.5,dt);
    const energy=this.energy;
    this.controls.autoRotate=animated&&this.automatic&&this.view==='encounter';
    this.controls.autoRotateSpeed=.16;
    this.controls.update(dt);
    this.organism.update(this.time,energy,this.treble,this.onset,this.force);
    this.singularity.update(this.time,energy,this.camera,this.treble,this.force);
    this.cosmos.update(this.time,this.renderer.getPixelRatio());
    this.center.set(0,.65,0).project(this.camera);
    this.right.set(1,0,0).applyQuaternion(this.camera.quaternion).multiplyScalar(.86);
    this.rim.copy(this.right).add(new THREE.Vector3(0,.65,0)).project(this.camera);
    this.lens.uniforms.center.value.set(this.center.x*.5+.5,this.center.y*.5+.5);
    this.lens.uniforms.radius.value=Math.abs(this.rim.x-this.center.x)*.5*this.camera.aspect;
    this.lens.uniforms.time.value=this.time;
    this.bloom.strength=.38+energy*.07;
    this.root.style.setProperty('--music-energy',signal.energy.toFixed(3));
    this.root.style.setProperty('--music-bass',signal.bass.toFixed(3));
    this.root.style.setProperty('--music-treble',signal.treble.toFixed(3));
    this.composer.render();
    // Reduce pixel cost once when a device sustains slow frames.
    if(++this.frames<180&&raw>.04)this.slowFrames++;
    if(this.frames===180&&this.slowFrames>100){this.quality=.7;this.resize();}
    if(this.frames===2){this.root.classList.add('is-ready');document.querySelector('.loading')?.remove();}
    this.frameId=requestAnimationFrame(this.frame);
  };

  private readonly contextLost=(event:Event):void=>{
    event.preventDefault();cancelAnimationFrame(this.frameId);
    this.root.dispatchEvent(new CustomEvent('visual-error',{detail:'the visual paused. restoring the connection…'}));
  };
  private readonly contextRestored=():void=>{window.location.reload();};

  dispose():void{
    this.disposed=true;cancelAnimationFrame(this.frameId);
    window.removeEventListener('resize',this.resize);
    document.removeEventListener('visibilitychange',this.visibility);
    this.motionQuery.removeEventListener('change',this.motionChanged);
    this.controls.dispose();this.organism.dispose();this.singularity.dispose();this.cosmos.dispose();
    this.source.dispose?.();
    for(const pass of this.composer.passes)pass.dispose();
    this.composer.dispose();
    this.renderer.dispose();this.renderer.domElement.remove();
  }
}
