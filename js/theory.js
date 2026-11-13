'use strict';

// Music theory helpers: note spelling, scales, tunings.
const Theory = (() => {
  const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
  const DEGREE_SEMIS = [0, 2, 4, 5, 7, 9, 11];
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  const ACC = { '-2': '𝄫', '-1': '♭', '0': '', '1': '♯', '2': '𝄪' };

  const mod = (n, m) => ((n % m) + m) % m;

  // Degrees are written relative to the major scale; the number decides the
  // letter, so spelling is always correct (e.g. G# harmonic minor gets F𝄪).
  const SCALES = {
    major:            { name: 'Major (Ionian)',        short: 'Major',            degrees: ['1', '2', '3', '4', '5', '6', '7'] },
    naturalMinor:     { name: 'Natural Minor (Aeolian)', short: 'Minor',          degrees: ['1', '2', 'b3', '4', '5', 'b6', 'b7'] },
    harmonicMinor:    { name: 'Harmonic Minor',        short: 'Harmonic Minor',   degrees: ['1', '2', 'b3', '4', '5', 'b6', '7'] },
    melodicMinor:     { name: 'Melodic Minor',         short: 'Melodic Minor',    degrees: ['1', '2', 'b3', '4', '5', '6', '7'] },
    majorPentatonic:  { name: 'Major Pentatonic',      short: 'Major Pentatonic', degrees: ['1', '2', '3', '5', '6'] },
    minorPentatonic:  { name: 'Minor Pentatonic',      short: 'Minor Pentatonic', degrees: ['1', 'b3', '4', '5', 'b7'] },
    blues:            { name: 'Blues (minor)',         short: 'Blues',            degrees: ['1', 'b3', '4', 'b5', '5', 'b7'] },
    majorBlues:       { name: 'Major Blues',           short: 'Major Blues',      degrees: ['1', '2', 'b3', '3', '5', '6'] },
    dorian:           { name: 'Dorian',                short: 'Dorian',           degrees: ['1', '2', 'b3', '4', '5', '6', 'b7'] },
    phrygian:         { name: 'Phrygian',              short: 'Phrygian',         degrees: ['1', 'b2', 'b3', '4', '5', 'b6', 'b7'] },
    lydian:           { name: 'Lydian',                short: 'Lydian',           degrees: ['1', '2', '3', '#4', '5', '6', '7'] },
    mixolydian:       { name: 'Mixolydian',            short: 'Mixolydian',       degrees: ['1', '2', '3', '4', '5', '6', 'b7'] },
    locrian:          { name: 'Locrian',               short: 'Locrian',          degrees: ['1', 'b2', 'b3', '4', 'b5', 'b6', 'b7'] },
    harmonicMajor:    { name: 'Harmonic Major',        short: 'Harmonic Major',   degrees: ['1', '2', '3', '4', '5', 'b6', '7'] },
    phrygianDominant: { name: 'Phrygian Dominant',     short: 'Phrygian Dominant', degrees: ['1', 'b2', '3', '4', '5', 'b6', 'b7'] },
    lydianDominant:   { name: 'Lydian Dominant',       short: 'Lydian Dominant',  degrees: ['1', '2', '3', '#4', '5', '6', 'b7'] },
    altered:          { name: 'Altered (Super Locrian)', short: 'Altered',        degrees: ['1', 'b2', '#2', '3', 'b5', '#5', 'b7'] },
    hungarianMinor:   { name: 'Hungarian Minor',       short: 'Hungarian Minor',  degrees: ['1', '2', 'b3', '#4', '5', 'b6', '7'] },
    wholeTone:        { name: 'Whole Tone',            short: 'Whole Tone',       degrees: ['1', '2', '3', '#4', '#5', 'b7'] },
    diminishedHW:     { name: 'Diminished (half-whole)', short: 'Diminished H-W', degrees: ['1', 'b2', '#2', '3', '#4', '5', '6', 'b7'] },
    diminishedWH:     { name: 'Diminished (whole-half)', short: 'Diminished W-H', degrees: ['1', '2', 'b3', '4', 'b5', '#5', '6', '7'] },
  };
  const SCALE_ORDER = Object.keys(SCALES);

  const SCALE_GROUPS = [
    { label: 'Diatonic modes', items: ['major', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'naturalMinor', 'locrian'] },
    { label: 'Minor scales', items: ['naturalMinor', 'harmonicMinor', 'melodicMinor'] },
    { label: 'Pentatonic & blues', items: ['majorPentatonic', 'minorPentatonic', 'blues', 'majorBlues'] },
    { label: 'Harmonic & melodic modes', items: ['harmonicMajor', 'phrygianDominant', 'lydianDominant', 'altered', 'hungarianMinor'] },
    { label: 'Symmetric', items: ['wholeTone', 'diminishedHW', 'diminishedWH'] },
  ];

  const CHORDS = {
    major:    { name: 'Major triad',        symbol: '',        degrees: ['1', '3', '5'] },
    minor:    { name: 'Minor triad',        symbol: 'm',       degrees: ['1', 'b3', '5'] },
    dim:      { name: 'Diminished triad',   symbol: '°',       degrees: ['1', 'b3', 'b5'] },
    aug:      { name: 'Augmented triad',    symbol: '+',       degrees: ['1', '3', '#5'] },
    sus2:     { name: 'Sus2 triad',         symbol: 'sus2',    degrees: ['1', '2', '5'] },
    sus4:     { name: 'Sus4 triad',         symbol: 'sus4',    degrees: ['1', '4', '5'] },
    maj7:     { name: 'Major 7th',          symbol: 'maj7',    degrees: ['1', '3', '5', '7'] },
    dom7:     { name: 'Dominant 7th',       symbol: '7',       degrees: ['1', '3', '5', 'b7'] },
    min7:     { name: 'Minor 7th',          symbol: 'm7',      degrees: ['1', 'b3', '5', 'b7'] },
    m7b5:     { name: 'Half-diminished',    symbol: 'm7♭5',    degrees: ['1', 'b3', 'b5', 'b7'] },
    dim7:     { name: 'Diminished 7th',     symbol: '°7',      degrees: ['1', 'b3', 'b5', 'bb7'] },
    mMaj7:    { name: 'Minor-major 7th',    symbol: 'm(maj7)', degrees: ['1', 'b3', '5', '7'] },
    aug7:     { name: 'Augmented 7th',      symbol: '+7',      degrees: ['1', '3', '#5', 'b7'] },
    sus7:     { name: 'Dominant 7sus4',     symbol: '7sus4',   degrees: ['1', '4', '5', 'b7'] },
    six:      { name: 'Major 6th',          symbol: '6',       degrees: ['1', '3', '5', '6'] },
    m6:       { name: 'Minor 6th',          symbol: 'm6',      degrees: ['1', 'b3', '5', '6'] },
    add9:     { name: 'Add 9',              symbol: 'add9',    degrees: ['1', '3', '5', '9'] },
    madd9:    { name: 'Minor add 9',        symbol: 'm(add9)', degrees: ['1', 'b3', '5', '9'] },
    sixNine:  { name: '6/9',                symbol: '6/9',     degrees: ['1', '3', '5', '6', '9'] },
    dom9:     { name: 'Dominant 9th',       symbol: '9',       degrees: ['1', '3', '5', 'b7', '9'] },
    maj9:     { name: 'Major 9th',          symbol: 'maj9',    degrees: ['1', '3', '5', '7', '9'] },
    min9:     { name: 'Minor 9th',          symbol: 'm9',      degrees: ['1', 'b3', '5', 'b7', '9'] },
    dom7b9:   { name: '7♭9',                symbol: '7♭9',     degrees: ['1', '3', '5', 'b7', 'b9'] },
    dom7s9:   { name: '7♯9 (Hendrix)',      symbol: '7♯9',     degrees: ['1', '3', '5', 'b7', '#9'] },
    min11:    { name: 'Minor 11th',         symbol: 'm11',     degrees: ['1', 'b3', '5', 'b7', '9', '11'] },
    dom13:    { name: 'Dominant 13th',      symbol: '13',      degrees: ['1', '3', '5', 'b7', '9', '13'] },
  };

  const CHORD_GROUPS = [
    { label: 'Triads', items: ['major', 'minor', 'dim', 'aug', 'sus2', 'sus4'] },
    { label: 'Seventh chords', items: ['maj7', 'dom7', 'min7', 'm7b5', 'dim7', 'mMaj7', 'aug7', 'sus7'] },
    { label: 'Sixth & added-tone', items: ['six', 'm6', 'add9', 'madd9', 'sixNine'] },
    { label: 'Extended & altered', items: ['dom9', 'maj9', 'min9', 'dom7b9', 'dom7s9', 'min11', 'dom13'] },
  ];

  const KEYS = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B', 'Cb'];

  // MIDI note numbers, lowest string first.
  const TUNINGS = {
    standard:     { name: 'Standard (E A D G B E)',      notes: [40, 45, 50, 55, 59, 64] },
    halfDown:     { name: 'Half step down (E♭)',          notes: [39, 44, 49, 54, 58, 63] },
    fullDown:     { name: 'Full step down (D)',           notes: [38, 43, 48, 53, 57, 62] },
    dropD:        { name: 'Drop D (D A D G B E)',         notes: [38, 45, 50, 55, 59, 64] },
    doubleDropD:  { name: 'Double drop D (D A D G B D)',  notes: [38, 45, 50, 55, 59, 62] },
    dropCs:       { name: 'Drop C♯',                      notes: [37, 44, 49, 54, 58, 63] },
    dropC:        { name: 'Drop C',                       notes: [36, 43, 48, 53, 57, 62] },
    dropB:        { name: 'Drop B',                       notes: [35, 42, 47, 52, 56, 61] },
    dropA:        { name: 'Drop A',                       notes: [33, 40, 45, 50, 54, 59] },
    dadgad:       { name: 'DADGAD (D modal)',             notes: [38, 45, 50, 55, 57, 62] },
    gModal:       { name: 'G modal (D G D G C D)',        notes: [38, 43, 50, 55, 60, 62] },
    openC:        { name: 'Open C (C G C G C E)',         notes: [36, 43, 48, 55, 60, 64] },
    openD:        { name: 'Open D (D A D F♯ A D)',        notes: [38, 45, 50, 54, 57, 62] },
    openDm:       { name: 'Open Dm (D A D F A D)',        notes: [38, 45, 50, 53, 57, 62] },
    openE:        { name: 'Open E (E B E G♯ B E)',        notes: [40, 47, 52, 56, 59, 64] },
    openEm:       { name: 'Open Em (E B E G B E)',        notes: [40, 47, 52, 55, 59, 64] },
    openG:        { name: 'Open G (D G D G B D)',         notes: [38, 43, 50, 55, 59, 62] },
    openA:        { name: 'Open A (E A E A C♯ E)',        notes: [40, 45, 52, 57, 61, 64] },
    openAm:       { name: 'Open Am (E A E A C E)',        notes: [40, 45, 52, 57, 60, 64] },
    allFourths:   { name: 'All fourths (E A D G C F)',    notes: [40, 45, 50, 55, 60, 65] },
    nst:          { name: 'New Standard (C G D A E G)',   notes: [36, 43, 50, 57, 64, 67] },
    sevenString:  { name: '7-string (B E A D G B E)',     notes: [35, 40, 45, 50, 55, 59, 64] },
    bass4:        { name: 'Bass 4-string (E A D G)',      notes: [28, 33, 38, 43] },
    bass5:        { name: 'Bass 5-string (B E A D G)',    notes: [23, 28, 33, 38, 43] },
  };

  function parseNote(name) {
    const li = LETTERS.indexOf(name[0].toUpperCase());
    let acc = 0;
    for (const ch of name.slice(1)) acc += (ch === '#' || ch === '♯') ? 1 : -1;
    return { li, acc, pc: mod(LETTER_PC[li] + acc, 12) };
  }

  function parseDegree(d) {
    const m = /^([b#]*)(\d+)$/.exec(d);
    let acc = 0;
    for (const ch of m[1]) acc += ch === '#' ? 1 : -1;
    const num = Number(m[2]);
    return { num, acc, semis: DEGREE_SEMIS[(num - 1) % 7] + 12 * Math.floor((num - 1) / 7) + acc };
  }

  const accStr = a => ACC[a] ?? (a > 0 ? '♯'.repeat(a) : '♭'.repeat(-a));
  const pretty = name => name[0] + name.slice(1).replace(/#/g, '♯').replace(/b/g, '♭');

  function pcName(pc, flats) {
    const sharp = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
    const flat = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
    return (flats ? flat : sharp)[pc];
  }

  function spell(root, degree) {
    const r = parseNote(root);
    const d = parseDegree(degree);
    const li = (r.li + d.num - 1) % 7;
    const pc = mod(r.pc + d.semis, 12);
    let acc = pc - LETTER_PC[li];
    if (acc > 6) acc -= 12;
    if (acc < -6) acc += 12;
    if (Math.abs(acc) > 2) return { name: pcName(pc, r.acc < 0), pc };
    return { name: LETTERS[li] + accStr(acc), pc };
  }

  // Root name (ASCII, e.g. "F#", "Bb") of the chord built on a scale degree.
  function degreeRoot(root, degree) {
    const r = parseNote(root);
    const d = parseDegree(degree);
    const li = (r.li + d.num - 1) % 7;
    let acc = mod(r.pc + d.semis, 12) - LETTER_PC[li];
    if (acc > 6) acc -= 12;
    if (acc < -6) acc += 12;
    return LETTERS[li] + (acc > 0 ? '#'.repeat(acc) : 'b'.repeat(-acc));
  }

  // Spell a list of degrees from a root. `simplify` avoids 𝄪/𝄫, used for
  // non-heptatonic scales which have no strict one-letter-per-degree rule.
  function notesFor(root, degrees, simplify) {
    const r = parseNote(root);
    const preferFlats = r.acc < 0 || root === 'F';
    return degrees.map((deg, index) => {
      const p = parseDegree(deg);
      const s = spell(root, deg);
      if (simplify && /[𝄪𝄫]/u.test(s.name)) s.name = pcName(s.pc, preferFlats);
      return {
        index,
        degree: deg,
        num: p.num,
        semis: p.semis,
        pc: s.pc,
        name: s.name,
        interval: accStr(p.acc) + p.num,
        roman: accStr(p.acc) + ROMAN[(p.num - 1) % 7],
      };
    });
  }

  const scaleNotes = (root, id) => notesFor(root, SCALES[id].degrees, SCALES[id].degrees.length !== 7);
  const chordNotes = (root, id) => notesFor(root, CHORDS[id].degrees, false);

  // The key scale adjusted to fit a chord: each chord tone replaces the scale
  // note with the same letter (V in minor turns ♭7 into 7 → harmonic minor;
  // ♭VII in major turns 7 into ♭7 → Mixolydian). Chord tones whose letter is
  // missing (pentatonic scales) are added only with `addMissing`.
  function chordScale(scale, chord, addMissing = true) {
    const letter = n => n.name[0];
    const out = scale.map(n => chord.find(c => letter(c) === letter(n)) ?? n);
    if (addMissing) for (const c of chord) if (!out.some(n => n.pc === c.pc)) out.push(c);
    return out.filter((n, i, a) => a.findIndex(x => x.pc === n.pc) === i);
  }

  // Re-label spelled notes as intervals from another root (the chord's), root
  // first: in C major over Am, C becomes the ♭3.
  function relabel(notes, root) {
    const r = parseNote(root);
    return notes.map(n => {
      const li = LETTERS.indexOf(n.name[0]);
      const num = mod(li - r.li, 7) + 1;
      const semis = mod(n.pc - r.pc, 12);
      let acc = semis - DEGREE_SEMIS[num - 1];
      if (acc > 6) acc -= 12;
      if (acc < -6) acc += 12;
      return {
        ...n, num, semis, degree: (acc > 0 ? '#'.repeat(acc) : 'b'.repeat(-acc)) + num,
        interval: accStr(acc) + num, roman: accStr(acc) + ROMAN[num - 1],
      };
    }).sort((a, b) => a.semis - b.semis).map((n, index) => ({ ...n, index: n.semis === 0 ? 0 : index || 1 }));
  }

  return {
    SCALES, SCALE_ORDER, SCALE_GROUPS, CHORDS, CHORD_GROUPS, KEYS, TUNINGS,
    mod, pretty, parseNote, scaleNotes, chordNotes, degreeRoot, chordScale, relabel,
    isTriad: id => CHORDS[id].degrees.length === 3,
    rootPc: root => parseNote(root).pc,
    midiFreq: m => 440 * Math.pow(2, (m - 69) / 12),
    midiOctave: m => Math.floor(m / 12) - 1,
  };
})();
