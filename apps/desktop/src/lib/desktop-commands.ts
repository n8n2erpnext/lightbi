import registry from './desktop-command-registry.json';

export type DesktopCommand = {
  id: string;
  label: string;
  group: 'File' | 'Edit' | 'View' | 'Help';
  accelerator: string | null;
  kind: 'route' | 'ui' | 'url';
  target: string;
};

export const desktopCommands = registry as DesktopCommand[];

export const desktopCommandById = (id: string) =>
  desktopCommands.find((command) => command.id === id) ?? null;

export const displayAccelerator = (accelerator: string | null) =>
  accelerator?.replace('CmdOrCtrl', navigator.platform?.toLowerCase().includes('mac') ? '⌘' : 'Ctrl') ?? '';

const normalizeKey = (value: string) => value.length === 1 ? value.toLowerCase() : value.toLowerCase();

export function matchesAccelerator(event: KeyboardEvent, accelerator: string | null): boolean {
  if (!accelerator) return false;
  const parts = accelerator.split('+');
  const key = normalizeKey(parts.at(-1) ?? '');
  const primary = parts.includes('CmdOrCtrl');
  const ctrlOrMeta = event.ctrlKey || event.metaKey;
  if (primary !== ctrlOrMeta) return false;
  if (parts.includes('Shift') !== event.shiftKey) return false;
  if (parts.includes('Alt') !== event.altKey) return false;
  return normalizeKey(event.key) === key;
}
