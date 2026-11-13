'use strict';

// Full chord shapes for standard tuning: open chords plus the movable
// E-shape (root on the 6th string) and A-shape (root on the 5th) barres.
// Frets are listed from the 6th string to the 1st; null = muted string.
const Shapes = (() => {
  const STANDARD = [40, 45, 50, 55, 59, 64];

  const OPEN = {
    'C:major': [null, 3, 2, 0, 1, 0], 'A:major': [null, 0, 2, 2, 2, 0], 'G:major': [3, 2, 0, 0, 0, 3],
    'E:major': [0, 2, 2, 1, 0, 0], 'D:major': [null, null, 0, 2, 3, 2],
    'A:minor': [null, 0, 2, 2, 1, 0], 'E:minor': [0, 2, 2, 0, 0, 0], 'D:minor': [null, null, 0, 2, 3, 1],
    'C:dom7': [null, 3, 2, 3, 1, 0], 'A:dom7': [null, 0, 2, 0, 2, 0], 'G:dom7': [3, 2, 0, 0, 0, 1],
    'E:dom7': [0, 2, 0, 1, 0, 0], 'D:dom7': [null, null, 0, 2, 1, 2], 'B:dom7': [null, 2, 1, 2, 0, 2],
    'A:min7': [null, 0, 2, 0, 1, 0], 'E:min7': [0, 2, 0, 0, 0, 0], 'D:min7': [null, null, 0, 2, 1, 1],
    'C:maj7': [null, 3, 2, 0, 0, 0], 'A:maj7': [null, 0, 2, 1, 2, 0], 'D:maj7': [null, null, 0, 2, 2, 2],
    'F:maj7': [null, null, 3, 2, 1, 0], 'G:maj7': [3, 2, 0, 0, 0, 2], 'E:maj7': [0, 2, 1, 1, 0, 0],
    'A:sus2': [null, 0, 2, 2, 0, 0], 'A:sus4': [null, 0, 2, 2, 3, 0], 'D:sus2': [null, null, 0, 2, 3, 0],
    'D:sus4': [null, null, 0, 2, 3, 3], 'E:sus4': [0, 2, 2, 2, 0, 0],
  };

  // Offsets from the root fret.
  const MOVABLE = {
    E: {
      major: [0, 2, 2, 1, 0, 0], minor: [0, 2, 2, 0, 0, 0], dom7: [0, 2, 0, 1, 0, 0], min7: [0, 2, 0, 0, 0, 0],
      maj7: [0, null, 1, 1, 0, null], aug: [0, 3, 2, 1, 1, 0], dim: [0, 1, 2, 0, null, null],
      sus4: [0, 2, 2, 2, 0, 0], m7b5: [0, null, 0, 0, -1, null],
    },
    A: {
      major: [null, 0, 2, 2, 2, 0], minor: [null, 0, 2, 2, 1, 0], dom7: [null, 0, 2, 0, 2, 0], min7: [null, 0, 2, 0, 1, 0],
      maj7: [null, 0, 2, 1, 2, 0], aug: [null, 0, 3, 2, 2, null], dim: [null, 0, 1, 2, 1, null],
      sus2: [null, 0, 2, 2, 0, 0], sus4: [null, 0, 2, 2, 3, 0], m7b5: [null, 0, 1, 0, 1, null],
    },
  };

  // CAGED: the five open-chord shapes moved up the neck. Each is anchored on
  // the root on string `ref` (0 = 6th string); offsets from that root fret.
  const CAGED = {
    major: {
      C: [1, [null, 0, -1, -3, -2, -3]], A: [1, [null, 0, 2, 2, 2, 0]], G: [0, [0, -1, -3, -3, -3, 0]],
      E: [0, [0, 2, 2, 1, 0, 0]], D: [2, [null, null, 0, 2, 3, 2]],
    },
    minor: {
      C: [1, [null, 0, -2, -3, -2, null]], A: [1, [null, 0, 2, 2, 1, 0]], G: [0, [0, -2, -3, -3, 0, 0]],
      E: [0, [0, 2, 2, 0, 0, 0]], D: [2, [null, null, 0, 2, 3, 1]],
    },
  };

  // The five major-scale positions found in most guitar books, written in
  // G major (frets from the 6th string to the 1st) and named after the CAGED
  // shape of the tonic chord they surround. Every diatonic mode uses the
  // positions of its parent major scale.
  const SCALE_PATTERNS = {
    E: [[2, 3, 5], [2, 3, 5], [2, 4, 5], [2, 4, 5], [3, 5], [2, 3, 5]],
    D: [[5, 7, 8], [5, 7], [4, 5, 7], [4, 5, 7], [5, 7, 8], [5, 7, 8]],
    C: [[7, 8, 10], [7, 9, 10], [7, 9, 10], [7, 9], [7, 8, 10], [7, 8, 10]],
    A: [[10, 12], [9, 10, 12], [9, 10, 12], [9, 11, 12], [10, 12, 13], [10, 12]],
    G: [[12, 14, 15], [12, 14, 15], [12, 14], [11, 12, 14], [12, 13, 15], [12, 14, 15]],
  };
  const MAJOR = [0, 2, 4, 5, 7, 9, 11];

  // Book positions for a diatonic scale (any mode) given its pitch classes,
  // lowest on the neck first; null if the notes are not a major-scale mode.
  function scalePatterns(pcs, maxFret) {
    const set = new Set(pcs);
    if (set.size !== 7) return null;
    const tonic = [...Array(12).keys()].find(t => MAJOR.every(i => set.has((t + i) % 12)));
    if (tonic === undefined) return null;
    const shift = (tonic - 7 + 12) % 12;
    const out = [];
    for (const [letter, strings] of Object.entries(SCALE_PATTERNS)) {
      for (const base of [shift - 12, shift, shift + 12]) {
        const pts = strings.flatMap((fs, s) => fs.map(f => ({ s, f: f + base, midi: STANDARD[s] + f + base })));
        const frets = pts.map(p => p.f);
        if (Math.min(...frets) < 0 || Math.max(...frets) > maxFret) continue;
        out.push({ letter, pts, lo: Math.min(...frets), hi: Math.max(...frets) });
      }
    }
    return out.sort((a, b) => a.lo - b.lo);
  }

  // The five CAGED shapes of a major or minor chord, lowest on the neck
  // first, each placed at the first position where it fits (no negative frets).
  function caged(notes, quality, maxFret) {
    const out = [];
    for (const [letter, [ref, offs]] of Object.entries(CAGED[quality])) {
      let r = (notes[0].pc - STANDARD[ref] + 12) % 12;
      while (Math.min(...offs.filter(o => o !== null)) + r < 0) r += 12;
      const frets = offs.map(o => (o === null ? null : o + r));
      if (Math.max(...frets.filter(f => f !== null)) > maxFret) continue;
      const v = build(frets, notes, 'caged', `${letter} shape`);
      if (!v) continue;
      const used = frets.filter(f => f !== null);
      out.push({ ...v, letter, rootFret: r, lo: Math.min(...used), hi: Math.max(...used) });
    }
    return out.sort((a, b) => a.lo - b.lo || a.hi - b.hi);
  }

  const isStandard = tun => tun.length === 6 && tun.every((m, i) => m === STANDARD[i]);

  // Turn a fret list into points, checking every note belongs to the chord.
  function build(frets, notes, kind, name) {
    const byPc = new Map(notes.map(n => [n.pc, n]));
    const pts = [];
    for (let s = 0; s < 6; s++) {
      const f = frets[s];
      if (f === null) continue;
      if (f < 0) return null;
      const midi = STANDARD[s] + f;
      const note = byPc.get(midi % 12);
      if (!note) return null;
      pts.push({ s, f, midi, note });
    }
    if (new Set(pts.map(p => p.midi % 12)).size < Math.min(3, notes.length)) return null;
    const fretted = pts.map(p => p.f).filter(f => f > 0);
    return {
      pts, kind, name, frets,
      inv: Math.max(0, notes.indexOf(pts[0].note)),
      minF: fretted.length ? Math.min(...fretted) : 0,
      maxF: Math.max(0, ...fretted),
    };
  }

  // Every shape for the chord up to fret `maxFret`: the open shape (if any)
  // and the E- and A-shape barres at each octave.
  function forChord(rootName, quality, notes, maxFret) {
    const out = [];
    const key = `${rootName.replace('♯', '#').replace('♭', 'b')}:${quality}`;
    const pc = notes[0].pc;
    // Enharmonic open shapes (e.g. "A#" never has one, but "A" does).
    const open = OPEN[key];
    if (open) {
      const v = build(open, notes, 'open', 'open');
      if (v) out.push(v);
    }
    for (const [shape, string] of [['E', 0], ['A', 1]]) {
      const offs = MOVABLE[shape][quality];
      if (!offs) continue;
      for (let r = (pc - STANDARD[string] + 12) % 12; r <= maxFret; r += 12) {
        if (r === 0 && open) continue; // same as the open shape
        const frets = offs.map(o => (o === null ? null : o + r));
        if (Math.max(...frets.filter(f => f !== null)) > maxFret) continue;
        const v = build(frets, notes, shape, r === 0 ? `${shape}-shape, open` : `${shape}-shape, fret ${r}`);
        if (v) out.push(v);
      }
    }
    return out;
  }

  return { forChord, caged, scalePatterns, isStandard };
})();
