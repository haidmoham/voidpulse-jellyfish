import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Organism } from '../src/visual/Organism';
import { Singularity } from '../src/visual/Singularity';
import { Cosmos } from '../src/visual/Cosmos';

const SIZE=160;
const button=document.querySelector<HTMLButtonElement>('#run-check')!;
const progress=document.querySelector<HTMLElement>('#progress')!;
const output=document.querySelector<HTMLElement>('#result')!;
const measurements=document.querySelector<HTMLElement>('#measurements')!;
const preview=document.querySelector<HTMLCanvasElement>('#preview')!;
const palettes=['abyss','ritual','venom'] as const;
const cameras=[
  {name:'encounter',position:[0,1,15.2]},
  {name:'horizon',position:[.2,1.1,7.5]},
  {name:'oracle',position:[5,5.5,10]},
  {name:'rear',position:[0,2,-15]},
  {name:'side',position:[12,2,5]},
] as const;
const inputs=[
  {time:0,energy:0,bass:0,mid:0,treble:0,onset:0,force:0,threat:0,reach:0},
  {time:1.37,energy:.4,bass:1,mid:.1,treble:0,onset:1,force:2,threat:1,reach:0},
  {time:17.3,energy:.5,bass:.1,mid:1,treble:.1,onset:.4,force:1,threat:.4,reach:.8},
  {time:55,energy:.8,bass:0,mid:.2,treble:1,onset:.8,force:3,threat:.7,reach:1},
  {time:163,energy:1,bass:1,mid:1,treble:1,onset:1,force:3,threat:1,reach:1},
  {time:489,energy:.05,bass:.02,mid:.1,treble:.01,onset:0,force:.1,threat:0,reach:.5},
  {time:2048,energy:.6,bass:.7,mid:.3,treble:.8,onset:.6,force:1.6,threat:.5,reach:.9},
  {time:8192,energy:0,bass:0,mid:0,treble:0,onset:0,force:0,threat:0,reach:0},
] as const;

interface PixelMetrics {nonFinite:number;litPixels:number;maxChannel:number;meanLuminance:number;blank:boolean;}
interface FrameMetrics {pose:string;palette:string;stage:'scene'|'bloom-output';repeat:number;pixels:PixelMetrics;maxRepeatDelta:number;}

function inspect(pixels:Float32Array):PixelMetrics {
  let nonFinite=0,litPixels=0,maxChannel=0,luminance=0;
  for(let i=0;i<pixels.length;i+=4){
    for(let c=0;c<4;c++)if(!Number.isFinite(pixels[i+c]))nonFinite++;
    const r=Number.isFinite(pixels[i])?pixels[i]:0;
    const g=Number.isFinite(pixels[i+1])?pixels[i+1]:0;
    const b=Number.isFinite(pixels[i+2])?pixels[i+2]:0;
    const maximum=Math.max(r,g,b);
    if(maximum>1e-6)litPixels++;
    maxChannel=Math.max(maxChannel,maximum);
    luminance+=r*.2126+g*.7152+b*.0722;
  }
  return {nonFinite,litPixels,maxChannel,meanLuminance:luminance/(SIZE*SIZE),blank:litPixels===0};
}

function compare(a:Float32Array,b:Float32Array):number {
  let maximum=0;
  for(let i=0;i<a.length;i++)if(Number.isFinite(a[i])&&Number.isFinite(b[i]))maximum=Math.max(maximum,Math.abs(a[i]-b[i]));
  return maximum;
}

function showPreview(pixels:Float32Array):void {
  const context=preview.getContext('2d');
  if(!context)return;
  const image=context.createImageData(SIZE,SIZE);
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
    const source=((SIZE-1-y)*SIZE+x)*4,destination=(y*SIZE+x)*4;
    for(let channel=0;channel<3;channel++){
      const value=pixels[source+channel];
      image.data[destination+channel]=Number.isFinite(value)?Math.round(THREE.MathUtils.clamp(value,0,1)*255):channel===0||channel===2?255:0;
    }
    image.data[destination+3]=255;
  }
  context.putImageData(image,0,0);
}

button.addEventListener('click',()=>{void run();});

