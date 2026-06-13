import { beforeEach, describe, expect, it } from 'vitest';
import { useUiStore } from './ui.store';

describe('useUiStore – sidebar collapse', () => {
  beforeEach(() => {
    localStorage.clear();
    useUiStore.setState({ sidebarCollapsed: false });
  });

  it('defaults to expanded (not collapsed)', () => {
    expect(useUiStore.getState().sidebarCollapsed).toBe(false);
  });

  it('toggleSidebar flips the collapsed flag', () => {
    useUiStore.getState().toggleSidebar();
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);

    useUiStore.getState().toggleSidebar();
    expect(useUiStore.getState().sidebarCollapsed).toBe(false);
  });

  it('setSidebarCollapsed sets the flag explicitly', () => {
    useUiStore.getState().setSidebarCollapsed(true);
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);

    useUiStore.getState().setSidebarCollapsed(false);
    expect(useUiStore.getState().sidebarCollapsed).toBe(false);
  });
});
