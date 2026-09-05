import type { SignalFrame, SignalSource } from '../core/Signal';
import { AudioFeatures } from './AudioFeatures';

type MusicKind='included'|'file'|'tab';
export interface MusicState {kind:MusicKind;title:string;playing:boolean;busy:boolean;message:string;duration:number;currentTime:number;volume:number;loop:boolean;bpm:number|null;}
const empty:Readonly<SignalFrame>={energy:0,bass:0,mids:0,treble:0,onset:0,spectrum:new Float32Array(64),waveform:new Float32Array(128),bpm:null,beatConfidence:0};

export class MusicPlayer implements SignalSource {
  readonly state:MusicState={kind:'included',title:'come play with me · kevin macleod',playing:false,busy:false,message:'',duration:0,currentTime:0,volume:.55,loop:true,bpm:null};
  private readonly events=new AbortController();
  private context:AudioContext|null=null;
  private analyser:AnalyserNode|null=null;
  private mediaSource:MediaElementAudioSourceNode|null=null;
  private gain:GainNode|null=null;
  private analysisSink:GainNode|null=null;
  private stream:MediaStream|null=null;
  private streamSource:MediaStreamAudioSourceNode|null=null;
  private wave=new Uint8Array(4096);
  private frequency=new Uint8Array(2048);
  private readonly features=new AudioFeatures();
  private lastSample=0;
  private objectUrl:string|null=null;
  private operation=0;
  private volume=.55;
  private disposed=false;
  private cancelCapture:(()=>void)|null=null;
  private silentSince:number|null=null;

  constructor(readonly audio:HTMLAudioElement,private readonly notify:()=>void){
    audio.src='/audio/come-play-with-me.mp3';audio.preload='none';audio.loop=true;
    const options={signal:this.events.signal};
    audio.addEventListener('playing',()=>{if(this.state.kind!=='tab'){this.state.playing=true;this.state.busy=false;this.state.message='';this.notify();}},options);
    audio.addEventListener('pause',()=>{if(this.state.kind!=='tab'){this.state.playing=false;this.notify();}},options);
    audio.addEventListener('ended',()=>{if(this.state.kind!=='tab'){this.state.playing=false;this.notify();}},options);
    for(const event of ['loadedmetadata','durationchange','timeupdate','seeked'])audio.addEventListener(event,()=>this.updateTimeline(),options);
    audio.addEventListener('error',()=>{
      if(this.disposed||this.state.kind==='tab')return;
      this.state.playing=false;this.state.busy=false;
      this.state.message=this.state.kind==='file'?'that song could not play. try an mp3, or play the demo.':'the music could not load. press play to try again.';
      this.notify();
    },options);
  }

  private connect():void {
    if(this.context)return;
    this.context=new AudioContext();
    this.analyser=this.context.createAnalyser();
    this.analyser.fftSize=4096;this.analyser.smoothingTimeConstant=.2;
    this.analyser.minDecibels=-90;this.analyser.maxDecibels=-15;
    // Keep captured audio in the rendered graph without playing it twice.
    this.analysisSink=this.context.createGain();this.analysisSink.gain.value=0;
    this.analyser.connect(this.analysisSink);this.analysisSink.connect(this.context.destination);
    this.gain=this.context.createGain();this.gain.gain.value=this.volume;
    this.mediaSource=this.context.createMediaElementSource(this.audio);
    this.mediaSource.connect(this.analyser);
    this.mediaSource.connect(this.gain);this.gain.connect(this.context.destination);
  }

  async toggle():Promise<void>{
    if(this.disposed)return;
    if(this.cancelCapture){this.cancelCapture();return;}
    if(this.state.kind==='tab'){this.stopTab();return;}
    if(this.state.busy)return;
    if(!this.audio.paused){this.audio.pause();return;}
    await this.play();
  }

  private async play():Promise<void>{
    if(this.disposed)return;
    const operation=++this.operation;
    this.state.busy=true;this.state.message='';this.notify();
    try{
      this.connect();
      // Start both from the click handler to preserve mobile playback permission.
      if(this.audio.error)this.audio.load();
      const resume=this.context!.resume();
      const play=this.audio.play();
      await Promise.all([resume,play]);
      if(operation!==this.operation||this.disposed)return;
      this.state.playing=true;
    }catch(error){
      if(operation!==this.operation||this.disposed)return;
      this.audio.pause();this.state.playing=false;
      this.state.message=error instanceof DOMException&&error.name==='NotAllowedError'
        ?'press play once more to start the music.'
        :'that song could not play. try another song or play the demo.';
    }finally{
      if(operation===this.operation&&!this.disposed){this.state.busy=false;this.notify();}
    }
  }

