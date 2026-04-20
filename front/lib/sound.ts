"use client";

let _ctx: AudioContext | null = null;

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!_ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    _ctx = new Ctor();
  }
  return _ctx;
}

export function playAddToCartSound() {
  const ac = ctx();
  if (!ac) return;
  if (ac.state === "suspended") void ac.resume();

  const now = ac.currentTime;
  const master = ac.createGain();
  master.gain.value = 0.22;
  master.connect(ac.destination);

  const notes = [
    { freq: 988, start: 0, dur: 0.09 },
    { freq: 1319, start: 0.055, dur: 0.2 },
  ];

  for (const n of notes) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "triangle";
    osc.frequency.value = n.freq;

    const t = now + n.start;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(1, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + n.dur);

    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + n.dur + 0.02);
  }
}
