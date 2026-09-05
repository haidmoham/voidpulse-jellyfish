import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as THREE from 'three';

const transpile=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const importSource=async path=>import(`data:text/javascript;base64,${Buffer.from(transpile(readFileSync(new URL(path,import.meta.url),'utf8'))).toString('base64')}`);
const {normalizeSignal,silentSource}=await importSource('../src/core/Signal.ts');
const {ThreatResponse}=await importSource('../src/visual/ThreatResponse.ts');
const sourceText=readFileSync(new URL('../src/app/VoidpulseApp.ts',import.meta.url),'utf8');
const source=ts.createSourceFile('VoidpulseApp.ts',sourceText,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
const app=source.statements.find(node=>ts.isClassDeclaration(node)&&node.name?.text==='VoidpulseApp');
assert.ok(app,'the regression must execute the actual app class members');
const names=['resize','resizeRenderer','frame'];
const members=names.map(name=>{
  const member=app.members.find(node=>node.name?.getText(source)===name);
  assert.ok(member,`missing app member: ${name}`);
  return member.getText(source);
});

// Run the actual frame loop without constructing WebGL. Camera math and signal code stay real.
const document={hidden:false,querySelector:()=>null};
const Harness=new Function('THREE','normalizeSignal','document','requestAnimationFrame','innerWidth','innerHeight','devicePixelRatio',
  `${transpile(`class FrameHarness {${members.join('\n')}}`)}\nreturn FrameHarness;`
)(THREE,normalizeSignal,document,()=>1,1280,800,1);

function setup(immediateResize=false){
  const events=[];
  let hasPixels=true;
  const clear=label=>()=>{events.push(label);hasPixels=false;};
  const camera=new THREE.PerspectiveCamera(42,1.6,.1,160);
  camera.position.set(0,1,18.4);camera.lookAt(0,-1.2,0);camera.updateMatrixWorld();
  const harness=new Harness();
  Object.assign(harness,{
    disposed:false,resizePending:false,mobile:false,immersive:false,view:'encounter',
    qualityMode:'auto',quality:1,frames:119,slowFrames:61,last:967,time:0,running:false,
    impulse:0,intensity:1.6,clockSpeed:.38,energy:0,treble:0,mids:0,bass:0,onset:0,force:0,
    lensDeformation:0,threat:0,reach:0,bloomLevel:.75,bloomAmount:.75,automatic:false,signalListener:null,
    source:silentSource,threatResponse:new ThreatResponse(),camera,
    watcher:new THREE.Vector3(),center:new THREE.Vector3(),right:new THREE.Vector3(),rim:new THREE.Vector3(),
    renderer:{setPixelRatio:clear('renderer density'),setSize:clear('canvas resize'),getPixelRatio:()=>1},
    composer:{setPixelRatio:clear('composer density'),setSize:clear('composer resize'),render:()=>{events.push('draw');hasPixels=true;}},
    controls:{update(){}},organism:{group:new THREE.Group(),setWatcher(){},setViewportHeight(){},update(){}},
    singularity:{update(){}},cosmos:{update(){}},bloom:{strength:0},
    edgeSmoothing:{uniforms:{texel:{value:new THREE.Vector2()}}},
    root:{style:{setProperty(){}},classList:{add(){}}},
    lens:{uniforms:{center:{value:new THREE.Vector2()},aspect:{value:1.6},radius:{value:0},time:{value:0},energy:{value:0},threat:{value:0}}},
  });
  // Reproduce the old callback: it changed canvas size immediately after drawing.
  if(immediateResize)harness.resize=()=>harness.resizeRenderer();
  return {harness,events,hasPixels:()=>hasPixels};
}

function assertAdaptiveFrameKeepsPixels(state){
  state.harness.frame(1000);
  assert.equal(state.hasPixels(),true,'adaptive quality keeps the drawn pixels until the next frame');
}

const state=setup();
assertAdaptiveFrameKeepsPixels(state);
assert.deepEqual(state.events,['draw'],'adaptive quality queues its resize after presentation');
assert.equal(state.harness.resizePending,true);
assert.equal(state.harness.quality,.85,'the slow-frame fixture must trigger adaptive quality');
state.events.length=0;
state.harness.frame(1016);
assert.deepEqual(state.events,['renderer density','canvas resize','composer density','composer resize','draw']);
assert.equal(state.hasPixels(),true);
assert.equal(state.harness.resizePending,false);

// Browser resize bursts must also preserve the current frame and coalesce before the next draw.
state.events.length=0;state.harness.resize();state.harness.resize();
assert.equal(state.hasPixels(),true);assert.deepEqual(state.events,[]);
state.harness.frame(1032);
assert.equal(state.events.filter(event=>event==='canvas resize').length,1);
assert.equal(state.events.at(-1),'draw');assert.equal(state.hasPixels(),true);

assert.throws(()=>assertAdaptiveFrameKeepsPixels(setup(true)),/adaptive quality keeps the drawn pixels/,
  'the regression must reject the original immediate-resize behavior');

// Pause a nonzero musical pose. New silence must not snap the displayed body back to rest.
const paused=setup().harness;
paused.running=true;paused.frames=0;paused.qualityMode='high';
paused.source={sample:()=>({...silentSource.sample(0),energy:.6,bass:.7,mids:.35,treble:.3,onset:.5})};
let displayedPose;
paused.organism.update=(...values)=>{displayedPose=values;};
for(let tick=0;tick<20;tick++)paused.frame(1000+tick*16);
assert.ok(paused.threat>.1&&paused.force>.1&&paused.bass>.1,'the pause fixture must first produce a deformed musical pose');
const poseKeys=['time','clockSpeed','impulse','energy','treble','mids','bass','onset','force','threat','reach','lensDeformation'];
const pose=()=>poseKeys.map(key=>paused[key]);
const beforePause=pose(),beforeDisplayedPose=[...displayedPose];
assert.ok(beforePause.every(Number.isFinite));
paused.running=false;paused.source=silentSource;
for(let tick=20;tick<32;tick++){
  paused.frame(1000+tick*16);
  assert.deepEqual(pose(),beforePause,'pause freezes every numerical body and lens pose channel');
  assert.deepEqual(displayedPose,beforeDisplayedPose,'pause sends the unchanged pose to the organism');
}
console.log('Visual checks passed: queued resize prevents blank frames; pause preserves the displayed musical pose.');
