import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const source = readFileSync(resolve(__dirname, '../src/crystal-alert.js'), 'utf8');
const load = () => new Function(`${source}\n;return { Crystal, CrystalAlert };`)();

const finishTransition = (element) => {
  element.dispatchEvent(new Event('transitionend'));
};

beforeEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('toast handles', () => {
  it('returns a handle that updates and closes its toast', () => {
    const { Crystal } = load();
    const handle = Crystal.toast({ title: 'Uploading', text: 'Please wait', duration: 0 });

    expect(handle.id).toMatch(/^ca-toast-/);
    expect(Crystal.toastContainer.querySelector(`[data-toast-id="${handle.id}"]`)).not.toBeNull();

    handle.update({ title: 'Uploaded', text: 'Complete', icon: 'success' });
    const toast = Crystal.toastContainer.querySelector(`[data-toast-id="${handle.id}"]`);
    expect(toast.querySelector('.ca-toast-title').textContent).toBe('Uploaded');
    expect(toast.querySelector('.ca-toast-text').textContent).toBe('Complete');

    expect(handle.close()).toBe(true);
    expect(toast.classList.contains('hide')).toBe(true);
    finishTransition(toast);
    expect(Crystal.toastContainer.querySelector(`[data-toast-id="${handle.id}"]`)).toBeNull();
  });

  it('resets the timer when a toast is updated', async () => {
    vi.useFakeTimers();
    const { Crystal } = load();
    const handle = Crystal.toast({ title: 'Uploading', duration: 1000 });
    const toast = Crystal.toastContainer.querySelector(`[data-toast-id="${handle.id}"]`);

    await vi.advanceTimersByTimeAsync(900);
    handle.update({ title: 'Uploaded', duration: 1000 });
    await vi.advanceTimersByTimeAsync(999);
    expect(toast.classList.contains('hide')).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(toast.classList.contains('hide')).toBe(true);
    finishTransition(toast);
    expect(Crystal.toasts.has(handle.id)).toBe(false);
    vi.useRealTimers();
  });

  it('closes one toast or all toasts through the public API', () => {
    const { Crystal } = load();
    const first = Crystal.toast({ title: 'First', duration: 0 });
    const second = Crystal.toast({ title: 'Second', duration: 0 });
    const firstElement = Crystal.toastContainer.querySelector(`[data-toast-id="${first.id}"]`);
    const secondElement = Crystal.toastContainer.querySelector(`[data-toast-id="${second.id}"]`);

    expect(Crystal.closeToast(first.id)).toBe(true);
    expect(firstElement.classList.contains('hide')).toBe(true);
    expect(secondElement.classList.contains('hide')).toBe(false);

    Crystal.closeAllToasts();
    expect(secondElement.classList.contains('hide')).toBe(true);
    finishTransition(firstElement);
    finishTransition(secondElement);
    expect(Crystal.toasts.size).toBe(0);
  });
});
