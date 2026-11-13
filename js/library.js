'use strict';

// Sidebar content: the category tree and the exercise presets.
const Library = (() => {
  const STRING_SETS = [['1', 'Strings 1-2-3'], ['2', 'Strings 2-3-4'], ['3', 'Strings 3-4-5'], ['4', 'Strings 4-5-6']];
  const TRIADS = Theory.CHORD_GROUPS[0].items;
  const INVERSION_TRIADS = ['major', 'minor', 'dim', 'aug'];

  const seq = (pattern, notesPerBeat, desc) => ({
    kind: 'scale', minFrets: 17,
    desc: `${desc} The pattern runs through every position (block) of the scale, starting on the root block and moving up the neck.`,
    settings: { pattern, notesPerBeat, direction: 'updown', stringSet: 'all', blocks: 'all', winFrom: 0, winTo: 24 },
  });
  const arp = (chord, desc) =>
    ({ kind: 'chord', chord, desc, settings: { pattern: 'linear', notesPerBeat: 2, direction: 'updown', octaves: 2, stringSet: 'all' } });

  // Chord progressions as [numeral, scale degree of the root, triad quality].
  const PROGRESSIONS = {
    'I-IV-V-I':     { name: 'Classic cadence',       mode: 'major', label: 'I – IV – V – I',
      chords: [['I', '1', 'major'], ['IV', '4', 'major'], ['V', '5', 'major'], ['I', '1', 'major']] },
    'I-V-vi-IV':    { name: 'Pop axis',              mode: 'major', label: 'I – V – vi – IV',
      chords: [['I', '1', 'major'], ['V', '5', 'major'], ['vi', '6', 'minor'], ['IV', '4', 'major']] },
    'I-vi-IV-V':    { name: '50s / doo-wop',         mode: 'major', label: 'I – vi – IV – V',
      chords: [['I', '1', 'major'], ['vi', '6', 'minor'], ['IV', '4', 'major'], ['V', '5', 'major']] },
    'vi-IV-I-V':    { name: 'Pop, minor start',      mode: 'major', label: 'vi – IV – I – V',
      chords: [['vi', '6', 'minor'], ['IV', '4', 'major'], ['I', '1', 'major'], ['V', '5', 'major']] },
    'ii-V-I':       { name: 'Jazz ii – V – I',       mode: 'major', label: 'ii – V – I – I',
      chords: [['ii', '2', 'minor'], ['V', '5', 'major'], ['I', '1', 'major'], ['I', '1', 'major']] },
    'I-bVII-IV':    { name: 'Mixolydian rock',       mode: 'major', scale: 'mixolydian', label: 'I – ♭VII – IV – I',
      chords: [['I', '1', 'major'], ['♭VII', 'b7', 'major'], ['IV', '4', 'major'], ['I', '1', 'major']] },
    'blues12':      { name: '12-bar blues',          mode: 'major', scale: 'mixolydian', label: 'I I I I · IV IV I I · V IV I V',
      chords: ['1', '1', '1', '1', '4', '4', '1', '1', '5', '4', '1', '5'].map(d => [{ 1: 'I', 4: 'IV', 5: 'V' }[d], d, 'major']) },
    'I-IV-I-V':     { name: 'Folk / country',        mode: 'major', label: 'I – IV – I – V',
      chords: [['I', '1', 'major'], ['IV', '4', 'major'], ['I', '1', 'major'], ['V', '5', 'major']] },
    'I-iii-IV-V':   { name: 'Rising bass',           mode: 'major', label: 'I – iii – IV – V',
      chords: [['I', '1', 'major'], ['iii', '3', 'minor'], ['IV', '4', 'major'], ['V', '5', 'major']] },
    'I-IV-vi-V':    { name: 'Pop anthem',            mode: 'major', label: 'I – IV – vi – V',
      chords: [['I', '1', 'major'], ['IV', '4', 'major'], ['vi', '6', 'minor'], ['V', '5', 'major']] },
    'I-vi-ii-V':    { name: 'Turnaround',            mode: 'major', label: 'I – vi – ii – V',
      chords: [['I', '1', 'major'], ['vi', '6', 'minor'], ['ii', '2', 'minor'], ['V', '5', 'major']] },
    'circle':       { name: 'Circle of fifths',      mode: 'major', label: 'iii – vi – ii – V – I',
      chords: [['iii', '3', 'minor'], ['vi', '6', 'minor'], ['ii', '2', 'minor'], ['V', '5', 'major'], ['I', '1', 'major']] },
    'canon':        { name: 'Pachelbel\'s Canon',    mode: 'major', label: 'I – V – vi – iii – IV – I – IV – V',
      chords: [['I', '1', 'major'], ['V', '5', 'major'], ['vi', '6', 'minor'], ['iii', '3', 'minor'],
        ['IV', '4', 'major'], ['I', '1', 'major'], ['IV', '4', 'major'], ['V', '5', 'major']] },
    'I-II-IV-I':    { name: 'Lydian lift',           mode: 'major', scale: 'lydian', label: 'I – II – IV – I',
      chords: [['I', '1', 'major'], ['II', '2', 'major'], ['IV', '4', 'major'], ['I', '1', 'major']] },
    'I-bVI-bVII-I': { name: 'Borrowed cadence',      mode: 'major', label: 'I – ♭VI – ♭VII – I',
      chords: [['I', '1', 'major'], ['♭VI', 'b6', 'major'], ['♭VII', 'b7', 'major'], ['I', '1', 'major']] },
    'I-iv-I':       { name: 'Minor plagal',          mode: 'major', label: 'I – IV – iv – I',
      chords: [['I', '1', 'major'], ['IV', '4', 'major'], ['iv', '4', 'minor'], ['I', '1', 'major']] },
    'i-iv-v-i':     { name: 'Natural minor',         mode: 'minor', label: 'i – iv – v – i',
      chords: [['i', '1', 'minor'], ['iv', '4', 'minor'], ['v', '5', 'minor'], ['i', '1', 'minor']] },
    'i-iv-V-i':     { name: 'Harmonic minor cadence', mode: 'minor', label: 'i – iv – V – i',
      chords: [['i', '1', 'minor'], ['iv', '4', 'minor'], ['V', '5', 'major'], ['i', '1', 'minor']] },
    'i-VI-III-VII': { name: 'Epic minor',            mode: 'minor', label: 'i – VI – III – VII',
      chords: [['i', '1', 'minor'], ['VI', 'b6', 'major'], ['III', 'b3', 'major'], ['VII', 'b7', 'major']] },
    'ii-V-i':       { name: 'Minor ii° – V – i',     mode: 'minor', label: 'ii° – V – i – i',
      chords: [['ii°', '2', 'dim'], ['V', '5', 'major'], ['i', '1', 'minor'], ['i', '1', 'minor']] },
    andalusian:     { name: 'Andalusian cadence',    mode: 'minor', label: 'i – VII – VI – V',
      chords: [['i', '1', 'minor'], ['VII', 'b7', 'major'], ['VI', 'b6', 'major'], ['V', '5', 'major']] },
    'i-VII-VI-VII': { name: 'Aeolian rock',          mode: 'minor', label: 'i – VII – VI – VII',
      chords: [['i', '1', 'minor'], ['VII', 'b7', 'major'], ['VI', 'b6', 'major'], ['VII', 'b7', 'major']] },
    'i-iv-VII-III': { name: 'Minor circle',          mode: 'minor', label: 'i – iv – VII – III',
      chords: [['i', '1', 'minor'], ['iv', '4', 'minor'], ['VII', 'b7', 'major'], ['III', 'b3', 'major']] },
    'i-VI-iv-V':    { name: 'Dramatic minor',        mode: 'minor', label: 'i – VI – iv – V',
      chords: [['i', '1', 'minor'], ['VI', 'b6', 'major'], ['iv', '4', 'minor'], ['V', '5', 'major']] },
    'i-III-VII-VI': { name: 'Minor power ballad',    mode: 'minor', label: 'i – III – VII – VI',
      chords: [['i', '1', 'minor'], ['III', 'b3', 'major'], ['VII', 'b7', 'major'], ['VI', 'b6', 'major']] },
    'i-IV':         { name: 'Dorian vamp',           mode: 'minor', scale: 'dorian', label: 'i – IV – i – IV',
      chords: [['i', '1', 'minor'], ['IV', '4', 'major'], ['i', '1', 'minor'], ['IV', '4', 'major']] },
    'i-bII':        { name: 'Phrygian vamp',         mode: 'minor', scale: 'phrygian', label: 'i – ♭II – i – ♭II',
      chords: [['i', '1', 'minor'], ['♭II', 'b2', 'major'], ['i', '1', 'minor'], ['♭II', 'b2', 'major']] },
    'blues12m':     { name: 'Minor blues',           mode: 'minor', label: 'i i i i · iv iv i i · VI V i V',
      chords: [['i', '1', 'minor'], ['i', '1', 'minor'], ['i', '1', 'minor'], ['i', '1', 'minor'],
        ['iv', '4', 'minor'], ['iv', '4', 'minor'], ['i', '1', 'minor'], ['i', '1', 'minor'],
        ['VI', 'b6', 'major'], ['V', '5', 'major'], ['i', '1', 'minor'], ['V', '5', 'major']] },
  };

  // Each exercise applies a set of settings; `randomList` also deals a random key.
  const EXERCISES = {
    'seq-straight': { label: 'Straight up & down', ...seq('linear', 2,
      'Play each position up and down in even eighth notes, locked to the click.') },
    'seq-thirds': { label: 'In thirds', ...seq('thirds', 2,
      'Play the scale in diatonic thirds (1-3, 2-4, 3-5 …) to break up linear runs.') },
    'seq-groups3': { label: 'Groups of 3', ...seq('groups3', 3,
      'Play the scale in groups of three (1-2-3, 2-3-4 …) as triplets, accenting each beat.') },
    'seq-groups4': { label: 'Groups of 4', ...seq('groups4', 4,
      'Play the scale in groups of four (1-2-3-4, 2-3-4-5 …) as sixteenth notes.') },

    'arp-maj7': { label: 'Major 7th', ...arp('maj7', 'Arpeggiate 1-3-5-7 over two octaves. Say the interval names as you play.') },
    'arp-dom7': { label: 'Dominant 7th', ...arp('dom7', 'Arpeggiate 1-3-5-♭7 over two octaves. Listen for the tritone between 3 and ♭7.') },
    'arp-min7': { label: 'Minor 7th', ...arp('min7', 'Arpeggiate 1-♭3-5-♭7 over two octaves.') },
    'arp-m7b5': { label: 'Half-diminished', ...arp('m7b5', 'Arpeggiate 1-♭3-♭5-♭7 over two octaves.') },
    'arp-dim7': { label: 'Diminished 7th', ...arp('dim7', 'Arpeggiate the symmetric 1-♭3-♭5-𝄫7 shape; it repeats every three frets.') },

    'drill-major': {
      label: 'Major scales · new key every 2 bars', kind: 'scale', scale: 'major', randomList: 2,
      desc: 'Press Play. Every two bars a new random major key is dealt — find it on the neck before the next downbeat.',
      settings: { autoMode: 'bars', autoBars: 2, pattern: 'linear', direction: 'updown', octaves: 1, notesPerBeat: 2, stringSet: 'all' },
    },
    'drill-majmin': {
      label: 'Major & minor · new key each pass', kind: 'scale', randomList: 4,
      desc: 'Play each random major or minor scale up and down once; the next key is dealt when the pass ends.',
      settings: { autoMode: 'pass', pattern: 'linear', direction: 'updown', octaves: 1, notesPerBeat: 2, stringSet: 'all' },
    },
    'drill-triads': {
      label: 'Random roots · triads on strings 2-3-4', kind: 'chord', chord: 'major', randomList: 1,
      desc: 'Play every major triad shape on strings 2-3-4 up the neck; a new random root is dealt after each pass.',
      settings: { autoMode: 'pass', stringSet: '2', direction: 'up', notesPerBeat: 3, pattern: 'linear' },
    },
  };

  // Diagonal runs: n notes per string, each string starting further up the neck.
  for (const step of [1, 2]) {
    for (const n of [1, 2, 3, 4]) {
      const label = `${n} note${n > 1 ? 's' : ''} per string`;
      EXERCISES[`diag-${n}-${step}`] = {
        label, title: `Across the strings · ${label}, shift ${step} step${step > 1 ? 's' : ''}`, kind: 'scale',
        minFrets: step === 1 ? 22 : 24,
        desc: `Start on the root on the 6th string and play ${n} scale note${n > 1 ? 's' : ''} on each string. Every new string starts ${step === 1 ? 'one scale step' : 'two scale steps'} further up the neck, so you travel along the fretboard as you cross to the 1st string, then retrace the same path back. One string per beat. The run is repeated from each scale note of the 6th string; use the Positions bar to loop one.`,
        settings: {
          diag: n, diagStep: step, diagStart: 'root', blocks: 'all', direction: 'updown', notesPerBeat: n,
          pattern: 'linear', winFrom: 0, winTo: 24, stringSet: 'all',
        },
      };
    }
  }

  for (const [id, p] of Object.entries(PROGRESSIONS)) {
    EXERCISES[`prog-${id}`] = {
      label: p.label, sub: p.name, title: `${p.name} · ${p.label}`, kind: 'prog', prog: id,
      desc: `Play the triads of the progression on one string set, one chord per bar. Each chord uses the voicing closest to the previous one (voice leading), so the hand barely moves. Positions start the progression from each voicing of the first chord.`,
      settings: { stringSet: '2', progStyle: 'arp4', progVoice: 'lead', notesPerBeat: 1, beatsPerBar: 4, winFrom: 0, winTo: 24 },
    };
  }
  EXERCISES['drill-prog'] = {
    label: 'I – IV – V – I triads · new key each pass', kind: 'prog', prog: 'I-IV-V-I', randomList: 1,
    desc: 'Voice-lead I – IV – V – I on strings 2-3-4; after every pass a random new key is dealt.',
    settings: { stringSet: '2', progStyle: 'arp4', progVoice: 'lead', notesPerBeat: 2, beatsPerBar: 2, autoMode: 'pass', winFrom: 0, winTo: 24 },
  };

  // Melodic lines over a progression: one exercise per style and progression.
  const MELODY_PROGS = {
    targets: ['I-IV-V-I', 'I-V-vi-IV', 'I-vi-IV-V', 'ii-V-I', 'i-iv-V-i', 'andalusian', 'blues12'],
    guide: ['ii-V-I', 'I-vi-ii-V', 'circle', 'ii-V-i', 'blues12', 'canon'],
    arpScale: ['I-IV-V-I', 'I-V-vi-IV', 'i-VI-III-VII', 'I-bVII-IV', 'i-IV'],
    enclose: ['ii-V-I', 'I-vi-ii-V', 'circle', 'i-iv-V-i', 'blues12'],
    motif: ['I-V-vi-IV', 'canon', 'i-VI-III-VII', 'andalusian', 'circle'],
    random: ['I-IV-V-I', 'I-V-vi-IV', 'ii-V-I', 'i-iv-V-i', 'blues12', 'blues12m', 'i-bII'],
  };
  // Exercise id for a line style over a progression; created on demand
  // (routines use pairs that are not listed in the sidebar).
  function melodyExercise(style, id) {
    const key = `mel-${style}-${id}`;
    if (EXERCISES[key]) return key;
    const st = Melody.STYLES[style];
    const p = PROGRESSIONS[id];
    EXERCISES[key] = {
      label: p.label, sub: p.name, title: `${st.label} · ${p.name} (${p.label})`, kind: 'melody', prog: id, minFrets: 17,
      desc: `${st.desc} One chord per bar; the line stays inside one scale position (Positions bar), with the backing chord strummed on each change.`,
      settings: {
        melodyStyle: style, melodyScale: 'key', melodyBacking: true, notesPerBeat: st.notesPerBeat, beatsPerBar: 4, chordBars: 1,
        onlyPlayed: false, labels: 'intervals', blockPick: 0, winFrom: 0, winTo: 24,
      },
    };
    return key;
  }
  for (const [style, ids] of Object.entries(MELODY_PROGS)) ids.forEach(id => melodyExercise(style, id));
  EXERCISES['mel-penta-blues'] = {
    label: 'Pentatonic targets · 12-bar blues', kind: 'melody', prog: 'blues12', minFrets: 17,
    desc: 'Stay in the major pentatonic box, but aim every downbeat at a tone of the current chord. The box never changes; which of its notes are "home" changes with each chord. Watch the large dots move.',
    settings: { melodyStyle: 'targets', melodyScale: 'penta', melodyBacking: true, notesPerBeat: 2, beatsPerBar: 4, chordBars: 1, onlyPlayed: false, labels: 'intervals', blockPick: 0, winFrom: 0, winTo: 24 },
  };
  EXERCISES['mel-penta-minor'] = {
    label: 'Pentatonic targets · minor blues', kind: 'melody', prog: 'blues12m', minFrets: 17,
    desc: 'The minor pentatonic box over a minor blues, landing on a chord tone at every change. Over iv the ♭3 of the key becomes the ♭7 of the chord; over V, aim for the 5th of the key, its root.',
    settings: { melodyStyle: 'targets', melodyScale: 'penta', melodyBacking: true, notesPerBeat: 2, beatsPerBar: 4, chordBars: 1, onlyPlayed: false, labels: 'intervals', blockPick: 0, winFrom: 0, winTo: 24 },
  };
  EXERCISES['drill-melody'] = {
    label: 'Chord-tone targets · I – V – vi – IV · new key each pass', kind: 'melody', prog: 'I-V-vi-IV', randomList: 1, minFrets: 17,
    desc: 'Target chord tones over the pop axis; after every pass a new key is dealt. Find the position and the first target before the downbeat.',
    settings: { melodyStyle: 'targets', melodyScale: 'key', melodyBacking: true, notesPerBeat: 2, beatsPerBar: 4, chordBars: 1, autoMode: 'pass', onlyPlayed: false, labels: 'intervals', blockPick: 0, winFrom: 0, winTo: 24 },
  };

  // Sweep arpeggios over a random chord sequence, one note per string.
  const SWEEP_QUALS = {
    majmin: { label: 'Major & minor', quals: ['major', 'minor'] },
    all: { label: 'Major, minor, dim & aug', quals: ['major', 'minor', 'dim', 'aug'] },
    dimaug: { label: 'Diminished & augmented', quals: ['dim', 'aug'] },
  };
  for (const n of [3, 5]) {
    for (const [q, { label }] of Object.entries(SWEEP_QUALS)) {
      EXERCISES[`sweep-${n}-${q}`] = {
        label, title: `${n}-string sweeps · ${label.toLowerCase()}`, kind: 'sweep', minFrets: 22,
        desc: `Sweep each chord of a random ${label.toLowerCase()} sequence across the top ${n} strings, one note per string, up and back down in sixteenths: one bar per chord. Each chord takes the sweep shape closest to the previous one. Press N or 🎲 for new chords.`,
        settings: { sweepStrings: n, sweepQual: q, progVoice: 'lead', notesPerBeat: 4, beatsPerBar: 4, winFrom: 0, winTo: 24 },
      };
    }
  }
  EXERCISES['drill-sweep'] = {
    label: '5-string sweeps · new chords each pass', kind: 'sweep', minFrets: 22,
    desc: 'Sweep a random sequence of major, minor, diminished and augmented triads across five strings; a new sequence is dealt after every pass.',
    settings: { sweepStrings: 5, sweepQual: 'all', progVoice: 'lead', notesPerBeat: 4, beatsPerBar: 4, autoMode: 'pass', blockPick: 0, winFrom: 0, winTo: 24 },
  };

  for (const q of INVERSION_TRIADS) {
    const name = Theory.CHORDS[q].name.toLowerCase();
    for (const [k, label] of STRING_SETS) {
      EXERCISES[`inv-${q}-${k}`] = {
        label, title: `${Theory.CHORDS[q].name} inversions · ${label.toLowerCase()}`, kind: 'chord', chord: q,
        desc: `Arpeggiate each ${name} shape on ${label.toLowerCase()} — root position, 1st and 2nd inversion — up the neck and back, one shape per beat.`,
        settings: { stringSet: k, direction: 'updown', notesPerBeat: 3, pattern: 'linear' },
      };
    }
  }

  // Chord changes with full open / barre shapes, in fixed keys. Chords are
  // "Root:quality" pairs.
  const ch = str => str.split(' ').map(c => c.split(':'));
  const blues = (i, iv, v) => [i, i, i, i, iv, iv, i, i, v, iv, i, v].join(' ');
  const CHANGES = {
    'G-C-D': { group: 'open', name: 'G – C – D', sub: 'three-chord song', chords: ch('G:major C:major D:major G:major') },
    'G-Em-C-D': { group: 'open', name: 'G – Em – C – D', sub: '50s progression', chords: ch('G:major E:minor C:major D:major') },
    'C-G-Am-F': { group: 'open', name: 'C – G – Am – Fmaj7', sub: 'pop axis, easy F', chords: ch('C:major G:major A:minor F:maj7') },
    'A-D-E': { group: 'open', name: 'A – D – E – A', sub: 'rock & roll', chords: ch('A:major D:major E:major A:major') },
    'Em-C-G-D': { group: 'open', name: 'Em – C – G – D', sub: 'minor pop', chords: ch('E:minor C:major G:major D:major') },
    'Am-Dm-E': { group: 'open', name: 'Am – Dm – E – Am', sub: 'minor cadence', chords: ch('A:minor D:minor E:major A:minor') },
    'D-G-A': { group: 'open', name: 'D – G – A – D', sub: 'folk in D', chords: ch('D:major G:major A:major D:major') },
    'E-blues': { group: 'open', name: 'E7 – A7 – B7', sub: '12-bar blues in E', chords: ch(blues('E:dom7', 'A:dom7', 'B:dom7')) },
    'A-blues': { group: 'open', name: 'A7 – D7 – E7', sub: '12-bar blues in A', chords: ch(blues('A:dom7', 'D:dom7', 'E:dom7')) },
    'jazz-C': { group: 'open', name: 'Dm7 – G7 – Cmaj7', sub: 'ii – V – I with open 7ths', chords: ch('D:min7 G:dom7 C:maj7 C:maj7') },
    'sus-D': { group: 'open', name: 'D – Dsus4 – D – Dsus2', sub: 'sus embellishments', chords: ch('D:major D:sus4 D:major D:sus2') },

    'pair-C-G': { group: 'pairs', name: 'C ↔ G', chords: ch('C:major G:major') },
    'pair-G-D': { group: 'pairs', name: 'G ↔ D', chords: ch('G:major D:major') },
    'pair-A-D': { group: 'pairs', name: 'A ↔ D', chords: ch('A:major D:major') },
    'pair-E-A': { group: 'pairs', name: 'E ↔ A', chords: ch('E:major A:major') },
    'pair-C-Am': { group: 'pairs', name: 'C ↔ Am', chords: ch('C:major A:minor') },
    'pair-Em-C': { group: 'pairs', name: 'Em ↔ C', chords: ch('E:minor C:major') },
    'pair-D-Em': { group: 'pairs', name: 'D ↔ Em', chords: ch('D:major E:minor') },
    'pair-Am-E': { group: 'pairs', name: 'Am ↔ E', chords: ch('A:minor E:major') },
    'pair-G-Em': { group: 'pairs', name: 'G ↔ Em', chords: ch('G:major E:minor') },
    'pair-D-A': { group: 'pairs', name: 'D ↔ A', chords: ch('D:major A:major') },

    'F-Bb-C': { group: 'barre', name: 'F – B♭ – C – F', sub: 'first barre chords', chords: ch('F:major Bb:major C:major F:major') },
    'C-Am-F-G': { group: 'barre', name: 'C – Am – F – G', sub: 'with a full F barre', chords: ch('C:major A:minor F:major G:major') },
    'Bm-G-D-A': { group: 'barre', name: 'Bm – G – D – A', sub: 'B minor barre', chords: ch('B:minor G:major D:major A:major') },
    'F#m-D-A-E': { group: 'barre', name: 'F♯m – D – A – E', sub: 'minor barre on the 6th string', chords: ch('F#:minor D:major A:major E:major') },
    'Cm-Fm-Gm': { group: 'barre', name: 'Cm – Fm – Gm – Cm', sub: 'all minor barres', chords: ch('C:minor F:minor G:minor C:minor') },
    'Ab-Bb-Cm': { group: 'barre', name: 'A♭ – B♭ – Cm', sub: 'epic rock', chords: ch('Ab:major Bb:major C:minor C:minor') },
    'G-blues-barre': { group: 'barre', name: 'G7 – C7 – D7', sub: '12-bar blues, barre 7ths', chords: ch(blues('G:dom7', 'C:dom7', 'D:dom7')) },
    'jazz-Bb': { group: 'barre', name: 'Cm7 – F7 – B♭maj7', sub: 'ii – V – I with barre 7ths', chords: ch('C:min7 F:dom7 Bb:maj7 Bb:maj7') },
  };
  const CHANGE_GROUPS = [
    ['open', 'Open chords', 0], ['pairs', 'One-minute changes', 0], ['barre', 'Barre chords', -1],
  ];
  for (const [id, c] of Object.entries(CHANGES)) {
    const [, groupLabel, blockPick] = CHANGE_GROUPS.find(g => g[0] === c.group);
    const pair = c.group === 'pairs';
    EXERCISES[`chg-${id}`] = {
      label: c.name, sub: c.sub, title: `${groupLabel} · ${c.name}`, kind: 'changes', changes: id,
      desc: pair
        ? 'Switch between the two chords, strumming on every beat and changing on the downbeat. Keep the strum going even if the new chord is not ready, and count how many clean changes you make in a minute. Lift all fingers together and look for a finger that can stay or slide.'
        : `Strum each chord on every beat, one bar per chord, and land the change exactly on beat 1. ${c.group === 'barre' ? 'Positions: open-position voicings first, then the same changes as barre chords starting from an E-shape or an A-shape; each next chord uses the closest barre.' : 'Watch the shape for the next chord and prepare it during beat 4.'}`,
      settings: { progVoice: 'full', progStyle: 'strum', notesPerBeat: 1, beatsPerBar: 4, chordBars: 1, blockPick, winFrom: 0, winTo: 24 },
    };
  }

  // CAGED views: what is shown and played inside each of the five shapes.
  const CAGED_VIEWS = {};
  for (const quality of ['major', 'minor']) {
    const Q = quality === 'major' ? 'Major' : 'Minor';
    Object.assign(CAGED_VIEWS, {
      [`${quality}:chord`]: { quality, view: 'chord', title: `${Q} chord shapes` },
      [`${quality}:arp`]: { quality, view: 'arp', title: `${Q} arpeggios` },
      [`${quality}:scale`]: { quality, view: 'scale', title: `${quality === 'major' ? 'Major' : 'Natural minor'} scale positions` },
      [`${quality}:penta`]: { quality, view: 'penta', title: `${Q} pentatonic positions` },
      [`${quality}:combo`]: { quality, view: 'combo', title: `${Q} chord → arpeggio → scale` },
    });
  }
  const cagedEx = (caged, label, desc, settings = {}) => ({
    label, title: `CAGED · ${label}`, kind: 'caged', caged, desc, minFrets: 15,
    settings: { direction: 'updown', pattern: 'linear', notesPerBeat: 2, chordBars: 1, winFrom: 0, winTo: 24, ...settings },
  });
  Object.assign(EXERCISES, {
    'caged-tour-major': cagedEx('major:chord', 'Major shapes tour',
      'Strum the chord in each CAGED shape for one bar, moving up the neck: C → A → G → E → D shape (starting from whichever is lowest in the key). Say the shape name as you change.', { notesPerBeat: 1 }),
    'caged-tour-minor': cagedEx('minor:chord', 'Minor shapes tour',
      'The same tour with the minor versions of the five shapes.', { notesPerBeat: 1 }),
    'caged-arp-major': cagedEx('major:arp', 'Major arpeggios in every shape',
      'Arpeggiate the chord tones under each shape, up and down, then move to the next shape up the neck. Aim for the roots: they anchor every shape.'),
    'caged-arp-minor': cagedEx('minor:arp', 'Minor arpeggios in every shape',
      'Arpeggiate the minor chord tones under each shape, up and down, moving up the neck.'),
    'caged-scale-major': cagedEx('major:scale', 'Major scale in every shape',
      'Play the major scale position that surrounds each chord shape. The chord tones you just strummed are inside every position, so the scale is “the chord plus the notes in between”.'),
    'caged-penta-minor': cagedEx('minor:penta', 'Minor pentatonic in every shape',
      'The five minor-pentatonic boxes, each built around a CAGED minor shape. Connect the boxes as you move up the neck.'),
    'caged-combo-major': cagedEx('major:combo', 'Chord → arpeggio → scale (major)',
      'In each shape: strum the chord for a bar, arpeggiate it, then play the scale position around it, before moving to the next shape. This links chord, arpeggio and scale in one hand position.'),
    'caged-combo-minor': cagedEx('minor:combo', 'Chord → arpeggio → scale (minor)',
      'Strum, arpeggiate and play the natural-minor position in each minor shape, moving up the neck.'),
    'caged-drill-chord': cagedEx('major:chord', 'Random key · strum all five shapes',
      'A random key is dealt after every pass: find and strum the five shapes of the new chord up the neck.', { notesPerBeat: 1, autoMode: 'pass' }),
    'caged-drill-arp': cagedEx('major:arp', 'Random key · arpeggios in all five shapes',
      'A random key is dealt after every pass: arpeggiate the new chord in all five shapes.', { autoMode: 'pass' }),
  });
  EXERCISES['caged-drill-chord'].randomList = 1;
  EXERCISES['caged-drill-arp'].randomList = 1;

  // Bend trainer presets, applied to the trainer card (not the fretboard).
  const BEND_PRESETS = {
    half: { label: 'Half-step bends', settings: { semis: 1, mode: 'hold' } },
    whole: { label: 'Whole-step bends', settings: { semis: 2, mode: 'hold' } },
    big: { label: '1½-step bends', settings: { semis: 3, mode: 'hold' } },
    scale: { label: 'Bend to the next scale note', settings: { semis: 0, mode: 'hold' } },
    release: { label: 'Bend & release', settings: { semis: 2, mode: 'release' } },
    pre: { label: 'Pre-bend & release', settings: { semis: 2, mode: 'pre' } },
  };

  const exLeaf = id => ({ id: `ex:${id}`, label: EXERCISES[id].label, sub: EXERCISES[id].sub, action: { type: 'exercise', id } });
  const itemLeaf = (prefix, kind, id, label) => ({ id: `${prefix}/${id}`, label, action: { type: 'item', kind, id } });

  function tree() {
    return [
      {
        id: 'routines', label: 'Daily routines', icon: '⏱',
        children: Routines.BUDGETS.map(min => ({
          id: `routines/${min}`, label: Routines.label(min), sub: Routines.summary(min), action: { type: 'routine', id: String(min) },
        })),
      },
      {
        id: 'scales', label: 'Scales', icon: '♪',
        children: Theory.SCALE_GROUPS.map(g => ({
          id: `scales/${g.label}`, label: g.label,
          children: g.items.map(id => itemLeaf(`scales/${g.label}`, 'scale', id, Theory.SCALES[id].name)),
        })),
      },
      {
        id: 'chords', label: 'Chords', icon: '♬',
        children: Theory.CHORD_GROUPS.slice(1).map(g => ({
          id: `chords/${g.label}`, label: g.label,
          children: g.items.map(id => itemLeaf(`chords/${g.label}`, 'chord', id, Theory.CHORDS[id].name)),
        })),
      },
      {
        id: 'triads', label: 'Triads', icon: '△',
        children: TRIADS.map(id => ({
          id: `triads/${id}`, label: Theory.CHORDS[id].name,
          action: { type: 'item', kind: 'chord', id, stringSet: 'all' },
          children: STRING_SETS.map(([k, label]) => ({
            id: `triads/${id}/${k}`, label, action: { type: 'item', kind: 'chord', id, stringSet: k },
          })),
        })),
      },
      {
        id: 'caged', label: 'CAGED', icon: '◇',
        children: ['major', 'minor'].map(q => ({
          id: `caged/${q}`, label: q === 'major' ? 'Major' : 'Minor',
          children: Object.keys(CAGED_VIEWS).filter(id => CAGED_VIEWS[id].quality === q)
            .map(id => itemLeaf(`caged/${q}`, 'caged', id, CAGED_VIEWS[id].title)),
        })),
      },
      {
        id: 'exercises', label: 'Exercises', icon: '⚑',
        children: [
          { id: 'ex/seq', label: 'Scale sequences', children: ['seq-straight', 'seq-thirds', 'seq-groups3', 'seq-groups4'].map(exLeaf) },
          {
            id: 'ex/diag', label: 'Across the strings',
            children: [1, 2].map(step => ({
              id: `ex/diag/${step}`, label: step === 1 ? 'Shift 1 step per string' : 'Shift 2 steps per string',
              children: [1, 2, 3, 4].map(n => exLeaf(`diag-${n}-${step}`)),
            })),
          },
          { id: 'ex/arp', label: 'Arpeggios', children: ['arp-maj7', 'arp-dom7', 'arp-min7', 'arp-m7b5', 'arp-dim7'].map(exLeaf) },
          {
            id: 'ex/inv', label: 'Triad inversions',
            children: INVERSION_TRIADS.map(q => ({
              id: `ex/inv/${q}`, label: `${Theory.CHORDS[q].name}s`,
              children: STRING_SETS.map(([k]) => exLeaf(`inv-${q}-${k}`)),
            })),
          },
          {
            id: 'ex/prog', label: 'Triad progressions',
            children: ['major', 'minor'].map(mode => ({
              id: `ex/prog/${mode}`, label: mode === 'major' ? 'Major keys' : 'Minor keys',
              children: Object.keys(PROGRESSIONS).filter(id => PROGRESSIONS[id].mode === mode).map(id => exLeaf(`prog-${id}`)),
            })),
          },
          {
            id: 'ex/melody', label: 'Melody over changes',
            children: [
              ...Object.entries(MELODY_PROGS).map(([style, ids]) => ({
                id: `ex/melody/${style}`, label: Melody.STYLES[style].label,
                children: ids.map(id => exLeaf(`mel-${style}-${id}`)),
              })),
              { id: 'ex/melody/penta', label: 'Pentatonic over changes', children: ['mel-penta-blues', 'mel-penta-minor'].map(exLeaf) },
            ],
          },
          {
            id: 'ex/sweep', label: 'Sweep arpeggios',
            children: [3, 5].map(n => ({
              id: `ex/sweep/${n}`, label: `${n}-string sweeps`,
              children: Object.keys(SWEEP_QUALS).map(q => exLeaf(`sweep-${n}-${q}`)),
            })),
          },
          {
            id: 'ex/caged', label: 'CAGED',
            children: ['caged-tour-major', 'caged-tour-minor', 'caged-arp-major', 'caged-arp-minor', 'caged-scale-major',
              'caged-penta-minor', 'caged-combo-major', 'caged-combo-minor', 'caged-drill-chord', 'caged-drill-arp'].map(exLeaf),
          },
          {
            id: 'ex/changes', label: 'Chord changes',
            children: CHANGE_GROUPS.map(([g, label]) => ({
              id: `ex/changes/${g}`, label,
              children: Object.keys(CHANGES).filter(id => CHANGES[id].group === g).map(id => exLeaf(`chg-${id}`)),
            })),
          },
          {
            id: 'ex/bend', label: 'Bend trainer',
            children: Object.entries(BEND_PRESETS).map(([id, p]) => ({
              id: `ex/bend/${id}`, label: p.label, action: { type: 'tool', id: 'bend', preset: id },
            })),
          },
          { id: 'ex/drill', label: 'Random key drills', children: ['drill-major', 'drill-majmin', 'drill-triads', 'drill-prog', 'drill-sweep', 'drill-melody'].map(exLeaf) },
        ],
      },
    ];
  }

  // Identity of a tree action, compared against the app's current state.
  function keyOf(a) {
    if (a.type === 'exercise') return `ex:${a.id}`;
    if (a.type === 'tool') return `tool:${a.id}:${a.preset}`;
    if (a.type === 'routine') return `routine:${a.id}`;
    const triad = a.kind === 'chord' && Theory.isTriad(a.id);
    return `${a.kind}:${a.id}${triad ? '@' + (a.stringSet ?? 'all') : ''}`;
  }

  return { melodyExercise, EXERCISES, PROGRESSIONS, SWEEP_QUALS, BEND_PRESETS, CHANGES, CAGED_VIEWS, tree, keyOf };
})();
