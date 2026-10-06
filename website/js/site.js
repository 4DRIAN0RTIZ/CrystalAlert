// The library declares `Crystal` with `const`, so it is not a property of
// `window`. Expose it explicitly and point theme loading at the bundled copy
// under vendor/.
window.Crystal = Crystal;
Crystal.setThemePath('vendor/themes/');

(function () {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- Syntax highlighting (DOM nodes only, no innerHTML) ---------- */
  const TOKEN_RE = new RegExp([
    '(<!--[\\s\\S]*?-->)',                                  // 1 html comment
    '((?<![:\\w])\\/\\/[^\\n]*|^#[^\\n]*)',                    // 2 line comment
    '(\'(?:\\\\.|[^\'\\\\\\n])*\'|"(?:\\\\.|[^"\\\\\\n])*"|`(?:\\\\.|[^`\\\\])*`)', // 3 string
    '(<\\/?[a-zA-Z][\\w-]*)',                               // 4 tag
    '\\b(const|await|async|return|true|false|null|new|cp|git)\\b', // 5 keyword
    '\\b(\\d+)\\b',                                         // 6 number
    '\\b(Crystal)\\b'                                       // 7 object
  ].join('|'), 'gm');
  const TOKEN_CLASS = [null, 'tok-c', 'tok-c', 'tok-s', 'tok-t', 'tok-k', 'tok-n', 'tok-o'];

  function highlight(el, code) {
    const src = code !== undefined ? code : el.textContent;
    el.textContent = '';
    let last = 0;
    TOKEN_RE.lastIndex = 0;
    let m;
    while ((m = TOKEN_RE.exec(src)) !== null) {
      let idx = 1;
      while (idx < 8 && m[idx] === undefined) idx++;
      let text = m[0];
      let start = m.index;
      // A "#" comment may capture the preceding newline; keep it as plain text.
      if (idx === 2 && text.charAt(0) === '\n') {
        start += 1;
        text = text.slice(1);
      }
      if (start > last) el.appendChild(document.createTextNode(src.slice(last, start)));
      const span = document.createElement('span');
      span.className = TOKEN_CLASS[idx];
      span.textContent = text;
      el.appendChild(span);
      last = start + text.length;
    }
    if (last < src.length) el.appendChild(document.createTextNode(src.slice(last)));
  }

  function highlightStatic() {
    $$('code[data-lang]').forEach((el) => { if (el.id !== 'playground-code') highlight(el); });
    $$('pre.code[data-lang]').forEach((pre) => {
      const code = document.createElement('code');
      code.dataset.lang = pre.dataset.lang;
      code.textContent = pre.textContent;
      pre.textContent = '';
      pre.appendChild(code);
      highlight(code);
    });
  }

  /* ---------- Site theme (light / dark) ---------- */
  const themeBtn = $('#theme-toggle');
  function syncThemeButton() {
    const isDark = root.getAttribute('data-theme') !== 'light';
    themeBtn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  }
  themeBtn.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('ca-site-theme', next); } catch (e) { /* storage unavailable */ }
    syncThemeButton();
  });
  syncThemeButton();

  /* ---------- Navbar ---------- */
  const navbar = $('#navbar');
  const navToggle = $('.nav-toggle');
  const navLinks = $('#nav-links');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
  navToggle.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
  $$('a', navLinks).forEach((link) => link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  }));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navLinks.classList.contains('open')) {
      navLinks.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.focus();
    }
  });

  // Highlight the nav link of the section in view.
  if ('IntersectionObserver' in window) {
    const linkFor = new Map();
    $$('a[href^="#"]', navLinks).forEach((a) => linkFor.set(a.getAttribute('href').slice(1), a));
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const link = linkFor.get(entry.target.id);
        if (link) link.classList.toggle('active', entry.isIntersecting);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    linkFor.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
  }

  /* ---------- Scroll reveal ---------- */
  if ('IntersectionObserver' in window && !reduceMotion) {
    root.classList.add('js');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    $$('.reveal').forEach((el) => io.observe(el));
  }

  /* ---------- Copy buttons ---------- */
  function copyText(text, btn) {
    const label = $('span', btn);
    const original = label.textContent;
    const done = () => {
      btn.classList.add('done');
      label.textContent = 'Copied';
      setTimeout(() => { btn.classList.remove('done'); label.textContent = original; }, 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, () => { label.textContent = 'Press Ctrl+C'; });
    } else {
      label.textContent = 'Unsupported';
    }
  }
  $$('[data-copy-target]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = $(btn.dataset.copyTarget);
      if (target) copyText(target.textContent, btn);
    });
  });

  /* ---------- Docs tabs ---------- */
  const tabs = $$('.rail [role="tab"]');
  function selectTab(name, focus) {
    tabs.forEach((tab) => {
      const on = tab.dataset.tab === name;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(tab.getAttribute('aria-controls'));
      panel.hidden = !on;
      if (on && focus) tab.focus();
    });
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(tab.dataset.tab));
    tab.addEventListener('keydown', (e) => {
      const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
      if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        selectTab(tabs[e.key === 'Home' ? 0 : tabs.length - 1].dataset.tab, true);
      } else if (keys[e.key]) {
        e.preventDefault();
        selectTab(tabs[(i + keys[e.key] + tabs.length) % tabs.length].dataset.tab, true);
      }
    });
  });
  $$('[data-open-tab]').forEach((link) => link.addEventListener('click', () => selectTab(link.dataset.openTab)));

  /* ---------- Crystal theme (shared by playground + gallery) ---------- */
  const state = { kind: 'alert', icon: 'success', position: 'top-right', theme: 'default' };
  const THEME_LABEL = { default: 'Default glass', dark: 'Dark', minimal: 'Minimal' };

  function syncThemeUi(name) {
    state.theme = name;
    $$('[data-field="theme"] button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.value === name)));
    $$('[data-apply-theme]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.applyTheme === name)));
    $$('[data-theme-card]').forEach((c) => c.classList.toggle('is-active', c.dataset.themeCard === name));
  }

  async function applyCrystalTheme(name) {
    try {
      await Crystal.setTheme(name);
      syncThemeUi(name);
      return true;
    } catch (err) {
      Crystal.toast({ title: 'Theme not found', text: 'Could not load the "' + name + '" theme.', icon: 'error' });
      return false;
    }
  }

  /* ---------- Playground ---------- */
  const titleInput = $('#f-title');
  const textInput = $('#f-text');
  const durationInput = $('#duration');
  const durationOut = $('#duration-out');
  const codeEl = $('#playground-code');

  const q = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
  const titleFor = (fallback) => titleInput.value.trim() || fallback;
  const textFor = () => textInput.value.trim();

  function buildSnippet() {
    const title = titleFor('Hello');
    const text = textFor();
    const dur = Number(durationInput.value);
    const lines = [];
    const add = (s) => lines.push(s);
    if (state.theme !== 'default') add("await Crystal.setTheme(" + q(state.theme) + ");\n");

    switch (state.kind) {
      case 'alert':
        add('Crystal.fire({');
        add('  title: ' + q(title) + ',');
        if (text) add('  text: ' + q(text) + ',');
        add('  icon: ' + q(state.icon));
        add('});');
        break;
      case 'confirm':
        add('const ok = await Crystal.fire({');
        add('  title: ' + q(title) + ',');
        if (text) add('  text: ' + q(text) + ',');
        add('  icon: ' + q(state.icon) + ',');
        add('  showCancelButton: true,');
        add("  confirmButtonText: 'Yes, proceed'");
        add('});');
        break;
      case 'toast':
        add('Crystal.toast({');
        add('  title: ' + q(title) + ',');
        if (text) add('  text: ' + q(text) + ',');
        add('  icon: ' + q(state.icon) + ',');
        add('  position: ' + q(state.position) + ',');
        add('  duration: ' + dur);
        add('});');
        break;
      case 'prompt':
        add('const email = await Crystal.prompt(' + q(title) + ', {');
        add("  input: 'email',");
        add("  inputPlaceholder: 'you@example.com',");
        add("  inputValidator: (v) => v.includes('@') ? '' : 'Enter a valid email.',");
        add('  showCancelButton: true');
        add('});');
        break;
      case 'async':
        add('const result = await Crystal.fire({');
        add('  title: ' + q(title) + ',');
        if (text) add('  text: ' + q(text) + ',');
        add('  icon: ' + q(state.icon) + ',');
        add('  showCancelButton: true,');
        add('  preConfirm: async () => {');
        add('    await saveToApi(); // spinner shows while pending');
        add('    return { saved: true };');
        add('  }');
        add('});');
        break;
      case 'timer':
        add('Crystal.fire({');
        add('  title: ' + q(title) + ',');
        if (text) add('  text: ' + q(text) + ',');
        add('  icon: ' + q(state.icon) + ',');
        add('  timer: ' + dur + ',');
        add('  timerProgressBar: true');
        add('});');
        break;
      default:
        break;
    }
    return lines.join('\n');
  }

  function refreshLab() {
    $$('[data-for]').forEach((f) => { f.hidden = !f.dataset.for.split(' ').includes(state.kind); });
    durationOut.textContent = durationInput.value + ' ms';
    highlight(codeEl, buildSnippet());
  }

  async function runLab() {
    const title = titleFor('Hello');
    const text = textFor();
    const dur = Number(durationInput.value);
    switch (state.kind) {
      case 'alert':
        Crystal.fire({ title, text, icon: state.icon });
        break;
      case 'confirm': {
        const ok = await Crystal.fire({
          title, text, icon: state.icon, showCancelButton: true, confirmButtonText: 'Yes, proceed'
        });
        if (ok) Crystal.toast({ title: 'Confirmed', text: 'The promise resolved truthy.', icon: 'success' });
        break;
      }
      case 'toast':
        Crystal.toast({ title, text, icon: state.icon, position: state.position, duration: dur });
        break;
      case 'prompt': {
        const email = await Crystal.prompt(title, {
          input: 'email',
          inputPlaceholder: 'you@example.com',
          inputValidator: (v) => (v.includes('@') ? '' : 'Enter a valid email.'),
          showCancelButton: true
        });
        if (email) Crystal.toast({ title: 'Got it', text: String(email), icon: 'success' });
        break;
      }
      case 'async': {
        const result = await Crystal.fire({
          title, text, icon: state.icon, showCancelButton: true,
          preConfirm: async () => { await wait(2000); return { saved: true }; }
        });
        if (result && result.saved) Crystal.toast({ title: 'Saved', text: 'preConfirm resolved after 2s.', icon: 'success' });
        break;
      }
      case 'timer':
        Crystal.fire({ title, text, icon: state.icon, timer: dur, timerProgressBar: true });
        break;
      default:
        break;
    }
  }

  // Defaults that make sense per kind, so the snippet reads well on switch.
  const KIND_DEFAULTS = {
    alert: ['Success!', 'Your changes have been saved.', 'success'],
    confirm: ['Are you sure?', 'This action cannot be undone.', 'warning'],
    toast: ['New message', 'You have 3 unread messages.', 'info'],
    prompt: ['Subscribe to newsletter', '', 'info'],
    async: ['Save changes?', 'This simulates an API call.', 'warning'],
    timer: ['Auto-closing alert', 'This alert closes by itself.', 'info']
  };

  $$('.seg').forEach((seg) => {
    const field = seg.dataset.field;
    const buttons = $$('button', seg);
    buttons.forEach((btn, i) => {
      btn.tabIndex = btn.getAttribute('aria-checked') === 'true' ? 0 : -1;
      btn.addEventListener('click', async () => {
        if (field === 'theme') {
          await applyCrystalTheme(btn.dataset.value);
          refreshLab();
          return;
        }
        buttons.forEach((b) => { b.setAttribute('aria-checked', String(b === btn)); b.tabIndex = b === btn ? 0 : -1; });
        state[field] = btn.dataset.value;
        if (field === 'kind') {
          const d = KIND_DEFAULTS[state.kind];
          titleInput.value = d[0];
          textInput.value = d[1];
          state.icon = d[2];
          $$('[data-field="icon"] button').forEach((b) => {
            b.setAttribute('aria-checked', String(b.dataset.value === d[2]));
            b.tabIndex = b.dataset.value === d[2] ? 0 : -1;
          });
        }
        refreshLab();
      });
      btn.addEventListener('keydown', (e) => {
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!step) return;
        e.preventDefault();
        const next = buttons[(i + step + buttons.length) % buttons.length];
        next.focus();
        next.click();
      });
    });
  });
  // Roving tabindex for the theme group is handled by syncThemeUi's aria-checked.
  $$('[data-field="theme"] button').forEach((b) => { b.tabIndex = 0; });

  [titleInput, textInput, durationInput].forEach((el) => el.addEventListener('input', refreshLab));
  $('#lab-run').addEventListener('click', runLab);

  // Extra recipes
  const RECIPES = {
    'custom-icon': () => Crystal.fire({
      title: 'Custom icon',
      text: 'Any HTML works as an icon: Font Awesome, images, SVGs or emojis.',
      iconHtml: '<i class="fa-solid fa-rocket"></i>'
    }),
    positions: async () => {
      for (const pos of ['top-right', 'top-left', 'bottom-right', 'bottom-left']) {
        Crystal.toast({ title: pos, text: 'Toast in this position', icon: 'info', position: pos, duration: 1500 });
        await wait(1900);
      }
    },
    queue: () => {
      ['First step', 'Second step', 'Third step'].forEach((title, i) => {
        Crystal.fire({ title, text: 'Queued modals open one after another (' + (i + 1) + '/3).', icon: 'info' });
      });
    }
  };
  $$('[data-recipe]').forEach((btn) => btn.addEventListener('click', () => RECIPES[btn.dataset.recipe]()));

  /* ---------- Theme gallery ---------- */
  $$('[data-apply-theme]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const name = btn.dataset.applyTheme;
      if (await applyCrystalTheme(name)) {
        refreshLab();
        Crystal.fire({
          title: THEME_LABEL[name] || name,
          text: 'Theme loaded via a CSS file.',
          icon: 'info'
        });
      }
    });
  });

  /* ---------- Hero stage ---------- */
  const STAGE = {
    alert: () => Crystal.fire({ title: 'Changes saved', text: 'A frosted modal over your page.', icon: 'success' }),
    confirm: async () => {
      const ok = await Crystal.fire({
        title: 'Ship release?', text: 'This will deploy to production.', icon: 'warning',
        showCancelButton: true, confirmButtonText: 'Ship it'
      });
      if (ok) Crystal.toast({ title: 'Shipped', text: 'Deploy started.', icon: 'success' });
    },
    toast: () => {
      const items = [
        ['Success!', 'Your file has been uploaded.', 'success'],
        ['Error', 'Failed to save changes.', 'error'],
        ['Warning', 'Your session will expire soon.', 'warning'],
        ['New message', 'You have 3 unread messages.', 'info']
      ];
      const pick = items[Math.floor(Math.random() * items.length)];
      Crystal.toast({ title: pick[0], text: pick[1], icon: pick[2] });
    }
  };
  $$('[data-stage]').forEach((btn) => btn.addEventListener('click', () => STAGE[btn.dataset.stage]()));

  /* ---------- Changelog ---------- */
  const REPO_URL = 'https://github.com/4DRIAN0RTIZ/CrystalAlert';
  // Same-origin copy first (Netlify build copies docs/changelog.json into vendor/),
  // then the raw file on GitHub (works locally and as a safety net).
  const CHANGELOG_SOURCES = [
    'vendor/changelog.json',
    'https://raw.githubusercontent.com/4DRIAN0RTIZ/CrystalAlert/main/docs/changelog.json'
  ];
  const GROUP_CLASS = {
    'Features': 'g-feat', 'Bug Fixes': 'g-fix', 'Performance': 'g-perf', 'Documentation': 'g-docs'
  };

  async function fetchChangelog() {
    for (const url of CHANGELOG_SOURCES) {
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (!res.ok) continue;
        const data = await res.json();
        if (Array.isArray(data)) return data;
      } catch (e) { /* try next source */ }
    }
    throw new Error('changelog unavailable');
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function fmtDate(ts, withDay) {
    const opts = withDay ? { year: 'numeric', month: 'long', day: 'numeric' } : { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(ts * 1000).toLocaleDateString(undefined, opts);
  }

  function showChangelogStatus(box, text, withLink) {
    box.textContent = '';
    const p = el('p', 'cl-status', text);
    if (withLink) {
      p.appendChild(document.createTextNode(' '));
      const a = el('a', '', 'Open CHANGELOG.md');
      a.href = REPO_URL + '/blob/main/CHANGELOG.md';
      a.target = '_blank';
      a.rel = 'noopener';
      p.appendChild(a);
    }
    box.appendChild(p);
    box.setAttribute('aria-busy', 'false');
  }

  function renderRelease(rel) {
    const card = el('article', 'cl-release');
    const head = el('div', 'cl-head');
    head.appendChild(el('h3', '', rel.version));
    if (rel.timestamp) {
      const t = el('time', '', fmtDate(rel.timestamp, false));
      t.dateTime = new Date(rel.timestamp * 1000).toISOString();
      head.appendChild(t);
    }
    card.appendChild(head);

    const list = el('ul', 'cl-list');
    rel.commits.forEach((c) => {
      const li = el('li', 'cl-item');
      li.appendChild(el('span', 'cl-group ' + (GROUP_CLASS[c.group] || ''), c.group || 'Other'));
      const msg = el('span', 'cl-msg', String(c.message || '').split('\n')[0]);
      if (c.scope) msg.prepend(el('span', 'cl-scope', c.scope + ': '));
      li.appendChild(msg);
      if (/^[0-9a-f]{7,40}$/.test(c.id || '')) {
        const a = el('a', 'cl-sha', c.id.slice(0, 7));
        a.href = REPO_URL + '/commit/' + c.id;
        a.target = '_blank';
        a.rel = 'noopener';
        a.setAttribute('aria-label', 'Commit ' + c.id.slice(0, 7) + ' on GitHub');
        li.appendChild(a);
      }
      list.appendChild(li);
    });
    card.appendChild(list);
    return card;
  }

  async function loadChangelog() {
    const box = $('#changelog-content');
    if (!box) return;
    try {
      const releases = await fetchChangelog();
      const rel = releases.find((r) => r.version);
      const commits = rel
        ? (rel.commits || []).filter((c) => c && c.message && !/^chore\((release|changelog)\)/.test(c.message))
        : [];
      if (!rel || !commits.length) {
        showChangelogStatus(box, 'No changelog entries yet. Check back after the next release.', true);
        return;
      }
      box.textContent = '';
      box.appendChild(renderRelease(Object.assign({}, rel, { commits })));
      box.setAttribute('aria-busy', 'false');

      const ver = rel.version;
      const hv = $('#hero-version');
      if (hv && ver) { hv.textContent = ' \u00b7 ' + ver; hv.hidden = false; }
      const cdn = $('#code-cdn');
      if (cdn && /^v?\d+\.\d+\.\d+/.test(ver)) {
        const tag = ver.charAt(0) === 'v' ? ver : 'v' + ver;
        const w = document.createTreeWalker(cdn, NodeFilter.SHOW_TEXT);
        for (let n = w.nextNode(); n; n = w.nextNode()) {
          n.nodeValue = n.nodeValue.replace('CrystalAlert/dist', 'CrystalAlert@' + tag + '/dist');
        }
      }

      const footer = $('#footer-updated');
      const latest = releases.find((r) => r.version && r.timestamp);
      let ts = latest ? latest.timestamp : 0;
      if (!ts) {
        releases.forEach((r) => (r.commits || []).forEach((c) => {
          const t = c.author && c.author.timestamp;
          if (t && t > ts) ts = t;
        }));
      }
      if (footer && ts) {
        footer.textContent = 'Last updated: ' + fmtDate(ts, true) + (latest ? ' (' + latest.version + ')' : '');
        footer.hidden = false;
      }
    } catch (e) {
      showChangelogStatus(box, 'Could not load the changelog right now.', true);
    }
  }

  /* ---------- Init ---------- */
  highlightStatic();
  loadChangelog();
  syncThemeUi('default');
  refreshLab();
})();
