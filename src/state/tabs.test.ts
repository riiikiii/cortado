import { beforeEach, describe, expect, it } from 'vitest';

class MemoryStorage {
  private m = new Map<string, string>();
  getItem = (k: string) => this.m.get(k) ?? null;
  setItem = (k: string, v: string) => void this.m.set(k, String(v));
  removeItem = (k: string) => void this.m.delete(k);
  clear = () => this.m.clear();
}
Object.assign(globalThis, { localStorage: new MemoryStorage(), window: { innerWidth: 1200 } });

const { useStore } = await import('./store');
const s = () => useStore.getState();
const paths = () => s().tabs.map((t) => t.path);

beforeEach(() => {
  useStore.setState({ activeVaultId: 'v', tabs: [], activeTabId: null, mru: [], recent: [], progress: {} });
});

describe('tabs', () => {
  it('opens the first file in a new tab, then replaces it in the same tab', () => {
    s().openFile('a.md');
    expect(paths()).toEqual(['a.md']);
    const id = s().activeTabId;
    s().openFile('b.md');
    expect(paths()).toEqual(['b.md']);
    expect(s().activeTabId).toBe(id);
  });

  it('always opens in the current tab, even when the file is open in another tab', () => {
    s().openFile('a.md');
    s().newTab();
    s().openFile('b.md');
    s().activateTab(s().tabs[1].id);
    s().openFile('a.md');
    expect(paths()).toEqual(['a.md', 'a.md']);
    expect(s().activeTabId).toBe(s().tabs[1].id);
  });

  it('adds an empty tab at the end with +, and the next file fills it', () => {
    s().openFile('a.md');
    s().openFile('b.md', { newTab: true });
    s().activateTab(s().tabs[0].id);
    s().newTab();
    expect(paths()).toEqual(['a.md', 'b.md', null]);
    expect(s().activeTabId).toBe(s().tabs[2].id);
    s().openFile('c.md');
    expect(paths()).toEqual(['a.md', 'b.md', 'c.md']);
  });

  it('opens ⌘-clicked links in a new tab next to the current one', () => {
    s().openFile('a.md');
    s().openFile('b.md', { newTab: true });
    s().activateTab(s().tabs[0].id);
    s().openFile('c.md', { newTab: true });
    expect(paths()).toEqual(['a.md', 'c.md', 'b.md']);
  });

  it('goes back to the home screen when every tab is closed', () => {
    s().openFile('a.md');
    s().newTab();
    s().closeAllTabs();
    expect(s().tabs).toEqual([]);
    expect(s().activeTabId).toBeNull();
  });
});
