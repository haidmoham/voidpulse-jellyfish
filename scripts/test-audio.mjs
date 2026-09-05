import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const moduleUrl=(source)=>`data:text/javascript;base64,${Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64')}`;
const featureUrl=moduleUrl(readFileSync(new URL('../src/audio/AudioFeatures.ts',import.meta.url),'utf8'));
const {AudioFeatures}=await import(featureUrl);
const {MusicPlayer}=await import(moduleUrl(readFileSync(new URL('../src/audio/MusicPlayer.ts',import.meta.url),'utf8').replace("'./AudioFeatures'",JSON.stringify(featureUrl))));

const wave=new Uint8Array(2048).fill(128),frequency=new Uint8Array(1024);
const features=new AudioFeatures();
assert.deepEqual(features.measure(wave,frequency,48000,2048,1/60,1),{energy:0,bass:0,treble:0,onset:0});
for(let i=0;i<wave.length;i++)wave[i]=128+Math.round(Math.sin(i*.02)*45);
frequency.fill(220,2,10);
let result;
for(let i=0;i<60;i++)result=features.measure(wave,frequency,48000,2048,1/60,2+i/60);
assert.ok(result.bass>.6&&result.treble<.001,'bass remains distinct from treble');
frequency.fill(0);wave.fill(128);
for(let i=0;i<300;i++)result=features.measure(wave,frequency,48000,2048,1/60,3+i/60);
assert.ok(result.energy<.00001&&result.bass<.00001,'silence returns the visual to rest');

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
console.log('Audio checks passed: measured bands, silence, playback/recovery, source switching, capture races, and track cleanup.');
