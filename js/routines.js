'use strict';

// Daily practice routines: a time budget split into timed steps, each loading
// an exercise. Rotations by date (key of the day, sequence, string set, line
// style) mean a week covers everything without planning. Also keeps a small
// practice log: minutes per day, streak, best tempo per exercise.
const Routines = (() => {
  const BUDGETS = [10, 15, 20, 30, 60];
  const LOG = 'gst.log';
  const STATE = 'gst.routine';
  const CIRCLE = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  // Line style and progression of the day (Sunday: review).
  const DAYS = [
    { style: 'random', prog: 'i-iv-V-i' },
    { style: 'targets', prog: 'I-V-vi-IV' },
    { style: 'guide', prog: 'ii-V-I' },
    { style: 'arpScale', prog: 'I-IV-V-I' },
    { style: 'enclose', prog: 'I-vi-ii-V' },
    { style: 'motif', prog: 'i-VI-III-VII' },
    { style: 'random', prog: 'blues12' },
  ];
  const PAIRS = ['pair-C-G', 'pair-G-D', 'pair-A-D', 'pair-E-A', 'pair-C-Am', 'pair-Em-C', 'pair-D-Em', 'pair-Am-E', 'pair-G-Em', 'pair-D-A'];
  const BARRE = ['F-Bb-C', 'C-Am-F-G', 'Bm-G-D-A', 'F#m-D-A-E', 'Cm-Fm-Gm', 'Ab-Bb-Cm', 'G-blues-barre', 'jazz-Bb'];

  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const persist = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };
  const dateKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const dayNumber = (d = new Date()) => Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 864e5);

  // ---------- Rotations ----------
  function context(d = new Date()) {
    const n = dayNumber(d);
    const day = d.getDay();
    const st = load(STATE, null);
    const key = st?.keyDate === dateKey(d) && st.key ? st.key : CIRCLE[n % 12];
    return {
      n, day, dayName: DAY_NAMES[day], key, ...DAYS[day],
      seq: ['seq-thirds', 'seq-groups3', 'seq-groups4'][n % 3],
      set: String(1 + (n % 4)),
      quality: n % 2 ? 'minor' : 'major',
    };
  }

  // ---------- Routines ----------
  // Step: { min, area, ex?, bend?, patch?, title?, note? }
  const step = (min, area, ex, extra = {}) => ({ min, area, ex, ...extra });
  const IMPROVISE = 'Play notes is off: the backing chords play, you improvise. Same rule as the exercise — a chord tone on every downbeat, scale notes in between. Sing a phrase, then play it.';
  const STYLE_NOTE = c => `Line style of the day: ${Melody.STYLES[c.style].label.toLowerCase()}. Follow the highlighted notes first, then play along with the line.`;

  function build(min, c = context()) {
    const mel = style => Library.melodyExercise(style, c.prog);
    const melody = step(0, 'Melody', mel(c.style), { note: STYLE_NOTE(c) });
    const improvise = step(0, 'Apply', mel(c.style), { patch: { notesOn: false }, title: 'Improvise over the backing', note: IMPROVISE });
    const guide = step(0, 'Melody', mel('guide'), { note: 'Guide tones first: hear how the 3rds and 7ths move from chord to chord.' });
    const at = (s, m) => ({ ...s, min: m });
    const pair = k => `chg-${PAIRS[(c.n + k) % PAIRS.length]}`;
    switch (min) {
      case 10: return [
        step(2, 'Warm-up', 'seq-straight', { note: 'One position, even eighths. Relax the hand.' }),
        step(3, 'Fretboard', 'drill-majmin', { note: 'A new random key every pass: find the root before the downbeat.' }),
        at(melody, 5),
      ];
      case 15: return [
        step(2, 'Warm-up', 'seq-straight'),
        step(3, 'Technique', c.seq, { note: 'Sequence of the day. Use the tempo ladder: +5 BPM after 3 clean passes.' }),
        step(3, 'Chords', `inv-major-${c.set}`, { note: 'String set of the day. Name the top note of each shape.' }),
        at(melody, 4),
        at(improvise, 3),
      ];
      case 20: return [
        step(3, 'Warm-up', c.seq),
        step(4, 'Fretboard', `caged-arp-${c.quality}`, { note: 'Aim for the roots: they anchor every shape.' }),
        step(4, 'Chords', `prog-${c.prog}`, { note: 'The progression of the melody block, voice-led on one string set.' }),
        at(guide, 2),
        at(melody, 4),
        at(improvise, 3),
      ];
      case 30: return [
        step(3, 'Warm-up', 'diag-2-1', { note: 'Shift with the finger that ends each string.' }),
        step(5, 'Technique', c.seq, { note: 'Tempo ladder: +5 BPM after 3 clean passes; note your top tempo.' }),
        step(5, 'Fretboard', `caged-combo-${c.quality}`),
        ...(c.n % 2
          ? [step(5, 'Chords', `chg-${BARRE[c.n % BARRE.length]}`, { note: 'Change exactly on beat 1; keep strumming even if the chord is not ready.' })]
          : [step(2.5, 'Chords', pair(0), { note: 'Count the clean changes in a minute and try to beat it tomorrow.' }), step(2.5, 'Chords', pair(5))]),
        at(guide, 2),
        at(melody, 3),
        at(improvise, 3),
        step(2, 'Expression', null, { bend: 'whole', title: 'Whole-step bends', note: 'Bend trainer: plug in and press Start listening.' }),
        step(2, 'Expression', null, { bend: 'release', title: 'Bend & release' }),
      ];
      case 60: return [
        step(2, 'Warm-up', 'seq-straight'),
        step(1.5, 'Warm-up', 'diag-1-1'),
        step(1.5, 'Warm-up', 'diag-2-1'),
        step(5, 'Technique', c.seq, { note: 'Tempo ladder: +5 BPM after 3 clean passes.' }),
        step(5, 'Technique', `sweep-${c.day >= 1 && c.day <= 3 ? 3 : 5}-${c.day === 0 ? 'all' : 'majmin'}`, { note: 'Let the pick fall through the strings; separate every note.' }),
        step(5, 'Fretboard', 'caged-drill-chord'),
        step(5, 'Fretboard', 'drill-majmin'),
        step(2.5, 'Chords', `inv-major-${c.set}`),
        step(2.5, 'Chords', `inv-minor-${c.set}`),
        step(2.5, 'Chords', `prog-${c.prog}`, { patch: { blockPick: 0 }, note: 'From the first starting voicing…' }),
        step(2.5, 'Chords', `prog-${c.prog}`, { patch: { blockPick: 1 }, note: '…then from the next one up the neck.' }),
        at(guide, 3),
        step(4, 'Melody', mel('targets')),
        step(4, 'Melody', mel(c.n % 2 ? 'motif' : 'enclose')),
        step(4, 'Apply', mel(c.style), { patch: { notesOn: false }, title: 'Improvise over the backing', note: IMPROVISE }),
        step(2.5, 'Expression', null, { bend: 'scale', title: 'Bend to the next scale note' }),
        step(2.5, 'Expression', null, { bend: 'pre', title: 'Pre-bend & release' }),
        step(5, 'Review', mel('random'), { patch: { notesOn: false }, title: 'Record an 8-bar phrase',
          note: 'Improvise eight bars over the backing and record them (phone is fine). Listen back: did the downbeats land on chord tones?' }),
      ];
      default: return [];
    }
  }

  const label = min => (min === 60 ? '1 hour' : `${min} minutes`);
  const summary = min => [...new Set(build(min).map(s => s.area))].join(' · ');
  const stepTitle = s => s.title ?? (s.ex ? Library.EXERCISES[s.ex].title ?? Library.EXERCISES[s.ex].label : '');

  // ---------- Log ----------
  const log = () => load(LOG, { days: {}, best: {} });
  function addSeconds(sec) {
    const L = log();
    const k = dateKey();
    L.days[k] = L.days[k] ?? { sec: 0, done: [] };
    L.days[k].sec += sec;
    persist(LOG, L);
  }
  function markDone(min) {
    const L = log();
    const k = dateKey();
    L.days[k] = L.days[k] ?? { sec: 0, done: [] };
    L.days[k].done.push(min);
    persist(LOG, L);
  }
  const best = ex => log().best[ex];
  function recordBest(ex, bpm) {
    const L = log();
    if (!(L.best[ex] >= bpm)) { L.best[ex] = bpm; persist(LOG, L); }
  }
  // Consecutive days with at least 5 minutes, ending today (or yesterday).
  function streak() {
    const days = log().days;
    const ok = d => (days[dateKey(d)]?.sec ?? 0) >= 300;
    const d = new Date();
    if (!ok(d)) d.setDate(d.getDate() - 1);
    let n = 0;
    while (ok(d)) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function weekMinutes() {
    const days = log().days;
    let sec = 0;
    const d = new Date();
    for (let i = 0; i < 7; i++) { sec += days[dateKey(d)]?.sec ?? 0; d.setDate(d.getDate() - 1); }
    return Math.round(sec / 60);
  }
  const todayMinutes = () => Math.round((log().days[dateKey()]?.sec ?? 0) / 60);

  // ---------- Runner ----------
  // R: { min, steps, idx, left (seconds), running, stepSec (played in step) }
  let R = null;
  let el, cb, timer, last;
  const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const cur = () => R.steps[R.idx];
  const save = () => persist(STATE, { ...load(STATE, {}), active: R && { min: R.min, idx: R.idx, left: R.left, date: dateKey() } });

  function init(container, callbacks) {
    el = container;
    cb = callbacks;
    const st = load(STATE, null);
    if (st?.active && st.active.date === dateKey() && BUDGETS.includes(st.active.min)) {
      start(st.active.min, { idx: st.active.idx, left: st.active.left, quiet: true });
    } else render();
  }

  function start(min, { idx = 0, left = null, quiet = false } = {}) {
    if (R) leaveStep();
    const steps = build(min);
    R = { min, steps, idx: Math.min(idx, steps.length - 1), left: 0, running: false, stepSec: 0 };
    enterStep(left);
    if (!quiet) cb.toast(`${label(min)} routine ready · press ▶ to start`);
  }

  function enterStep(left = null) {
    const s = cur();
    R.left = left ?? s.min * 60;
    R.stepSec = 0;
    if (s.bend) {
      cb.bend(s.bend);
      if (cb.isPlaying()) cb.stop();
    } else {
      const b = best(s.ex);
      cb.apply(s, context(), b ? Math.max(40, b - 10) : null);
      if (R.running && !cb.isPlaying()) cb.play();
    }
    save();
    render();
  }

  // Leaving a step: the tempo reached counts as the best for its exercise
  // once it was practised for half a minute.
  function leaveStep() {
    const s = cur();
    if (s.ex && s.patch?.notesOn !== false && R.stepSec >= 30) recordBest(s.ex, cb.getBpm());
  }

  function go(idx) {
    if (!R || idx < 0) return;
    leaveStep();
    if (idx >= R.steps.length) return finish();
    R.idx = idx;
    enterStep();
  }

  function finish() {
    const min = R.min;
    markDone(min);
    R = null;
    clearInterval(timer);
    timer = null;
    save();
    cb.stop();
    cb.onEnd();
    chime(3);
    cb.toast(`${label(min)} routine complete — ${streak()}-day streak 🔥`);
    render();
  }

  function stopRoutine() {
    if (!R) return;
    leaveStep();
    R = null;
    clearInterval(timer);
    timer = null;
    save();
    cb.stop();
    cb.onEnd();
    render();
  }

  function setRunning(on) {
    if (!R || R.running === on) return;
    R.running = on;
    clearInterval(timer);
    timer = null;
    if (on) {
      last = performance.now();
      timer = setInterval(tick, 250);
    }
    render();
  }

  function toggle() {
    if (!R) return;
    const on = !R.running;
    setRunning(on);
    if (cur().bend) return;
    if (on && !cb.isPlaying()) cb.play();
    if (!on && cb.isPlaying()) cb.stop();
  }

  // The transport drives the clock on exercise steps: Space pauses both.
  function onTransport(playing) {
    if (!R || cur().bend) return;
    setRunning(playing);
  }

  function chime(n = 2) {
    AudioEngine.ensure();
    const t = AudioEngine.now() + 0.05;
    for (let i = 0; i < n; i++) AudioEngine.click(t + i * 0.16, 'accent');
  }

  let pending = 0;
  function tick() {
    const now = performance.now();
    const dt = (now - last) / 1000;
    last = now;
    R.left -= dt;
    R.stepSec += dt;
    pending += dt;
    if (pending >= 5) { addSeconds(Math.round(pending)); pending = 0; }
    if (R.left <= 0) {
      const next = R.steps[R.idx + 1];
      if (next) { chime(); cb.toast(`Next: ${stepTitle(next)}`); }
      go(R.idx + 1);
      return;
    }
    updateClock();
    if (Math.floor(R.left) % 5 === 0) save();
  }

  function updateClock() {
    const c = el.querySelector('.rt-clock');
    if (c) c.textContent = fmt(Math.max(0, Math.ceil(R.left)));
    const total = R.steps.reduce((a, s) => a + s.min * 60, 0);
    const done = R.steps.slice(0, R.idx).reduce((a, s) => a + s.min * 60, 0) + (cur().min * 60 - R.left);
    const bar = el.querySelector('.rt-fill');
    if (bar) bar.style.width = `${Math.min(100, (100 * done) / total)}%`;
    const seg = el.querySelector('.rt-seg.on .rt-segfill');
    if (seg) seg.style.width = `${Math.min(100, 100 * (1 - R.left / (cur().min * 60)))}%`;
  }

  function rerollKey() {
    const c = context();
    const others = CIRCLE.filter(k => k !== c.key);
    persist(STATE, { ...load(STATE, {}), key: others[Math.floor(Math.random() * others.length)], keyDate: dateKey() });
    if (R && !cur().bend) cb.apply(cur(), context(), null, true);
    render();
  }

  function stats() {
    const s = streak();
    return h('div', { class: 'rt-stats muted' },
      h('span', {}, `Today ${todayMinutes()} min`), h('span', {}, `This week ${weekMinutes()} min`),
      h('span', {}, s ? `🔥 ${s}-day streak` : 'No streak yet'));
  }

  function render() {
    if (!el) return;
    const c = context();
    el.hidden = !R;
    if (!R) { el.replaceChildren(); return; }
    const s = cur();
    const b = s.ex && best(s.ex);
    el.replaceChildren(
      h('div', { class: 'rt-head' },
        h('div', {},
          h('div', { class: 'eyebrow' }, `Routine · ${label(R.min)} · ${c.dayName}`),
          h('div', { class: 'rt-key' }, 'Key of the day ', h('b', {}, Theory.pretty(c.key)),
            h('button', { class: 'icon small', title: 'Pick another key for today', onclick: rerollKey }, '🎲'),
            h('span', { class: 'muted' }, ` · ${Melody.STYLES[c.style].label.toLowerCase()} over ${Library.PROGRESSIONS[c.prog].label}`))),
        stats(),
        h('button', { class: 'icon small', title: 'End routine', onclick: stopRoutine }, '✕')),
      h('div', { class: 'rt-segs', role: 'list' }, ...R.steps.map((x, i) => h('button', {
        class: 'rt-seg' + (i === R.idx ? ' on' : '') + (i < R.idx ? ' done' : ''), style: `flex-grow:${x.min}`,
        title: `${i + 1}. ${x.area} · ${stepTitle(x)} (${x.min} min)`, onclick: () => go(i), role: 'listitem',
      }, h('span', { class: 'rt-segfill' }), h('small', {}, x.area)))),
      h('div', { class: 'rt-now' },
        h('div', { class: 'rt-info' },
          h('div', { class: 'eyebrow' }, `Step ${R.idx + 1} of ${R.steps.length} · ${s.area} · ${s.min} min`),
          h('div', { class: 'rt-title' }, stepTitle(s)),
          s.note ? h('p', {}, s.note) : null,
          b ? h('p', { class: 'muted' }, `Best ${b} BPM — started at ${Math.max(40, b - 10)}; climb back with the tempo ladder.`) : null),
        h('div', { class: 'rt-ctrl' },
          h('span', { class: 'rt-clock' }, fmt(Math.ceil(R.left))),
          h('button', { class: 'icon', title: 'Previous step', onclick: () => go(R.idx - 1), disabled: R.idx === 0 }, '⏮'),
          h('button', { class: 'primary rt-play' + (R.running ? ' playing' : ''), onclick: toggle }, R.running ? '❚❚ Pause' : '▶ Start'),
          h('button', { class: 'icon', title: 'Next step', onclick: () => go(R.idx + 1) }, '⏭'))),
      h('div', { class: 'rt-bar' }, h('span', { class: 'rt-fill' })));
    updateClock();
  }

  return {
    BUDGETS, label, summary, build, context, init, start, stop: stopRoutine, onTransport,
    active: () => !!R, stepTitle,
  };
})();
