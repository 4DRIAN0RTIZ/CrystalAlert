import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';

const source = readFileSync(resolve(__dirname, '../src/crystal-alert.js'), 'utf8');

const load = new Function(`${source}\n;return { Crystal, CrystalAlert };`);
const { Crystal } = load();

afterEach(() => {
  Crystal.modal.innerHTML = '';
  Crystal.overlay.classList.remove('ca-show');
  Crystal.toastContainer.innerHTML = '';
  delete window.__xss;
});

describe('fire() escapes text (XSS)', () => {
  it('renders a text payload as literal text, not as DOM', () => {
    const payload = '<img src=x onerror="window.__xss=1">';
    Crystal.fire({ text: payload });

    const textEl = document.querySelector('.ca-text');
    expect(textEl).not.toBeNull();
    expect(textEl.querySelector('img')).toBeNull();
    expect(textEl.textContent).toBe(payload);
    expect(window.__xss).toBeUndefined();
  });

  it('still interprets html as markup', () => {
    Crystal.fire({ html: '<b class="x">hi</b>' });

    expect(document.querySelector('.ca-modal .x')).not.toBeNull();
  });

  it('renders plain text unchanged', () => {
    Crystal.fire({ text: 'hello' });

    expect(document.querySelector('.ca-text').textContent).toBe('hello');
  });

  it('renders title as literal text, not as DOM', () => {
    const payload = '<img src=x onerror="window.__xss=1">';
    Crystal.fire({ title: payload });

    const titleEl = document.querySelector('.ca-title');
    expect(titleEl.querySelector('img')).toBeNull();
    expect(titleEl.textContent).toBe(payload);
    expect(window.__xss).toBeUndefined();
  });
});

describe('toast() escapes text (XSS)', () => {
  it('renders a text payload as literal text, not as DOM', () => {
    const payload = '<img src=x onerror=1>';
    Crystal.toast({ text: payload });

    const textEl = document.querySelector('.ca-toast-text');
    expect(textEl).not.toBeNull();
    expect(textEl.querySelector('img')).toBeNull();
    expect(textEl.textContent).toBe(payload);
  });

  it('still interprets html as markup', () => {
    Crystal.toast({ html: '<b class="y">hi</b>' });

    expect(document.querySelector('.y')).not.toBeNull();
  });

  it('renders title as literal text, not as DOM', () => {
    const payload = '<img src=x onerror=1>';
    Crystal.toast({ title: payload });

    const titleEl = document.querySelector('.ca-toast-title');
    expect(titleEl.querySelector('img')).toBeNull();
    expect(titleEl.textContent).toBe(payload);
  });
});
