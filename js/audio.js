'use strict';

// Web Audio engine: Karplus-Strong plucked string + metronome clicks.
const AudioEngine = (() => {
  let ctx = null;
  let clickBus, noteBus;
  let vols = { click: 0.7, notes: 0.8 };
  const cache = new Map();

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -12;
      comp.ratio.value = 4;
      comp.connect(ctx.destination);
      const master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(comp);
      clickBus = ctx.createGain();
      noteBus = ctx.createGain();
      clickBus.connect(master);
      noteBus.connect(master);
      applyVolumes();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function applyVolumes() {
    if (!ctx) return;
    clickBus.gain.value = vols.click;
    noteBus.gain.value = vols.notes;
  }

  function setVolumes(click, notes) {
    vols = { click, notes };
    applyVolumes();
  }

  // Render a plucked-string sample for a MIDI note (cached).
  function pluck(midi) {
    if (cache.has(midi)) return cache.get(midi);
    const sr = ctx.sampleRate;
    const f = Theory.midiFreq(midi);
    const N = Math.max(2, Math.round(sr / f - 0.5));
    const len = Math.floor(sr * 2.6);
    const d = new Float32Array(len);

    // Low-passed noise burst as excitation, DC removed.
    let lp = 0, mean = 0;
    for (let i = 0; i < N; i++) {
      lp += 0.55 * ((Math.random() * 2 - 1) - lp);
      d[i] = lp;
      mean += lp;
    }
    mean /= N;
    for (let i = 0; i < N; i++) d[i] -= mean;

    // Per-period loss so low strings ring longer than high ones.
    const t60 = Math.max(0.9, 3.4 - (midi - 40) * 0.06);
    const g = Math.pow(10, -3 / (t60 * f));
    for (let i = N; i < len; i++) {
      const prev = i - N - 1 >= 0 ? d[i - N - 1] : d[i - N];
      d[i] = g * 0.5 * (d[i - N] + prev);
    }

    let peak = 0;
    for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(d[i]));
    const norm = peak > 0 ? 0.9 / peak : 1;
    const fade = Math.floor(sr * 0.08);
    for (let i = 0; i < len; i++) {
      d[i] *= norm;
      if (i > len - fade) d[i] *= (len - i) / fade;
    }

    const buffer = ctx.createBuffer(1, len, sr);
    buffer.getChannelData(0).set(d);
    // The averaging filter adds half a sample of delay; correct tuning exactly.
    const entry = { buffer, rate: f * (N + 0.5) / sr };
    cache.set(midi, entry);
    return entry;
  }

  function playNote(midi, time, velocity = 0.9) {
    ensure();
    const t = time ?? ctx.currentTime;
    const { buffer, rate } = pluck(midi);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 5200;
    const g = ctx.createGain();
    g.gain.value = velocity;
    src.connect(tone).connect(g).connect(noteBus);
    src.start(t);
  }

  // Pick a note and bend it up by `semis`: rise, hold, and optionally release.
  // With `pre`, the string is bent before the pick and only released.
  function playBend(midi, semis, { rise = 0.3, hold = 0.7, release = false, pre = false } = {}) {
    ensure();
    const t = ctx.currentTime + 0.05;
    const { buffer, rate } = pluck(midi);
    const up = rate * Math.pow(2, semis / 12);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const pr = src.playbackRate;
    if (pre) {
      pr.setValueAtTime(up, t);
      pr.setValueAtTime(up, t + hold);
      pr.linearRampToValueAtTime(rate, t + hold + rise);
    } else {
      pr.setValueAtTime(rate, t);
      pr.setValueAtTime(rate, t + 0.18);
      pr.linearRampToValueAtTime(up, t + 0.18 + rise);
      if (release) {
        pr.setValueAtTime(up, t + 0.18 + rise + hold);
        pr.linearRampToValueAtTime(rate, t + 0.18 + 2 * rise + hold);
      }
    }
    const g = ctx.createGain();
    g.gain.value = 0.9;
    src.connect(g).connect(noteBus);
    src.start(t);
  }

  function click(time, kind) {
    ensure();
    const freq = { accent: 1760, beat: 1180, sub: 820 }[kind];
    const level = { accent: 1, beat: 0.65, sub: 0.3 }[kind];
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(level, time + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    osc.connect(g).connect(clickBus);
    osc.start(time);
    osc.stop(time + 0.06);
  }

  return {
    ensure, setVolumes, playNote, playBend, click,
    now: () => (ctx ? ctx.currentTime : 0),
  };
})();
