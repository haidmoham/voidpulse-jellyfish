import { VoidpulseApp } from './app/VoidpulseApp';
import { MusicControls } from './audio/MusicControls';
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
