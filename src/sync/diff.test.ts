import { describe, expect, it } from 'vitest';
import { planSync } from './diff';

const local = (path: string, md5?: string, modifiedTime?: string, size = 1) => ({ vaultId: 'v', path, remoteId: path, size, md5, modifiedTime });
const remote = (path: string, md5?: string, modifiedTime?: string, size = 1) => ({ id: path, path, size, md5, modifiedTime });

describe('planSync', () => {
  it('downloads new and changed files, removes deleted ones, keeps unchanged', () => {
    const plan = planSync(
      [remote('a.md', '1'), remote('b.md', '2'), remote('new.html', '9')],
      [local('a.md', '1'), local('b.md', 'old'), local('gone.md', '3')],
      new Set(['a.md', 'b.md', 'gone.md']),
    );
    expect(plan.download.map((d) => d.path).sort()).toEqual(['b.md', 'new.html']);
    expect(plan.remove).toEqual(['gone.md']);
    expect(plan.unchanged).toBe(1);
  });

  it('falls back to modifiedTime and size when there is no md5', () => {
    const plan = planSync(
      [remote('a', undefined, 't1'), remote('b', undefined, 't2'), remote('c', undefined, 't1', 5)],
      [local('a', undefined, 't1'), local('b', undefined, 't1'), local('c', undefined, 't1', 4)],
      new Set(['a', 'b', 'c']),
    );
    expect(plan.download.map((d) => d.path)).toEqual(['b', 'c']);
  });

  it('re-downloads when the stored body is missing', () => {
    const plan = planSync([remote('a.md', '1')], [local('a.md', '1')], new Set());
    expect(plan.download).toHaveLength(1);
  });
});
