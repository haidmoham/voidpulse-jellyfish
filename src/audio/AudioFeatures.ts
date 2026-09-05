import type { SignalFrame } from '../core/Signal';

/** All features come from the analyser. Silence never creates a synthetic beat. */
export class AudioFeatures {
  private previousEnergy=0;
  private lastOnset=-Infinity;
  private onsetStrength=0;
  private fluxAverage=0;
  private readonly intervals:number[]=[];
  private readonly previousSpectrum=new Float32Array(64);
  private readonly spectrum=new Float32Array(64);
  private readonly waveform=new Float32Array(128);
  private readonly frame:SignalFrame={energy:0,bass:0,mids:0,treble:0,onset:0,spectrum:this.spectrum,waveform:this.waveform,bpm:null,beatConfidence:0};

  reset():void {
    this.previousEnergy=0;this.lastOnset=-Infinity;this.onsetStrength=0;this.fluxAverage=0;
    this.intervals.length=0;this.previousSpectrum.fill(0);this.spectrum.fill(0);this.waveform.fill(0);
    Object.assign(this.frame,{energy:0,bass:0,mids:0,treble:0,onset:0,bpm:null,beatConfidence:0});
  }

  measure(wave:Uint8Array,frequency:Uint8Array,sampleRate:number,fftSize:number,dt:number,now:number):Readonly<SignalFrame>{
    const step=Math.max(0,Math.min(.1,dt));
    const damp=(current:number,target:number,attack:number,release:number)=>current+(target-current)*(1-Math.exp(-step/(target>current?attack:release)));
    let sum=0;
    for(const value of wave){const x=(value-128)/128;sum+=x*x;}
    const rms=Math.sqrt(sum/Math.max(1,wave.length));
    const band=(low:number,high:number)=>{
      const first=Math.max(1,Math.min(frequency.length-1,Math.floor(low*fftSize/sampleRate)));
      const last=Math.min(frequency.length-1,Math.ceil(high*fftSize/sampleRate));
      let power=0;
      for(let i=first;i<=last;i++)power+=(frequency[i]/255)**2;
      return Math.sqrt(power/Math.max(1,last-first+1));
    };
    const audible=Math.min(1,rms/.012);
    const energy=Math.min(1,Math.max(0,(rms-.002)*5));
    this.frame.energy=damp(this.frame.energy,energy,.045,.28);
    this.frame.bass=damp(this.frame.bass,band(35,220)*audible,.045,.25);
    this.frame.mids=damp(this.frame.mids??0,band(220,1800)*audible,.065,.22);
    this.frame.treble=damp(this.frame.treble,band(1800,11000)*audible,.045,.2);
    let flux=0;
    const maxHz=Math.min(16000,sampleRate/2);
    for(let i=0;i<this.spectrum.length;i++){
      const low=30*(maxHz/30)**(i/64),high=30*(maxHz/30)**((i+1)/64);
      const value=band(low,high)*audible;
      flux+=Math.max(0,value-this.previousSpectrum[i]);
      this.previousSpectrum[i]=value;
      this.spectrum[i]=damp(this.spectrum[i],value,.035,.18);
    }
    flux/=64;
    for(let i=0;i<this.waveform.length;i++){
      const index=Math.min(wave.length-1,Math.floor(i*wave.length/this.waveform.length));
      this.waveform[i]=wave.length?(wave[index]-128)/128:0;
    }
    const transient=Math.max(0,energy-this.previousEnergy);
    this.previousEnergy=energy;
    const hit=audible>.3&&now-this.lastOnset>.25&&
      (flux>Math.max(.016,this.fluxAverage*2.2)||transient>.08);
    this.fluxAverage=damp(this.fluxAverage,flux,.7,.7);
    if(hit){
      const interval=now-this.lastOnset;
      if(interval>=.28&&interval<=1.5){
        this.intervals.push(interval);
        if(this.intervals.length>10)this.intervals.shift();
      }else if(interval>1.5){this.intervals.length=0;}
      this.lastOnset=now;
      this.onsetStrength=Math.min(1,Math.max(flux*8,transient*3));
      this.estimateTempo();
    }
    if(now-this.lastOnset>4){this.frame.bpm=null;this.frame.beatConfidence=0;this.intervals.length=0;}
    this.frame.onset=damp(this.frame.onset,now-this.lastOnset<.075?this.onsetStrength:0,.018,.22);
    return this.frame;
  }

  private estimateTempo():void {
    this.frame.bpm=null;this.frame.beatConfidence=0;
    if(this.intervals.length<5)return;
    const sorted=[...this.intervals].sort((a,b)=>a-b);
    const median=sorted[Math.floor(sorted.length/2)];
    const consistent=this.intervals.filter(interval=>Math.abs(interval-median)/median<.13);
    const confidence=consistent.length/this.intervals.length;
    if(consistent.length<5||confidence<.75)return;
    let bpm=60/(consistent.reduce((sum,interval)=>sum+interval,0)/consistent.length);
    // Tempo has an octave ambiguity. Report a stable estimate in a useful range.
    while(bpm<60)bpm*=2;
    while(bpm>180)bpm/=2;
    this.frame.bpm=Math.round(bpm);this.frame.beatConfidence=confidence;
  }
}
