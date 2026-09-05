/** Audio adapters produce normalized features. The artwork owns their meaning. */
export interface SignalFrame {
  energy: number;
  bass: number;
  treble: number;
  onset: number;
  mids?: number;
  /** 64 logarithmic bands from 30 Hz to at most 16 kHz. Values are 0..1. */
  spectrum?: Readonly<Float32Array>;
  /** 128 time-domain samples. Values are -1..1. These arrays are reused per frame. */
  waveform?: Readonly<Float32Array>;
  /** Estimated only after several consistent onsets. Null means insufficient evidence. */
  bpm?: number | null;
  beatConfidence?: number;
}

export interface SignalSource {
  sample(elapsed: number): Readonly<SignalFrame>;
  dispose?(): void;
}

export const silentSource: SignalSource = {
  sample: () => ({ energy: 0, bass: 0, treble: 0, onset: 0 }),
};

export function normalizeSignal(frame: Readonly<SignalFrame>): SignalFrame {
  const unit = (n: number) => Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
  const result:SignalFrame={ energy: unit(frame.energy), bass: unit(frame.bass), treble: unit(frame.treble), onset: unit(frame.onset) };
  if(frame.mids!==undefined)result.mids=unit(frame.mids);
  if(frame.spectrum)result.spectrum=frame.spectrum;
  if(frame.waveform)result.waveform=frame.waveform;
  if(frame.bpm!==undefined)result.bpm=typeof frame.bpm==='number'&&Number.isFinite(frame.bpm)&&frame.bpm>0?frame.bpm:null;
  if(frame.beatConfidence!==undefined)result.beatConfidence=unit(frame.beatConfidence);
  return result;
}
