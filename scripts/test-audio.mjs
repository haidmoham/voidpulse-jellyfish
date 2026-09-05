import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const moduleUrl=(source)=>`data:text/javascript;base64,${Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64')}`;
const featureUrl=moduleUrl(readFileSync(new URL('../src/audio/AudioFeatures.ts',import.meta.url),'utf8'));
const {AudioFeatures}=await import(featureUrl);
const {MusicPlayer}=await import(moduleUrl(readFileSync(new URL('../src/audio/MusicPlayer.ts',import.meta.url),'utf8').replace("'./AudioFeatures'",JSON.stringify(featureUrl))));

const wave=new Uint8Array(2048).fill(128),frequency=new Uint8Array(1024);
const features=new AudioFeatures();
const silence=features.measure(wave,frequency,48000,2048,1/60,1);
for(const key of ['energy','bass','mids','treble','onset'])assert.equal(silence[key],0);
assert.equal(silence.bpm,null,'silence has no invented tempo');
assert.equal(silence.spectrum.length,64);assert.equal(silence.waveform.length,128);
assert.ok(silence.spectrum.every(value=>value===0)&&silence.waveform.every(value=>value===0));
for(let i=0;i<wave.length;i++)wave[i]=128+Math.round(Math.sin(i*.02)*45);
frequency.fill(220,2,10);
let result;
for(let i=0;i<60;i++)result=features.measure(wave,frequency,48000,2048,1/60,2+i/60);
assert.ok(result.bass>.6&&result.treble<.001,'bass remains distinct from treble');
assert.ok(result.spectrum.some(value=>value>.5),'measured spectrum contains bass energy');
assert.ok(result.waveform.some(value=>value<0)&&result.waveform.some(value=>value>0),'waveform preserves signed samples');
assert.equal(result.bpm,null,'a sustained tone does not invent a beat');
frequency.fill(0);wave.fill(128);
for(let i=0;i<300;i++)result=features.measure(wave,frequency,48000,2048,1/60,3+i/60);
assert.ok(result.energy<.00001&&result.bass<.00001,'silence returns the visual to rest');
features.reset();frequency.fill(210,20,60);
for(let i=0;i<wave.length;i++)wave[i]=128+Math.round(Math.sin(i*.2)*45);
for(let i=0;i<60;i++)result=features.measure(wave,frequency,48000,2048,1/60,10+i/60);
assert.ok(result.mids>.4&&result.bass<.001&&result.treble<.001,'mids respond independently');

features.reset();
for(let tick=0;tick<480;tick++){
  const beat=tick%30<3;
  for(let i=0;i<wave.length;i++)wave[i]=beat?128+Math.round(Math.sin(i*.02)*70):128;
  frequency.fill(beat?220:0);
  result=features.measure(wave,frequency,48000,2048,1/60,tick/60);
  if(tick<150)assert.equal(result.bpm,null,'tempo waits for five complete onset intervals');
}
assert.ok(Math.abs(result.bpm-120)<=1&&result.beatConfidence>.9,'regular measured pulses establish a tempo');
wave.fill(128);frequency.fill(0);
for(let tick=480;tick<800;tick++)result=features.measure(wave,frequency,48000,2048,1/60,tick/60);
assert.equal(result.bpm,null,'tempo clears after prolonged silence');
features.reset();
let irregularTime=20;
for(const interval of [.31,.82,.49,1.23,.61,.38,.97,.72]){
  wave.fill(128);frequency.fill(0);features.measure(wave,frequency,48000,2048,1/60,irregularTime+.1);
  irregularTime+=interval;
  for(let i=0;i<wave.length;i++)wave[i]=128+Math.round(Math.sin(i*.02)*70);
  frequency.fill(220);result=features.measure(wave,frequency,48000,2048,1/60,irregularTime);
}
assert.equal(result.bpm,null,'irregular onsets do not produce a confident tempo');

