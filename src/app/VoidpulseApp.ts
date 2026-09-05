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
import { ThreatResponse } from '../visual/ThreatResponse';
import { normalizeSignal, silentSource } from '../core/Signal';
import type { SignalFrame, SignalSource } from '../core/Signal';

export type VisualPreset = 'abyss' | 'ritual' | 'venom';
export type VisualQuality = 'auto' | 'high' | 'low';

export class VoidpulseApp {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(42,1,.1,160);
  private readonly renderer = new THREE.WebGLRenderer({antialias:false,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  private readonly composer:EffectComposer;
  private readonly bloom:UnrealBloomPass;
  private readonly lens:ShaderPass;
  private readonly edgeSmoothing:ShaderPass;
  private readonly controls:OrbitControls;
  private readonly organism=new Organism();
  private readonly singularity=new Singularity();
  private readonly cosmos=new Cosmos();
  private readonly threatResponse=new ThreatResponse();
  private readonly motionQuery=matchMedia('(prefers-reduced-motion: reduce)');
  private source:SignalSource=silentSource;
  private time=0;
  private last=0;
  private frameId=0;
  private disposed=false;
  private resizePending=true;
  private running=!this.motionQuery.matches;
  private automatic=true;
  private view='encounter';
  private impulse=0;
  private energy=0;
  private treble=0;
  private mids=0;
  private bass=0;
  private onset=0;
  private intensity=1.6;
  private force=0;
  private lensDeformation=0;
  private threat=0;
  private reach=0;
  private clockSpeed=.38;
  private frames=0;
  private slowFrames=0;
  private quality=1;
  private qualityMode:VisualQuality='auto';
  private bloomAmount=.75;
  private bloomLevel=.75;
  private immersive=false;
  private signalListener:((signal:Readonly<SignalFrame>,animate:boolean)=>void)|null=null;
  private mobile=innerWidth<700;
  private readonly center=new THREE.Vector3();
  private readonly rim=new THREE.Vector3();
  private readonly right=new THREE.Vector3();
  private readonly watcher=new THREE.Vector3();

  private constructor(private readonly root:HTMLElement){
    this.renderer.domElement.className='experience-canvas';
    this.renderer.domElement.setAttribute('aria-label','an eldritch jellyfish with a domed bell, trailing tentacles, and a black hole inside its body');
    this.renderer.domElement.setAttribute('role','img');
    this.renderer.setClearColor(0x020309,0);
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=.76;
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
    // A non-finite scene pixel must not spread through the bloom blur chain.
    this.composer.addPass(new ShaderPass({
      uniforms:{tDiffuse:{value:null}},
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`uniform sampler2D tDiffuse;varying vec2 vUv;
        float finiteChannel(float x){bool invalid=(floatBitsToUint(x)&0x7f800000u)==0x7f800000u;return invalid?0.:clamp(x,0.,16.);}
        void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;
        gl_FragColor=vec4(finiteChannel(c.r),finiteChannel(c.g),finiteChannel(c.b),1.);}`,
    }));
    this.bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.4,.5,.72);
    this.composer.addPass(this.bloom);
    this.lens=new ShaderPass({
      uniforms:{tDiffuse:{value:null},center:{value:new THREE.Vector2(.5,.5)},radius:{value:.1},aspect:{value:1},time:{value:0},energy:{value:0},threat:{value:0},aura:{value:new THREE.Color(.12,.25,.2)}},
      vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`uniform sampler2D tDiffuse;uniform vec2 center;uniform float radius;uniform float aspect;uniform float time;uniform float energy;uniform float threat;uniform vec3 aura;varying vec2 vUv;
      void main(){
        vec2 delta=vUv-center;delta.x*=aspect;float d=length(delta);float r=radius;
        float bend=exp(-max(d-r,0.)/max(r*1.05,.001))*(.16+threat*.20)*r*smoothstep(r*.98,r*1.2,d);
        vec2 dir=delta/max(d,.001);dir.x/=aspect;
        float angle=atan(delta.y,delta.x);
        vec2 tangent=vec2(-dir.y/aspect,dir.x*aspect);
        vec2 uv=vUv-dir*bend+tangent*sin(angle*3.+d*24.-time*.025)*bend*(.26+threat*.32);
        vec3 color=texture2D(tDiffuse,uv).rgb;
        float fringe=exp(-abs(d-r*1.06)/max(r*.12,.001))*.0012;
        color.r=texture2D(tDiffuse,uv+dir*fringe).r;
        color.b=texture2D(tDiffuse,uv-dir*fringe).b;
        float vignette=1.-.46*pow(length((vUv-.5)*vec2(1.,.85)),1.4);
        float atmosphere=exp(-length(delta*vec2(.85,1.05))*5.5);
        float cloud=.6+.2*sin(delta.x*23.+sin(delta.y*17.))+.2*sin(delta.y*31.+delta.x*7.);
        color+=aura*.012*atmosphere*cloud;
        color*=vignette;
        color*=smoothstep(r*.96,r*.99,d);
        gl_FragColor=vec4(max(color,vec3(0.)),1.);
      }`,
    });
    this.composer.addPass(this.lens);
    this.composer.addPass(new OutputPass());
    // Fixed samples avoid derivative-dependent loops in edge filtering.
    this.edgeSmoothing=new ShaderPass({
      uniforms:{tDiffuse:{value:null},texel:{value:new THREE.Vector2(1,1)}},
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`uniform sampler2D tDiffuse;uniform vec2 texel;varying vec2 vUv;
        void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;
        vec3 n=texture2D(tDiffuse,vUv+vec2(0.,texel.y)).rgb;
        vec3 s=texture2D(tDiffuse,vUv-vec2(0.,texel.y)).rgb;
        vec3 e=texture2D(tDiffuse,vUv+vec2(texel.x,0.)).rgb;
        vec3 w=texture2D(tDiffuse,vUv-vec2(texel.x,0.)).rgb;
        float contrast=length(max(max(n,s),max(e,w))-min(min(n,s),min(e,w)));
        gl_FragColor=vec4(mix(c,(n+s+e+w)*.25,smoothstep(.06,.3,contrast)*.3),1.);}`,
    });
    this.composer.addPass(this.edgeSmoothing);
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
    if(view==='oracle'){
      this.camera.position.set(mobile?9:7,mobile?9:7,mobile?20:16);
      this.controls.target.set(0,-.6,0);
    }else if(view==='horizon'){
      this.camera.position.set(.2,1.1,mobile?11.4:7.5);
      this.controls.target.set(0,.35,0);
    }else{
      this.camera.position.set(0,1.0,mobile?24:18.4);
      this.controls.target.set(0,-1.2,0);
    }
    this.automatic=true;
    this.controls.update();
  }

  get isRunning():boolean{return this.running;}
  onSignal(listener:(signal:Readonly<SignalFrame>,animate:boolean)=>void):void{this.signalListener=listener;}
  setPreset(preset:VisualPreset):void{
    this.organism.setPalette(preset);this.singularity.setPalette(preset);this.cosmos.setPalette(preset);
    this.lens.uniforms.aura.value.set(preset==='ritual'?0x70211c:preset==='venom'?0x466920:0x1e4033);
  }
  setBloom(value:number):void{this.bloomAmount=Number.isFinite(value)?THREE.MathUtils.clamp(value,0,1.5):.75;}
  setQuality(value:VisualQuality):void{
    this.qualityMode=value;this.quality=value==='low'?.6:1;
    this.frames=0;this.slowFrames=0;this.resize();
  }
  setImmersive(value:boolean):void{this.immersive=value;this.resize();}
  capture():void{
    // Render and read in one task, before the browser clears the drawing buffer.
    this.composer.render();
    this.renderer.domElement.toBlob(blob=>{
      if(!blob)return;
      const url=URL.createObjectURL(blob),link=document.createElement('a');
      link.href=url;link.download=`voidpulse-${new Date().toISOString().replace(/[:.]/g,'-')}.png`;
      link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    },'image/png');
  }
  setIntensity(value:number):void{this.intensity=Number.isFinite(value)?THREE.MathUtils.clamp(value,0,3):1.6;}
  toggleMotion():boolean{this.running=!this.running;return this.running;}
  pulse=():void=>{if(this.running)this.impulse=1;};

  private readonly onInteract=():void=>{this.automatic=false;};
  private readonly motionChanged=():void=>{
    this.impulse=0;this.energy=0;this.treble=0;this.mids=0;this.bass=0;this.onset=0;this.running=!this.motionQuery.matches;
    this.root.dispatchEvent(new CustomEvent('motion-change'));
  };
  private readonly resize=():void=>{this.resizePending=true;};

  private resizeRenderer():void{
    this.resizePending=false;
    const width=innerWidth,height=innerHeight;
    if(this.mobile!==(width<700)){this.mobile=width<700;this.setView(this.view);}
    const densityCap=this.qualityMode==='high'?1.7:1.35;
    const ratio=Math.min(devicePixelRatio||1,densityCap)*this.quality;
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(width,height,false);
    this.composer.setPixelRatio(ratio);
    this.composer.setSize(width,height);
    this.organism.setViewportHeight(height*ratio);
    this.edgeSmoothing.uniforms.texel.value.set(1/(width*ratio),1/(height*ratio));
    this.camera.aspect=width/height;
    this.camera.setViewOffset(width,height,width<700||this.immersive?0:-width*.025,this.immersive?0:height*(width<700?.07:.105),width,height);
    this.camera.updateProjectionMatrix();
    this.lens.uniforms.aspect.value=width/height;
  }

  private readonly visibility=():void=>{
    cancelAnimationFrame(this.frameId);
    if(!document.hidden&&!this.disposed){this.last=performance.now();this.frameId=requestAnimationFrame(this.frame);}
  };

  private readonly frame=(now:number):void=>{
    if(this.disposed||document.hidden)return;
    // Canvas resize clears its pixels. Resize before drawing, never after presentation.
    if(this.resizePending)this.resizeRenderer();
    const raw=(now-this.last)/1000,dt=Math.min(raw,.05);this.last=now;
    const animated=this.running;
    const motionDt=animated?dt:0;
    this.impulse*=Math.exp(-motionDt*1.35);
    const signal=normalizeSignal(this.source.sample(this.time));
    if(animated){
      this.threat=this.threatResponse.update(dt,signal.onset,signal.bass,this.impulse,this.intensity>0)*Math.min(1,this.intensity);
      this.reach=this.threatResponse.reach*Math.min(1,this.intensity);
    }
    const threat=this.threat,reach=this.reach;
    this.clockSpeed=THREE.MathUtils.damp(this.clockSpeed,.38+signal.energy*this.intensity*.12,2,motionDt);
    if(animated)this.time+=dt*this.clockSpeed;
    const lightIntensity=Math.min(1,this.intensity);
    const targetEnergy=animated?Math.min(1,(signal.energy*.75+signal.bass*.45+this.impulse*.8)*lightIntensity):0;
    this.energy=THREE.MathUtils.damp(this.energy,targetEnergy,6,motionDt);
    this.treble=THREE.MathUtils.damp(this.treble,animated?signal.treble*lightIntensity:0,5,motionDt);
    this.mids=THREE.MathUtils.damp(this.mids,animated?(signal.mids??0)*lightIntensity:0,6,motionDt);
    this.bass=THREE.MathUtils.damp(this.bass,animated?signal.bass*lightIntensity:0,6,motionDt);
    this.onset=THREE.MathUtils.damp(this.onset,animated?signal.onset*lightIntensity:0,5,motionDt);
    const targetForce=animated?Math.min(3,(signal.energy*.24+signal.bass*.3+threat*1.1)*this.intensity):0;
    this.force=THREE.MathUtils.damp(this.force,targetForce,5,motionDt);
    const energy=this.energy;
    this.controls.autoRotate=animated&&this.automatic&&this.view==='encounter';
    this.controls.autoRotateSpeed=.035;
    this.controls.update(dt);
    this.watcher.copy(this.camera.position).sub(this.organism.group.position).normalize();
    this.organism.setWatcher(this.watcher);
    this.organism.update(this.time,energy,this.treble,this.onset,this.force,this.mids,this.bass,threat,reach);
    this.singularity.update(this.time,energy,this.camera,this.treble,this.force,this.mids,this.onset,threat);
    this.cosmos.update(this.time,this.renderer.getPixelRatio(),energy,this.treble,this.onset,threat);
    this.center.set(0,.65,0).project(this.camera);
    this.right.set(1,0,0).applyQuaternion(this.camera.quaternion).multiplyScalar(.86);
    this.rim.copy(this.right).add(new THREE.Vector3(0,.65,0)).project(this.camera);
    this.lens.uniforms.center.value.set(this.center.x*.5+.5,this.center.y*.5+.5);
    this.lens.uniforms.radius.value=Math.abs(this.rim.x-this.center.x)*.5*this.camera.aspect;
    this.lens.uniforms.time.value=this.time;
    this.lens.uniforms.energy.value=energy;
    // Broad distortion trails the body. Illumination does not follow beat attacks.
    this.lensDeformation=THREE.MathUtils.damp(this.lensDeformation,threat,.85,motionDt);
    this.lens.uniforms.threat.value=this.lensDeformation;
    this.bloomLevel=THREE.MathUtils.damp(this.bloomLevel,this.bloomAmount,1.5,dt);
    this.bloom.strength=this.bloomLevel*.50;
    this.root.style.setProperty('--music-energy',animated?signal.energy.toFixed(3):'0');
    this.root.style.setProperty('--music-bass',animated?signal.bass.toFixed(3):'0');
    this.root.style.setProperty('--music-treble',animated?signal.treble.toFixed(3):'0');
    this.signalListener?.(signal,animated);
    this.composer.render();
    // Recheck sustained rendering cost after each window, including after resizes.
    if(++this.frames>30&&raw>.025)this.slowFrames++;
    if(this.frames%120===0){
      if(this.qualityMode==='auto'&&this.slowFrames>60&&this.quality>.55){
        this.quality=Math.max(.55,this.quality*.85);this.resize();
      }
      this.slowFrames=0;
    }
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
