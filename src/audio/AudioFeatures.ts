import type { SignalFrame } from '../core/Signal';

/** Measures real audio. Smooth envelopes prevent single samples from causing flashes. */
export class AudioFeatures {
  private previous=0;
  private lastOnset=-1;
  private onsetStrength=0;
  private readonly frame:SignalFrame={energy:0,bass:0,treble:0,onset:0};

  reset():void {this.previous=0;this.lastOnset=-1;this.onsetStrength=0;Object.assign(this.frame,{energy:0,bass:0,treble:0,onset:0});}

  measure(wave:Uint8Array,frequency:Uint8Array,sampleRate:number,fftSize:number,dt:number,now:number):Readonly<SignalFrame>{
    let sum=0;
    for(const value of wave){const x=(value-128)/128;sum+=x*x;}
    const rms=Math.sqrt(sum/wave.length);
    const band=(low:number,high:number)=>{
      const first=Math.max(1,Math.floor(low*fftSize/sampleRate));
      const last=Math.min(frequency.length-1,Math.ceil(high*fftSize/sampleRate));
      let power=0;
      for(let i=first;i<=last;i++)power+=(frequency[i]/255)**2;
      return Math.sqrt(power/Math.max(1,last-first+1));
    };
    const audible=Math.min(1,rms/.012);
    const energy=Math.min(1,Math.max(0,(rms-.002)*5));
    const bass=band(35,220)*audible;
    const treble=band(1800,11000)*audible;
    const transient=Math.max(0,energy-this.previous);
    this.previous=energy;
    const damp=(current:number,target:number,attack:number,release:number)=>current+(target-current)*(1-Math.exp(-dt/(target>current?attack:release)));
    this.frame.energy=damp(this.frame.energy,energy,.09,.35);
    this.frame.bass=damp(this.frame.bass,bass,.08,.3);
    this.frame.treble=damp(this.frame.treble,treble,.12,.35);
    const hit=transient>.045&&now-this.lastOnset>.26;
    if(hit){this.lastOnset=now;this.onsetStrength=Math.min(1,transient*5);}
    this.frame.onset=damp(this.frame.onset,now-this.lastOnset<.12?this.onsetStrength:0,.08,.45);
    return this.frame;
  }
}
