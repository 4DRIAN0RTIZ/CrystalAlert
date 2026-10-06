import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const source = readFileSync(resolve(__dirname, '../src/crystal-alert.js'), 'utf8');
const load = () => new Function(`${source}\n;return { Crystal, CrystalAlert };`)();

describe('modal timers', () => {
  it('closes the modal after the configured timer', async () => {
    vi.useFakeTimers();
    const { Crystal } = load();
    const promise = Crystal.fire({ title: 'Timed alert', timer: 1000 });

    await vi.advanceTimersByTimeAsync(999);
    expect(Crystal.overlay.classList.contains('ca-show')).toBe(true);

    await vi.advanceTimersByTimeAsync(1);
    expect(Crystal.overlay.classList.contains('ca-show')).toBe(false);
    await vi.advanceTimersByTimeAsync(400);
    await expect(promise).resolves.toBe(null);
    vi.useRealTimers();
  });

  it('renders a progress bar and cancels the timer on manual close', async () => {
    vi.useFakeTimers();
    const { Crystal } = load();
    const promise = Crystal.fire({
      title: 'Timed alert',
      timer: 2000,
      timerProgressBar: true
    });
    const progressBar = Crystal.modal.querySelector('.ca-modal-progress');

    expect(progressBar).not.toBeNull();
    expect(progressBar.style.transition).toBe('width 2000ms linear');
    expect(Crystal.timer).not.toBeNull();

    Crystal.modal.querySelector('.ca-btn-confirm').click();
    await vi.advanceTimersByTimeAsync(400);
    await expect(promise).resolves.toBe(true);
    expect(Crystal.timer).toBeNull();

    await vi.advanceTimersByTimeAsync(2000);
    vi.useRealTimers();
  });
});