  async choose(file:File):Promise<void>{
    if(this.disposed)return;
    if(!file.type.startsWith('audio/')&&!/\.(mp3|wav|m4a|aac|ogg|oga|flac|opus|aiff|webm)$/i.test(file.name)){
      this.state.message='choose a music file, such as an mp3 or m4a.';this.notify();return;
    }
    this.switchSource('file',file.name.replace(/\.[^.]+$/,''));
    this.objectUrl=URL.createObjectURL(file);this.audio.src=this.objectUrl;this.audio.load();
    await this.play();
  }

  async included():Promise<void>{
    if(this.disposed)return;
    this.switchSource('included','come play with me · kevin macleod');this.audio.src='/audio/come-play-with-me.mp3';this.audio.load();await this.play();
  }

  private switchSource(kind:MusicKind,title:string):void{
    this.cancelCapture?.();this.cancelCapture=null;
    ++this.operation;this.audio.pause();this.releaseStream();
    if(this.objectUrl){URL.revokeObjectURL(this.objectUrl);this.objectUrl=null;}
    this.features.reset();this.lastSample=0;
    Object.assign(this.state,{kind,title,playing:false,busy:false,message:'',currentTime:0,duration:0,bpm:null});
  }

  async shareTab():Promise<void>{
    if(this.disposed)return;
    if(this.cancelCapture)return;
    if(!navigator.mediaDevices?.getDisplayMedia){
      this.state.message='to use YouTube, open this page in Chrome or Edge on a computer. you can still choose a song here.';
      this.notify();return;
    }
    const operation=++this.operation;
    this.state.busy=true;this.state.message='choose the tab playing music and turn on “share tab audio”.';this.notify();
    let pending:MediaStream|null=null;
    let timer:ReturnType<typeof setTimeout>|undefined;
    let expired=false;
    try{
      this.connect();
      // The browser owns source selection. No captured data leaves this page.
      const capture=navigator.mediaDevices.getDisplayMedia({
        video:{displaySurface:'browser'},audio:{suppressLocalAudioPlayback:false},
        selfBrowserSurface:'exclude',systemAudio:'exclude',surfaceSwitching:'include',
      } as DisplayMediaStreamOptions);
      const interrupted=new Promise<never>((_,reject)=>{
        this.cancelCapture=()=>{expired=true;reject(new Error('capture-canceled'));};
        timer=setTimeout(()=>{expired=true;reject(new Error('capture-timeout'));},30000);
      });
      // A host can expose the API without presenting a sharing picker.
      // Stop streams that arrive after cancellation or the recovery deadline.
      const guardedCapture=capture.then(stream=>{
        if(expired||operation!==this.operation||this.disposed){stream.getTracks().forEach(track=>track.stop());throw new Error('capture-canceled');}
        pending=stream;return stream;
      });
      [pending]=await Promise.race([Promise.all([guardedCapture,this.context!.resume()]),interrupted]);
      if(!pending)throw new Error('no-audio');
      if(operation!==this.operation||this.disposed){pending.getTracks().forEach(track=>track.stop());return;}
      if(!pending.getAudioTracks().length){
        pending.getTracks().forEach(track=>track.stop());pending=null;
        throw new Error('no-audio');
      }
      this.audio.pause();this.releaseStream();this.stream=pending;pending=null;
      this.streamSource=this.context!.createMediaStreamSource(this.stream);
      this.streamSource.connect(this.analyser!);
      // Do not connect capture to speakers: the source tab already plays its sound.
      this.features.reset();
      this.silentSince=null;
      Object.assign(this.state,{kind:'tab',title:'music from your tab',playing:true,message:'',duration:0,currentTime:0,bpm:null});
      for(const track of this.stream.getTracks())track.addEventListener('ended',this.stopTab,{once:true});
    }catch(error){
      pending?.getTracks().forEach(track=>track.stop());
      if(operation!==this.operation||this.disposed)return;
      this.state.message=error instanceof Error&&error.message==='capture-timeout'
        ?'sharing did not open. open this site and your music in the same Chrome or Edge browser, then try again.'
        :error instanceof Error&&error.message==='capture-canceled'
        ?'connection canceled. you can play music or try again.'
        :error instanceof DOMException&&error.name==='NotAllowedError'
        ?'nothing shared. you can try again or play the demo.'
        :'no sound was shared. in Chrome or Edge, choose a browser tab and turn on “share tab audio”.';
    }finally{
      clearTimeout(timer);if(operation===this.operation)this.cancelCapture=null;
      if(operation===this.operation&&!this.disposed){this.state.busy=false;this.notify();}
    }
  }

