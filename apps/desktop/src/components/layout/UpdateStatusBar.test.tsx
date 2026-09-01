// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { UpdateStatusBar } from './UpdateStatusBar';
import { useUpdateStore } from '../../stores/update-store';

const manifest = { schema_version:'lightbi.release.v1', product:'digital.thaiduy.lightbi', version:'0.9.3-test', channel:'beta', published_at:'2026-09-01T00:00:00Z', release_notes:'test', artifacts:[] } as any;
describe('global update status bar',()=>{
  beforeEach(()=>{localStorage.clear();useUpdateStore.setState({status:'idle',manifest:null,artifact:null,prepared:null,progress:null,error:'',checkedAt:null,dismissedVersion:null,qaSimulation:false});});
  it('shows deterministic 0-100 download progress and ready affordance',()=>{
    useUpdateStore.setState({status:'downloading',manifest,progress:42});
    const view=render(<UpdateStatusBar/>);
    expect(screen.getByTestId('global-update-percent').textContent).toBe('42%');
    useUpdateStore.setState({status:'ready',manifest,progress:100,prepared:{version:'0.9.3-test',artifact:'x.exe',sha256:'a'.repeat(64),reused:false,ready:true}});
    view.rerender(<UpdateStatusBar/>);
    expect(screen.getByText(/ready to install/i)).toBeTruthy();
    expect(screen.getByRole('button',{name:/update now/i})).toBeTruthy();
  });
  it('lets the user hide a version without cancelling the updater state',()=>{
    useUpdateStore.setState({status:'downloading',manifest,progress:12});
    render(<UpdateStatusBar/>);
    screen.getAllByRole('button',{name:'Hide'})[0].click();
    expect(useUpdateStore.getState().status).toBe('downloading');
    expect(useUpdateStore.getState().dismissedVersion).toBe('0.9.3-test');
  });
});
