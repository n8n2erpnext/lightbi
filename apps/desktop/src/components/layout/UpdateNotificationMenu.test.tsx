// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/distribution-pairing', () => ({ lightBIDistributionEndpoint: () => 'https://distribution.test' }));
vi.mock('../../lib/native-runtime', () => ({ isNativeLightBI: () => true }));
vi.mock('../../lib/native-capabilities', () => ({ externalFetch: vi.fn() }));

import { useAnnouncementStore } from '../../stores/announcement-store';
import { UpdateNotificationMenu } from './UpdateNotificationMenu';

const announcement = {
  id: 'ann_bell-popover', title: 'RC notice', body: 'NEXT acceptance build is ready.',
  severity: 'info' as const, templateKind: 'general' as const, dismissible: true,
  startsAt: null, endsAt: null, linkLabel: null, linkUrl: null,
  updatedAt: '2026-09-03T05:40:00.000Z',
};
describe('UpdateNotificationMenu', () => {
  beforeEach(() => {
    localStorage.clear();
    useAnnouncementStore.setState({ items: [announcement], checkedAt: null, error: '' });
  });

  it('keeps the Bell inbox popover inside the desktop viewport instead of opening left off-screen', () => {
    render(<MemoryRouter><UpdateNotificationMenu /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'LightBI notifications' }));
    const popover = screen.getByTestId('notification-popover');
    expect(popover.className).toContain('left-0');
    expect(popover.className).toContain('max-w-[calc(100vw-2rem)]');
    expect(popover.className).not.toContain('right-0');
    expect(screen.getByText('Open notification inbox · 1 unread')).toBeTruthy();
  });
});
