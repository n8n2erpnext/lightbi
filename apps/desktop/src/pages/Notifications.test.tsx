// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAnnouncementStore } from '../stores/announcement-store';
import { Notifications } from './Notifications';

vi.mock('../lib/native-capabilities', () => ({ openExternalUrl: vi.fn() }));
vi.mock('../lib/lightbi-routing', () => ({ lightBIFrontendUrl: () => 'https://lightbi-next.test/docs' }));

const notice = {
  id: 'ann_archive-12345678', title: 'Archive me', body: 'Local inbox state only.',
  severity: 'info' as const, templateKind: 'general' as const, dismissible: true,
  startsAt: null, endsAt: null, linkLabel: null, linkUrl: null,
  updatedAt: '2026-09-03T11:00:00.000Z',
};
const renderInbox = (item = notice) => {
  useAnnouncementStore.setState({ items: [item], checkedAt: null, error: '' });
  return render(
    <MemoryRouter initialEntries={[`/notifications/${item.id}`]}>
      <Routes><Route path="/notifications/:id" element={<Notifications />} /><Route path="/notifications" element={<Notifications />} /></Routes>
    </MemoryRouter>,
  );
};

describe('Notifications local inbox actions', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it('archives a dismissible Distribution notice without deleting its local history', () => {
    renderInbox();
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    expect(useAnnouncementStore.getState().activeItems()).toHaveLength(0);
    expect(useAnnouncementStore.getState().archivedItems()).toHaveLength(1);
  });

  it('honors the Distribution dismissible=false rule', () => {
    renderInbox({ ...notice, id: 'ann_locked-12345678', dismissible: false });
    expect(screen.queryByRole('button', { name: 'Archive' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
  });
});