class FakeNode {connections=[];connect(node){this.connections.push(node);} disconnect(){this.connections=[];} gain={value:0,setTargetAtTime(){}};}
class FakeAudio extends EventTarget {
  paused=true;error=null;duration=120;currentTime=0;src='';loop=false;preload='';fail=false;
  async play(){if(this.fail)throw new Error('bad media');this.paused=false;this.dispatchEvent(new Event('playing'));}
  pause(){this.paused=true;this.dispatchEvent(new Event('pause'));}
  load(){} removeAttribute(){this.src='';}
}
class FakeContext {
  state='running';currentTime=1;sampleRate=48000;destination=new FakeNode();
  createAnalyser(){return Object.assign(new FakeNode(),{fftSize:2048,getByteTimeDomainData(a){a.fill(128);},getByteFrequencyData(a){a.fill(0);}});}
  createGain(){return new FakeNode();} createMediaElementSource(){return new FakeNode();} createMediaStreamSource(){return new FakeNode();}
  async resume(){this.state='running';}async close(){this.state='closed';}
}
globalThis.AudioContext=FakeContext;
let captured;
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getDisplayMedia:()=>new Promise(resolve=>{captured=resolve;})}}});
class Track extends EventTarget{stopped=false;stop(){this.stopped=true;}}
const stream=(hasAudio=true)=>{
  const tracks=[new Track(),...(hasAudio?[new Track()]:[])];
  return {tracks,getTracks:()=>tracks,getAudioTracks:()=>hasAudio?[tracks[1]]:[]};
};
const audio=new FakeAudio(),player=new MusicPlayer(audio,()=>{});
await player.toggle();assert.equal(player.state.playing,true);assert.equal(audio.paused,false);
player.setLoop(false);assert.equal(audio.loop,false);assert.equal(player.state.loop,false);
player.seek(400);assert.equal(audio.currentTime,120,'seek clamps to duration');
player.seek(-5);assert.equal(audio.currentTime,0);
player.setVolume(.8);assert.equal(player.state.volume,.8);
player.setVolume(NaN);assert.equal(player.state.volume,.8,'invalid volume cannot enter the audio graph');
player.sample();assert.equal(player.state.duration,120);
await player.toggle();assert.equal(player.state.playing,false);assert.equal(audio.paused,true);
const file=new File(['fixture'],'song.mp3',{type:'audio/mpeg'});
await player.choose(file);assert.equal(player.state.kind,'file');assert.equal(player.state.playing,true);
await player.choose(new File(['text'],'notes.txt',{type:'text/plain'}));assert.equal(player.state.kind,'file');assert.equal(player.state.playing,true,'invalid selection preserves the playing song');
audio.fail=true;await player.included();assert.equal(player.state.busy,false);assert.equal(player.state.playing,false);assert.ok(player.state.message);
audio.fail=false;await player.toggle();assert.equal(player.state.playing,true,'play recovers from failed media');

const pending=player.shareTab();const stale=stream();
await player.included();captured(stale);await pending;
assert.ok(stale.tracks.every(t=>t.stopped),'late sharing result is stopped after source change');
assert.equal(player.state.kind,'included');
const noAudioRequest=player.shareTab(),noAudio=stream(false);captured(noAudio);await noAudioRequest;
assert.ok(noAudio.tracks.every(t=>t.stopped));assert.equal(player.state.kind,'included');assert.ok(player.state.message.includes('no sound'));
const goodRequest=player.shareTab(),good=stream();captured(good);await goodRequest;
assert.equal(player.state.kind,'tab');assert.equal(audio.paused,true,'local playback stops when tab capture connects');
player.seek(40);assert.equal(audio.currentTime,0,'captured tab audio has no local seek control');
assert.equal(player.state.duration,0);
assert.ok(player.streamSource.connections.includes(player.analyser),'capture feeds the analyser');
assert.ok(player.analyser.connections.includes(player.analysisSink),'analysis remains in the rendered graph');
assert.equal(player.analysisSink.gain.value,0,'captured audio cannot echo');
assert.ok(player.analysisSink.connections.includes(player.context.destination));
player.sample();player.context.currentTime+=5;player.sample();
assert.ok(player.state.message.includes('no sound is arriving'),'silent capture gives actionable feedback');
player.analyser.getByteTimeDomainData=a=>{for(let i=0;i<a.length;i++)a[i]=128+Math.round(45*Math.sin(i*.02));};
player.context.currentTime+=.1;assert.ok(player.sample().energy>0);assert.equal(player.state.message,'','audio clears the silence message');
good.tracks[0].dispatchEvent(new Event('ended'));
assert.equal(player.state.kind,'included');assert.ok(good.tracks.every(t=>t.stopped),'browser stop releases all captured tracks');
const canceledRequest=player.shareTab(),canceledStream=stream();
await player.toggle();await canceledRequest;
assert.equal(player.state.busy,false,'pending capture can be canceled');
captured(canceledStream);await Promise.resolve();await Promise.resolve();
assert.ok(canceledStream.tracks.every(t=>t.stopped),'capture arriving after cancel is released');
player.dispose();assert.equal(audio.paused,true);
assert.equal(player.state.playing,false,'disposal clears the transport state');
player.dispose();await player.toggle();assert.equal(audio.paused,true,'disposed players cannot resume');
console.log('Audio checks passed: measured features, uncertain tempo, playback, source cleanup, and no invented beats.');
