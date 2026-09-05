import { MusicPlayer } from './MusicPlayer';

export class MusicControls {
  readonly player: MusicPlayer;
  private readonly play: HTMLButtonElement;
  private readonly title: HTMLElement;
  private readonly message: HTMLElement;
  private readonly seek: HTMLInputElement;
  private readonly time: HTMLElement;
  private readonly volume: HTMLInputElement;
  private readonly repeat: HTMLButtonElement;
  private readonly file: HTMLInputElement;
  private readonly detail: HTMLDetailsElement;
  private readonly audio: HTMLAudioElement;
  private readonly cleanup = new AbortController();

  constructor(private readonly panel: HTMLElement) {
    const element = <T extends HTMLElement>(id: string) => panel.querySelector<T>(`#${id}`)!;
    this.play = element('music-play');
    this.title = element('music-title');
    this.message = element('music-message');
    this.seek = element('music-seek');
    this.time = element('music-time');
    this.volume = element('music-volume');
    this.repeat = element('music-repeat');
    this.file = element('music-file');
    this.detail = element('music-options');
    this.audio = element('music-audio');
    this.player = new MusicPlayer(this.audio, this.render);
    const options = { signal: this.cleanup.signal };
    this.play.addEventListener('click', () => void this.player.toggle(), options);
    element('music-choose').addEventListener('click', () => this.file.click(), options);
    this.file.addEventListener('change', () => {
      const file = this.file.files?.[0];
      this.file.value = '';
      if (file) { this.detail.open = false; void this.player.choose(file); }
    }, options);
    element('music-demo').addEventListener('click', () => {
      this.detail.open = false;
      void this.player.included();
    }, options);
    element('music-tab').addEventListener('click', () => {
      void this.player.shareTab().then(() => {
        if (this.player.state.kind === 'tab') this.detail.open = false;
      });
    }, options);
    this.seek.addEventListener('input', () => {
      this.player.seek(Number(this.seek.value));
      this.renderProgress();
    }, options);
    this.volume.addEventListener('input', () => this.player.setVolume(Number(this.volume.value) / 100), options);
    this.repeat.addEventListener('click', () => this.player.setLoop(!this.player.state.loop), options);
    this.audio.addEventListener('timeupdate', this.renderProgress, options);
    this.audio.addEventListener('durationchange', this.renderProgress, options);
    this.audio.addEventListener('loadedmetadata', this.renderProgress, options);
    window.addEventListener('keydown', event => {
      const target = event.target;
      // Native controls retain their own keyboard behavior.
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
        (target instanceof Element && target.closest('button, input, select, textarea, a, summary, [contenteditable]'))) return;
      if (event.code === 'Space') {
        event.preventDefault();
        if (!event.repeat) void this.player.toggle();
      } else if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
        if (this.player.state.kind === 'tab') return;
        event.preventDefault();
        this.player.seek(this.audio.currentTime + (event.code === 'ArrowRight' ? 5 : -5));
        this.renderProgress();
      } else if (event.code === 'Escape') {
        this.detail.open = false;
        const settings = document.querySelector<HTMLDetailsElement>('#visual-settings');
        if (settings) settings.open = false;
      }
    }, options);
    // File drop is an optional shortcut. The visible button remains the main path.
    window.addEventListener('dragover', event => {
      if (event.dataTransfer?.types.includes('Files')) event.preventDefault();
    }, options);
    window.addEventListener('drop', event => {
      if (!event.dataTransfer?.files.length) return;
      event.preventDefault();
      this.detail.open = false;
      void this.player.choose(event.dataTransfer.files[0]);
    }, options);
    this.render();
  }

  private readonly render = (): void => {
    const state = this.player.state;
    this.play.disabled = state.busy && !state.message;
    this.play.textContent = state.busy && state.message ? 'cancel connection' : state.busy ? 'connecting…' : state.kind === 'tab' ? 'disconnect audio' : state.playing ? 'pause music' : 'play music';
    this.play.setAttribute('aria-pressed', String(state.playing));
    this.play.dataset.playing = String(state.playing);
    this.title.textContent = state.title;
    this.title.title = state.title;
    this.message.textContent = state.message;
    this.message.hidden = !state.message;
    this.panel.classList.toggle('has-music', state.playing);
    this.panel.classList.toggle('is-tab', state.kind === 'tab');
    this.panel.querySelector<HTMLElement>('#music-credit')!.hidden = state.kind !== 'included';
    this.panel.querySelector<HTMLElement>('#music-demo')!.hidden = state.kind === 'included';
    this.panel.querySelector<HTMLElement>('#music-tab-note')!.hidden = state.kind !== 'tab';
    this.volume.disabled = state.kind === 'tab';
    this.repeat.disabled = state.kind === 'tab';
    this.repeat.setAttribute('aria-pressed', String(state.loop));
    this.repeat.title = state.loop ? 'repeat on' : 'repeat off';
    this.renderProgress();
  };

  private readonly renderProgress = (): void => {
    const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
    const current = Number.isFinite(this.audio.currentTime) ? this.audio.currentTime : 0;
    const format = (n: number) => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`;
    this.seek.disabled = duration === 0 || this.player.state.kind === 'tab';
    this.seek.max = String(duration || 1);
    this.seek.value = String(current);
    this.seek.setAttribute('aria-valuetext', `${format(current)} of ${format(duration)}`);
    this.time.textContent = `${format(current)} / ${format(duration)}`;
  };

  dispose(): void { this.cleanup.abort(); }
}
