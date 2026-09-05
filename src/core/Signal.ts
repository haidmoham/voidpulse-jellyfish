/** Future audio adapters produce normalized features. The artwork owns their meaning. */
export interface SignalFrame {
  energy: number;
  bass: number;
  treble: number;
  onset: number;
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
  return { energy: unit(frame.energy), bass: unit(frame.bass), treble: unit(frame.treble), onset: unit(frame.onset) };
}
