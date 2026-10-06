import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const source = readFileSync(resolve(__dirname, '../src/crystal-alert.js'), 'utf8');
const load = () => new Function(`${source}\n;return { Crystal, CrystalAlert };`)();

const settleClose = async () => {
  await vi.advanceTimersByTimeAsync(400);
};

describe('input and prompt API', () => {
  const { Crystal } = load();

  afterEach(() => {
    if (Crystal.modal) Crystal.modal.innerHTML = '';
    if (Crystal.overlay) Crystal.overlay.classList.remove('ca-show');
    document.removeEventListener('keydown', Crystal._escHandler);
    vi.useRealTimers();
  });

  it('renders a configured text input and resolves its value', async () => {
    vi.useFakeTimers();
    const promise = Crystal.fire({
      title: 'Name',
      input: 'text',
      inputPlaceholder: 'Your name',
      inputValue: 'Ada'
    });
    const input = Crystal.modal.querySelector('.ca-input');

    expect(input.type).toBe('text');
    expect(input.placeholder).toBe('Your name');
    expect(input.value).toBe('Ada');

    input.value = 'Grace';
    Crystal.modal.querySelector('.ca-btn-confirm').click();
    await settleClose();

    await expect(promise).resolves.toBe('Grace');
  });

  it('supports select options and checkbox values', async () => {
    vi.useFakeTimers();
    const selectPromise = Crystal.fire({
      input: 'select',
      inputOptions: [
        { value: 'daily', label: 'Daily digest' },
        { value: 'weekly', label: 'Weekly summary' }
      ],
      inputValue: 'weekly'
    });
    const select = Crystal.modal.querySelector('.ca-input');

    expect(select.options).toHaveLength(2);
    expect(select.value).toBe('weekly');
    Crystal.modal.querySelector('.ca-btn-confirm').click();
    await settleClose();
    await expect(selectPromise).resolves.toBe('weekly');

    const checkboxPromise = Crystal.fire({ input: 'checkbox', inputValue: true });
    const checkbox = Crystal.modal.querySelector('.ca-input');
    expect(checkbox.checked).toBe(true);
    checkbox.checked = false;
    Crystal.modal.querySelector('.ca-btn-confirm').click();
    await settleClose();
    await expect(checkboxPromise).resolves.toBe(false);
  });

  it('keeps the modal open when inputValidator returns a message', async () => {
    vi.useFakeTimers();
    const inputValidator = vi.fn((value) => value ? '' : 'Email is required');
    const promise = Crystal.fire({ input: 'email', inputValidator });
    const input = Crystal.modal.querySelector('.ca-input');

    Crystal.modal.querySelector('.ca-btn-confirm').click();
    await Promise.resolve();
    expect(inputValidator).toHaveBeenCalledWith('');
    expect(Crystal.overlay.classList.contains('ca-show')).toBe(true);
    expect(Crystal.modal.querySelector('.ca-validation-message').textContent)
      .toBe('Email is required');

    input.value = 'ada@example.com';
    Crystal.modal.querySelector('.ca-btn-confirm').click();
    await settleClose();
    await expect(promise).resolves.toBe('ada@example.com');
  });

  it('passes the input value to preConfirm and exposes Crystal.prompt()', async () => {
    vi.useFakeTimers();
    const preConfirm = vi.fn((value) => value.toUpperCase());
    const promise = Crystal.prompt('Code', {
      inputPlaceholder: 'Type a code',
      preConfirm
    });
    const input = Crystal.modal.querySelector('.ca-input');
    input.value = 'crystal';
    Crystal.modal.querySelector('.ca-btn-confirm').click();
    await settleClose();

    expect(preConfirm).toHaveBeenCalledWith('crystal');
    await expect(promise).resolves.toBe('CRYSTAL');
  });
});
