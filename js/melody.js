'use strict';

// Melodic lines over a chord progression. Pure pitch logic: given, for each
// chord, the scale pitches available in one fret position and the chord's
// target pitch classes, build a line that lands on chord tones at the changes
// and moves through the scale in between. Positions on the neck are assigned
// by the caller.
const Melody = (() => {
  const STYLES = {
    targets: { label: 'Chord-tone targets', notesPerBeat: 2,
      desc: 'Land on a chord tone on beat 1 of every chord, then walk the scale stepwise so the line arrives on the nearest chord tone of the next chord exactly on its downbeat. When the run has time to spare it passes the target and turns back, so targets are approached from above and below.' },
    guide: { label: 'Guide tones (3rds & 7ths)', notesPerBeat: 1,
      desc: 'Only the 3rd and 7th of each chord, the notes that define its quality, on beats 1 and 3 (the 7th is the one the key scale gives the chord, even when only the triad is strummed); here the large dots mark these guide tones. Each note moves to the nearest guide tone of the next chord, usually by a half or whole step: this slow line is the skeleton of every melodic solo over changes.' },
    arpScale: { label: 'Arpeggio → scale', notesPerBeat: 2,
      desc: 'Arpeggiate the chord for the first half of the bar, then use the scale to connect the last arpeggio note to a chord tone of the next chord. Hear how the arpeggio states the harmony and the scale run creates motion toward the change.' },
    enclose: { label: 'Enclosures', notesPerBeat: 2,
      desc: 'Every chord tone on a downbeat is approached from the scale note above and the chromatic note a half step below, a bebop "enclosure". The tension of surrounding the target makes the landing sound intentional.' },
    motif: { label: 'Motif through the changes', notesPerBeat: 2,
      desc: 'A short four-note motif on beats 1–2, then rest. The motif keeps its shape in scale steps but starts on the nearest chord tone of each chord, so it bends to fit the harmony. Leaving space is part of phrasing. Press N for another motif.' },
    random: { label: 'Improvised phrases', notesPerBeat: 2,
      desc: 'A new random phrase over the changes: chord tones on the downbeats, scale steps and the occasional skip in between, with rests for breathing. Learn it, then press N for another. Sing a phrase before you play it.' },
  };

  const MOTIFS = [[0, 1, 2, 0], [0, -1, 0, 2], [2, 1, 0, -2], [0, 2, 1, -1], [0, 1, -1, 0], [4, 2, 1, 0]];

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const nearest = (list, m) => list.reduce((a, b) => (Math.abs(b - m) < Math.abs(a - m) ? b : a));
  const uniqSorted = list => [...new Set(list)].sort((a, b) => a - b);

  // A chord's walking pool, with the pitches `extra` added; any pool pitch a
  // half step from an added one is dropped (e.g. the leading tone of the
  // coming V replaces the ♭7 just before the change).
  function withPitches(pool, extra) {
    const foreign = extra.filter(x => !pool.includes(x));
    if (!foreign.length) return pool;
    return uniqSorted([...pool.filter(m => !foreign.some(x => Math.abs(x - m) === 1)), ...foreign]);
  }

  // n notes from a, such that the next note would be b, moving through pool by
  // scale steps (one skip of a third when the parity needs it). Spare moves
  // overshoot the target and turn back, or turn away first when there is no
  // room past the target.
  function walk(pool, a, b, n, flip = false) {
    const p = withPitches(pool, [a, b]);
    const ia = p.indexOf(a);
    const ib = p.indexOf(b);
    const top = p.length - 1;
    const mid = top / 2;
    let need = ib - ia;
    let left = n;
    let dir = Math.sign(need) || (ia < mid ? 1 : -1);
    const moves = [];
    if (Math.abs(need) > left) {
      // Too far for steps alone: skip thirds until it fits.
      let skips = Math.abs(need) - left;
      while (left > 0) { const s = skips-- > 0 ? 2 : 1; moves.push(s * dir); left--; }
    } else {
      if ((left - Math.abs(need)) % 2) {
        moves.push(2 * dir);
        need -= 2 * dir;
        left--;
        dir = Math.sign(need) || dir;
      }
      const k = (left - Math.abs(need)) / 2;
      const past = ib + dir * k;
      const away = ia - dir * k;
      const canPast = past >= 0 && past <= top;
      const canAway = away >= 0 && away <= top;
      const overshoot = canPast && (!canAway || !flip);
      const straight = Array(Math.abs(need)).fill(dir);
      if (overshoot || !canAway) moves.push(...straight, ...Array(k).fill(dir), ...Array(k).fill(-dir));
      else moves.push(...Array(k).fill(-dir), ...Array(k).fill(dir), ...straight);
    }
    const out = [a];
    let i = ia;
    for (const mv of moves.slice(0, n - 1)) {
      i = Math.max(0, Math.min(top, i + mv));
      out.push(p[i]);
    }
    return out;
  }

  // Chord tone of `pool` (pitch classes `tones`) to land on from `from`,
  // reachable in `reach` scale steps: the nearest, avoiding a repeat, kept
  // near the middle of the position.
  function target(pool, tones, from, reach, r, center) {
    let cands = pool.filter(m => tones.has(m % 12));
    if (!cands.length) cands = pool;
    const close = cands.filter(m => Math.abs(m - from) <= reach * 2);
    if (close.length) cands = close;
    const cost = m => Math.abs(m - from) + (m === from ? 2.5 : 0) + 0.12 * Math.abs(m - center) + (r ? r() * 3 : 0);
    return cands.reduce((a, b) => (cost(b) < cost(a) ? b : a));
  }

  // Scale pitch `steps` scale steps from m in pool.
  function stepFrom(pool, m, steps) {
    const p = withPitches(pool, [m]);
    const i = Math.max(0, Math.min(p.length - 1, p.indexOf(m) + steps));
    return p[i];
  }

  // chords: [{ pool: sorted midis, tones: Set(pc), guide: Set(pc) }]
  // opts: { style, steps (per chord), beat (steps per beat), seed }
  // Returns, per chord, an array of `steps` midis (null = rest).
  function generate(chords, { style, steps: n, beat, seed }) {
    const r = style === 'random' ? rng(seed) : null;
    const all = uniqSorted(chords.flatMap(c => c.pool));
    const center = (all[0] + all.at(-1)) / 2;
    const rest = () => Array(n).fill(null);

    if (style === 'guide') {
      // Guide tones on beat 1 and the middle of the bar, voice-led.
      let prev = center;
      return chords.map(c => {
        const cands = c.pool.filter(m => c.guide.has(m % 12));
        const line = rest();
        if (!cands.length) return line;
        const hits = [0];
        if (n >= 2 * beat && (n / beat) % 2 === 0) hits.push(n / 2);
        hits.forEach((at, j) => {
          const list = j ? cands.filter(m => m % 12 !== line[0] % 12) : cands;
          const m = nearest(list.length ? list : cands, prev + (prev < center ? 0.4 : -0.4));
          line[at] = m;
          prev = m;
        });
        return line;
      });
    }

    if (style === 'motif') {
      const shape = MOTIFS[Math.abs(seed) % MOTIFS.length];
      let prev = center;
      return chords.map(c => {
        const start = target(c.pool, c.tones, prev, 3, null, center);
        prev = start;
        const len = Math.min(shape.length, Math.max(1, Math.floor(n / 2)));
        const line = rest();
        for (let j = 0; j < len; j++) line[j] = stepFrom(c.pool, start, shape[j] - shape[0]);
        return line;
      });
    }

    // Target-based styles: a chain of chord tones, one per chord, joined by
    // scale runs. The last chord leads back to the first target so the line loops.
    const head = (c, t) => {
      if (style !== 'arpScale') return [t];
      const tones = c.pool.filter(m => c.tones.has(m % 12));
      const len = Math.max(1, Math.floor(n / 2));
      const up = tones.filter(m => m >= t);
      const down = tones.filter(m => m <= t).reverse();
      return (up.length >= len || up.length >= down.length ? up : down).slice(0, len);
    };
    const tail = style === 'enclose' && n >= 4 ? 2 : 0;
    const first = target(chords[0].pool, chords[0].tones, center, n, r, center);
    const targets = [first];
    const lines = [];
    chords.forEach((c, i) => {
      const t = targets[i];
      const hd = head(c, t);
      const from = hd.at(-1);
      const left = n - hd.length + 1; // moves left, counting `from` as the first note
      const nc = chords[(i + 1) % chords.length];
      const last = i === chords.length - 1;
      const next = last ? first : target(nc.pool, nc.tones, from, left - tail, r, center);
      if (!last) targets.push(next);
      let line;
      if (tail) {
        const above = stepFrom(withPitches(c.pool, [next]), next, 1);
        line = [...hd.slice(0, -1), ...walk(c.pool, from, above, left - tail, r && r() < 0.5), above, next - 1];
      } else {
        line = [...hd.slice(0, -1), ...walk(c.pool, from, next, left, r ? r() < 0.5 : i % 2 === 1)];
      }
      line = line.slice(0, n);
      while (line.length < n) line.push(null);
      if (r) {
        // Breathe: drop some off-beat notes, never the first of the bar.
        for (let j = 1; j < n; j++) if (j % beat && r() < 0.28) line[j] = null;
        if (r() < 0.3) for (let j = Math.max(1, n - beat); j < n; j++) line[j] = null;
      }
      lines.push(line);
    });
    return lines;
  }

  return { STYLES, generate };
})();