  private releaseStream():void{
    this.streamSource?.disconnect();this.streamSource=null;
    this.stream?.getTracks().forEach(track=>{track.removeEventListener('ended',this.stopTab);track.stop();});
    this.stream=null;
  }

  private readonly stopTab=():void=>{
    ++this.operation;this.releaseStream();this.features.reset();
    Object.assign(this.state,{kind:'included',title:'come play with me · kevin macleod',playing:false,busy:false,message:'disconnected. press play for the demo.',duration:0,currentTime:0,bpm:null});
    if(this.objectUrl){URL.revokeObjectURL(this.objectUrl);this.objectUrl=null;}
    this.audio.src='/audio/come-play-with-me.mp3';this.audio.load();this.notify();
  };

  setVolume(value:number):void {
    if(!Number.isFinite(value))return;
    this.volume=Math.min(1,Math.max(0,value));
    this.state.volume=this.volume;
    if(this.context&&this.gain)this.gain.gain.setTargetAtTime(this.volume,this.context.currentTime,.025);
  }

  setLoop(enabled:boolean):void {this.audio.loop=enabled;this.state.loop=enabled;this.notify();}

  seek(seconds:number):void {
    if(this.state.kind==='tab'||!Number.isFinite(seconds)||!Number.isFinite(this.audio.duration)||this.audio.duration<=0)return;
    this.audio.currentTime=Math.min(this.audio.duration,Math.max(0,seconds));
    this.features.reset();this.state.bpm=null;this.updateTimeline();
  }

  private updateTimeline():void {
    this.state.duration=this.state.kind!=='tab'&&Number.isFinite(this.audio.duration)?Math.max(0,this.audio.duration):0;
    this.state.currentTime=this.state.kind!=='tab'&&Number.isFinite(this.audio.currentTime)?Math.max(0,this.audio.currentTime):0;
  }

  sample():Readonly<SignalFrame>{
    this.updateTimeline();
    if(!this.analyser||!this.context||this.context.state!=='running'||!this.state.playing){this.features.reset();this.state.bpm=null;return empty;}
    const now=this.context.currentTime,dt=Math.min(.1,Math.max(.001,now-this.lastSample));this.lastSample=now;
    this.analyser.getByteTimeDomainData(this.wave);this.analyser.getByteFrequencyData(this.frequency);
    const signal=this.features.measure(this.wave,this.frequency,this.context.sampleRate,this.analyser.fftSize,dt,now);
    this.state.bpm=signal.bpm??null;
    if(this.state.kind==='tab'){
      if(signal.energy>.005){
        this.silentSince=null;
        if(this.state.message){this.state.message='';this.notify();}
      }else{
        this.silentSince??=now;
        if(now-this.silentSince>4&&!this.state.message){
          this.state.message='connected, but no sound is arriving. play the music in the shared tab. if it is playing, reconnect and turn on “share tab audio”.';this.notify();
        }
      }
    }
    return signal;
  }

  dispose():void{
    if(this.disposed)return;
    this.cancelCapture?.();
    this.disposed=true;++this.operation;this.events.abort();this.audio.pause();this.releaseStream();
    this.features.reset();Object.assign(this.state,{playing:false,busy:false,bpm:null});
    this.audio.removeAttribute('src');this.audio.load();
    if(this.objectUrl)URL.revokeObjectURL(this.objectUrl);
    this.mediaSource?.disconnect();this.analyser?.disconnect();this.analysisSink?.disconnect();this.gain?.disconnect();
    void this.context?.close();
  }
}

