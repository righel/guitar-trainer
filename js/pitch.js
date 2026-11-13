'use strict';

// Live pitch detection from an audio input (line-in, interface or mic)
// using the YIN algorithm on the analyser's time-domain buffer.
const Pitch = (() => {
  let ctx = null;
  let stream = null;
  let source = null;
  let analyser = null;
  let buf = null;
  let diff = null;

  // The browser's voice processing distorts an instrument signal.
  const constraints = deviceId => ({
    audio: {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      echoCancellation: false, noiseSuppression: false, autoGainControl: false,
    },
  });

  async function start(deviceId) {
    stop();
    ctx = AudioEngine.ensure();
    stream = await navigator.mediaDevices.getUserMedia(constraints(deviceId));
    source = ctx.createMediaStreamSource(stream);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 2048; // ~43 ms at 48 kHz: four periods of low E
    source.connect(analyser); // not to the speakers: no monitoring feedback
    buf = new Float32Array(analyser.fftSize);
    diff = new Float32Array(analyser.fftSize / 2);
  }

  function stop() {
    stream?.getTracks().forEach(t => t.stop());
    source?.disconnect();
    stream = source = analyser = null;
  }

  async function devices() {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    return (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'audioinput');
  }

  // YIN over periods between 1/maxHz and 1/minHz. Returns the frequency and
  // the aperiodicity (0 = perfectly periodic), or null if nothing periodic.
  function yin(x, sr, minHz, maxHz, threshold = 0.15) {
    const W = x.length >> 1;
    const tauMin = Math.max(2, Math.floor(sr / maxHz));
    const tauMax = Math.min(W - 1, Math.ceil(sr / minHz));
    const d = diff;
    let run = 0;
    d[0] = 1;
    for (let tau = 1; tau <= tauMax; tau++) {
      let sum = 0;
      for (let i = 0; i < W; i++) {
        const v = x[i] - x[i + tau];
        sum += v * v;
      }
      run += sum;
      d[tau] = run ? (sum * tau) / run : 1; // cumulative mean normalised
    }
    let tau = -1;
    for (let t = tauMin; t <= tauMax; t++) {
      if (d[t] < threshold) {
        while (t + 1 <= tauMax && d[t + 1] < d[t]) t++;
        tau = t;
        break;
      }
    }
    if (tau < 0) {
      // No dip under the threshold: take the global minimum if it is clear.
      let best = tauMin;
      for (let t = tauMin + 1; t <= tauMax; t++) if (d[t] < d[best]) best = t;
      if (d[best] > 0.35) return null;
      tau = best;
    }
    // Parabolic interpolation around the dip for sub-sample accuracy.
    let t = tau;
    if (tau > 1 && tau < tauMax) {
      const a = d[tau - 1], b = d[tau], c = d[tau + 1];
      const den = a + c - 2 * b;
      if (den) t = tau + (a - c) / (2 * den);
    }
    return { freq: sr / t, aperiodicity: d[tau] };
  }

  // One reading: level in dBFS, plus pitch when the input is loud enough.
  function read(minHz, maxHz, gateDb) {
    if (!analyser) return null;
    analyser.getFloatTimeDomainData(buf);
    let sq = 0;
    for (let i = 0; i < buf.length; i++) sq += buf[i] * buf[i];
    const db = 10 * Math.log10(sq / buf.length || 1e-12);
    if (db < gateDb) return { db, freq: null };
    const r = yin(buf, ctx.sampleRate, minHz, maxHz);
    return { db, freq: r?.freq ?? null, aperiodicity: r?.aperiodicity };
  }

  const ensureBuffers = n => { if (!diff || diff.length < n) diff = new Float32Array(n); };

  return {
    start, stop, devices, read,
    active: () => !!analyser,
    // Exposed for tests.
    yin: (x, sr, lo, hi) => { ensureBuffers(x.length >> 1); return yin(x, sr, lo, hi); },
  };
})();
