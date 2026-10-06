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

describe('toast lifecycle', () => {
  it('pauses and resumes the timer when pauseOnHover is enabled', async () => {
    vi.useFakeTimers();
    const { Crystal } = load();
    const handle = Crystal.toast({ title: 'Reading', duration: 1000, pauseOnHover: true });
    const toast = Crystal.toastContainer.querySelector(`[data-toast-id="${handle.id}"]`);

    await vi.advanceTimersByTimeAsync(400);
    toast.dispatchEvent(new Event('mouseenter'));
    await vi.advanceTimersByTimeAsync(1000);
    expect(toast.classList.contains('hide')).toBe(false);

    toast.dispatchEvent(new Event('mouseleave'));
    await vi.advanceTimersByTimeAsync(599);
    expect(toast.classList.contains('hide')).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(toast.classList.contains('hide')).toBe(true);
    finishTransition(toast);
    await expect(handle.closed).resolves.toBe('timer');
    vi.useRealTimers();
  });

  it('renders a close button and resolves closed after the exit transition', async () => {
    const onClose = vi.fn();
    const { Crystal } = load();
    const handle = Crystal.toast({ title: 'Saved', duration: 0, showCloseButton: true, onClose });
    const toast = Crystal.toastContainer.querySelector(`[data-toast-id="${handle.id}"]`);
    const closeButton = toast.querySelector('.ca-toast-close');

    expect(closeButton).not.toBeNull();
    closeButton.click();
    expect(toast.classList.contains('hide')).toBe(true);
    expect(onClose).not.toHaveBeenCalled();

    finishTransition(toast);
    await expect(handle.closed).resolves.toBe('button');
    expect(onClose).toHaveBeenCalledWith('button');
    expect(Crystal.toasts.has(handle.id)).toBe(false);
  });

  it('calls onClose once when a toast is closed programmatically', async () => {
    const onClose = vi.fn();
    const { Crystal } = load();
    const handle = Crystal.toast({ title: 'Persistent', duration: 0, onClose });
    const toast = Crystal.toastContainer.querySelector(`[data-toast-id="${handle.id}"]`);

    expect(handle.close()).toBe(true);
    expect(handle.close()).toBe(false);
    finishTransition(toast);
    await expect(handle.closed).resolves.toBe('programmatic');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledWith('programmatic');
  });

  it('pauses after update enables pauseOnHover while the pointer is already over the toast', async () => {
    vi.useFakeTimers();
    const { Crystal } = load();
    const handle = Crystal.toast({ title: 'Late', duration: 1000, pauseOnHover: false });
    const toast = Crystal.toastContainer.querySelector(`[data-toast-id="${handle.id}"]`);

    toast.dispatchEvent(new Event('mouseenter'));
    await vi.advanceTimersByTimeAsync(400);
    handle.update({ pauseOnHover: true });
    await vi.advanceTimersByTimeAsync(2000);
    expect(toast.classList.contains('hide')).toBe(false);

    toast.dispatchEvent(new Event('mouseleave'));
    await vi.advanceTimersByTimeAsync(999);
    expect(toast.classList.contains('hide')).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(toast.classList.contains('hide')).toBe(true);
  });

  it('does not freeze a later pauseOnHover update when the pointer already left', async () => {
    vi.useFakeTimers();
    const { Crystal } = load();
    const handle = Crystal.toast({ title: 'Left', duration: 1000, pauseOnHover: true });
    const toast = Crystal.toastContainer.querySelector(`[data-toast-id="${handle.id}"]`);

    toast.dispatchEvent(new Event('mouseenter'));
    handle.update({ pauseOnHover: false });
    toast.dispatchEvent(new Event('mouseleave'));
    await vi.advanceTimersByTimeAsync(1000);
    expect(toast.classList.contains('hide')).toBe(true);

    const other = Crystal.toast({ title: 'Other', duration: 1000, pauseOnHover: true });
    const otherToast = Crystal.toastContainer.querySelector(`[data-toast-id="${other.id}"]`);
    otherToast.dispatchEvent(new Event('mouseenter'));
    otherToast.dispatchEvent(new Event('mouseleave'));
    other.update({ pauseOnHover: false });
    other.update({ pauseOnHover: true });
    await vi.advanceTimersByTimeAsync(1000);
    expect(otherToast.classList.contains('hide')).toBe(true);
  });

  it('keeps duration 0 timerless and re-pauses on update during hover', async () => {
    vi.useFakeTimers();
    const { Crystal } = load();
    const sticky = Crystal.toast({ title: 'Sticky', duration: 0, pauseOnHover: true });
    const stickyToast = Crystal.toastContainer.querySelector(`[data-toast-id="${sticky.id}"]`);
    stickyToast.dispatchEvent(new Event('mouseenter'));
    stickyToast.dispatchEvent(new Event('mouseleave'));
    await vi.advanceTimersByTimeAsync(5000);
    expect(stickyToast.classList.contains('hide')).toBe(false);

    const handle = Crystal.toast({ title: 'Hover', duration: 1000, pauseOnHover: true });
    const toast = Crystal.toastContainer.querySelector(`[data-toast-id="${handle.id}"]`);
    toast.dispatchEvent(new Event('mouseenter'));
    handle.update({ title: 'Hover 2' });
    await vi.advanceTimersByTimeAsync(2000);
    expect(toast.classList.contains('hide')).toBe(false);
  });

  it('ignores transitionend events bubbling from child elements', async () => {
    const onClose = vi.fn();
    const { Crystal } = load();
    const handle = Crystal.toast({ title: 'Bubble', duration: 5000, onClose });
    const toast = Crystal.toastContainer.querySelector(`[data-toast-id="${handle.id}"]`);
    const bar = toast.querySelector('.ca-progress-bar');
    const settled = vi.fn();
    handle.closed.then(settled);

    handle.close();
    bar.dispatchEvent(new Event('transitionend', { bubbles: true }));
    await Promise.resolve();
    expect(toast.isConnected).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
    expect(settled).not.toHaveBeenCalled();

    finishTransition(toast);
    await expect(handle.closed).resolves.toBe('programmatic');
    expect(toast.isConnected).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledWith('programmatic');
  });

  it('calls onClose once with the timer reason', async () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const { Crystal } = load();
    const handle = Crystal.toast({ title: 'Timer', duration: 500, onClose });
    const toast = Crystal.toastContainer.querySelector(`[data-toast-id="${handle.id}"]`);

    await vi.advanceTimersByTimeAsync(500);
    finishTransition(toast);
    await expect(handle.closed).resolves.toBe('timer');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledWith('timer');
  });

  it('calls onClose once with the click reason', async () => {
    const onClose = vi.fn();
    const { Crystal } = load();
    const handle = Crystal.toast({ title: 'Click', duration: 0, onClose });
    const toast = Crystal.toastContainer.querySelector(`[data-toast-id="${handle.id}"]`);

    toast.click();
    finishTransition(toast);
    await expect(handle.closed).resolves.toBe('click');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledWith('click');
  });

  describe('exit fallback', () => {
    const setup = (options = {}) => {
      vi.useFakeTimers();
      const onClose = vi.fn();
      const { Crystal } = load();
      const handle = Crystal.toast({ title: 'Fallback', duration: 0, onClose, ...options });
      const toast = Crystal.toastContainer.querySelector(`[data-toast-id="${handle.id}"]`);
      return { Crystal, handle, toast, onClose };
    };

    it('finalizes via fallback when no transitionend ever fires', async () => {
      const { Crystal, handle, toast, onClose } = setup();

      handle.close();
      expect(toast.isConnected).toBe(true);
      await vi.advanceTimersByTimeAsync(700);
      expect(toast.isConnected).toBe(false);
      expect(Crystal.toasts.has(handle.id)).toBe(false);
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledWith('programmatic');
      await expect(handle.closed).resolves.toBe('programmatic');
    });

    it('does not call onClose again when the fallback elapses after transitionend', async () => {
      const { handle, toast, onClose } = setup();

      handle.close();
      finishTransition(toast);
      await expect(handle.closed).resolves.toBe('programmatic');
      await vi.advanceTimersByTimeAsync(1000);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('ignores a late transitionend after the fallback finalized', async () => {
      const { handle, toast, onClose } = setup();

      handle.close();
      await vi.advanceTimersByTimeAsync(700);
      finishTransition(toast);
      await vi.advanceTimersByTimeAsync(0);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('resolves every toast via fallback on closeAllToasts', async () => {
      const { Crystal, handle, onClose } = setup();
      const other = Crystal.toast({ title: 'Other', duration: 0 });

      Crystal.closeAllToasts();
      await vi.advanceTimersByTimeAsync(700);
      await expect(handle.closed).resolves.toBe('programmatic');
      await expect(other.closed).resolves.toBe('programmatic');
      expect(Crystal.toasts.size).toBe(0);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('ignores bubbled child transitionend and still finalizes via fallback', async () => {
      const { handle, toast, onClose } = setup({ duration: 5000 });
      const bar = toast.querySelector('.ca-progress-bar');

      handle.close();
      bar.dispatchEvent(new Event('transitionend', { bubbles: true }));
      expect(onClose).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(700);
      expect(toast.isConnected).toBe(false);
      expect(onClose).toHaveBeenCalledTimes(1);
      await expect(handle.closed).resolves.toBe('programmatic');
    });
  });
});
