// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { desktopCommands, matchesAccelerator } from './desktop-commands';

describe('desktop command registry', () => {
  it('keeps ids and accelerators unique', () => {
    expect(new Set(desktopCommands.map((item) => item.id)).size).toBe(desktopCommands.length);
    const shortcuts = desktopCommands.map((item) => item.accelerator).filter(Boolean);
    expect(new Set(shortcuts).size).toBe(shortcuts.length);
  });

  it('covers the native File/Edit/View/Help command surface', () => {
    expect(new Set(desktopCommands.map((item) => item.group))).toEqual(new Set(['File', 'Edit', 'View', 'Help']));
    for (const id of ['new-brief', 'search', 'toggle-sidebar', 'settings', 'keyboard-shortcuts', 'documentation']) {
      expect(desktopCommands.some((item) => item.id === id)).toBe(true);
    }
  });

  it('keeps NEXT Help documentation on the NEXT documentation surface', () => {
    const documentation = desktopCommands.find((item) => item.id === 'documentation');
    expect(documentation?.target).toBe('https://lightbi-next.thaiduy.digital/docs');
  });

  it('matches primary keyboard shortcuts without intercepting unrelated keys', () => {
    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
    expect(matchesAccelerator(event, 'CmdOrCtrl+K')).toBe(true);
    expect(matchesAccelerator(event, 'CmdOrCtrl+B')).toBe(false);
  });
});
