import type { SignalFrame } from '../core/Signal';

/** One measured frame drives both the spectrum and the instrument readouts. */
export class AudioTelemetry {
  private readonly context:CanvasRenderingContext2D|null;
  private readonly bass=document.querySelector<HTMLElement>('#meter-bass');
  private readonly mid=document.querySelector<HTMLElement>('#meter-mid');
  private readonly treble=document.querySelector<HTMLElement>('#meter-treble');
  private readonly bpm=document.querySelector<HTMLElement>('#meter-bpm');
  private last=0;
  private lastText=0;
  private accent='#94cbb7';
  private readonly peaks=new Float32Array(64);
  private readonly levels=new Float32Array(64);
  private readonly waveTrace=new Float32Array(128);

  constructor(private readonly canvas:HTMLCanvasElement){
    this.context=canvas.getContext('2d');
  }

  setPalette(preset:string):void{
    this.accent=preset==='ritual'?'#e7987d':preset==='venom'?'#bbd87b':'#94cbb7';
  }

  update=(signal:Readonly<SignalFrame>,animate=true):void=>{
    const now=performance.now();
    if(now-this.last<33)return;
    const dt=Math.min(.2,(now-this.last)/1000);this.last=now;
    if(now-this.lastText>150){
      this.lastText=now;
      for(const [element,value] of [[this.bass,signal.bass],[this.mid,signal.mids??0],[this.treble,signal.treble]] as const){
        if(element){element.textContent=String(Math.round(value*100)).padStart(2,'0');element.style.setProperty('--level',String(value));}
      }
      if(this.bpm){this.bpm.textContent=signal.bpm?String(Math.round(signal.bpm)):'—';this.bpm.title=signal.bpm?'estimated tempo':'listening for consistent beats';}
    }
    const ctx=this.context;
    if(!ctx||this.canvas.clientWidth===0||!animate)return;
    const width=this.canvas.clientWidth,height=this.canvas.clientHeight,ratio=Math.min(devicePixelRatio||1,2);
    if(this.canvas.width!==Math.round(width*ratio)||this.canvas.height!==Math.round(height*ratio)){
      this.canvas.width=Math.round(width*ratio);this.canvas.height=Math.round(height*ratio);
    }
    ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);
    const floor=height*.83,step=width/64;
    const ease=1-Math.exp(-dt*7);
    ctx.strokeStyle='#ffffff0c';ctx.lineWidth=1;
    for(let i=1;i<4;i++){ctx.beginPath();ctx.moveTo(0,floor*i/3);ctx.lineTo(width,floor*i/3);ctx.stroke();}
    for(let i=0;i<64;i++){
      this.levels[i]+=((signal.spectrum?.[i]??0)-this.levels[i])*ease;
      const value=this.levels[i];
      this.peaks[i]=Math.max(value,this.peaks[i]-dt*.22);
      const barHeight=Math.max(1,value*(floor-4));
      ctx.globalAlpha=.55;ctx.fillStyle=this.accent;
      ctx.fillRect(i*step,floor-barHeight,Math.max(1,step-2),barHeight);
      ctx.globalAlpha=.55;ctx.fillStyle='#e9dfc9';
      if(this.peaks[i]>.015)ctx.fillRect(i*step,floor-this.peaks[i]*(floor-4)-2,Math.max(1,step-2),1);
    }
    // Signed time-domain samples form a separate waveform through the spectrum.
    ctx.globalAlpha=.4;ctx.strokeStyle=this.accent;ctx.lineWidth=1;ctx.beginPath();
    const wave=signal.waveform;
    for(let i=0;i<128;i++){
      this.waveTrace[i]+=((wave?.[i]??0)-this.waveTrace[i])*ease;
      const x=i/127*width,y=height*.46-this.waveTrace[i]*height*.3;
      if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.stroke();ctx.globalAlpha=.6;ctx.fillStyle='#a5ada5';ctx.font='8px monospace';
    ctx.fillText('30 hz',0,height-1);ctx.fillText('1 khz',width*.49,height-1);ctx.fillText('16 khz',width-36,height-1);
    ctx.globalAlpha=1;
  };
}
