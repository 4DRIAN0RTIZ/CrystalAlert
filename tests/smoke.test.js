import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const source = readFileSync(resolve(__dirname, '../crystal-alert.js'), 'utf8');

const load = new Function(`${source}\n;return { Crystal, CrystalAlert };`);
const { Crystal, CrystalAlert } = load();

describe('crystal-alert public API', () => {
	it('exposes the Crystal singleton as a CrystalAlert instance', () => {
		expect(Crystal).toBeInstanceOf(CrystalAlert);
	});

	it('exposes fire() and toast() as functions', () => {
		expect(typeof Crystal.fire).toBe('function');
		expect(typeof Crystal.toast).toBe('function');
	});
});