async function run():Promise<void> {
  button.disabled=true;output.textContent='running';measurements.textContent='';document.body.dataset.result='running';
  progress.textContent='creating a WebGL 2 context';
  const frames:FrameMetrics[]=[],errors:string[]=[];
  let renderer:THREE.WebGLRenderer|undefined,rawTarget:THREE.WebGLRenderTarget|undefined,composer:EffectComposer|undefined;
  let organism:Organism|undefined,singularity:Singularity|undefined,cosmos:Cosmos|undefined;
  const started=performance.now();
  let rendererName='unknown';
  try{
    renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});
    renderer.setPixelRatio(1);renderer.setSize(SIZE,SIZE);renderer.setClearColor(0x000000,1);
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;
    const gl=renderer.getContext();
    rendererName=String(gl.getParameter(gl.RENDERER));
    if(!renderer.extensions.get('EXT_color_buffer_float'))throw new Error('unsupported: EXT_color_buffer_float is required for unmasked float readback');
    if(!renderer.extensions.get('EXT_float_blend'))throw new Error('unsupported: EXT_float_blend is required for this transparent FloatType scene');
    renderer.debug.onShaderError=(context,program,vertex,fragment)=>{
      errors.push(`shader failure: ${context.getProgramInfoLog(program)}\nvertex: ${context.getShaderInfoLog(vertex)}\nfragment: ${context.getShaderInfoLog(fragment)}`);
    };
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,.1,160);
    organism=new Organism();singularity=new Singularity();cosmos=new Cosmos();
    organism.setViewportHeight(SIZE);
    scene.add(organism.group,singularity.group,cosmos.group);
    rawTarget=new THREE.WebGLRenderTarget(SIZE,SIZE,{type:THREE.FloatType,format:THREE.RGBAFormat,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthBuffer:true});
    composer=new EffectComposer(renderer,rawTarget.clone());composer.renderToScreen=false;
    composer.addPass(new RenderPass(scene,camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(SIZE,SIZE),.6,.5,.72));
    composer.addPass(new OutputPass());
    const samples=new Float32Array(SIZE*SIZE*4),firstRaw=new Float32Array(samples.length),firstPost=new Float32Array(samples.length);
    const watcher=new THREE.Vector3();
    let completed=0;
    for(const view of cameras)for(let index=0;index<inputs.length;index++){
      const input=inputs[index],palette=palettes[(completed+index)%palettes.length],pose=`${view.name}/${index}/t=${input.time}`;
      camera.position.set(view.position[0],view.position[1],view.position[2]);camera.lookAt(0,-.8,0);camera.updateMatrixWorld();
      organism.setPalette(palette);singularity.setPalette(palette);cosmos.setPalette(palette);
      organism.setWatcher(watcher.copy(camera.position).sub(new THREE.Vector3(0,.5,0)).normalize());
      organism.update(input.time,input.energy,input.treble,input.onset,input.force,input.mid,input.bass,input.threat,input.reach);
      singularity.update(input.time,input.energy,camera,input.treble,input.force,input.mid,input.onset,input.threat);
      cosmos.update(input.time,1,input.energy,input.treble,input.onset,input.threat);
      for(let repeat=0;repeat<2;repeat++){
        renderer.setRenderTarget(rawTarget);renderer.render(scene,camera);
        // A NaN sentinel also exposes failed readback; zero-filled buffers could pass unnoticed.
        samples.fill(NaN);renderer.readRenderTargetPixels(rawTarget,0,0,SIZE,SIZE,samples);
        const raw=inspect(samples),rawDelta=repeat?compare(samples,firstRaw):0;
        if(!repeat)firstRaw.set(samples);
        frames.push({pose,palette,stage:'scene',repeat,pixels:raw,maxRepeatDelta:rawDelta});
        renderer.setRenderTarget(null);composer.render(1/60);
        samples.fill(NaN);renderer.readRenderTargetPixels(composer.readBuffer,0,0,SIZE,SIZE,samples);
        const post=inspect(samples),postDelta=repeat?compare(samples,firstPost):0;
        if(!repeat)firstPost.set(samples);
        frames.push({pose,palette,stage:'bloom-output',repeat,pixels:post,maxRepeatDelta:postDelta});
        const glError=gl.getError();
        if(glError!==gl.NO_ERROR)errors.push(`${pose} repeat ${repeat}: WebGL error 0x${glError.toString(16)}`);
      }
      showPreview(samples);completed++;
      progress.textContent=`${completed}/40 poses · ${frames.filter(frame=>frame.pixels.nonFinite>0).length} non-finite frames · ${frames.filter(frame=>frame.pixels.blank).length} blank frames`;
      // Yield between poses so the progress stays visible and the page remains responsive.
      await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
    }
  }catch(error){errors.push(error instanceof Error?error.message:String(error));}
  finally{
    organism?.dispose();singularity?.dispose();cosmos?.dispose();
    if(composer){for(const pass of composer.passes)pass.dispose();composer.dispose();}
    rawTarget?.dispose();renderer?.dispose();renderer?.forceContextLoss();
    button.disabled=false;
  }
  const bad=frames.filter(frame=>frame.pixels.nonFinite>0||frame.pixels.blank||frame.maxRepeatDelta>1e-5);
  const passed=frames.length===160&&bad.length===0&&errors.length===0;
  const report={status:passed?'PASS':'FAIL',renderer:rendererName,poseCount:frames.length/4,readbacks:frames.length,resolution:`${SIZE}x${SIZE}`,nonFiniteValues:frames.reduce((sum,frame)=>sum+frame.pixels.nonFinite,0),nonFiniteFrames:frames.filter(frame=>frame.pixels.nonFinite>0).length,blankFrames:frames.filter(frame=>frame.pixels.blank).length,unstableRepeats:frames.filter(frame=>frame.maxRepeatDelta>1e-5).length,maxRepeatDelta:Math.max(0,...frames.map(frame=>frame.maxRepeatDelta)),seconds:Number(((performance.now()-started)/1000).toFixed(2)),resourcesDisposed:true,scope:'real scene shaders + UnrealBloomPass + OutputPass; app lens shader is not included',errors,failures:bad};
  output.textContent=JSON.stringify(report,null,2);
  measurements.textContent=JSON.stringify(frames,null,2);
  progress.textContent=`${report.status} · ${report.poseCount}/40 poses · ${report.nonFiniteValues} non-finite values · ${report.blankFrames} blank frames · ${report.unstableRepeats} unstable repeats`;
  document.body.dataset.result=report.status.toLowerCase();
}
