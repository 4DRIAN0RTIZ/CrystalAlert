import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const source = readFileSync(resolve(__dirname, '../src/crystal-alert.js'), 'utf8');
const load = () => new Function(`${source}\n;return { Crystal, CrystalAlert };`)();

describe('modal queue', () => {
  it('shows concurrent fire calls in FIFO order and resolves each promise', async () => {
    vi.useFakeTimers();
    const { Crystal } = load();
    const first = Crystal.fire({ title: 'First' });
    const second = Crystal.fire({ title: 'Second' });

    expect(Crystal.modal.querySelector('.ca-title').textContent).toBe('First');
    expect(Crystal.modalQueue).toHaveLength(1);

    Crystal.modal.querySelector('.ca-btn-confirm').click();
    await vi.advanceTimersByTimeAsync(400);
    await expect(first).resolves.toBe(true);
    expect(Crystal.modal.querySelector('.ca-title').textContent).toBe('Second');
    expect(Crystal.overlay.classList.contains('ca-show')).toBe(true);

    Crystal.modal.querySelector('.ca-btn-confirm').click();
    await vi.advanceTimersByTimeAsync(400);
    await expect(second).resolves.toBe(true);
    expect(Crystal.modalActive).toBe(false);
    vi.useRealTimers();
  });

  it('does not resolve a queued modal when the active modal is closed twice', async () => {
    vi.useFakeTimers();
    const { Crystal } = load();
    const first = Crystal.fire({ title: 'First' });
    const second = Crystal.fire({ title: 'Second' });
    const confirm = Crystal.modal.querySelector('.ca-btn-confirm');

    confirm.click();
    Crystal.close(false);
    await vi.advanceTimersByTimeAsync(400);
    await expect(first).resolves.toBe(true);
    expect(Crystal.modal.querySelector('.ca-title').textContent).toBe('Second');

    Crystal.modal.querySelector('.ca-btn-confirm').click();
    await vi.advanceTimersByTimeAsync(400);
    await expect(second).resolves.toBe(true);
    vi.useRealTimers();
  });
});
