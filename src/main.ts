import { VoidpulseApp } from './app/VoidpulseApp';
import { MusicControls } from './audio/MusicControls';
import { AudioTelemetry } from './audio/AudioTelemetry';
import type { VisualPreset, VisualQuality } from './app/VoidpulseApp';
import './style.css';

const root=document.querySelector<HTMLElement>('#app');
if(!root)throw new Error('Missing #app mount element.');
const status=document.querySelector<HTMLElement>('#status');
const showError=(message:string)=>{
  document.querySelector('.loading')?.remove();
  if(status){status.textContent=message;status.classList.add('has-error');}
};
VoidpulseApp.create(root).then(app=>{
  app.start();
  const music=new MusicControls(document.querySelector<HTMLElement>('#music-panel')!);
  app.setSignalSource(music.player);
  const spectrum=document.querySelector<HTMLCanvasElement>('#spectrum');
  const telemetry=spectrum?new AudioTelemetry(spectrum):null;
  if(telemetry)app.onSignal(telemetry.update);
  const preset=document.querySelector<HTMLSelectElement>('#visual-preset');
  preset?.addEventListener('change',()=>{
    const value=preset.value as VisualPreset;
    app.setPreset(value);telemetry?.setPalette(value);root.dataset.preset=value;
  });
  const bloom=document.querySelector<HTMLInputElement>('#visual-bloom');
  bloom?.addEventListener('input',()=>app.setBloom(Number(bloom.value)/100));
  const quality=document.querySelector<HTMLSelectElement>('#visual-detail');
  quality?.addEventListener('change',()=>app.setQuality(quality.value as VisualQuality));
  const immersive=document.querySelector<HTMLButtonElement>('#immersive');
  const toggleImmersive=(force?:boolean)=>{
    const active=force??!root.classList.contains('is-immersive');
    const settings=document.querySelector<HTMLDetailsElement>('#visual-settings');
    if(settings)settings.open=active;
    root.classList.toggle('is-immersive',active);app.setImmersive(active);
    immersive?.setAttribute('aria-pressed',String(active));
    if(immersive)immersive.textContent=active?'return to station [h]':'hide interface [h]';
  };
  immersive?.addEventListener('click',()=>toggleImmersive());
  document.querySelector('#capture')?.addEventListener('click',()=>app.capture());
  window.addEventListener('keydown',event=>{
    if(event.key==='Escape'){
      toggleImmersive(false);
      const sources=document.querySelector<HTMLDetailsElement>('#music-options');
      if(sources)sources.open=false;
      return;
    }
    if(event.altKey||event.ctrlKey||event.metaKey||event.repeat)return;
    if(event.target instanceof Element&&event.target.closest('input,select,textarea,button,a,summary,[contenteditable]'))return;
    if(event.key.toLowerCase()==='h'){event.preventDefault();toggleImmersive();}
  });
  const intensity=document.querySelector<HTMLInputElement>('#music-intensity')!;
  intensity.addEventListener('input',()=>{
    app.setIntensity(Number(intensity.value)/100);
    document.querySelector<HTMLOutputElement>('#intensity-value')!.value=`${intensity.value}%`;
  });
  const motion=document.querySelector<HTMLButtonElement>('#motion')!;
  const syncMotion=()=>{
    const running=app.isRunning;
    root.classList.toggle('is-moving',running);
    motion.setAttribute('aria-pressed',String(!running));
    motion.setAttribute('aria-label',running?'pause motion':'resume motion');
    motion.title=running?'pause motion':'resume motion';
    motion.innerHTML=running?'<span class="pause-mark" aria-hidden="true"></span>':'<span class="play-mark" aria-hidden="true"></span>';
    const pulse=document.querySelector<HTMLButtonElement>('#pulse');
    if(pulse)pulse.disabled=!running;
  };
  motion.addEventListener('click',()=>{app.toggleMotion();syncMotion();});
  root.addEventListener('motion-change',syncMotion);
  syncMotion();
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button=>{
    button.addEventListener('click',()=>{
      app.setView(button.dataset.view!);
      document.querySelectorAll('[data-view]').forEach(other=>other.setAttribute('aria-pressed',String(other===button)));
    });
  });
  document.querySelector('#pulse')?.addEventListener('click',app.pulse);
  const fullscreen=document.querySelector<HTMLButtonElement>('#fullscreen')!;
  if(!document.fullscreenEnabled)fullscreen.hidden=true;
  fullscreen.addEventListener('click',async()=>{
    try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
    catch{showError('fullscreen is unavailable in this browser.');}
  });
  document.addEventListener('fullscreenchange',()=>{
    fullscreen.setAttribute('aria-label',document.fullscreenElement?'exit fullscreen':'enter fullscreen');
    fullscreen.setAttribute('aria-pressed',String(Boolean(document.fullscreenElement)));
  });
  root.addEventListener('visual-error',event=>showError((event as CustomEvent<string>).detail));
  window.addEventListener('pagehide',event=>{if(!event.persisted){music.dispose();app.dispose();}});
}).catch(error=>{
  console.error(error);
  showError('this universe needs WebGL 2. enable hardware acceleration, then reload.');
});
