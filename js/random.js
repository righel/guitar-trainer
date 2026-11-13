'use strict';

// Random Scale Machine: non-repeating shuffled decks of keys/scales.
const RandomMachine = (() => {
  const MAJ15 = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'];
  const MIN15 = ['A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#', 'D', 'G', 'C', 'F', 'Bb', 'Eb', 'Ab'];
  const MAJ12 = MAJ15.filter(k => !['C#', 'Gb', 'Cb'].includes(k));
  const MIN12 = MIN15.filter(k => !['D#', 'A#', 'Ab'].includes(k));
  const NAMES12 = [['C', 'C'], ['C♯/D♭', 'Db'], ['D', 'D'], ['E♭', 'Eb'], ['E', 'E'], ['F', 'F'],
    ['F♯/G♭', 'F#'], ['G', 'G'], ['A♭', 'Ab'], ['A', 'A'], ['B♭', 'Bb'], ['B', 'B']];

  const entries = (roots, scale) => roots.map(root => ({ root, scale }));
  const MODES = [
    { id: 1, title: '12 key names', desc: 'Roots only — keeps the scale chosen above', merge: false,
      build: () => NAMES12.map(([label, root]) => ({ root, scale: null, label })) },
    { id: 2, title: 'Major keys', merge: true,
      build: m => entries(m ? MAJ12 : MAJ15, 'major') },
    { id: 3, title: 'Minor keys', desc: 'Natural minor', merge: true,
      build: m => entries(m ? MIN12 : MIN15, 'naturalMinor') },
    { id: 4, title: 'Major & minor keys', merge: true,
      build: m => [...MODES[1].build(m), ...MODES[2].build(m)] },
    { id: 5, title: 'Major, harmonic & melodic minor', merge: true,
      build: m => [...MODES[1].build(m), ...entries(m ? MIN12 : MIN15, 'harmonicMinor'),
        ...entries(m ? MIN12 : MIN15, 'melodicMinor')] },
  ];
  const CUSTOM_MAIN = ['major', 'harmonicMinor', 'melodicMinor', 'naturalMinor'];

  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };

  const merge = load('gst.merge', { 2: false, 3: false, 4: false, 5: false });
  const saves = load('gst.saves', [null, null, null, null, null, null]);
  const decks = {};
  const history = [];
  let selected = new Set();
  let locked = false;
  let active = null;
  let lastKey = null;
  let opts = {};
  let root;

  const keyOf = e => `${e.scale}|${e.root}`;
  const labelOf = e => e.label ?? `${Theory.pretty(e.root)} ${e.scale ? Theory.SCALES[e.scale].short : ''}`.trim();
  const titleOf = id => (id === 6 ? 'Custom selection' : MODES[id - 1].title);

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function rootsFor(scaleId) {
    const list = Theory.SCALES[scaleId].degrees.includes('3') ? MAJ15 : MIN15;
    return list.map(r => Theory.parseNote(r))
      .map((p, i) => ({ name: list[i], ...p }))
      .sort((a, b) => a.pc - b.pc || b.acc - a.acc)
      .map(p => p.name);
  }

  function itemsFor(id) {
    if (id === 6) return [...selected].map(k => { const [scale, r] = k.split('|'); return { root: r, scale }; });
    return MODES[id - 1].build(!!merge[id]);
  }

  function go(id) {
    if (id === 6) {
      if (!selected.size) { opts.toast?.('Select at least one key in the custom grid first'); return null; }
      if (!locked) setLocked(true);
    }
    let d = decks[id];
    if (!d || d.pos >= d.order.length) {
      d = decks[id] = { order: shuffle(itemsFor(id)), pos: 0 };
      if (d.order.length > 1 && keyOf(d.order[0]) === lastKey) {
        const j = 1 + Math.floor(Math.random() * (d.order.length - 1));
        [d.order[0], d.order[j]] = [d.order[j], d.order[0]];
      }
    }
    const item = d.order[d.pos++];
    active = id;
    lastKey = keyOf(item);
    history.unshift(labelOf(item));
    history.length = Math.min(history.length, 12);
    refresh();
    opts.onPick?.(item, { mode: id, title: titleOf(id), pos: d.pos, total: d.order.length });
    return item;
  }

  const next = () => go(active ?? 4);

  function resetDeck(id) {
    delete decks[id];
    refresh();
  }

  function setLocked(v) {
    locked = v;
    delete decks[6];
    refresh();
  }

  // ---------- UI ----------
  function counterText(id) {
    const d = decks[id];
    const total = d ? d.order.length : itemsFor(id).length;
    if (d && d.pos >= d.order.length) return `<span class="done">Completed ✓</span> ${d.pos} of ${total}`;
    return `${d ? d.pos : 0} of ${total}`;
  }

  function modeRow(m) {
    const row = h('div', { class: 'mode-row' + (active === m.id ? ' active' : '') },
      h('button', { class: 'go', title: `Go (key ${m.id})`, onclick: () => go(m.id) }, 'Go ', h('kbd', {}, String(m.id))),
      h('div', { class: 'mode-info' },
        h('div', { class: 'mode-title' }, m.title),
        h('div', { class: 'mode-desc' }, m.desc ?? '')),
      m.merge
        ? h('label', { class: 'merge', title: 'Consolidate enharmonic keys (e.g. F♯/G♭)' },
          h('input', { type: 'checkbox', checked: !!merge[m.id], onchange: e => {
            merge[m.id] = e.target.checked; store('gst.merge', merge); resetDeck(m.id);
          } }), ' Merge enharmonics')
        : h('span'),
      h('div', { class: 'counter' }),
      h('button', { class: 'icon', title: 'Start a new list', onclick: () => resetDeck(m.id) }, '↻'));
    row.querySelector('.counter').innerHTML = counterText(m.id);
    return row;
  }

  function customRow(scaleId) {
    const keys = rootsFor(scaleId).map(r => {
      const k = `${scaleId}|${r}`;
      const natural = r.length === 1;
      return h('button', {
        class: 'kbtn ' + (natural ? 'nat' : 'acc') + (selected.has(k) ? ' sel' : ''),
        disabled: locked && !selected.has(k),
        onclick: () => {
          if (locked) return;
          selected.has(k) ? selected.delete(k) : selected.add(k);
          delete decks[6];
          refresh();
        },
      }, Theory.pretty(r));
    });
    return h('div', { class: 'crow' },
      h('button', {
        class: 'crow-label', disabled: locked, title: 'Toggle whole row',
        onclick: () => {
          const ks = rootsFor(scaleId).map(r => `${scaleId}|${r}`);
          const all = ks.every(k => selected.has(k));
          ks.forEach(k => (all ? selected.delete(k) : selected.add(k)));
          delete decks[6];
          refresh();
        },
      }, Theory.SCALES[scaleId].short),
      h('div', { class: 'ckeys' }, ...keys));
  }

  let moreOpen = false;
  let saving = false;

  function render() {
    root.innerHTML = '';
    root.append(h('div', { class: 'modes' }, ...MODES.map(modeRow)));

    const custom = h('div', { class: 'custom' + (locked ? ' locked' : '') + (active === 6 ? ' active' : '') });
    custom.append(h('div', { class: 'custom-head' },
      h('div', { class: 'mode-title' }, 'Custom selection ', h('span', { class: 'muted' }, `· ${selected.size} selected`)),
      h('div', { class: 'counter' })));
    custom.querySelector('.counter').innerHTML = counterText(6);
    custom.append(...CUSTOM_MAIN.map(customRow));
    const more = h('details', { open: moreOpen, ontoggle: e => { moreOpen = e.target.open; } },
      h('summary', {}, 'More scales & modes'),
      ...Theory.SCALE_ORDER.filter(s => !CUSTOM_MAIN.includes(s)).map(customRow));
    custom.append(more);

    custom.append(h('div', { class: 'custom-actions' },
      h('button', { class: 'go', onclick: () => go(6) }, 'Go ', h('kbd', {}, '6')),
      h('button', { onclick: () => setLocked(!locked), disabled: !selected.size && !locked }, locked ? '🔓 Unlock' : '🔒 Lock'),
      h('button', { disabled: locked, onclick: () => { selected = new Set(); delete decks[6]; refresh(); } }, 'Clear'),
      h('button', { class: 'icon', title: 'Start a new list', onclick: () => resetDeck(6) }, '↻'),
      h('button', { disabled: !selected.size, onclick: () => { saving = !saving; refresh(); } }, saving ? 'Cancel save' : '💾 Save…')));

    if (saving) {
      custom.append(h('div', { class: 'save-pick' }, 'Save this selection to slot: ',
        ...saves.map((s, i) => h('button', {
          class: 'slot' + (s ? ' filled' : ''),
          onclick: () => { saves[i] = [...selected]; store('gst.saves', saves); saving = false; refresh(); opts.toast?.(`Saved to slot ${i + 1}`); },
        }, String(i + 1)))));
    }

    custom.append(h('div', { class: 'saves' },
      h('span', { class: 'muted' }, 'Saved selections: '),
      ...saves.map((s, i) => h('button', {
        class: 'slot' + (s ? ' filled' : ''), disabled: !s,
        title: s ? `${s.length} keys — click to load` : 'Empty',
        onclick: () => { selected = new Set(s); locked = false; delete decks[6]; refresh(); },
      }, String(i + 1))),
      saves.some(Boolean)
        ? h('button', { class: 'linkish', onclick: () => {
          if (!confirm('Clear all saved selections?')) return;
          saves.fill(null); store('gst.saves', saves); refresh();
        } }, 'Clear all')
        : null));
    root.append(custom);

    root.append(h('div', { class: 'history' },
      h('span', { class: 'muted' }, 'Recent: '),
      ...(history.length ? history.map((l, i) => h('span', { class: 'hchip' + (i === 0 ? ' latest' : '') }, l)) : [h('span', { class: 'muted' }, '—')])));
  }

  const refresh = () => root && render();

  // ---------- Stopwatch ----------
  function initTimer(display, toggle, reset) {
    let elapsed = 0, startedAt = null, id = null;
    const fmt = ms => {
      const s = Math.floor(ms / 1000);
      return `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    };
    const current = () => elapsed + (startedAt ? Date.now() - startedAt : 0);
    const paint = () => { display.textContent = fmt(current()); };
    toggle.addEventListener('click', () => {
      if (startedAt) { elapsed = current(); startedAt = null; clearInterval(id); toggle.textContent = 'Start'; }
      else { startedAt = Date.now(); id = setInterval(paint, 250); toggle.textContent = 'Stop'; }
      paint();
    });
    reset.addEventListener('click', () => { elapsed = 0; if (startedAt) startedAt = Date.now(); paint(); });
  }

  function init(container, options) {
    root = container;
    opts = options;
    render();
  }

  return { init, go, next, initTimer };
})();
