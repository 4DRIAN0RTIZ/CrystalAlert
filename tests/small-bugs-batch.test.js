import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, vi, afterEach } from 'vitest';

const source = readFileSync(resolve(__dirname, '../src/crystal-alert.js'), 'utf8');
const css = readFileSync(resolve(__dirname, '../src/crystal-alert-styles.css'), 'utf8');

const load = () => new Function(`${source}\n;return { Crystal, CrystalAlert };`)();

describe('DOM is built lazily, not at import time', () => {
  it('does not touch the DOM until the first fire()/toast()', () => {
    document.body.innerHTML = '';
    const { Crystal } = load();

    expect(Crystal.overlay).toBeNull();
    expect(Crystal.toastContainer).toBeNull();
    expect(document.querySelector('.ca-overlay')).toBeNull();

    Crystal.fire({ title: 'hi' });

    expect(document.querySelector('.ca-overlay')).not.toBeNull();
  });
});

describe('feature 4 — small bugs batch', () => {
  const { Crystal } = load();

  afterEach(() => {
    if (Crystal.modal) Crystal.modal.innerHTML = '';
    if (Crystal.overlay) Crystal.overlay.classList.remove('ca-show');
    if (Crystal.toastContainer) Crystal.toastContainer.innerHTML = '';
    document.querySelectorAll('#ca-theme-stylesheet').forEach((l) => l.remove());
    Crystal.themeStylesheet = null;
    Crystal.toastPosition = null;
    vi.useRealTimers();
  });

  it('close() settles after the 400ms modal transition, not 300ms', async () => {
    vi.useFakeTimers();
    let settled = false;
    const p = Crystal.fire({ title: 'x' }).then((r) => {
      settled = true;
      return r;
    });

    Crystal.close('done');

    await vi.advanceTimersByTimeAsync(300);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(100);
    expect(settled).toBe(true);
    await expect(p).resolves.toBe('done');
  });

  it('toast() does not rewrite the container class when the position is unchanged', () => {
    Crystal.toast({ text: 'a', duration: 0 });
    Crystal.toastContainer.className = 'ca-sentinel';

    Crystal.toast({ text: 'b', duration: 0 });
    expect(Crystal.toastContainer.className).toBe('ca-sentinel');

    Crystal.toast({ text: 'c', duration: 0, position: 'top-left' });
    expect(Crystal.toastContainer.className).toBe('ca-toast-container ca-top-left');
  });

  it('setTheme() never leaves duplicate <link id="ca-theme-stylesheet"> on rapid calls', () => {
    Crystal.setTheme('dark').catch(() => {});
    Crystal.setTheme('dark').catch(() => {});

    expect(document.querySelectorAll('#ca-theme-stylesheet').length).toBe(1);
  });
});

describe('CSS custom properties are actually referenced', () => {
  it('.ca-overlay blurs with --ca-backdrop-blur instead of a hardcoded value', () => {
    const overlayBlock = css.match(/\.ca-overlay\s*\{[^}]*\}/)[0];
    expect(overlayBlock).toContain('blur(var(--ca-backdrop-blur))');
    expect(overlayBlock).not.toContain('blur(5px)');
  });

  it('--ca-font-family is referenced by at least one rule', () => {
    const uses = css.split('var(--ca-font-family)').length - 1;
    expect(uses).toBeGreaterThanOrEqual(1);
  });
});
