'use strict';

// Bend trainer: pick a fretted note, bend it to the target pitch and hold it
// there. The guitar comes in through an audio input and Pitch tracks it live.
const BendTrainer = (() => {
  const STORE = 'gst.bend';
  const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  const STEP_NAMES = { 1: 'half step', 2: 'whole step', 3: '1½ steps', 4: '2 steps' };
  const STRING_NAMES = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
  const SILENCE_MS = 350; // this long without pitch ends an attempt
  const TRACE_S = 6;

  const DEFAULTS = {
    deviceId: '', string: -1, fret: 7, semis: 2, mode: 'hold', tol: 10, holdMs: 500,
    gateDb: -50, relative: false, autoNext: true, open: true,
  };
  const cfg = Object.assign({}, DEFAULTS, (() => {
    try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; }
  })());
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(cfg)); } catch { /* ignore */ } };

  let opts, ui = {};
  let listening = false;
  let raf = 0;
  let attempt = null;
  let lastPitchAt = 0;
  let mutedUntil = 0; // ignore the input while our own demo plays
  let recent = [];
  let trace = [];
  const stats = { hits: 0, tries: 0, streak: 0, best: 0, last: null };

  const freq = m => 440 * Math.pow(2, (m - 69) / 12);
  const cents = (f, ref) => 1200 * Math.log2(f / ref);
  const nowMs = () => performance.now();
  const tuning = () => opts.tuning();
  const strIdx = () => {
    const nS = tuning().length;
    if (cfg.string < 0 || cfg.string >= nS) cfg.string = nS - 3; // G string in standard
    return cfg.string;
  };
  const startMidi = () => tuning()[strIdx()] + cfg.fret;
  const targetMidi = () => startMidi() + bendSemis();
  const noteName = m => NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);

  // Phases of one attempt: each is a pitch to reach and hold.
  const phases = () => (cfg.mode === 'hold' ? ['target'] : ['target', 'start']);

  // ---------- Targets ----------
  // Random target from the app's current scale / chord: the fretted note is
  // in the scale and, for fixed bends, so is the target. "To next scale note"
  // bends up to the next scale tone above.
  function randomTarget() {
    const tun = tuning();
    const nS = tun.length;
    const pcs = new Set(opts.notes().map(n => n.pc));
    const frets = opts.frets();
    const cands = [];
    for (let s = Math.max(0, nS - 4); s < nS; s++) {
      for (let f = 3; f <= Math.min(17, frets - 1); f++) {
        const m = tun[s] + f;
        if (!pcs.has(m % 12)) continue;
        let k = cfg.semis;
        if (!k) {
          k = 1;
          while (k < 4 && !pcs.has((m + k) % 12)) k++;
          if (!pcs.has((m + k) % 12)) continue;
        } else if (!pcs.has((m + k) % 12)) continue;
        if (f + k <= frets && !(s === cfg.string && f === cfg.fret)) cands.push({ s, f, k });
      }
    }
    if (!cands.length) return;
    const c = cands[Math.floor(Math.random() * cands.length)];
    setTarget(c.s, c.f, cfg.semis ? undefined : c.k);
  }

  let autoSemis = 0; // bend size chosen by "to next scale note"
  function setTarget(s, f, k) {
    cfg.string = s;
    cfg.fret = f;
    autoSemis = k ?? 0;
    save();
    attempt = null;
    trace = [];
    render();
  }
  // Distance from midi m up to the next note of the current scale.
  function nextScaleStep(m) {
    const pcs = new Set(opts.notes().map(n => n.pc));
    for (let k = 1; k <= 4; k++) if (pcs.has((m + k) % 12)) return k;
    return 2;
  }
  const bendSemis = () => cfg.semis || autoSemis || nextScaleStep(startMidi());

  // ---------- Listening ----------
  async function startListening() {
    if (!navigator.mediaDevices?.getUserMedia) {
      opts.toast('Audio input is not available in this browser (try Chrome, or serve the page from localhost).');
      return;
    }
    try {
      await Pitch.start(cfg.deviceId || undefined);
    } catch (e) {
      opts.toast(e.name === 'NotAllowedError' ? 'Microphone / line-in access was blocked.' : `Could not open the input: ${e.message}`);
      return;
    }
    listening = true;
    attempt = null;
    trace = [];
    await fillDevices();
    loop();
    render();
  }

  function stopListening() {
    listening = false;
    cancelAnimationFrame(raf);
    Pitch.stop();
    attempt = null;
    render();
  }

  async function fillDevices() {
    const list = await Pitch.devices();
    const sel = ui.device;
    sel.replaceChildren(new Option('Default input', ''),
      ...list.filter(d => d.deviceId && d.deviceId !== 'default')
        .map((d, i) => new Option(d.label || `Input ${i + 1}`, d.deviceId)));
    sel.value = [...sel.options].some(o => o.value === cfg.deviceId) ? cfg.deviceId : '';
  }

  // ---------- Detection loop ----------
  function loop() {
    if (!listening) return;
    raf = requestAnimationFrame(loop);
    const k = bendSemis();
    const start = startMidi();
    const lo = freq(start - 5);
    const hi = freq(start + k + 4);
    const r = Pitch.read(lo, hi, cfg.gateDb);
    const t = nowMs();
    if (!r) return;
    let f = null;
    if (r.freq && t >= mutedUntil) {
      recent.push(r.freq);
      if (recent.length > 3) recent.shift();
      f = [...recent].sort((a, b) => a - b)[recent.length >> 1]; // median of 3
      lastPitchAt = t;
    } else if (t - lastPitchAt > 80) {
      recent = [];
    }
    update(f, r.db, t);
  }

  function update(f, db, t) {
    const k = bendSemis();
    if (f === null) {
      if (attempt && t - lastPitchAt > SILENCE_MS) {
        if (!attempt.done && t - attempt.onset > 400) { stats.tries++; stats.streak = 0; feedback('miss', 'The note died before you got there. Pick it again.'); }
        attempt = null;
      }
    } else if (!attempt) {
      attempt = { onset: t, phase: 0, inBandSince: null, ref: freq(startMidi()), overshoot: 0, reachedAt: null, done: false, refSet: false };
      feedback('', '');
    }

    if (attempt && f !== null && !attempt.done) {
      // "Relative" mode measures the bend from the pitch actually picked,
      // so a slightly out-of-tune string does not count against you.
      if (cfg.relative && !attempt.refSet && Math.abs(cents(f, freq(startMidi()))) < 60) {
        attempt.ref = f;
        attempt.refSet = true;
      }
      const goalFreq = phases()[attempt.phase] === 'target' ? attempt.ref * Math.pow(2, k / 12) : attempt.ref;
      const c = cents(f, goalFreq);
      if (cfg.mode === 'pre' && attempt.phase === 0 && t - attempt.onset < 250 && Math.abs(cents(f, attempt.ref)) < 40) {
        // Pre-bend: the first thing heard must already be the bent pitch.
        attempt.done = true;
        stats.tries++;
        stats.streak = 0;
        feedback('miss', 'You picked the unbent note. Bend the string first, then pick.');
      } else {
        if (phases()[attempt.phase] === 'target' && attempt.reachedAt === null && c > -cfg.tol) attempt.reachedAt = t;
        if (attempt.phase === 0) attempt.overshoot = Math.max(attempt.overshoot, c);
        if (Math.abs(c) <= cfg.tol) {
          attempt.inBandSince ??= t;
          if (t - attempt.inBandSince >= cfg.holdMs) nextPhase(t);
        } else {
          attempt.inBandSince = null;
        }
      }
      attempt.cents = c;
    }

    trace.push({ t, st: f === null ? null : 12 * Math.log2(f / (attempt?.ref ?? freq(startMidi()))) });
    while (trace.length && t - trace[0].t > TRACE_S * 1000) trace.shift();
    draw(f, db, t);
  }

  function nextPhase(t) {
    attempt.phase++;
    attempt.inBandSince = null;
    if (attempt.phase < phases().length) return;
    attempt.done = true;
    stats.hits++;
    stats.tries++;
    stats.streak++;
    stats.best = Math.max(stats.best, stats.streak);
    stats.last = { time: attempt.reachedAt ? attempt.reachedAt - attempt.onset : null, over: attempt.overshoot };
    const over = attempt.overshoot > cfg.tol ? ` · overshot by ${Math.round(attempt.overshoot)}¢` : '';
    feedback('hit', `In tune!${stats.last.time !== null ? ` Reached pitch in ${(stats.last.time / 1000).toFixed(2)} s` : ''}${over}`);
    renderStats();
    if (cfg.autoNext) setTimeout(() => { if (listening) randomTarget(); }, 900);
  }

  function feedback(kind, msg) {
    ui.feedback.className = 'bend-feedback' + (kind ? ` ${kind}` : '');
    ui.feedback.textContent = msg;
    if (kind === 'miss') renderStats();
  }

  // ---------- Drawing ----------
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  function draw(f, db, t) {
    // Input level.
    ui.level.style.width = `${Math.max(0, Math.min(100, (db + 80) / 80 * 100))}%`;
    ui.level.classList.toggle('gated', db < cfg.gateDb);

    // Readout + needle relative to the goal of the current phase.
    const k = bendSemis();
    if (f === null) {
      ui.note.textContent = '—';
      ui.cents.textContent = listening ? (attempt?.done ? '' : 'Pick the note…') : '';
      ui.bent.textContent = '';
      ui.needle.style.opacity = 0.25;
    } else {
      const m = 69 + 12 * Math.log2(f / 440);
      const near = Math.round(m);
      const off = Math.round((m - near) * 100);
      ui.note.textContent = noteName(near);
      ui.note.append(h('small', {}, ` ${off >= 0 ? '+' : ''}${off}¢`));
      const c = attempt?.cents ?? cents(f, freq(targetMidi()));
      const goal = phases()[attempt?.phase ?? 0] === 'start' ? 'start note' : 'target';
      ui.cents.textContent = attempt?.done ? '✓' : Math.abs(c) <= cfg.tol ? `On pitch — hold it` : `${c > 0 ? 'Sharp' : 'Flat'} by ${Math.abs(Math.round(c))}¢ from the ${goal}`;
      ui.cents.className = 'bend-cents' + (Math.abs(c) <= cfg.tol || attempt?.done ? ' ok' : Math.abs(c) <= 30 ? ' near' : '');
      const st = 12 * Math.log2(f / (attempt?.ref ?? freq(startMidi())));
      ui.bent.textContent = `Bent ${st >= 0 ? '+' : ''}${st.toFixed(2)} of ${k} semitone${k > 1 ? 's' : ''}`;
      ui.needle.style.opacity = 1;
      ui.needle.style.left = `${50 + Math.max(-50, Math.min(50, c / 2))}%`;
    }
    const held = attempt?.inBandSince ? Math.min(1, (t - attempt.inBandSince) / cfg.holdMs) : 0;
    ui.hold.style.width = `${(attempt?.done ? 1 : held) * 100}%`;
    [...ui.phaseRow.children].forEach((el, i) => {
      el.classList.toggle('on', !!attempt && !attempt.done && attempt.phase === i);
      el.classList.toggle('done', !!attempt && (attempt.done ? attempt.phase > i : attempt.phase > i));
    });
    drawTrace(t);
  }

  function drawTrace(t) {
    const cv = ui.canvas;
    const dpr = window.devicePixelRatio || 1;
    const W = cv.clientWidth;
    const H = cv.clientHeight;
    if (cv.width !== W * dpr || cv.height !== H * dpr) { cv.width = W * dpr; cv.height = H * dpr; }
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const k = bendSemis();
    const lo = -0.6, hi = k + 0.8;
    const y = st => H - 8 - ((st - lo) / (hi - lo)) * (H - 16);
    const x = tt => W - ((t - tt) / (TRACE_S * 1000)) * W;
    const tolSt = cfg.tol / 100;

    g.fillStyle = 'rgba(34, 197, 94, 0.18)';
    g.fillRect(0, y(k + tolSt), W, y(k - tolSt) - y(k + tolSt));
    g.font = '11px system-ui, sans-serif';
    const line = (st, color, dash, label) => {
      g.strokeStyle = color;
      g.setLineDash(dash);
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(0, y(st)); g.lineTo(W, y(st)); g.stroke();
      g.setLineDash([]);
      g.fillStyle = color;
      g.fillText(label, 6, y(st) - 4);
    };
    line(0, css('--muted'), [4, 4], `${noteName(startMidi())} (fretted)`);
    line(k, '#22c55e', [], `${noteName(targetMidi())} (target)`);
    for (let i = 1; i < k; i++) line(i, css('--border'), [2, 6], '');

    g.strokeStyle = css('--accent');
    g.lineWidth = 2.5;
    g.lineJoin = 'round';
    g.beginPath();
    let pen = false;
    for (const p of trace) {
      if (p.st === null || p.st < lo - 1 || p.st > hi + 1) { pen = false; continue; }
      const px = x(p.t), py = y(Math.max(lo, Math.min(hi, p.st)));
      if (pen) g.lineTo(px, py); else g.moveTo(px, py);
      pen = true;
    }
    g.stroke();
  }

  // ---------- Rendering ----------
  function renderBoard() {
    const tun = tuning();
    const s = strIdx();
    const k = bendSemis();
    const m = startMidi();
    const notes = [
      { pc: m % 12, name: NAMES[m % 12], interval: '1', num: 1, index: 0 },
      { pc: (m + k) % 12, name: NAMES[(m + k) % 12], interval: STEP_NAMES[k], num: 5, index: 4 },
    ];
    const frets = opts.frets();
    Fretboard.render(ui.svg, {
      ...opts.boardOpts(), tuning: tun, frets, notes, labels: 'notes', colorMode: 'color',
      winFrom: 0, winTo: 24, only: new Set([`${s}:${cfg.fret}`, `${s}:${cfg.fret + k}`]),
    });
    // The target is reached by bending, not fretted: draw it as a ghost.
    const ghost = ui.svg.querySelector(`.note[data-s="${s}"][data-f="${cfg.fret + k}"]`);
    if (ghost) { ghost.setAttribute('opacity', 0.45); ghost.classList.add('ghost'); }
  }

  function renderStats() {
    const l = stats.last;
    ui.stats.replaceChildren(
      ...[['Hits', `${stats.hits} / ${stats.tries}`], ['Streak', stats.streak], ['Best', stats.best],
        ['Time to pitch', l?.time != null ? `${(l.time / 1000).toFixed(2)} s` : '—'],
        ['Overshoot', l ? (l.over > cfg.tol ? `${Math.round(l.over)}¢` : 'none') : '—']]
        .map(([k, v]) => h('div', {}, h('small', {}, k), h('b', {}, String(v)))));
  }

  function render() {
    if (!ui.card) return;
    ui.card.classList.toggle('closed', !cfg.open);
    ui.toggle.textContent = cfg.open ? '▾' : '▸';
    ui.listen.textContent = listening ? '■ Stop listening' : '🎤 Start listening';
    ui.listen.classList.toggle('playing', listening);
    ui.status.textContent = listening ? 'Listening' : 'Input off';
    ui.status.classList.toggle('on', listening);
    const nS = tuning().length;
    if (ui.string.options.length !== nS) {
      ui.string.replaceChildren(...tuning().map((m, s) => new Option(`${STRING_NAMES[nS - 1 - s] ?? s + 1} (${NAMES[m % 12]})`, s)).reverse());
    }
    ui.string.value = strIdx();
    ui.fret.max = opts.frets();
    ui.fret.value = cfg.fret;
    ui.semis.value = cfg.semis;
    ui.mode.value = cfg.mode;
    ui.tol.value = cfg.tol;
    ui.holdMs.value = cfg.holdMs;
    ui.gate.value = cfg.gateDb;
    ui.gateVal.textContent = `${cfg.gateDb} dB`;
    ui.relative.checked = cfg.relative;
    ui.autoNext.checked = cfg.autoNext;

    const k = bendSemis();
    const s = strIdx();
    ui.target.replaceChildren(
      h('b', {}, `${STRING_NAMES[nS - 1 - s] ?? ''} string, fret ${cfg.fret}`),
      ` · ${noteName(startMidi())} → bend ${k < 3 ? 'a ' : ''}${STEP_NAMES[k]} up to `,
      h('b', {}, noteName(targetMidi())),
      ` (sounds like fret ${cfg.fret + k})`);
    const labels = { target: `Bend up to ${noteName(targetMidi())}`, start: `Release to ${noteName(startMidi())}` };
    ui.phaseRow.replaceChildren(
      ...(cfg.mode === 'pre' ? [`Pre-bend to ${noteName(targetMidi())}, then pick`, labels.start] : phases().map(p => labels[p]))
        .map((txt, i) => h('span', { class: 'bphase' }, h('i', {}, String(i + 1)), txt)));
    renderBoard();
    renderStats();
    draw(null, -100, nowMs());
  }

  function hearBend() {
    const k = bendSemis();
    mutedUntil = nowMs() + 2600;
    AudioEngine.playBend(startMidi(), k, { release: cfg.mode !== 'hold', pre: cfg.mode === 'pre' });
  }
  const hear = m => { mutedUntil = nowMs() + 1500; AudioEngine.playNote(m); };

  function set(k, v) {
    cfg[k] = v;
    save();
    attempt = null;
    if (k === 'semis') autoSemis = 0;
    render();
  }

  // Apply a preset from the sidebar.
  function preset(p) {
    Object.assign(cfg, p, { open: true });
    autoSemis = 0;
    save();
    randomTarget();
    render();
  }

  function init(card, options) {
    opts = options;
    const field = (label, el) => h('label', { class: 'field' }, label, el);
    const check = (label, el, title) => h('label', { class: 'check', title }, el, ` ${label}`);
    const sel = (pairs, k, num) => {
      const s = h('select', {}, ...pairs.map(([v, l]) => new Option(l, v)));
      s.addEventListener('input', () => set(k, num ? Number(s.value) : s.value));
      return s;
    };

    ui.card = card;
    ui.toggle = h('button', { class: 'icon small', title: 'Show / hide', 'aria-label': 'Show or hide the bend trainer', onclick: () => set('open', !cfg.open) });
    ui.status = h('span', { class: 'bend-status' });
    ui.device = h('select', { 'aria-label': 'Audio input' });
    ui.device.addEventListener('input', () => { cfg.deviceId = ui.device.value; save(); if (listening) startListening(); });
    ui.listen = h('button', { class: 'primary', onclick: () => (listening ? stopListening() : startListening()) });
    ui.level = h('span', { class: 'bend-level-fill' });
    ui.string = h('select', {});
    ui.string.addEventListener('input', () => setTarget(Number(ui.string.value), cfg.fret));
    ui.fret = h('input', { type: 'number', min: 0, max: 24 });
    ui.fret.addEventListener('change', () => {
      const v = Math.round(Number(ui.fret.value));
      if (Number.isFinite(v)) setTarget(strIdx(), Math.max(0, Math.min(opts.frets() - bendSemis(), v)));
      else render();
    });
    ui.semis = sel([[1, '½ step'], [2, 'Whole step'], [3, '1½ steps'], [4, '2 steps'], [0, 'To the next scale note']], 'semis', true);
    ui.mode = sel([['hold', 'Bend & hold'], ['release', 'Bend & release'], ['pre', 'Pre-bend & release']], 'mode');
    ui.tol = sel([[5, '±5¢ (strict)'], [10, '±10¢'], [15, '±15¢'], [25, '±25¢ (easy)']], 'tol', true);
    ui.holdMs = sel([[300, '0.3 s'], [500, '0.5 s'], [1000, '1 s'], [2000, '2 s']], 'holdMs', true);
    ui.gate = h('input', { type: 'range', min: -80, max: -20, step: 1 });
    ui.gate.addEventListener('input', () => set('gateDb', Number(ui.gate.value)));
    ui.gateVal = h('span', { class: 'muted' });
    ui.relative = h('input', { type: 'checkbox', onchange: e => set('relative', e.target.checked) });
    ui.autoNext = h('input', { type: 'checkbox', onchange: e => set('autoNext', e.target.checked) });
    ui.target = h('div', { class: 'bend-target' });
    ui.phaseRow = h('div', { class: 'bend-phases' });
    ui.note = h('div', { class: 'bend-note' });
    ui.cents = h('div', { class: 'bend-cents' });
    ui.bent = h('div', { class: 'muted small-text' });
    ui.needle = h('span', { class: 'bend-needle' });
    ui.hold = h('span', { class: 'bend-hold-fill' });
    ui.feedback = h('div', { class: 'bend-feedback', role: 'status' });
    ui.canvas = h('canvas', { class: 'bend-trace', 'aria-label': 'Pitch over the last seconds' });
    ui.stats = h('div', { class: 'bend-stats' });
    ui.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    ui.svg.classList.add('fretboard');
    ui.svg.addEventListener('pointerdown', e => {
      const n = e.target.closest('.note');
      if (n) hear(Number(n.dataset.midi));
    });

    card.replaceChildren(
      h('div', { class: 'theory-head' }, ui.toggle, h('h2', {}, 'Bend trainer'), ui.status,
        h('span', { class: 'muted small-text' }, 'Plug the guitar into a line-in or audio interface (a mic works too).')),
      h('div', { class: 'bend-body' },
        h('div', { class: 'controls' },
          field('Input', ui.device), h('div', { class: 'field' }, ' ', ui.listen),
          h('div', { class: 'field bend-level-field' }, 'Level', h('span', { class: 'bend-level' }, ui.level)),
          field('Gate', h('span', { class: 'bend-gate' }, ui.gate, ui.gateVal))),
        h('div', { class: 'controls' },
          field('String', ui.string), field('Fret', ui.fret), field('Bend', ui.semis), field('Exercise', ui.mode),
          field('Tolerance', ui.tol), field('Hold for', ui.holdMs),
          h('div', { class: 'field' }, ' ', h('button', { onclick: randomTarget, title: 'Random target from the current scale' }, '🎲 New target')),
          h('div', { class: 'field' }, ' ', h('span', { class: 'bend-hear' },
            h('button', { onclick: hearBend, title: 'Hear the bend' }, '🔊 Bend'),
            h('button', { onclick: () => hear(startMidi()), title: 'Hear the fretted note' }, 'Start'),
            h('button', { onclick: () => hear(targetMidi()), title: 'Hear the target pitch' }, 'Target')))),
        h('div', { class: 'controls' },
          check('Measure from the picked note', ui.relative, 'Measure the bend from the pitch you actually pick, so a slightly out-of-tune string is not counted against you'),
          check('New random target after each hit', ui.autoNext)),
        h('div', { class: 'board-wrap' }, ui.svg),
        ui.target, ui.phaseRow,
        h('div', { class: 'bend-main' },
          h('div', { class: 'bend-readout' },
            ui.note, ui.cents,
            h('div', { class: 'bend-meter' }, h('span', { class: 'bend-zone' }), h('span', { class: 'bend-mid' }), ui.needle),
            h('div', { class: 'bend-meter-scale muted' }, h('span', {}, '−100¢'), h('span', {}, '0'), h('span', {}, '+100¢')),
            h('div', { class: 'bend-hold' }, ui.hold),
            ui.bent),
          ui.canvas),
        ui.feedback, ui.stats));
    render();
    navigator.mediaDevices?.addEventListener?.('devicechange', () => { if (listening) fillDevices(); });
    fillDevices().catch(() => {});
  }

  return {
    init, preset, render,
    open() { cfg.open = true; save(); render(); },
    // Test hook: feed a frequency (or null for silence) as if detected.
    _feed: (f, t = nowMs()) => { if (f !== null) lastPitchAt = t; update(f, -20, t); },
    _stats: stats,
  };
})();
