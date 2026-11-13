'use strict';

// SVG fretboard renderer.
const Fretboard = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  // Indexed by scale-degree number - 1.
  const DEGREE_COLORS = ['#ef4444', '#f59e0b', '#facc15', '#22c55e', '#06b6d4', '#818cf8', '#e879f9'];
  const SINGLE_INLAYS = [3, 5, 7, 9, 15, 17, 19, 21];
  const DOUBLE_INLAYS = [12, 24];

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  function luminance(hex) {
    const h = hex.replace('#', '');
    const [r, g, b] = [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16));
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }
  const inkFor = hex => (luminance(hex) > 0.6 ? '#111' : '#fff');

  // o: { tuning, frets, notes, labels, colorMode, leftHanded, winFrom, winTo,
  //      board?, strings? (Set of string indexes to show), shapes?,
  //      only? (Set of "string:fret" keys; hides every other note),
  //      accent? (Set of pitch classes drawn full size; the rest are smaller) }
  function render(svg, o) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const c = {
      bg: cssVar('--panel'), board: cssVar('--board'), fret: cssVar('--fret'),
      string: cssVar('--string'), nut: cssVar('--nut'), inlay: cssVar('--inlay'),
      text: cssVar('--muted'), strong: cssVar('--text'), mono: cssVar('--mono'),
      root: cssVar('--accent'), ring: cssVar('--root-ring'), win: cssVar('--window'),
    };
    if (o.board) {
      // Custom board colour: keep inlays visible against light or dark wood.
      c.board = o.board;
      c.inlay = luminance(o.board) > 0.5 ? 'rgba(40, 28, 16, 0.35)' : 'rgba(240, 232, 215, 0.55)';
    }

    const nS = o.tuning.length;
    const gap = 32, top = 36, labelW = 26, openW = 70, nutW = 7, R = 12.5;
    const xs = [openW + nutW];
    for (let f = 1; f <= o.frets; f++) xs[f] = xs[f - 1] + 70 * Math.pow(0.968, f - 1);
    const W = xs[o.frets] + 16;
    const bottom = top + (nS - 1) * gap;
    const H = bottom + 50;

    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('font-family', 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif');
    svg.style.minWidth = `${Math.min(W, o.frets * 46)}px`;

    const mx = x => (o.leftHanded ? W - x : x);
    const span = (x1, x2) => ({ x: Math.min(mx(x1), mx(x2)), width: Math.abs(mx(x2) - mx(x1)) });
    const yS = s => top + (nS - 1 - s) * gap;
    const noteX = f => (f === 0 ? (labelW + openW) / 2 + 2 : (xs[f - 1] + xs[f]) / 2);
    const midY = (top + bottom) / 2;

    el('rect', { x: 0, y: 0, width: W, height: H, fill: c.bg }, svg);
    el('rect', { ...span(openW, xs[o.frets]), y: top - 16, height: bottom - top + 32, fill: c.board, rx: 3 }, svg);

    // Position window highlight.
    const winTo = Math.min(o.winTo, o.frets);
    if (o.winFrom > 0 || winTo < o.frets) {
      const x1 = o.winFrom === 0 ? labelW : xs[o.winFrom - 1];
      el('rect', { ...span(x1, xs[winTo]), y: top - 22, height: bottom - top + 44, fill: c.win, rx: 6 }, svg);
    }

    for (const f of SINGLE_INLAYS) {
      if (f <= o.frets) el('circle', { cx: mx(noteX(f)), cy: midY, r: 7, fill: c.inlay }, svg);
    }
    for (const f of DOUBLE_INLAYS) {
      if (f > o.frets) continue;
      el('circle', { cx: mx(noteX(f)), cy: top + (bottom - top) * 0.25, r: 7, fill: c.inlay }, svg);
      el('circle', { cx: mx(noteX(f)), cy: top + (bottom - top) * 0.75, r: 7, fill: c.inlay }, svg);
    }

    for (let f = 1; f <= o.frets; f++) {
      el('line', { x1: mx(xs[f]), x2: mx(xs[f]), y1: top - 16, y2: bottom + 16, stroke: c.fret, 'stroke-width': 3 }, svg);
      const marked = SINGLE_INLAYS.includes(f) || DOUBLE_INLAYS.includes(f);
      el('text', {
        x: mx(noteX(f)), y: bottom + 38, 'text-anchor': 'middle', 'font-size': 12,
        fill: marked ? c.strong : c.text, 'font-weight': marked ? 700 : 400,
      }, svg).textContent = f;
    }
    el('rect', { ...span(openW, openW + nutW), y: top - 16, height: bottom - top + 32, fill: c.nut }, svg);

    for (let s = 0; s < nS; s++) {
      const y = yS(s);
      el('line', {
        x1: mx(openW), x2: mx(xs[o.frets]), y1: y, y2: y,
        stroke: c.string, 'stroke-width': 0.8 + (nS - 1 - s) * 0.32 + (nS - s > 3 ? 0.3 : 0),
      }, svg);
      const open = o.tuning[s];
      el('text', {
        x: mx(labelW / 2), y, 'text-anchor': 'middle', 'dominant-baseline': 'central',
        'font-size': 11, fill: c.text,
      }, svg).textContent = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'][open % 12];
    }

    // Chord shapes (e.g. triad inversions): connect their notes and label them.
    for (const sh of o.shapes || []) {
      const pts = sh.pts.map(p => [mx(noteX(p.f)), yS(p.s)]);
      el('polyline', {
        points: pts.map(p => p.join(',')).join(' '), fill: 'none', stroke: c.root,
        'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: sh.inWin ? 0.6 : 0.15,
      }, svg);
      const xs2 = pts.map(p => p[0]);
      el('text', {
        x: (Math.min(...xs2) + Math.max(...xs2)) / 2, y: Math.min(...pts.map(p => p[1])) - 21,
        'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, fill: c.strong, opacity: sh.inWin ? 1 : 0.35,
      }, svg).textContent = sh.label;
    }

    const byPc = new Map(o.notes.map(n => [n.pc, n]));
    for (let s = 0; s < nS; s++) {
      if (o.strings && !o.strings.has(s)) continue;
      for (let f = 0; f <= o.frets; f++) {
        if (o.only && !o.only.has(`${s}:${f}`)) continue;
        const midi = o.tuning[s] + f;
        const n = byPc.get(midi % 12);
        if (!n) continue;
        const inWin = f >= o.winFrom && f <= o.winTo;
        const isRoot = n.index === 0;
        const minor = o.accent && !o.accent.has(n.pc);
        const r = minor ? R * 0.68 : R;
        const fill = o.colorMode === 'color'
          ? DEGREE_COLORS[(n.num - 1) % 7]
          : (isRoot ? c.root : c.mono);
        const g = el('g', {
          class: 'note' + (inWin ? '' : ' dim') + (isRoot ? ' root' : '') + (minor ? ' passing' : ''),
          'data-midi': midi, 'data-s': s, 'data-f': f,
          transform: `translate(${mx(noteX(f))},${yS(s)})`,
          opacity: inWin ? (minor ? 0.8 : 1) : 0.22,
        }, svg);
        el('circle', { class: 'halo', r: r + 6, fill: 'none', stroke: c.strong, 'stroke-width': 3, opacity: 0 }, g);
        el('circle', {
          r, fill,
          stroke: isRoot ? c.ring : 'rgba(0,0,0,.35)',
          'stroke-width': isRoot ? 2.5 : 1,
        }, g);
        let label = '';
        if (o.labels === 'notes') label = n.name;
        else if (o.labels === 'intervals') label = n.interval;
        else if (o.labels === 'roman') label = n.roman;
        else if (o.labels === 'octave') label = n.name + Theory.midiOctave(midi);
        if (label) {
          el('text', {
            'text-anchor': 'middle', 'dominant-baseline': 'central', 'pointer-events': 'none',
            'font-size': (label.length > 2 ? 9.5 : 11.5) * (minor ? 0.78 : 1), 'font-weight': 700, fill: inkFor(fill),
          }, g).textContent = label;
        }
      }
    }
  }

  // Small diagram of one chord shape on three adjacent strings.
  // pts: [{ f, note }] ordered from the lowest string to the highest.
  function miniShape(pts) {
    const c = { string: cssVar('--muted'), fret: cssVar('--border'), text: cssVar('--muted'), nut: cssVar('--text') };
    const fs = pts.map(p => p.f);
    const lo = Math.min(...fs);
    const base = lo === 0 ? 0 : lo;
    const cells = Math.max(4, Math.max(...fs) - base + 1);
    const cw = 22, gap = 16, padL = 34, padT = 10;
    const W = padL + cells * cw + 6;
    const H = padT + 2 * gap + 10;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: 'mini-svg', 'font-family': 'system-ui, sans-serif' });
    const y = r => padT + (2 - r) * gap;
    for (let r = 0; r < 3; r++) el('line', { x1: padL, x2: padL + cells * cw, y1: y(r), y2: y(r), stroke: c.string, 'stroke-width': 1 }, svg);
    for (let i = 0; i <= cells; i++) {
      const nut = base === 0 && i === 1;
      if (base === 0 && i === 0) continue;
      el('line', { x1: padL + i * cw, x2: padL + i * cw, y1: y(2), y2: y(0), stroke: nut ? c.nut : c.fret, 'stroke-width': nut ? 3 : 1.5 }, svg);
    }
    el('text', { x: padL - 6, y: y(1), 'text-anchor': 'end', 'dominant-baseline': 'central', 'font-size': 10, fill: c.text },
      svg).textContent = base === 0 ? 'open' : `${base}fr`;
    pts.forEach((p, r) => {
      const fill = DEGREE_COLORS[(p.note.num - 1) % 7];
      const g = el('g', { transform: `translate(${padL + (p.f - base + 0.5) * cw},${y(r)})` }, svg);
      el('circle', { r: 7.5, fill, stroke: 'rgba(0,0,0,.35)' }, g);
      el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 8, 'font-weight': 700, fill: inkFor(fill) },
        g).textContent = p.note.index === 0 ? 'R' : p.note.interval;
    });
    return svg;
  }

  // Classic vertical chord diagram. v: { frets (6th → 1st string, null =
  // muted), pts: [{ s, f, note }] }.
  function chordBox(v, title) {
    const c = { line: cssVar('--muted'), text: cssVar('--text'), muted: cssVar('--muted'), nut: cssVar('--text') };
    const n = v.frets.length;
    const fretted = v.frets.filter(f => f !== null && f > 0);
    const hi = Math.max(0, ...fretted);
    const base = hi <= 4 ? 1 : Math.min(...fretted);
    const rows = Math.max(4, hi - base + 1);
    const sw = 16, fh = 20, padL = 22, padT = 34;
    const W = padL + (n - 1) * sw + 16;
    const H = padT + rows * fh + 8;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: 'chord-box', 'font-family': 'system-ui, sans-serif' });
    el('text', { x: padL + (n - 1) * sw / 2, y: 12, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: c.text }, svg).textContent = title;
    const x = s => padL + s * sw;
    for (let s = 0; s < n; s++) el('line', { x1: x(s), x2: x(s), y1: padT, y2: padT + rows * fh, stroke: c.line, 'stroke-width': 1 }, svg);
    for (let r = 0; r <= rows; r++) {
      const nut = r === 0 && base === 1;
      el('line', { x1: x(0), x2: x(n - 1), y1: padT + r * fh, y2: padT + r * fh, stroke: nut ? c.nut : c.line, 'stroke-width': nut ? 4 : 1 }, svg);
    }
    if (base > 1) el('text', { x: padL - 6, y: padT + fh / 2, 'text-anchor': 'end', 'dominant-baseline': 'central', 'font-size': 10, fill: c.muted }, svg).textContent = `${base}fr`;
    // Barre: the lowest fret shared by the outer strings of an E/A shape.
    const lowest = fretted.length ? Math.min(...fretted) : 0;
    const onLow = v.frets.map((f, s) => (f === lowest ? s : -1)).filter(s => s >= 0);
    if (lowest > 0 && onLow.length >= 3 && v.kind !== 'open') {
      const y = padT + (lowest - base + 0.5) * fh;
      el('line', { x1: x(onLow[0]), x2: x(onLow.at(-1)), y1: y, y2: y, stroke: c.text, 'stroke-width': 11, 'stroke-linecap': 'round', opacity: 0.35 }, svg);
    }
    v.frets.forEach((f, s) => {
      if (f === null || f === 0) {
        el('text', { x: x(s), y: padT - 7, 'text-anchor': 'middle', 'font-size': 10, fill: c.muted }, svg).textContent = f === null ? '×' : '○';
        return;
      }
      const p = v.pts.find(q => q.s === s);
      const fill = p ? DEGREE_COLORS[(p.note.num - 1) % 7] : c.text;
      const g = el('g', { transform: `translate(${x(s)},${padT + (f - base + 0.5) * fh})` }, svg);
      el('circle', { r: 7, fill, stroke: 'rgba(0,0,0,.35)' }, g);
      if (p) {
        el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 7.5, 'font-weight': 700, fill: inkFor(fill) },
          g).textContent = p.note.index === 0 ? 'R' : p.note.interval;
      }
    });
    return svg;
  }

  function exportPNG(svg, title, filename) {
    const clone = svg.cloneNode(true);
    const vb = svg.viewBox.baseVal;
    clone.setAttribute('xmlns', NS);
    clone.setAttribute('width', vb.width);
    clone.setAttribute('height', vb.height);
    clone.removeAttribute('style');
    clone.querySelectorAll('.halo').forEach(h => h.remove());
    el('text', { x: 10, y: 15, 'font-size': 13, 'font-weight': 700, fill: cssVar('--text') }, clone).textContent = title;

    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = vb.width * scale;
      canvas.height = vb.height * scale;
      const g = canvas.getContext('2d');
      g.scale(scale, scale);
      g.drawImage(img, 0, 0);
      canvas.toBlob(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      });
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
  }

  return { render, miniShape, chordBox, exportPNG, DEGREE_COLORS };
})();
