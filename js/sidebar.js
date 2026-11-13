'use strict';

// Collapsible, arbitrarily nested category tree with bookmarks.
// Node: { id, label, icon?, action?, children? }. A node may have both an
// action and children: the label applies the action, the chevron toggles.
// Any node with an action can be starred; starred nodes are listed in a
// Bookmarks section at the top.
const Sidebar = (() => {
  const STORE = 'gst.tree';
  const BM_STORE = 'gst.bookmarks';
  const BM_ID = '__bookmarks';
  let opts, tree, list, search, expanded, bookmarks;
  const index = new Map(); // id → { node, path: [ancestor labels], parents: [ancestor ids] }
  let query = '';

  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const persist = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };
  const store = () => persist(STORE, [...expanded]);

  function indexTree(nodes, path = [], parents = []) {
    for (const n of nodes) {
      index.set(n.id, { node: n, path, parents });
      if (n.children) indexTree(n.children, [...path, n.label], [...parents, n.id]);
    }
  }

  // Nodes from the top-level category down to the given node.
  function pathById(id) {
    const e = index.get(id);
    return e ? [...e.parents.map(p => index.get(p).node), e.node] : [];
  }

  function pathByKey(key) {
    for (const [id, e] of index) {
      if (e.node.action && opts.keyOf(e.node.action) === key) return pathById(id);
    }
    return [];
  }

  function toggleBookmark(id) {
    const i = bookmarks.indexOf(id);
    if (i >= 0) {
      bookmarks.splice(i, 1);
    } else {
      bookmarks.push(id);
      expanded.add(BM_ID);
      store();
    }
    persist(BM_STORE, bookmarks);
    render();
  }

  // Pseudo-node holding leaf copies of the bookmarked nodes.
  function bookmarksNode() {
    return {
      id: BM_ID, label: 'Bookmarks', icon: '★',
      children: bookmarks.filter(id => index.has(id)).map(id => {
        const { node, path } = index.get(id);
        return { id: `bm:${id}`, bookmarkOf: id, label: node.label, sub: path.slice(-2).join(' › '), action: node.action };
      }),
    };
  }

  function allBranchIds(nodes, out = []) {
    for (const n of nodes) {
      if (n.children?.length) { out.push(n.id); allBranchIds(n.children, out); }
    }
    return out;
  }

  function containsKey(node, key) {
    if (node.action && opts.keyOf(node.action) === key) return true;
    return (node.children || []).some(c => containsKey(c, key));
  }

  function toggle(id, force) {
    const open = force ?? !expanded.has(id);
    open ? expanded.add(id) : expanded.delete(id);
    store();
    render();
  }

  function renderNode(node, depth, q, key) {
    const kids = node.children || [];
    const match = !q || node.label.toLowerCase().includes(q);
    // Once a node matches the search, show its whole subtree.
    const childEls = kids.map(c => renderNode(c, depth + 1, match ? '' : q, key)).filter(Boolean);
    if (q && !match && !childEls.length) return null;

    const open = kids.length > 0 && (q ? true : expanded.has(node.id));
    const bmId = node.bookmarkOf ?? node.id;
    const starred = node.action && bookmarks.includes(bmId);
    const active = node.action && opts.keyOf(node.action) === key;
    const row = h('div', {
      class: 'trow' + (depth === 0 ? ' top' : '') + (active ? ' active' : '') +
        (!active && containsKey(node, key) ? ' has-active' : ''),
      style: `--depth:${depth}`, 'data-id': node.id,
    });
    row.append(kids.length
      ? h('button', { class: 'twisty' + (open ? ' open' : ''), 'aria-label': open ? 'Collapse' : 'Expand', onclick: () => toggle(node.id) }, '▸')
      : h('span', { class: 'twisty' }));
    row.append(h('button', {
      class: 'tlabel',
      onclick: () => {
        if (node.action) {
          opts.onSelect(node.action);
          if (kids.length && !expanded.has(node.id)) toggle(node.id, true);
        } else {
          toggle(node.id);
        }
      },
    }, node.icon ? h('span', { class: 'ticon' }, node.icon) : null, node.label,
    node.sub ? h('span', { class: 'tsub' }, node.sub) : null));
    if (!node.bookmarkOf && opts.hasInfo?.(node)) {
      row.append(h('button', {
        class: 'info', title: `Theory: ${node.label}`, 'aria-label': `Theory: ${node.label}`,
        onclick: () => opts.onInfo(node),
      }, 'ⓘ'));
    }
    if (node.action) {
      row.append(h('button', {
        class: 'star' + (starred ? ' on' : ''),
        title: starred ? 'Remove bookmark' : 'Bookmark',
        'aria-label': starred ? `Remove bookmark: ${node.label}` : `Bookmark ${node.label}`,
        'aria-pressed': String(!!starred),
        onclick: () => toggleBookmark(bmId),
      }, starred ? '★' : '☆'));
    }

    const li = h('li', { role: 'treeitem', 'aria-expanded': kids.length ? String(open) : null }, row);
    if (node.id === BM_ID && !kids.length && !q) {
      // Keep the section discoverable while empty.
      li.append(h('div', { class: 'thint' }, 'Click ☆ next to any item to pin it here.'));
    }
    if (open) li.append(h('ul', { class: 'tchildren', role: 'group' }, ...childEls));
    return li;
  }

  function render() {
    const key = opts.activeKey();
    list.replaceChildren(...[bookmarksNode(), ...tree].map(n => renderNode(n, 0, query, key)).filter(Boolean));
    if (!list.children.length) list.append(h('li', { class: 'tempty' }, 'No matches'));
  }

  function init(container, options) {
    opts = options;
    tree = options.tree;
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORE)); } catch { /* ignore */ }
    expanded = new Set(saved ?? [BM_ID, ...tree.map(n => n.id)]);
    bookmarks = load(BM_STORE, []);
    indexTree(tree);

    search = h('input', {
      type: 'search', placeholder: 'Filter…', 'aria-label': 'Filter categories',
      oninput: () => { query = search.value.trim().toLowerCase(); render(); },
    });
    list = h('ul', { class: 'tree', role: 'tree' });
    container.replaceChildren(
      h('div', { class: 'sb-head' },
        search,
        h('button', { class: 'icon small', title: 'Expand all', onclick: () => { allBranchIds(tree).forEach(id => expanded.add(id)); store(); render(); } }, '⊞'),
        h('button', { class: 'icon small', title: 'Collapse all', onclick: () => { expanded.clear(); store(); render(); } }, '⊟')),
      list);
    render();
  }

  return { init, refresh: () => list && render(), pathById, pathByKey };
})();
