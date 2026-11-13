'use strict';

(() => {
  const $ = s => document.querySelector(s);
  const STORE = 'gst.settings';
  const mobile = () => matchMedia('(max-width: 900px)').matches;

  const BOARD_PRESETS = [
    ['theme', 'Theme default'], ['#3a2416', 'Rosewood'], ['#5a3a24', 'Pau ferro'], ['#141010', 'Ebony'],
    ['#e4c79c', 'Maple'], ['#b7834f', 'Roasted maple'], ['#20242c', 'Slate'], ['#1d3557', 'Navy'],
  ];

  const DEFAULTS = {
    kind: 'scale', root: 'C', scale: 'major', chord: 'maj7', stringSet: 'all', exercise: null,
    diag: 0, diagStep: 1, diagStart: 'root', theoryOpen: true,
    prog: 'I-IV-V-I', progStyle: 'arp4', progVoice: 'lead', onlyPlayed: false, blocks: 'one', blockPick: -1, scaleSystem: 'caged',
    sweepStrings: 5, sweepQual: 'majmin', sweepChords: [], showTab: true, changes: 'G-C-D', chordBars: 1, caged: 'major:chord',
    melodyStyle: 'targets', melodyScale: 'key', melodyBacking: true, melodySeed: 1,
    tuning: 'standard', frets: 15, board: 'theme',
    labels: 'notes', color: 'color', left: false, winFrom: 0, winTo: 24,
    theme: matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark',
    sidebarCollapsed: false,
    bpm: 80, beatsPerBar: 4, accent: true, subClick: false, clickOn: true, clickVol: 0.7,
    notesOn: true, notesPerBeat: 2, direction: 'updown', octaves: 2, pattern: 'linear',
    noteVol: 0.8, countIn: true, loop: true, autoMode: 'off', autoBars: 4,
  };

  const S = Object.assign({}, DEFAULTS, (() => {
    try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; }
  })());
  if (!Theory.SCALES[S.scale]) S.scale = DEFAULTS.scale;
  if (!Theory.CHORDS[S.chord]) S.chord = DEFAULTS.chord;
  if (S.exercise && !Library.EXERCISES[S.exercise]) S.exercise = null;
  if (!Library.PROGRESSIONS[S.prog]) S.prog = DEFAULTS.prog;
  if (S.kind === 'prog' && !Library.PROGRESSIONS[S.prog]) S.kind = 'scale';
  if (!Library.SWEEP_QUALS[S.sweepQual]) S.sweepQual = DEFAULTS.sweepQual;
  if (!Library.CHANGES[S.changes]) S.changes = DEFAULTS.changes;
  if (!Library.CAGED_VIEWS[S.caged]) S.caged = DEFAULTS.caged;
  if (!Melody.STYLES[S.melodyStyle]) S.melodyStyle = DEFAULTS.melodyStyle;
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch { /* ignore */ } };

  const PC_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  let source = { kind: 'manual' };
  let shapes = [];
  let diagPath = []; // diagonal run across the strings
  let blocks = []; // scale positions along the neck: { notes, lo, hi }
  let theoryFocus = null; // folder chosen with ⓘ; null = follow the selection
  const svg = $('#fretboard');

  // ---------- Toast ----------
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  // ---------- Settings binding ----------
  function fillSelect(sel, pairs) {
    sel.innerHTML = '';
    for (const [v, label] of pairs) sel.append(new Option(label, v));
  }
  fillSelect($('#key'), Theory.KEYS.map(k => [k, Theory.pretty(k)]));
  fillSelect($('#tuning'), Object.entries(Theory.TUNINGS).map(([id, t]) => [id, t.name]));
  fillSelect($('#boardPreset'), [...BOARD_PRESETS, ['custom', 'Custom…']]);

  const typeSel = $('#type');
  const optgroup = (label, pairs) => {
    const g = document.createElement('optgroup');
    g.label = label;
    for (const [v, l] of pairs) g.append(new Option(l, v));
    typeSel.append(g);
  };
  optgroup('Scales', Theory.SCALE_ORDER.map(id => [`scale:${id}`, Theory.SCALES[id].name]));
  for (const g of Theory.CHORD_GROUPS) optgroup(g.label, g.items.map(id => [`chord:${id}`, Theory.CHORDS[id].name]));
  optgroup('Triad progressions', Object.entries(Library.PROGRESSIONS).map(([id, p]) => [`prog:${id}`, `${p.label} (${p.name})`]));
  optgroup('Melody over changes', Object.entries(Library.PROGRESSIONS).map(([id, p]) => [`melody:${id}`, `${p.label} (${p.name})`]));
  optgroup('Sweep arpeggios', [['sweep:random', 'Random chord sequence']]);
  optgroup('CAGED', Object.entries(Library.CAGED_VIEWS).map(([id, v]) => [`caged:${id}`, v.title]));
  optgroup('Chord changes', Object.entries(Library.CHANGES).map(([id, c]) => [`changes:${id}`, c.name + (c.sub ? ` (${c.sub})` : '')]));

  fillSelect($('#melodyStyle'), Object.entries(Melody.STYLES).map(([id, st]) => [id, st.label]));
  const inputs = [...document.querySelectorAll('[data-setting]')];
  const tuning = () => Theory.TUNINGS[S.tuning].notes;
  const isTriad = () => S.kind === 'chord' && Theory.isTriad(S.chord);
  const triadSetActive = () => isTriad() && S.stringSet !== 'all';
  const diagActive = () => S.kind === 'scale' && S.diag > 0;
  const cagedActive = () => S.kind === 'caged';
  const blocksActive = () => (S.kind === 'scale' && S.blocks === 'all') || cagedActive();
  // Sweeps reuse the progression engine with a random chord sequence.
  const sweepActive = () => S.kind === 'sweep';
  const changesActive = () => S.kind === 'changes';
  // Melodic lines over a progression's chords, inside one scale position.
  const melodyActive = () => S.kind === 'melody';
  const progActive = () => S.kind === 'prog' || sweepActive() || changesActive() || melodyActive();
  // Full open / barre chord shapes instead of triads on a string set.
  const fullActive = () => changesActive() || (S.kind === 'prog' && S.progVoice === 'full');
  const itemId = () => ({ scale: S.scale, prog: S.prog, melody: S.prog, sweep: 'random', changes: S.changes, caged: S.caged }[S.kind] ?? S.chord);
  // String indexes (low → high) of triad string set k.
  const setStrings = k => { const nS = tuning().length; return [nS - k - 2, nS - k - 1, nS - k]; };
  const progSetK = () => Math.min(S.stringSet === 'all' ? 2 : Number(S.stringSet), tuning().length - 2);
  const sweepN = () => Math.min(S.sweepStrings, tuning().length);
  // String indexes the progression is played on.
  const progStrings = () => (fullActive() ? tuning().map((_, s) => s) : sweepActive()
    ? Array.from({ length: sweepN() }, (_, i) => tuning().length - sweepN() + i)
    : setStrings(progSetK()));

  // Root spellings per quality, avoiding double sharps/flats where possible.
  const SWEEP_ROOTS = {
    sharp: ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'],
    flat: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'],
  };
  const SWEEP_LEN = 4;

  // Deal a random sequence of triads, never the same chord twice in a row.
  function newSweepChords() {
    const quals = Library.SWEEP_QUALS[S.sweepQual].quals;
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const out = [];
    while (out.length < SWEEP_LEN) {
      const quality = pick(quals);
      const root = pick(SWEEP_ROOTS[quality === 'minor' || quality === 'dim' ? 'sharp' : 'flat']);
      const prev = out.at(-1);
      if (prev && Theory.rootPc(prev[0]) === Theory.rootPc(root) && prev[1] === quality) continue;
      out.push([root, quality]);
    }
    S.sweepChords = out;
  }

  function newSweep() {
    newSweepChords();
    save();
    renderAll();
    const now = $('.now');
    now.classList.remove('flash');
    void now.offsetWidth;
    now.classList.add('flash');
  }

  // The random machine deals keys; for sweeps "next" deals new chords.
  const melodyRandom = () => melodyActive() && (S.melodyStyle === 'random' || S.melodyStyle === 'motif');
  function newMelody() {
    S.melodySeed = Math.floor(Math.random() * 1e9);
    save();
    renderAll();
    const now = $('.now');
    now.classList.remove('flash');
    void now.offsetWidth;
    now.classList.add('flash');
  }
  // …and for random melodic phrases a new phrase.
  const nextItem = () => (sweepActive() ? newSweep() : melodyRandom() ? newMelody() : RandomMachine.next());

  // The progression's chords in the current key.
  function progChords() {
    if (changesActive()) {
      return Library.CHANGES[S.changes].chords.map(([root, quality]) => ({
        roman: '', root, quality, symbol: Theory.pretty(root) + Theory.CHORDS[quality].symbol, notes: Theory.chordNotes(root, quality),
      }));
    }
    if (sweepActive()) {
      if (!S.sweepChords?.length || S.sweepChords.some(([r, q]) => !Theory.CHORDS[q] || !Theory.KEYS.includes(r))) newSweepChords();
      return S.sweepChords.map(([root, quality]) => ({
        roman: { major: 'maj', minor: 'min', dim: 'dim', aug: 'aug' }[quality], root, quality,
        symbol: Theory.pretty(root) + Theory.CHORDS[quality].symbol, notes: Theory.chordNotes(root, quality),
      }));
    }
    return Library.PROGRESSIONS[S.prog].chords.map(([roman, deg, quality]) => {
      const root = Theory.degreeRoot(S.root, deg);
      return { roman, root, quality, symbol: Theory.pretty(root) + Theory.CHORDS[quality].symbol, notes: Theory.chordNotes(root, quality) };
    });
  }

  // String sets depend on the number of strings in the tuning.
  function syncStringSets() {
    const nS = tuning().length;
    if (S.stringSet !== 'all' && Number(S.stringSet) > nS - 2) S.stringSet = 'all';
    const sel = $('#stringSet');
    if (sel.options.length !== nS - 1) {
      const pairs = [['all', 'All strings']];
      for (let k = 1; k <= nS - 2; k++) pairs.push([String(k), `Strings ${k}-${k + 1}-${k + 2}`]);
      fillSelect(sel, pairs);
    }
    $('#stringSetField').hidden = !isTriad() && (S.kind !== 'prog' || fullActive());
    const sw = $('#sweepStrings');
    if (sw.options.length !== nS - 2) fillSelect(sw, Array.from({ length: nS - 2 }, (_, i) => [String(i + 3), `${i + 3} strings`]));
  }

  function syncScaleModes() {
    $('#diagField').hidden = S.kind !== 'scale';
    $('#diagStepField').hidden = !diagActive();
    $('#diagStartField').hidden = !diagActive();
    $('#blocksField').hidden = S.kind !== 'scale';
    $('#progStyleField').hidden = !progActive() || sweepActive() || melodyActive();
    $('#progVoiceField').hidden = !progActive() || changesActive() || melodyActive();
    for (const id of ['#melodyStyleField', '#melodyScaleField', '#melodyBackingField']) $(id).hidden = !melodyActive();
    $('#chordBarsField').hidden = !progActive() && !cagedActive();
    $('#cagedField').hidden = !cagedActive();
    $('#sweepStringsField').hidden = !sweepActive();
    $('#showTabField').hidden = !progActive();
    $('#sweepQualField').hidden = !sweepActive();
    $('#key').closest('.field').hidden = sweepActive() || changesActive();
  }

  function syncInputs() {
    syncStringSets();
    syncScaleModes();
    for (const el of inputs) {
      const v = S[el.dataset.setting];
      if (el.type === 'checkbox') el.checked = !!v;
      else el.value = String(v);
    }
    typeSel.value = `${S.kind}:${itemId()}`;
    $('#autoBars').disabled = S.autoMode !== 'bars';
    const preset = BOARD_PRESETS.some(([v]) => v === S.board) ? S.board : 'custom';
    $('#boardPreset').value = preset;
    $('#boardColor').value = S.board === 'theme'
      ? getComputedStyle(document.documentElement).getPropertyValue('--board').trim()
      : S.board;
  }

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const LIMITS = { bpm: [30, 300], winFrom: [0, 24], winTo: [0, 24], autoBars: [1, 64] };
  const VIEW_KEYS = ['root', 'tuning', 'frets', 'labels', 'color', 'left', 'winFrom', 'winTo',
    'direction', 'octaves', 'pattern', 'stringSet', 'board', 'diag', 'diagStep', 'diagStart', 'onlyPlayed', 'blocks', 'progStyle', 'progVoice', 'sweepStrings', 'sweepQual', 'showTab', 'chordBars', 'caged', 'scaleSystem', 'melodyStyle', 'melodyScale', 'melodyBacking'];

  function setSetting(k, v) {
    if (LIMITS[k]) v = clamp(Math.round(v), ...LIMITS[k]);
    S[k] = v;
    if (k === 'winFrom' && S.winFrom > S.winTo) S.winTo = S.winFrom;
    if (k === 'winTo' && S.winTo < S.winFrom) S.winFrom = S.winTo;
    if (k === 'root') source = { kind: 'manual' };
    if (k === 'sweepQual') newSweepChords();
    save();
    syncInputs();
    if (VIEW_KEYS.includes(k)) renderAll();
    if (k === 'theme') applyTheme();
    if (['tuning', 'frets', 'left', 'board'].includes(k)) BendTrainer.render();
    if (k === 'clickVol' || k === 'noteVol') AudioEngine.setVolumes(S.clickVol, S.noteVol);
    if (k === 'beatsPerBar') renderBeatDots();
  }

  for (const el of inputs) {
    const live = el.type === 'range' || el.type === 'checkbox' || el.type === 'color' || el.tagName === 'SELECT';
    el.addEventListener(live ? 'input' : 'change', () => {
      let v;
      if (el.type === 'checkbox') v = el.checked;
      else if ('num' in el.dataset || el.type === 'number' || el.type === 'range') v = Number(el.value);
      else v = el.value;
      if (typeof v === 'number' && Number.isNaN(v)) return syncInputs();
      setSetting(el.dataset.setting, v);
    });
  }

  typeSel.addEventListener('input', () => {
    const i = typeSel.value.indexOf(':');
    const [kind, id] = [typeSel.value.slice(0, i), typeSel.value.slice(i + 1)];
    selectItem({ kind, id });
  });

  $('#boardPreset').addEventListener('input', e => {
    if (e.target.value === 'custom') $('#boardColor').click();
    else setSetting('board', e.target.value);
  });

  function applyTheme() {
    document.documentElement.dataset.theme = S.theme;
    syncInputs();
    renderBoard();
    BendTrainer.render();
  }

  // ---------- Selection: items & exercises ----------
  function selectItem(a) {
    S.kind = a.kind;
    if (a.kind === 'scale') S.scale = a.id;
    else if (a.kind === 'prog' || a.kind === 'melody') S.prog = a.id;
    else if (a.kind === 'changes') S.changes = a.id;
    else if (a.kind === 'caged') S.caged = a.id;
    else if (a.kind === 'chord') S.chord = a.id;
    // Browsing an item shows all of it: drop exercise-only practice modes.
    Object.assign(S, { onlyPlayed: false, diag: 0, blocks: 'one', blockPick: -1 });
    if (a.stringSet !== undefined) S.stringSet = a.stringSet;
    S.exercise = null;
    theoryFocus = null;
    save();
    syncInputs();
    renderAll();
  }

  // extra (routines): { root, patch, bpm } applied on top of the preset.
  function applyExercise(id, extra = {}) {
    const ex = Library.EXERCISES[id];
    Object.assign(S, { autoMode: 'off', diag: 0, onlyPlayed: true, blocks: 'one', blockPick: -1 }, ex.settings, extra.patch);
    if (extra.bpm) S.bpm = extra.bpm;
    if (extra.root && !ex.randomList) { S.root = extra.root; source = { kind: 'routine' }; }
    if (ex.minFrets && S.frets < ex.minFrets) S.frets = ex.minFrets;
    theoryFocus = null;
    S.kind = ex.kind;
    if (ex.scale) S.scale = ex.scale;
    if (ex.chord) S.chord = ex.chord;
    if (ex.prog) S.prog = ex.prog;
    if (ex.kind === 'sweep') newSweepChords();
    if (ex.changes) S.changes = ex.changes;
    if (ex.caged) S.caged = ex.caged;
    S.exercise = id;
    save();
    syncInputs();
    renderAll();
    renderBeatDots();
    if (ex.randomList) RandomMachine.go(ex.randomList);
  }

  function onTreeSelect(a) {
    if (a.type === 'routine') {
      Routines.start(Number(a.id));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (a.type === 'tool') {
      BendTrainer.preset(Library.BEND_PRESETS[a.preset].settings);
      $('#bendCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (a.type === 'exercise') applyExercise(a.id);
    else selectItem(a);
    if (mobile()) setSidebar(false);
  }

  const activeKey = () => (S.exercise
    ? `ex:${S.exercise}`
    : Library.keyOf({ type: 'item', kind: S.kind, id: itemId(), stringSet: S.stringSet }));

  // ---------- Sidebar ----------
  function setSidebar(open) {
    if (mobile()) {
      document.body.classList.toggle('sb-open', open);
    } else {
      S.sidebarCollapsed = !open;
      document.body.classList.toggle('sb-collapsed', !open);
      save();
    }
  }
  const sidebarOpen = () => (mobile() ? document.body.classList.contains('sb-open') : !S.sidebarCollapsed);
  $('#sbToggle').addEventListener('click', () => setSidebar(!sidebarOpen()));
  $('#sbClose').addEventListener('click', () => setSidebar(false));
  $('#sbBackdrop').addEventListener('click', () => setSidebar(false));
  document.body.classList.toggle('sb-collapsed', S.sidebarCollapsed);

  // ---------- Rendering ----------
  const chordIdx = () => (T.chordIdx ?? 0) % progChords().length;
  const currentNotes = () => (cagedActive() ? cagedNotes({ chord: 'chord', arp: 'chord', penta: 'penta' }[cagedView().view] ?? 'scale')
    : S.kind === 'scale' ? Theory.scaleNotes(S.root, S.scale)
    : progActive() ? progChords()[chordIdx()].notes
      : Theory.chordNotes(S.root, S.chord));

  // ---------- CAGED ----------
  const cagedView = () => Library.CAGED_VIEWS[S.caged];
  const cagedChord = () => Theory.chordNotes(S.root, cagedView().quality);
  // 'chord' | 'scale' | 'penta' → the notes shown on the board.
  function cagedNotes(which) {
    const q = cagedView().quality;
    if (which === 'chord') return cagedChord();
    const id = which === 'penta' ? (q === 'major' ? 'majorPentatonic' : 'minorPentatonic') : (q === 'major' ? 'major' : 'naturalMinor');
    return Theory.scaleNotes(S.root, id);
  }

  // The notes of `list` inside frets lo..hi, as one ascending line: a pitch
  // found on two neighbouring strings goes to the lower string, unless it
  // lies beyond the chord shape there (fret > shapeHi) and the upper string
  // can take it.
  function regionLine(list, lo, hi, shapeHi) {
    const tun = tuning();
    const byPc = new Map(list.map(n => [n.pc, n]));
    const taken = new Set();
    const line = [];
    for (let s = 0; s < tun.length; s++) {
      for (let f = Math.max(0, lo); f <= hi; f++) {
        const m = tun[s] + f;
        if (!byPc.has(m % 12) || taken.has(m)) continue;
        const up = s + 1 < tun.length ? m - tun[s + 1] : -1;
        if (f > shapeHi && up >= Math.max(0, lo) && up <= hi) continue;
        taken.add(m);
        line.push({ ...byPc.get(m % 12), midi: m, pos: { s, f } });
      }
    }
    return line.sort((a, b) => a.midi - b.midi);
  }

  // The book scale position around a CAGED chord shape: the one holding the
  // most of its notes (pentatonic views keep the boxes from regionLine).
  function bookLine(v) {
    if (cagedView().view === 'penta') return null;
    const notes = cagedNotes('scale');
    const list = bookPatterns(notes);
    if (!list?.length) return null;
    const byPc = new Map(notes.map(n => [n.pc, n]));
    const hits = p => v.pts.filter(q => p.pts.some(x => x.s === q.s && x.f === q.f)).length;
    const mid = x => (x.lo + x.hi) / 2;
    const best = list.reduce((a, b) => (hits(b) - hits(a) || Math.abs(mid(a) - mid(v)) - Math.abs(mid(b) - mid(v))) > 0 ? b : a);
    return best.pts.map(x => ({ ...byPc.get(x.midi % 12), midi: x.midi, pos: { s: x.s, f: x.f } }));
  }

  // One block per CAGED shape, lowest on the neck first. Arpeggios use the
  // chord tones under the shape; scales extend one fret either side.
  function cagedBlocks() {
    if (!Shapes.isStandard(tuning())) return [];
    const chord = cagedChord();
    return Shapes.caged(chord, cagedView().quality, S.frets).map(v => {
      const arp = regionLine(chord, v.lo, v.hi, v.hi);
      const scaleWhich = cagedView().view === 'penta' ? 'penta' : 'scale';
      const scale = bookLine(v) ?? regionLine(cagedNotes(scaleWhich), v.lo - 1, v.hi + 1, v.hi);
      const notes = { chord: arp, arp, scale, penta: scale, combo: scale }[cagedView().view];
      const fs = notes.map(n => n.pos.f).concat(v.pts.map(p => p.f));
      return { letter: v.letter, label: `${v.letter} shape`, voicing: v, arp, scale, notes, lo: Math.min(...fs), hi: Math.max(...fs) };
    });
  }

  function cagedSequence() {
    const view = cagedView().view;
    const out = [];
    const strum = (b, bi) => {
      for (let bar = 0; bar < S.chordBars; bar++) {
        for (let j = 0; j < S.beatsPerBar * S.notesPerBeat; j++) {
          const base = { block: bi, name: '·', midi: b.voicing.pts[0].midi, shapeStart: bar === 0 && j === 0 };
          out.push(j % S.notesPerBeat === 0
            ? { ...base, name: b.label[0], index: 0, chordMidis: b.voicing.pts.map(p => p.midi), posList: b.voicing.pts.map(p => ({ s: p.s, f: p.f })) }
            : { ...base, rest: true });
        }
      }
    };
    blocks.forEach((b, bi) => {
      if (S.blockPick >= 0 && bi !== S.blockPick) return;
      if (view === 'chord' || view === 'combo') strum(b, bi);
      const lines = view === 'combo' ? [b.arp, b.scale] : view === 'chord' ? [] : [b.notes];
      lines.forEach(line => directed(line).forEach((n, j) =>
        out.push({ ...n, block: bi, shapeStart: view !== 'combo' && j === 0 })));
    });
    return out;
  }

  function titleParts() {
    if (cagedActive()) return [`${Theory.pretty(S.root)}${Theory.CHORDS[cagedView().quality].symbol}`, `CAGED · ${cagedView().title.toLowerCase()}`];
    if (changesActive()) {
      const c = Library.CHANGES[S.changes];
      return [c.name, c.sub ? `chord changes · ${c.sub}` : 'chord changes'];
    }
    if (melodyActive()) {
      const p = Library.PROGRESSIONS[S.prog];
      return [`${Theory.pretty(S.root)} ${p.mode}`, `${Melody.STYLES[S.melodyStyle].label.toLowerCase()} · ${p.label}`];
    }
    if (sweepActive()) return ['Sweep arpeggios', `${sweepN()} strings · ${progChords().map(c => c.symbol).join(' – ')}`];
    if (progActive()) {
      const p = Library.PROGRESSIONS[S.prog];
      return [`${Theory.pretty(S.root)} ${p.mode}`, `${p.label} · ${p.name}`];
    }
    if (S.kind === 'scale') return [`${Theory.pretty(S.root)} ${Theory.SCALES[S.scale].short}`, 'scale'];
    const c = Theory.CHORDS[S.chord];
    const set = triadSetActive() ? ` · strings ${S.stringSet}-${+S.stringSet + 1}-${+S.stringSet + 2}` : '';
    return [`${Theory.pretty(S.root)}${c.symbol}`, c.name.toLowerCase() + set];
  }

  // Closed-voiced triads on string set k (k = highest string number), every inversion.
  function shapesFor(k, notes) {
    const tun = tuning();
    const nS = tun.length;
    const ss = [nS - k - 2, nS - k - 1, nS - k]; // low → high string indexes
    const pcs = notes.map(n => n.pc);
    const out = [];
    for (let f0 = 0; f0 <= S.frets; f0++) {
      const m0 = tun[ss[0]] + f0;
      const i = pcs.indexOf(m0 % 12);
      if (i < 0) continue;
      const pts = [{ s: ss[0], f: f0, midi: m0, note: notes[i] }];
      let prev = m0;
      for (let j = 1; j < 3; j++) {
        const want = pcs[(i + j) % 3];
        let m = prev + 1;
        while (m % 12 !== want) m++;
        let f = m - tun[ss[j]];
        while (f < 0) { m += 12; f += 12; }
        pts.push({ s: ss[j], f, midi: m, note: notes[(i + j) % 3] });
        prev = m;
      }
      const fs = pts.map(p => p.f);
      if (Math.max(...fs) > S.frets || Math.max(...fs) - Math.min(...fs) > 5) continue;
      out.push({
        pts, inv: i, label: ['Root', '1st', '2nd'][i], minF: Math.min(...fs),
        inWin: fs.every(f => f >= S.winFrom && f <= S.winTo),
      });
    }
    return out.sort((a, b) => a.minF - b.minF);
  }

  // Sweep shapes on the top n strings, one chord tone per string, rising in
  // pitch. Each string takes the next chord tone or skips one, and for every
  // starting fret the most compact shape (then fewest skips) wins.
  function sweepShapesFor(n, notes) {
    const tun = tuning();
    const ss = progStrings();
    const pcs = notes.map(x => x.pc);
    const MAX_SPAN = 4;
    const out = [];
    for (let f0 = 0; f0 <= S.frets; f0++) {
      const m0 = tun[ss[0]] + f0;
      const i0 = pcs.indexOf(m0 % 12);
      if (i0 < 0) continue;
      let best = null;
      const walk = (pts, lo, hi, skips) => {
        if (pts.length === n) {
          if (new Set(pts.map(p => p.midi % 12)).size < pcs.length) return;
          const score = (hi - lo) * 10 + skips;
          if (!best || score < best.score) best = { pts: pts.slice(), score };
          return;
        }
        const s = ss[pts.length];
        let m = pts.at(-1).midi;
        for (let skip = 0; skip < 2; skip++) {
          m++;
          while (!pcs.includes(m % 12)) m++;
          const f = m - tun[s];
          const nlo = Math.min(lo, f);
          const nhi = Math.max(hi, f);
          if (f < 0 || f > S.frets || nhi - nlo > MAX_SPAN) continue;
          pts.push({ s, f, midi: m, note: notes[pcs.indexOf(m % 12)] });
          walk(pts, nlo, nhi, skips + skip);
          pts.pop();
        }
      };
      walk([{ s: ss[0], f: f0, midi: m0, note: notes[i0] }], f0, f0, 0);
      if (!best) continue;
      const fs = best.pts.map(p => p.f);
      out.push({
        pts: best.pts, inv: i0, label: ['Root', '1st', '2nd'][i0], minF: Math.min(...fs),
        inWin: fs.every(f => f >= S.winFrom && f <= S.winTo),
      });
    }
    return out.sort((a, b) => a.minF - b.minF);
  }

  const computeShapes = () => (triadSetActive() ? shapesFor(Number(S.stringSet), currentNotes()) : []);

  // Walk the scale across strings `idx` (low → high), `perString` notes on
  // each, for every starting fret on the lowest string.
  function buildCells(idx, perString, notes = currentNotes()) {
    const tun = tuning();
    const byPc = new Map(notes.map(n => [n.pc, n]));
    const lo = S.winFrom;
    const hi = Math.min(S.winTo, S.frets);
    const out = [];
    for (let f0 = lo; f0 <= hi; f0++) {
      let cur = tun[idx[0]] + f0;
      if (!byPc.has(cur % 12)) continue;
      const cell = [];
      let ok = true;
      for (let si = 0; si < idx.length && ok; si++) {
        for (let j = 0; j < perString; j++) {
          if (si || j) {
            cur++;
            while (!byPc.has(cur % 12)) cur++;
          }
          const f = cur - tun[idx[si]];
          if (f < lo || f > hi) { ok = false; break; }
          cell.push({ ...byPc.get(cur % 12), midi: cur, pos: { s: idx[si], f }, shapeStart: !si && !j });
        }
      }
      if (ok) out.push(cell);
    }
    return out;
  }

  // Scale frets on string s inside the position window.
  function scaleFretsOn(s) {
    const open = tuning()[s];
    const pcs = new Set(currentNotes().map(n => n.pc));
    const out = [];
    for (let f = S.winFrom; f <= Math.min(S.winTo, S.frets); f++) if (pcs.has((open + f) % 12)) out.push(f);
    return out;
  }

  // Fret on the lowest string where the diagonal begins: the root, or the
  // lowest scale note.
  function diagStartFret() {
    const rootPc = Theory.rootPc(S.root);
    const fs = scaleFretsOn(0);
    return S.diagStart === 'low' ? fs[0] : fs.find(f => (tuning()[0] + f) % 12 === rootPc);
  }

  // Diagonal run across all strings: `S.diag` notes per string from fret
  // `start` on the lowest string. Each next string starts `S.diagStep` scale
  // steps further up the neck than the previous string started, so the hand
  // travels along the fretboard as it crosses the strings.
  function computeDiagonal(start = diagStartFret()) {
    if (!diagActive() || start === undefined) return [];
    const tun = tuning();
    const byPc = new Map(currentNotes().map(n => [n.pc, n]));
    const scaleFrets = scaleFretsOn;
    const path = [];
    for (let s = 0; s < tun.length; s++) {
      const fs = scaleFrets(s);
      const i = fs.indexOf(start);
      const group = i < 0 ? [] : fs.slice(i, i + S.diag);
      if (group.length < S.diag) break;
      group.forEach((f, j) => path.push({ ...byPc.get((tun[s] + f) % 12), midi: tun[s] + f, pos: { s, f }, shapeStart: j === 0 }));
      if (s + 1 < tun.length) {
        const next = scaleFrets(s + 1).filter(f => f > start);
        if (next.length < S.diagStep) break;
        start = next[S.diagStep - 1];
      }
    }
    return path;
  }

  // Every position of the scale across all strings. Diatonic modes use the
  // five book (CAGED) positions by default; otherwise three notes per string
  // for 7+ note scales, two for pentatonic/blues (the five boxes). One block
  // starts on each scale degree; play order begins with the root block and
  // continues up the neck, wrapping the lower blocks to the end.
  //
  // With "Across strings" on, the blocks are instead diagonal runs starting
  // on each scale note of the lowest string (only runs reaching the top string).
  function computeBlocks() {
    if (melodyActive()) return melodyBlocks();
    if (progActive()) return progBlocks();
    if (cagedActive()) return cagedBlocks();
    if (S.kind !== 'scale') return [];
    const notes = currentNotes();
    if (!diagActive() && S.scaleSystem === 'caged') {
      const book = bookBlocks(notes);
      if (book) return book;
    }
    const nS = tuning().length;
    const all = diagActive()
      ? scaleFretsOn(0).map(f => computeDiagonal(f)).filter(p => p.length && p.at(-1).pos.s === nS - 1)
      : buildCells(tuning().map((_, s) => s), notes.length >= 7 ? 3 : 2);
    const first = diagActive() ? diagStartFret() : null;
    const r = Math.max(0, all.findIndex(c => (first == null ? c[0].index === 0 : c[0].pos.f === first)));
    return [...all.slice(r), ...all.slice(0, r)].slice(0, notes.length).map(c => {
      const fs = c.map(n => n.pos.f);
      return { notes: c, lo: Math.min(...fs), hi: Math.max(...fs) };
    });
  }
  // Diatonic scales are book patterns available (standard tuning, a mode of
  // the major scale)?
  const bookPatterns = notes => (Shapes.isStandard(tuning()) ? Shapes.scalePatterns(notes.map(n => n.pc), S.frets) : null);

  // The five book positions inside the fret window, lowest first. Each is
  // named after the CAGED shape of the tonic chord it contains, when there is one.
  function bookBlocks(notes) {
    const all = bookPatterns(notes);
    if (!all) return null;
    const byPc = new Map(notes.map(n => [n.pc, n]));
    // Chord shapes are listed once; match them in any octave.
    const has = (p, pts) => [-12, 0, 12].some(o => pts.every(q => p.pts.some(x => x.s === q.s && x.f === q.f + o)));
    const quality = { '3': 'major', b3: 'minor' }[Theory.SCALES[S.scale]?.degrees[2]];
    const fifth = Theory.SCALES[S.scale]?.degrees[4] === '5';
    const tonic = quality && fifth ? Shapes.caged(Theory.chordNotes(S.root, quality), quality, S.frets + 3) : [];
    const list = all.filter(p => p.lo >= S.winFrom && p.hi <= Math.min(S.winTo, S.frets));
    return list.length ? list.map(p => {
      const letter = tonic.find(v => has(p, v.pts))?.letter;
      return {
        letter, label: letter ? `${letter} shape` : null, lo: p.lo, hi: p.hi,
        notes: p.pts.map((x, j) => ({ ...byPc.get(x.midi % 12), midi: x.midi, pos: { s: x.s, f: x.f }, shapeStart: j === 0 })),
      };
    }) : null;
  }

  // One voice-led pass through the progression for each voicing of the first
  // chord on the string set: each next chord takes the shape needing the least
  // total fret movement (ties go to the lower shape).
  function progBlocks() {
    if (fullActive()) return fullBlocks();
    const k = progSetK();
    const per = progChords().map(c => (sweepActive() ? sweepShapesFor(sweepN(), c.notes) : shapesFor(k, c.notes))
      .filter(sh => sh.inWin && (S.progVoice !== 'root' || sh.inv === 0)));
    if (per.some(list => !list.length)) return [];
    const dist = (a, b) => a.pts.reduce((sum, p, i) => sum + Math.abs(p.f - b.pts[i].f), 0);
    return per[0].map(first => {
      const voicings = [first];
      for (let i = 1; i < per.length; i++) {
        const prev = voicings[i - 1];
        voicings.push(per[i].reduce((best, sh) => {
          const d = dist(sh, prev) - dist(best, prev);
          return d < 0 || (d === 0 && sh.minF < best.minF) ? sh : best;
        }));
      }
      const fs = voicings.flatMap(v => v.pts.map(p => p.f));
      return { voicings, notes: [], lo: Math.min(...fs), hi: Math.max(...fs) };
    });
  }

  // Full chord shapes: open position first, then the progression as barre
  // chords starting from an E-shape and from an A-shape, each next chord
  // taking the barre closest to the previous one.
  function fullBlocks() {
    if (!Shapes.isStandard(tuning())) return [];
    const per = progChords().map(c => Shapes.forChord(c.root, c.quality, c.notes, S.frets));
    if (per.some(list => !list.length)) return [];
    const center = v => {
      const fs = v.pts.map(p => p.f).filter(f => f > 0);
      return fs.length ? fs.reduce((a, b) => a + b) / fs.length : 0;
    };
    const closest = (list, prev) => list.reduce((best, v) =>
      (Math.abs(center(v) - center(prev)) < Math.abs(center(best) - center(prev)) ? v : best));
    const barres = list => { const b = list.filter(v => v.kind !== 'open'); return b.length ? b : list; };
    const out = [{
      label: 'Open',
      voicings: per.map(list => list.find(v => v.kind === 'open') ?? list.reduce((a, b) => (b.maxF < a.maxF ? b : a))),
    }];
    for (const kind of ['E', 'A']) {
      const first = per[0].find(v => v.kind === kind && v.minF > 0);
      if (!first) continue;
      const voicings = [first];
      for (let i = 1; i < per.length; i++) voicings.push(closest(barres(per[i]), voicings[i - 1]));
      out.push({ label: `${kind}-shape`, voicings });
    }
    const seen = new Set();
    return out.filter(b => {
      const key = b.voicings.map(v => v.frets.join()).join('|');
      return !seen.has(key) && seen.add(key);
    }).map(b => {
      const fs = b.voicings.flatMap(v => v.pts.map(p => p.f));
      return { ...b, notes: [], lo: Math.min(...fs), hi: Math.max(...fs) };
    });
  }

  // ---------- Melody over changes ----------
  // The key scale of the progression (modal progressions name their own),
  // or its pentatonic.
  function melodyKeyScale() {
    const p = Library.PROGRESSIONS[S.prog];
    const id = p.scale ?? (p.mode === 'minor' ? 'naturalMinor' : 'major');
    if (S.melodyScale !== 'penta') return Theory.scaleNotes(S.root, id);
    return Theory.scaleNotes(S.root, Theory.SCALES[id].degrees[2] === '3' ? 'majorPentatonic' : 'minorPentatonic');
  }

  // Per chord: the scale to play (the key scale fitted to the chord; the
  // pentatonic box stays as it is), labelled from the chord root, its chord
  // tones and guide tones (3rd and 7th).
  function melodyInfo() {
    const key = melodyKeyScale();
    const penta = S.melodyScale === 'penta';
    return progChords().map(c => {
      const scale = penta ? key : Theory.chordScale(key, c.notes);
      const shown = Theory.relabel(scale, c.root);
      return {
        ...c, scale, shown, pcs: new Set(scale.map(n => n.pc)), tones: new Set(c.notes.map(n => n.pc)),
        guide: new Set(shown.filter(n => n.num === 3 || n.num === 7).map(n => n.pc)),
      };
    });
  }

  // Name of a chord-scale from its degrees, e.g. "G Mixolydian".
  function scaleName(shown, root) {
    const degs = shown.map(n => n.degree).join();
    const id = Theory.SCALE_ORDER.find(k => Theory.SCALES[k].degrees.join() === degs);
    return id ? `${Theory.pretty(root)} ${Theory.SCALES[id].short}` : null;
  }

  // The positions of the key scale: the book positions for diatonic modes,
  // otherwise three (or, for pentatonics, two) notes per string.
  function melodyBlocks() {
    const key = melodyKeyScale();
    const hiF = Math.min(S.winTo, S.frets);
    let list = (key.length === 7 && bookPatterns(key) || [])
      .filter(p => p.lo >= S.winFrom && p.hi <= hiF).map(p => ({ pts: p.pts }));
    if (!list.length) {
      list = buildCells(tuning().map((_, s) => s), key.length >= 7 ? 3 : 2, key)
        .map(c => ({ pts: c.map(n => ({ s: n.pos.s, f: n.pos.f, midi: n.midi })) }));
    }
    return list.map(b => {
      const fs = b.pts.map(p => p.f);
      const lo = Math.min(...fs);
      const hi = Math.max(...fs);
      return { ...b, notes: [], lo, hi, label: `fr ${lo}–${hi}` };
    });
  }

  // Scale pitches (pitch classes `pcs`) playable in block b, allowing a
  // one-fret stretch either side for notes the key scale lacks.
  function melodyPool(b, pcs) {
    const midis = b.pts.map(p => p.midi);
    const [minM, maxM] = [Math.min(...midis), Math.max(...midis)];
    const out = new Set();
    tuning().forEach((open, s) => {
      for (let f = Math.max(0, b.lo - 1); f <= Math.min(S.frets, b.hi + 1); f++) {
        const m = open + f;
        if (pcs.has(m % 12) && m >= minM - 1 && m <= maxM + 1) out.add(m);
      }
    });
    return [...out].sort((a, c) => a - c);
  }

  // A fret for each pitch of the line: the block's own spot when it has one,
  // else the nearest string in reach of the block.
  function placeLine(line, b) {
    const tun = tuning();
    const exact = new Map(b.pts.map(p => [p.midi, { s: p.s, f: p.f }]));
    let prev = b.pts[0];
    return line.map(m => {
      if (m == null) return null;
      let pos = exact.get(m);
      if (!pos) {
        const all = tun.map((open, s) => ({ s, f: m - open })).filter(c => c.f >= 0 && c.f <= S.frets);
        if (!all.length) return null;
        const out = c => Math.max(0, b.lo - c.f, c.f - b.hi);
        pos = all.reduce((a, c) => (out(c) * 10 + Math.abs(c.s - prev.s) < out(a) * 10 + Math.abs(a.s - prev.s) ? c : a));
      }
      prev = pos;
      return pos;
    });
  }

  // Backing chord: the root low, the triad closed above it.
  function backingVoicing(c) {
    const bass = 40 + Theory.mod(c.notes[0].pc - 40, 12);
    const out = [bass];
    let m = bass + 12;
    for (const n of c.notes) {
      while (Theory.mod(m, 12) !== n.pc) m++;
      out.push(m);
    }
    return out;
  }

  function melodySequence() {
    const info = melodyInfo();
    const steps = S.beatsPerBar * S.notesPerBeat * S.chordBars;
    const bar = S.beatsPerBar * S.notesPerBeat;
    const out = [];
    blocks.forEach((b, bi) => {
      if (S.blockPick >= 0 && bi !== S.blockPick) return;
      const pools = info.map(c => melodyPool(b, c.pcs));
      if (pools.some(p => !p.length)) return;
      const lines = Melody.generate(info.map((c, i) => ({ pool: pools[i], tones: c.tones, guide: c.guide })),
        { style: S.melodyStyle, steps, beat: S.notesPerBeat, seed: S.melodySeed });
      lines.forEach((line, ci) => {
        const c = info[ci];
        const byPc = new Map(c.shown.map(n => [n.pc, n]));
        const backing = backingVoicing(c);
        const posList = placeLine(line, b);
        line.forEach((m, j) => {
          const tag = { block: bi, chordIdx: ci, shapeStart: j === 0, backing: j % bar === 0 ? backing : undefined };
          if (m == null) { out.push({ ...tag, name: '·', rest: true, midi: c.notes[0].pc + 60 }); return; }
          const n = byPc.get(m % 12) ?? { name: PC_NAMES[m % 12], interval: '·', num: 0, index: -1 };
          out.push({ ...n, ...tag, midi: m, pos: posList[j] ?? undefined });
        });
      });
    });
    return out;
  }

  function progSequence() {
    const chords = progChords();
    const out = [];
    blocks.forEach((b, bi) => {
      if (S.blockPick >= 0 && bi !== S.blockPick) return;
      b.voicings.forEach((v, ci) => {
        const tag = { block: bi, chordIdx: ci };
        const len = S.beatsPerBar * S.notesPerBeat;
        const strum = !sweepActive() && (S.progStyle === 'strum' || S.progStyle === 'strum1');
        // Arpeggios cycle up across the strings (and back down, without
        // repeating the turn notes) to fill each bar.
        const n = v.pts.length;
        const cycle = S.progStyle === 'arp3' && !sweepActive()
          ? [...v.pts.keys()]
          : [...v.pts.keys(), ...Array.from({ length: n - 2 }, (_, j) => n - 2 - j)];
        for (let bar = 0; bar < S.chordBars; bar++) {
          for (let j = 0; j < len; j++) {
            const shapeStart = bar === 0 && j === 0;
            if (strum) {
              // Strum on each beat (or only beat 1), rest in between.
              const hit = j % S.notesPerBeat === 0 && (S.progStyle === 'strum' || j === 0);
              out.push(hit
                ? {
                  ...tag, name: chords[ci].symbol, index: 0, midi: v.pts[0].midi, shapeStart,
                  chordMidis: v.pts.map(p => p.midi), posList: v.pts.map(p => ({ s: p.s, f: p.f })),
                }
                : { ...tag, name: '·', rest: true, midi: v.pts[0].midi, shapeStart });
            } else {
              const p = v.pts[cycle[j % cycle.length]];
              out.push({ ...p.note, ...tag, midi: p.midi, pos: { s: p.s, f: p.f }, shapeStart });
            }
          }
        }
      });
    });
    return out;
  }

  // Strum the current voicing of chord ci.
  function strumChord(ci) {
    if (melodyActive()) {
      AudioEngine.ensure();
      backingVoicing(progChords()[ci]).forEach((m, i) => AudioEngine.playNote(m, AudioEngine.now() + i * 0.03, 0.6));
      return;
    }
    const v = (blocks[S.blockPick >= 0 ? S.blockPick : T.block] ?? blocks[0])?.voicings[ci];
    if (!v) return;
    AudioEngine.ensure();
    v.pts.forEach((p, i) => AudioEngine.playNote(p.midi, AudioEngine.now() + i * 0.03, 0.7));
  }

  function renderProgBar() {
    const bar = $('#progBar');
    bar.hidden = !progActive();
    if (!progActive()) return;
    const ci = chordIdx();
    bar.replaceChildren(h('span', { class: 'eyebrow' }, 'Chords'), ...progChords().map((c, i) => h('button', {
      class: 'cpill' + (i === ci ? ' on' : ''), title: `Show and hear ${c.symbol}`,
      onclick: () => { T.chordIdx = i; renderBoard(); renderProgBar(); strumChord(i); },
    }, h('small', {}, c.roman), h('b', {}, c.symbol))),
    ...(melodyRandom() ? [h('button', { class: 'bpos', title: `Deal a new ${S.melodyStyle === 'motif' ? 'motif' : 'phrase'} (N)`, onclick: newMelody }, h('b', {}, '🎲'), h('small', {}, 'new'))] : []),
    ...(sweepActive() ? [h('button', { class: 'bpos', title: 'Deal a new random chord sequence (N)', onclick: newSweep }, h('b', {}, '🎲'), h('small', {}, 'new'))] : []));
  }

  // Tablature of the position being played (or picked): one measure per
  // chord, one column per sequence step, highest string on top.
  function renderTab() {
    const box = $('#tabView');
    box.hidden = !progActive() || !S.showTab || !blocks.length;
    if (box.hidden) return;
    const bi = S.blockPick >= 0 ? S.blockPick : T.block;
    const at = n => n.posList ?? (n.pos ? [n.pos] : []);
    const key = `${bi}|${S.tuning}|${T.seq.map(n => at(n).map(p => `${p.s}.${p.f}`).join('+')).join()}`;
    if (box.dataset.key === key) return; // unchanged: keep the highlighted column
    box.dataset.key = key;
    const tun = tuning();
    const rows = tun.map((_, s) => s).reverse();
    const chords = progChords();
    const measures = new Map();
    T.seq.forEach((n, i) => {
      if (n.block !== bi) return;
      if (!measures.has(n.chordIdx)) measures.set(n.chordIdx, []);
      measures.get(n.chordIdx).push([n, i]);
    });
    const col = (n, i) => {
      const frets = new Map(at(n).map(p => [p.s, p.f]));
      return h('div', { class: 'tcol', 'data-i': i },
        ...rows.map(s => h('span', { class: 'tcell' }, frets.has(s) ? h('b', {}, String(frets.get(s))) : '')));
    };
    box.replaceChildren(
      h('div', { class: 'tnames' }, h('div', { class: 'thead' }, '·'),
        h('div', { class: 'tbody' }, ...rows.map(s => h('span', { class: 'tcell' }, PC_NAMES[tun[s] % 12].toLowerCase().replace('♯', '#'))))),
      ...[...measures].map(([ci, list]) => h('div', { class: 'tmeasure' },
        h('div', { class: 'thead' }, chords[ci].symbol),
        h('div', { class: 'tbody' }, ...list.map(([n, i]) => col(n, i))))));
  }

  function renderBoard() {
    const nS = tuning().length;
    const k = Number(S.stringSet);
    const base = {
      tuning: tuning(), frets: S.frets, labels: S.labels, colorMode: S.color, leftHanded: S.left,
      board: S.board === 'theme' ? null : S.board,
    };
    if (melodyActive()) {
      // The current chord's scale in the position; chord tones drawn large.
      const ci = chordIdx();
      const c = melodyInfo()[ci];
      const bi = blocks[S.blockPick >= 0 ? S.blockPick : T.block] ? (S.blockPick >= 0 ? S.blockPick : T.block) : 0;
      const b = blocks[bi];
      const played = T.seq.filter(n => n.block === bi && n.chordIdx === ci && n.pos);
      Fretboard.render(svg, {
        ...base, notes: c.shown, accent: S.melodyStyle === 'guide' ? c.guide : c.tones,
        winFrom: b ? b.lo : S.winFrom, winTo: b ? b.hi : S.winTo,
        only: S.onlyPlayed && played.length ? new Set(played.map(n => `${n.pos.s}:${n.pos.f}`)) : null,
      });
      renderTab();
      return;
    }
    if (progActive()) {
      // Show the current chord's voicing on its string set.
      const ci = chordIdx();
      const chord = progChords()[ci];
      const b = blocks[S.blockPick >= 0 ? S.blockPick : T.block] ?? blocks[0];
      const v = b?.voicings[ci];
      Fretboard.render(svg, {
        ...base, notes: chord.notes, strings: fullActive() ? null : new Set(progStrings()),
        winFrom: b ? b.lo : S.winFrom, winTo: b ? b.hi : S.winTo,
        shapes: v && !fullActive() ? [{ pts: v.pts, label: `${chord.symbol} · ${['root', '1st inv', '2nd inv'][v.inv]}`, inWin: true }] : [],
        only: v && S.onlyPlayed ? new Set(v.pts.map(p => `${p.s}:${p.f}`)) : null,
      });
      renderTab();
      return;
    }
    if (cagedActive()) {
      // Every shape outlined; the one played (or picked) is highlighted.
      const b = T.playing || S.blockPick >= 0 ? blocks[T.block] ?? null : null;
      Fretboard.render(svg, {
        ...base, notes: currentNotes(),
        winFrom: b ? b.lo : S.winFrom, winTo: b ? b.hi : S.winTo,
        shapes: blocks.map(x => ({ pts: x.voicing.pts, label: x.label, inWin: !b || x === b })),
        only: b && S.onlyPlayed ? new Set([...b.notes, ...b.voicing.pts.map(p => ({ pos: p }))].map(n => `${n.pos.s}:${n.pos.f}`)) : null,
      });
      return;
    }
    // With blocks, the board follows the block being played (or the one picked).
    const block = blocksActive() && (T.playing || S.blockPick >= 0) ? blocks[T.block] ?? null : null;
    let only = S.onlyPlayed && T.seq.length ? new Set(T.seq.filter(n => n.pos).map(n => `${n.pos.s}:${n.pos.f}`)) : null;
    if (block && S.onlyPlayed) only = new Set(block.notes.map(n => `${n.pos.s}:${n.pos.f}`));
    Fretboard.render(svg, {
      ...base, notes: currentNotes(),
      winFrom: block ? block.lo : S.winFrom, winTo: block ? block.hi : S.winTo,
      strings: triadSetActive() ? new Set([nS - k - 2, nS - k - 1, nS - k]) : null,
      shapes,
      only, // optionally show only the exact positions the progression plays
    });
  }

  function renderNow() {
    const [title, sub] = titleParts();
    $('#nowTitle').textContent = title;
    $('#nowTitle').append(h('span', { class: 'sub' }, sub));
    $('#nowMeta').textContent = source.kind === 'random'
      ? `Random · ${source.title} · ${source.pos} of ${source.total}`
      : source.kind === 'routine' ? 'Routine · key of the day' : 'Manual selection';
    const wrap = $('#scaleNotes');
    wrap.innerHTML = '';
    if (progActive()) {
      progChords().forEach((c, i) => wrap.append(h('button', {
        class: 'chip' + (c.roman.toUpperCase().startsWith('I') && c.root === S.root ? ' root' : ''), title: `Hear ${c.symbol}`,
        onclick: () => { T.chordIdx = i; renderBoard(); renderProgBar(); strumChord(i); },
      }, h('b', {}, c.symbol), h('small', {}, c.roman))));
    }
    for (const n of progActive() ? [] : currentNotes()) {
      const chip = h('button', { class: 'chip' + (n.index === 0 ? ' root' : ''), title: 'Play' },
        h('span', { class: 'dot' }), h('b', {}, n.name), h('small', {}, n.interval));
      chip.style.setProperty('--dot', Fretboard.DEGREE_COLORS[(n.num - 1) % 7]);
      chip.addEventListener('click', () => AudioEngine.playNote(startMidi() + n.semis));
      wrap.append(chip);
    }

    const ex = S.exercise && Library.EXERCISES[S.exercise];
    const box = $('#exerciseInfo');
    box.hidden = !ex;
    if (ex) {
      box.replaceChildren(
        h('div', {},
          h('div', { class: 'eyebrow' }, 'Exercise'),
          h('div', { class: 'ex-title' }, ex.title ?? ex.label),
          h('p', {}, ex.desc, ' Press ', h('kbd', {}, 'Space'), ' to start.')),
        h('button', { class: 'icon small', title: 'Close exercise', onclick: () => { S.exercise = null; save(); renderAll(); } }, '✕'));
    }
  }

  function renderSeqStrip() {
    const strip = $('#seqStrip');
    strip.replaceChildren(...T.seq.map((n, i) =>
      h('span', { class: 'schip' + (n.index === 0 ? ' root' : '') + (n.shapeStart && i ? ' gap' : ''), 'data-i': i }, n.name)));
    const first = T.seq[0];
    const start = first ? `starts on ${first.name}${Theory.midiOctave(first.midi)}` : 'no notes in the position window';
    const posInfo = S.blockPick >= 0 ? `position ${S.blockPick + 1} of ${blocks.length}` : `${blocks.length} positions`;
    $('#seqInfo').textContent = progActive()
      ? (blocks.length ? `${progChords().length} chords · ${posInfo} · ${T.seq.filter(n => !n.rest).length} notes`
        : melodyActive() ? 'no scale position fits the window' : 'no voicings fit the position window')
      : shapes.length
      ? `${shapes.filter(s => s.inWin).length} shapes · ${T.seq.length} notes · ${start}`
      : diagPath.length
        ? `${new Set(diagPath.map(n => n.pos.s)).size} strings · ${T.seq.length} notes · ${start}`
        : blocksActive() && blocks.length
          ? `${posInfo} · ${T.seq.length} notes · ${start}`
        : `${T.seq.length} notes · ${start}`;
  }

  function renderAll() {
    shapes = computeShapes();
    blocks = computeBlocks();
    diagPath = blocksActive() && blocks.length ? [] : computeDiagonal();
    if (S.blockPick >= blocks.length) S.blockPick = -1;
    const next = buildSequence();
    const changed = next.map(n => n.midi).join() !== T.seq.map(n => n.midi).join();
    T.seq = next;
    if (changed) { T.seqIdx = 0; T.block = Math.max(0, S.blockPick); T.chordIdx = 0; }
    renderNow();
    renderBoard();
    renderTab();
    renderBlockBar();
    renderProgBar();
    renderSeqStrip();
    renderTheory();
    Sidebar.refresh();
  }

  // ---------- Sequence ----------
  function startMidi() {
    const rpc = Theory.rootPc(S.root);
    let best = Infinity;
    for (const open of tuning()) {
      for (let f = S.winFrom; f <= Math.min(S.winTo, S.frets); f++) {
        const m = open + f;
        if (Theory.mod(m, 12) === rpc && m < best) best = m;
      }
    }
    if (best === Infinity) {
      best = tuning()[0];
      while (Theory.mod(best, 12) !== rpc) best++;
    }
    return best;
  }

  function applyPattern(line) {
    const out = [];
    const L = line.length;
    if (S.pattern === 'thirds') {
      for (let i = 0; i + 2 < L; i++) out.push(line[i], line[i + 2]);
      return out.length ? out : line;
    }
    const size = S.pattern === 'groups3' ? 3 : S.pattern === 'groups4' ? 4 : 0;
    if (!size || L < size) return line;
    for (let i = 0; i + size <= L; i++) out.push(...line.slice(i, i + size));
    return out;
  }

  // Triad shapes: arpeggiate each shape, moving along the neck.
  function shapeSequence() {
    const list = shapes.filter(s => s.inWin);
    if (!list.length) return [];
    const play = (sh, down) => {
      const pts = down ? sh.pts.slice().reverse() : sh.pts;
      return pts.map((p, j) => ({ ...p.note, midi: p.midi, pos: { s: p.s, f: p.f }, shapeStart: j === 0 }));
    };
    const up = list.flatMap(sh => play(sh, false));
    const downShapes = list.slice().reverse();
    switch (S.direction) {
      case 'up': return up;
      case 'down': return downShapes.flatMap(sh => play(sh, true));
      case 'downup': return [...downShapes.flatMap(sh => play(sh, true)), ...list.slice(1).flatMap(sh => play(sh, false))];
      default: return [...up, ...downShapes.slice(1).flatMap(sh => play(sh, true))];
    }
  }

  // Out along the diagonal and back over the same frets.
  function diagSequence() {
    const up = diagPath;
    if (!up.length) return [];
    const down = up.slice().reverse().map((n, j, a) => ({ ...n, shapeStart: j === 0 || a[j - 1].pos.s !== n.pos.s }));
    switch (S.direction) {
      case 'up': return up;
      case 'down': return down;
      case 'downup': return [...down, ...up.slice(1)];
      default: return [...up, ...down.slice(1)];
    }
  }

  // Give every note one fret position: stay in a 5-fret hand position and
  // shift only when a note is out of reach. Repeated pitches reuse their spot.
  function assignPositions(seq) {
    const tun = tuning();
    const lo = S.winFrom;
    const hi = Math.min(S.winTo, S.frets);
    const memo = new Map();
    let anchor = null;
    let prev = null;
    return seq.map(n => {
      if (memo.has(n.midi)) return { ...n, pos: memo.get(n.midi) };
      const cands = (a, b) => tun.map((open, s) => ({ s, f: n.midi - open })).filter(c => c.f >= a && c.f <= b);
      let list = cands(lo, hi);
      if (!list.length) list = cands(0, S.frets);
      if (!list.length) return n;
      if (anchor === null) {
        const first = list.reduce((a, b) => (b.f < a.f ? b : a));
        anchor = Math.max(lo, first.f - 1);
      }
      const out = c => Math.max(0, anchor - c.f, c.f - (anchor + 4));
      const cost = c => out(c) * 10 + (prev ? Math.abs(c.f - prev.f) * 0.3 + Math.abs(c.s - prev.s) * 0.2 : 0);
      const best = list.reduce((a, b) => (cost(b) < cost(a) ? b : a));
      if (best.f > anchor + 4) anchor = best.f - 3;
      else if (best.f < anchor) anchor = best.f;
      prev = best;
      memo.set(n.midi, best);
      return { ...n, pos: best };
    });
  }

  function buildSequence() {
    if (melodyActive()) return melodySequence();
    if (progActive()) return progSequence();
    if (cagedActive()) return cagedSequence();
    if (triadSetActive()) return shapeSequence();
    if (blocksActive() && blocks.length) return blockSequence();
    if (diagActive()) return diagSequence();
    return assignPositions(linearSequence());
  }

  // Apply pattern + direction to an ascending run of notes.
  function directed(up) {
    const down = up.slice().reverse();
    const join = (a, b) => (a.at(-1).midi === b[0].midi ? a.concat(b.slice(1)) : a.concat(b));
    switch (S.direction) {
      case 'up': return applyPattern(up);
      case 'down': return applyPattern(down);
      case 'downup': return join(applyPattern(down), applyPattern(up));
      default: return join(applyPattern(up), applyPattern(down));
    }
  }

  // The pattern played in each block in turn, moving along the neck, or
  // only in the block picked with the position switcher.
  function blockSequence() {
    const one = S.blockPick >= 0;
    return blocks.flatMap((b, bi) => (one && bi !== S.blockPick
      ? []
      : directed(b.notes).map((n, j) => ({ ...n, block: bi, shapeStart: j === 0 }))));
  }

  // i: a position index, -1 for the tour through all positions, or 'free'
  // (scales only) for the plain run over octaves without positions.
  const freeAvailable = () => S.kind === 'scale';
  const currentPick = () => (freeAvailable() && S.blocks !== 'all' ? 'free' : S.blockPick);

  function pickBlock(i) {
    if (freeAvailable()) S.blocks = i === 'free' ? 'one' : 'all';
    S.blockPick = i === 'free' ? -1 : i;
    T.block = Math.max(0, S.blockPick);
    save();
    syncInputs();
    renderAll();
  }

  // Step through (Free →) All → 1 → 2 … with the arrow keys.
  function stepBlock(d) {
    if (!blocks.length) return;
    const order = [...(freeAvailable() ? ['free'] : []), -1, ...blocks.keys()];
    const n = order.length;
    pickBlock(order[((order.indexOf(currentPick()) + d) % n + n) % n]);
  }

  function renderBlockBar() {
    const bar = $('#blockBar');
    bar.hidden = !blocks.length;
    if (!blocks.length) return;
    const pick = currentPick();
    const btn = (i, label, sub, title) => h('button', {
      class: 'bpos' + (pick === i ? ' on' : ''), title, 'aria-pressed': String(pick === i),
      onclick: () => pickBlock(i),
    }, h('b', {}, label), sub ? h('small', {}, sub) : null);
    // Diatonic modes: the five book positions or seven 3-notes-per-string ones.
    const sys = S.kind === 'scale' && !diagActive() && bookPatterns(currentNotes())
      ? h('span', { class: 'bsys', role: 'group', 'aria-label': 'Position system' },
        ...[['caged', 'CAGED', 'The five positions used in most guitar books, built around the CAGED chord shapes'],
          ['3nps', '3 NPS', 'Seven positions with three notes per string, one starting on each scale degree']]
          .map(([v, label, title]) => h('button', {
            class: S.scaleSystem === v ? 'on' : '', title, 'aria-pressed': String(S.scaleSystem === v),
            onclick: () => setSetting('scaleSystem', v),
          }, label)))
      : null;
    bar.replaceChildren(
      h('span', { class: 'eyebrow' }, 'Positions'), ...(sys ? [sys] : []),
      ...(freeAvailable() ? [diagActive()
        ? btn('free', 'Run', 'from root', 'Play the single run across the strings')
        : btn('free', 'Free', `${S.octaves} oct`, 'Play the scale over octaves from the lowest root, ignoring positions')] : []),
      btn(-1, 'All', 'tour', 'Play every position along the neck'),
      ...blocks.map((b, i) => btn(i, b.letter ?? String(i + 1), b.letter ? `fr ${b.lo}–${b.hi}` : b.label ?? `fr ${b.lo}–${b.hi}`,
        `Loop position ${i + 1} only (${b.label && b.voicings ? `${b.label} voicings` : b.label ? b.label : b.voicings ? `first chord in ${['root position', '1st inversion', '2nd inversion'][b.voicings[0].inv]}` : `starts on ${b.notes[0].name}`}, frets ${b.lo}–${b.hi})`)),
      h('span', { class: 'muted small-text' }, '← / → to switch'));
  }

  function linearSequence() {
    // Chord tones such as 9/11/13 are folded into one octave and stacked.
    const notes = currentNotes()
      .map(n => ({ ...n, semis: n.semis % 12 }))
      .sort((a, b) => a.semis - b.semis);
    const base = startMidi();
    const up = [];
    for (let o = 0; o < S.octaves; o++) {
      for (const n of notes) up.push({ ...n, midi: base + o * 12 + n.semis });
    }
    up.push({ ...notes[0], midi: base + S.octaves * 12 });
    return directed(up);
  }

  // ---------- Transport / scheduler ----------
  const T = {
    playing: false, stopping: false, timer: null, nextTime: 0,
    beat: 0, sub: 0, barBeat: 0, countIn: 0, bars: 0, started: false,
    seq: [], seqIdx: 0, wait: false, pendingAdvance: false, queue: [], block: 0, chordIdx: 0,
  };

  function startTransport() {
    AudioEngine.ensure();
    AudioEngine.setVolumes(S.clickVol, S.noteVol);
    Object.assign(T, {
      playing: true, stopping: false, beat: 0, sub: 0, barBeat: 0,
      countIn: S.countIn ? S.beatsPerBar : 0, bars: 0, started: false,
      seqIdx: 0, wait: false, pendingAdvance: false, queue: [],
    });
    T.nextTime = AudioEngine.now() + 0.1;
    T.timer = setInterval(scheduler, 25);
    scheduler();
    updatePlayBtn();
  }

  function stopTransport() {
    clearInterval(T.timer);
    T.playing = false;
    T.queue = [];
    clearPlaying();
    renderBeatDots();
    updatePlayBtn();
  }

  const toggleTransport = () => (T.playing ? stopTransport() : startTransport());

  function scheduler() {
    const horizon = AudioEngine.now() + 0.12;
    while (T.playing && !T.stopping && T.nextTime < horizon) {
      const dur = 60 / S.bpm / S.notesPerBeat;
      tick(T.nextTime, dur);
      T.nextTime += dur;
    }
  }

  function autoAdvance() {
    nextItem();
    T.seqIdx = 0;
    T.wait = false;
  }

  function tick(time, dur) {
    if (T.sub >= S.notesPerBeat) {
      T.sub = 0;
      T.beat++;
      T.barBeat = (T.barBeat + 1) % S.beatsPerBar;
    }
    const onBeat = T.sub === 0;
    const counting = T.beat < T.countIn;
    const downbeat = onBeat && T.barBeat === 0;

    if (onBeat) {
      if (downbeat && !counting) {
        if (T.started) {
          T.bars++;
          if (S.autoMode === 'bars' && T.bars % S.autoBars === 0) autoAdvance();
        }
        T.started = true;
        if (T.wait) {
          T.wait = false;
          if (T.pendingAdvance) { T.pendingAdvance = false; autoAdvance(); }
        }
      }
      if (S.clickOn || counting) AudioEngine.click(time, downbeat && S.accent ? 'accent' : 'beat');
      T.queue.push({ time, type: 'beat', beat: T.barBeat, counting });
    } else if (S.clickOn && S.subClick && !counting) {
      AudioEngine.click(time, 'sub');
    }

    if (!counting && S.notesOn && T.seq.length && !T.wait) {
      if (T.seqIdx >= T.seq.length) T.seqIdx = 0;
      const n = T.seq[T.seqIdx];
      if (n.backing && S.melodyBacking) n.backing.forEach((m, i) => AudioEngine.playNote(m, time + i * 0.02, i ? 0.28 : 0.34));
      if (n.chordMidis) n.chordMidis.forEach((m, i) => AudioEngine.playNote(m, time + i * 0.018, 0.7));
      else if (!n.rest) AudioEngine.playNote(n.midi, time);
      if (n.block !== undefined && (n.shapeStart || T.seqIdx === 0)) {
        T.queue.push({ time, type: 'block', block: n.block, chord: n.chordIdx });
      }
      if (!n.rest) T.queue.push({ time, type: 'note', midi: n.midi, pos: n.pos, posList: n.posList, idx: T.seqIdx });
      T.seqIdx++;
      if (T.seqIdx >= T.seq.length) {
        // Pass finished: rest until the next downbeat, then loop / advance / stop.
        T.seqIdx = 0;
        if (S.autoMode === 'pass') {
          T.wait = true;
          T.pendingAdvance = true;
        } else if (S.loop) {
          T.wait = true;
        } else {
          T.stopping = true;
          T.queue.push({ time: time + dur * 2, type: 'stop' });
        }
      }
    }
    T.sub++;
  }

  // Apply queued visual events in sync with the audio clock.
  function frame() {
    const now = AudioEngine.now();
    while (T.queue.length && T.queue[0].time <= now) {
      const e = T.queue.shift();
      if (e.type === 'beat') renderBeatDots(e.beat, e.counting);
      else if (e.type === 'block') {
        T.block = e.block;
        if (e.chord !== undefined) { T.chordIdx = e.chord; renderProgBar(); }
        renderBoard();
      }
      else if (e.type === 'note') highlight(e);
      else if (e.type === 'stop') stopTransport();
    }
    requestAnimationFrame(frame);
  }

  function clearPlaying() {
    svg.querySelectorAll('.note.playing').forEach(n => n.classList.remove('playing'));
    document.querySelectorAll('.schip.on, .tcol.on').forEach(n => n.classList.remove('on'));
  }

  function highlight({ midi, pos, posList, idx }) {
    clearPlaying();
    // Only the exact fret(s) being played; fall back to the first match.
    const at = p => svg.querySelector(`.note[data-s="${p.s}"][data-f="${p.f}"]`);
    const targets = posList ? posList.map(at)
      : [pos ? at(pos) : svg.querySelector(`.note[data-midi="${midi}"]:not(.dim)`) ?? svg.querySelector(`.note[data-midi="${midi}"]`)];
    targets.forEach(t => t?.classList.add('playing'));
    document.querySelector(`.schip[data-i="${idx}"]`)?.classList.add('on');
    document.querySelector(`.tcol[data-i="${idx}"]`)?.classList.add('on');
  }

  function renderBeatDots(active = -1, counting = false) {
    const wrap = $('#beatDots');
    if (wrap.children.length !== S.beatsPerBar) {
      wrap.replaceChildren(...Array.from({ length: S.beatsPerBar }, (_, i) => h('span', { class: 'bdot' + (i === 0 ? ' first' : '') })));
    }
    [...wrap.children].forEach((d, i) => {
      d.classList.toggle('on', i === active);
      d.classList.toggle('count', i === active && counting);
    });
    $('#countLabel').textContent = counting ? 'Count-in…' : '';
  }

  function updatePlayBtn() {
    const b = $('#playBtn');
    b.textContent = T.playing ? '■ Stop' : '▶ Play';
    b.classList.toggle('playing', T.playing);
    Routines.onTransport(T.playing);
  }

  // ---------- Theory panel ----------
  const theoryOpenState = new Map(); // block key → open, as toggled by the user

  function rich(text) {
    const p = h('p');
    text.split('**').forEach((part, i) => p.append(i % 2 ? h('b', {}, part) : part));
    return p;
  }

  function tblock(key, title, children, defOpen) {
    return h('details', {
      class: 'tblock', open: theoryOpenState.get(key) ?? defOpen,
      ontoggle: e => theoryOpenState.set(key, e.target.open),
    }, h('summary', {}, title), ...children);
  }

  const STEP_NAMES = { 1: 'H', 2: 'W', 3: '1½', 4: '2W' };
  function formula(notes, isScale) {
    const rows = [['Formula', notes.map(n => n.interval).join('  ')]];
    if (isScale) {
      const st = notes.map(n => n.semis % 12).sort((a, b) => a - b).concat(12);
      rows.push(['Steps', st.slice(1).map((v, i) => STEP_NAMES[v - st[i]] ?? v - st[i]).join('  ')]);
    }
    rows.push(['Notes', notes.map(n => n.name).join('  ')]);
    return h('dl', { class: 'formula' }, ...rows.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)]));
  }

  // One row per string set with the three inversion shapes; rows whose
  // string intervals match share a shape family.
  function shapeChart(chordId) {
    const tun = tuning();
    const nS = tun.length;
    if (nS < 3) return [];
    const notes = Theory.chordNotes(S.root, chordId);
    const names = tun.map(m => PC_NAMES[m % 12]);
    const families = new Map();
    const rows = [];
    for (let k = nS - 2; k >= 1; k--) {
      const ss = [nS - k - 2, nS - k - 1, nS - k];
      const iv = [tun[ss[1]] - tun[ss[0]], tun[ss[2]] - tun[ss[1]]];
      if (!families.has(iv.join())) families.set(iv.join(), { letter: String.fromCharCode(65 + families.size), sets: [] });
      const fam = families.get(iv.join());
      const label = `${k}-${k + 1}-${k + 2}`;
      fam.sets.push(label);
      const off1 = 5 - iv[0];
      const off2 = off1 + 5 - iv[1];
      const shifts = [[ss[1], off1], [ss[2], off2]].filter(([, o]) => o)
        .map(([st, o]) => `${names[st]} string ${o > 0 ? '+' : ''}${o} fret${Math.abs(o) === 1 ? '' : 's'}`);
      const all = shapesFor(k, notes);
      const active = S.kind === 'chord' && S.chord === chordId && S.stringSet === String(k);
      rows.push(h('button', {
        class: 'srow' + (active ? ' on' : ''), title: 'Show this string set on the fretboard',
        onclick: () => selectItem({ kind: 'chord', id: chordId, stringSet: String(k) }),
      },
      h('span', { class: 'slabel' },
        h('b', {}, `Strings ${label}`),
        h('span', {}, `${ss.map(st => names[st]).join(' ')} · +${iv[0]} +${iv[1]} frets`),
        h('span', { class: 'fam' }, `Shape ${fam.letter}`),
        h('span', { class: 'muted' }, shifts.length ? `${shifts.join(', ')} vs. all-fourths` : 'all-fourths shape')),
      ...[0, 1, 2].map(i => {
        const sh = all.find(x => x.inv === i);
        return h('span', { class: 'mini' },
          sh ? Fretboard.miniShape(sh.pts) : h('span', { class: 'muted' }, '—'),
          h('span', { class: 'mini-cap' }, ['Root position', '1st inversion', '2nd inversion'][i]));
      })));
    }
    const summary = [...families.values()].map(f => `shape ${f.letter} on strings ${f.sets.join(' & ')}`).join('; ');
    return [
      h('div', { class: 'schart' }, ...rows),
      h('p', { class: 'muted small-text' }, `In the current tuning: ${summary}. Click a row to show it on the fretboard.`),
    ];
  }

  // The five CAGED chord diagrams; boxes for the current key.
  const CAGEDboxes = () => blocks.map(b => h('div', { class: 'cbox' },
    Fretboard.chordBox(b.voicing, `${b.letter} shape`), h('small', { class: 'muted' }, `root on fret ${b.voicing.rootFret}`)));

  const blocksOf = () => blocks[S.blockPick >= 0 ? S.blockPick : T.block] ?? blocks[0];

  function renderTheory() {
    const card = $('#theoryCard');
    card.classList.toggle('closed', !S.theoryOpen);
    $('#theoryToggle').textContent = S.theoryOpen ? '▾' : '▸';
    $('#theoryBack').hidden = !theoryFocus;
    if (!S.theoryOpen) return;

    const blocks = [];
    let path;
    const [title, sub] = titleParts();
    if (theoryFocus) {
      path = Sidebar.pathById(theoryFocus);
      $('#theoryCtx').textContent = path.map(n => n.label).join(' › ');
    } else {
      path = Sidebar.pathByKey(activeKey());
      $('#theoryCtx').textContent = `${title} ${sub}`;
    }
    if (!theoryFocus && sweepActive()) {
      const chords = progChords();
      const rows = [['Chords', chords.map(c => c.symbol).join('  ')],
        ['Tones', chords.map(c => `${c.symbol}: ${c.notes.map(n => n.name).join(' ')}`).join(' · ')],
        ['Formulas', [...new Set(chords.map(c => c.quality))].map(q => `${Theory.CHORDS[q].name.replace(' triad', '')} ${Theory.CHORDS[q].degrees.join('-')}`).join(' · ')]];
      blocks.push(tblock('item', `Sweep sequence · ${sweepN()} strings`, [
        h('dl', { class: 'formula' }, ...rows.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)])),
      ], true));
    } else if (!theoryFocus && cagedActive()) {
      const v = cagedView();
      const shown = currentNotes();
      blocks.push(tblock('item', `${title} · ${v.title}`, [
        formula(shown, v.view !== 'chord' && v.view !== 'arp'),
        h('div', { class: 'cboxes' }, ...blocksOf() ? CAGEDboxes() : []),
        h('p', { class: 'muted small-text' }, Shapes.isStandard(tuning()) ? 'The five shapes in order up the neck. Click a letter in the Positions bar to loop one.' : 'CAGED shapes need standard tuning.'),
      ], true));
    } else if (!theoryFocus && changesActive()) {
      const c = Library.CHANGES[S.changes];
      const chords = progChords();
      const uniq = chords.filter((x, i, a) => a.findIndex(y => y.symbol === x.symbol) === i);
      blocks.push(tblock('item', `${c.name}${c.sub ? ` · ${c.sub}` : ''}`, [
        h('dl', { class: 'formula' }, ...[['Chords', chords.map(x => x.symbol).join('  ')],
          ['Tones', uniq.map(x => `${x.symbol}: ${x.notes.map(n => n.name).join(' ')}`).join(' · ')]]
          .flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)])),
      ], true));
    } else if (!theoryFocus && melodyActive()) {
      const p = Library.PROGRESSIONS[S.prog];
      const info = melodyInfo();
      const uniq = info.filter((c, i, a) => a.findIndex(x => x.symbol === c.symbol) === i);
      const rows = [['Numerals', info.map(c => c.roman).join('  ')], ['Chords', info.map(c => c.symbol).join('  ')],
        ['Scales', uniq.map(c => `${c.symbol}: ${scaleName(c.shown, c.root) ?? c.shown.map(n => n.name).join(' ')}`).join(' · ')],
        ['Targets', uniq.map(c => `${c.symbol}: ${c.notes.map(n => n.name).join(' ')}`).join(' · ')]];
      blocks.push(tblock('item', `${Melody.STYLES[S.melodyStyle].label} · ${p.label} in ${title}`, [
        h('dl', { class: 'formula' }, ...rows.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)])),
        rich(Melody.STYLES[S.melodyStyle].desc),
        rich(S.melodyScale === 'penta'
          ? 'The board shows the pentatonic box with intervals counted **from the current chord root**. Large dots are tones of the current chord: the safe landing notes. Small dots are passing notes.'
          : 'The board shows the scale for the current chord, with intervals counted **from the chord root**: the key scale, with any note the chord changes swapped for the chord\'s own (that is where names like Mixolydian or Phrygian dominant come from). Large dots are chord tones, the strong landing notes; small dots are passing notes.'),
        rich(Lessons.progs[S.prog] ?? ''),
      ], true));
    } else if (!theoryFocus && progActive()) {
      const p = Library.PROGRESSIONS[S.prog];
      const chords = progChords();
      const rows = [['Numerals', chords.map(c => c.roman).join('  ')], ['Chords', chords.map(c => c.symbol).join('  ')],
        ['Tones', chords.filter((c, i, a) => a.findIndex(x => x.symbol === c.symbol) === i)
          .map(c => `${c.symbol}: ${c.notes.map(n => n.name).join(' ')}`).join(' · ')]];
      blocks.push(tblock('item', `${p.name} · ${p.label} in ${title}`, [
        h('dl', { class: 'formula' }, ...rows.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)])),
        rich(Lessons.progs[S.prog] ?? ''),
      ], true));
    } else if (!theoryFocus) {
      const isScale = S.kind === 'scale';
      const id = isScale ? S.scale : S.chord;
      const text = (isScale ? Lessons.scales : Lessons.chords)[id];
      const name = isScale ? Theory.SCALES[id].name : Theory.CHORDS[id].name;
      blocks.push(tblock('item', `${Theory.pretty(S.root)} ${name}`,
        [formula(currentNotes(), isScale), text ? rich(text) : null].filter(Boolean), true));
    }

    if (fullActive() && blocksOf()) {
      // Chord diagrams of the voicings in the position being shown.
      const b = blocksOf();
      const chords = progChords();
      const seen = new Set();
      const boxes = b ? b.voicings.map((v, i) => [v, chords[i]]).filter(([v, c]) => {
        const key = c.symbol + v.frets.join();
        return !seen.has(key) && seen.add(key);
      }).map(([v, c]) => h('div', { class: 'cbox' }, Fretboard.chordBox(v, c.symbol), h('small', { class: 'muted' }, v.name))) : [];
      if (boxes.length) blocks.push(tblock('boxes', `Chord shapes · ${b.label} position`, [h('div', { class: 'cboxes' }, ...boxes)], true));
    }

    if (isTriad() || path.some(n => n.id === 'triads' || n.id === 'ex/inv')) {
      const chordId = isTriad() ? S.chord : 'major';
      blocks.push(tblock('shapes', `Triad shapes across string sets · ${Theory.pretty(S.root)}${Theory.CHORDS[chordId].symbol}`,
        [...Lessons.shapes.map(rich), ...shapeChart(chordId)], true));
    }

    path.filter(n => Lessons.nodes[n.id]).reverse().forEach((n, i) => {
      blocks.push(tblock(n.id, n.label, Lessons.nodes[n.id].map(rich), i === 0));
    });
    $('#theoryBody').replaceChildren(...blocks);
  }

  function showTheoryFor(node) {
    theoryFocus = node.id;
    S.theoryOpen = true;
    save();
    renderTheory();
    if (mobile()) setSidebar(false);
    $('#theoryCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  $('#theoryToggle').addEventListener('click', () => { S.theoryOpen = !S.theoryOpen; save(); renderTheory(); });
  $('#theoryBack').addEventListener('click', () => { theoryFocus = null; renderTheory(); });

  // ---------- Controls ----------
  $('#playBtn').addEventListener('click', toggleTransport);
  $('#bpmDown').addEventListener('click', () => setSetting('bpm', S.bpm - 1));
  $('#bpmUp').addEventListener('click', () => setSetting('bpm', S.bpm + 1));
  $('#winAll').addEventListener('click', () => { S.winFrom = 0; setSetting('winTo', 24); });
  $('#nextBtn').addEventListener('click', nextItem);

  let taps = [];
  $('#tapBtn').addEventListener('click', () => {
    const t = performance.now();
    taps = taps.filter(x => t - x < 2500);
    taps.push(t);
    if (taps.length >= 2) setSetting('bpm', 60000 / ((taps.at(-1) - taps[0]) / (taps.length - 1)));
  });

  $('#downloadBtn').addEventListener('click', () => {
    const [title, sub] = titleParts();
    const id = itemId();
    Fretboard.exportPNG(svg, `${title} ${sub} — ${Theory.TUNINGS[S.tuning].name}`,
      `${S.root}-${id}-${S.tuning}.png`.replace(/#/g, 'sharp'));
  });

  svg.addEventListener('pointerdown', e => {
    const g = e.target.closest('.note');
    if (!g) return;
    AudioEngine.playNote(Number(g.dataset.midi));
    g.classList.add('tapped');
    setTimeout(() => g.classList.remove('tapped'), 250);
  });

  const helpDlg = $('#helpDlg');
  $('#helpBtn').addEventListener('click', () => helpDlg.showModal());
  $('#helpClose').addEventListener('click', () => helpDlg.close());

  document.addEventListener('keydown', e => {
    if (e.target.closest?.('input, select, textarea') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === ' ') { e.preventDefault(); toggleTransport(); }
    else if (/^[1-6]$/.test(e.key)) RandomMachine.go(Number(e.key));
    else if (e.key === 'n' || e.key === 'N') nextItem();
    else if (e.key === '+' || e.key === '=') setSetting('bpm', S.bpm + 5);
    else if (e.key === '-') setSetting('bpm', S.bpm - 5);
    else if (e.key === '[') setSidebar(!sidebarOpen());
    else if (e.key === 'ArrowRight' && blocks.length) { e.preventDefault(); stepBlock(1); }
    else if (e.key === 'ArrowLeft' && blocks.length) { e.preventDefault(); stepBlock(-1); }
    else if (e.key === '?') helpDlg.showModal();
  });

  // ---------- Random machine ----------
  RandomMachine.init($('#randomMachine'), {
    toast,
    onPick(item, info) {
      S.root = item.root;
      if (item.scale) { S.kind = 'scale'; S.scale = item.scale; }
      if (S.exercise && Library.EXERCISES[S.exercise].kind !== S.kind) S.exercise = null;
      source = { kind: 'random', ...info };
      save();
      syncInputs();
      renderAll();
      const now = $('.now');
      now.classList.remove('flash');
      void now.offsetWidth;
      now.classList.add('flash');
    },
  });
  RandomMachine.initTimer($('#rmTimer'), $('#rmTimerToggle'), $('#rmTimerReset'));

  // ---------- Bend trainer ----------
  BendTrainer.init($('#bendCard'), {
    toast,
    tuning,
    frets: () => S.frets,
    notes: () => (S.kind === 'scale' ? Theory.scaleNotes(S.root, S.scale) : currentNotes()),
    boardOpts: () => ({ leftHanded: S.left, board: S.board === 'theme' ? null : S.board }),
  });

  // ---------- Routines ----------
  Routines.init($('#routineCard'), {
    toast,
    apply(step, ctx, bpm, keyOnly) {
      if (keyOnly) {
        if (!Library.EXERCISES[step.ex].randomList) { setSetting('root', ctx.key); source = { kind: 'routine' }; renderNow(); }
        return;
      }
      applyExercise(step.ex, { root: ctx.key, patch: { notesOn: true, ...step.patch }, bpm });
    },
    bend(preset) {
      BendTrainer.preset(Library.BEND_PRESETS[preset].settings);
      $('#bendCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    play: () => { if (!T.playing) startTransport(); },
    stop: () => { if (T.playing) stopTransport(); },
    isPlaying: () => T.playing,
    getBpm: () => S.bpm,
    onEnd() { S.notesOn = true; save(); syncInputs(); },
  });

  // ---------- Boot ----------
  Sidebar.init($('#sidebar .sb-body'), {
    tree: Library.tree(), keyOf: Library.keyOf, activeKey, onSelect: onTreeSelect,
    hasInfo: node => !!Lessons.nodes[node.id], onInfo: showTheoryFor,
  });
  document.documentElement.dataset.theme = S.theme;
  syncInputs();
  renderAll();
  renderBeatDots();
  requestAnimationFrame(frame);
})();
