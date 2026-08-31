// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadLightBIAccount, loginLightBIEmailAccount, registerLightBIEmailAccount, requestLightBIPasswordReset } from './account-api';
import { currentLicenseTier } from './distribution-pairing';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(async (command: string) => command === 'account_session_token' ? null : undefined) }));

describe('LightBI account client',()=>{
  beforeEach(()=>{localStorage.clear();vi.restoreAllMocks();delete (window as any).__TAURI_INTERNALS__;});
  it('accepts only server-authoritative entitlement state',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({authenticated:true,account:{id:'a',email:'user@example.com',provider:'google',created_at:''},entitlement:{tier:'pro',status:'active',max_devices:2},devices:[]}),{status:200,headers:{'content-type':'application/json'}})));
    const account=await loadLightBIAccount('https://distribution.test');
    expect(account?.entitlement.tier).toBe('pro');
    expect(currentLicenseTier()).toBe('pro');
  });
  it('downgrades local state when the server rejects the session',async()=>{
    localStorage.setItem('lightbi-license-tier','pro');
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('{}',{status:401})));
    expect(await loadLightBIAccount('https://distribution.test')).toBeNull();
    expect(currentLicenseTier()).toBe('basic');
  });
  it('registers an email account without storing credentials locally',async()=>{
    const fetchMock=vi.fn().mockResolvedValue(new Response(JSON.stringify({accepted:true}),{status:202,headers:{'content-type':'application/json'}}));
    vi.stubGlobal('fetch',fetchMock);
    await registerLightBIEmailAccount({email:'user@example.com',password:'a-secure-password',displayName:'LightBI User'},'https://distribution.test');
    expect(fetchMock).toHaveBeenCalledOnce();
    const [,request]=fetchMock.mock.calls[0];
    expect(JSON.parse(String(request.body))).toEqual({email:'user@example.com',password:'a-secure-password',displayName:'LightBI User'});
    expect(localStorage.length).toBe(0);
  });
  it('signs in with email through the server-authoritative web cookie',async()=>{
    const summary={authenticated:true,account:{id:'a',email:'user@example.com',provider:'password',created_at:''},entitlement:{tier:'basic',status:'active',max_devices:1},devices:[]};
    const fetchMock=vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({authenticated:true}),{status:200,headers:{'content-type':'application/json'}}))
      .mockResolvedValueOnce(new Response(JSON.stringify(summary),{status:200,headers:{'content-type':'application/json'}}));
    vi.stubGlobal('fetch',fetchMock);
    expect((await loginLightBIEmailAccount('user@example.com','a-secure-password','https://distribution.test'))?.account.provider).toBe('password');
    expect(fetchMock.mock.calls[0][0]).toBe('https://distribution.test/api/account/login');
  });
  it('uses bearer-style native requests without credential cookies so wildcard CORS remains valid',async()=>{
    (window as any).__TAURI_INTERNALS__={};
    const fetchMock=vi.fn().mockResolvedValue(new Response(JSON.stringify({accepted:true}),{status:202,headers:{'content-type':'application/json'}}));
    vi.stubGlobal('fetch',fetchMock);
    await registerLightBIEmailAccount({email:'native@example.com',password:'a-secure-password'},'https://distribution.test');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({method:'POST',credentials:'omit'});
  });
  it('requests password reset without exposing whether the account exists',async()=>{
    const fetchMock=vi.fn().mockResolvedValue(new Response(JSON.stringify({accepted:true}),{status:202,headers:{'content-type':'application/json'}}));
    vi.stubGlobal('fetch',fetchMock);
    await requestLightBIPasswordReset('unknown@example.com','https://distribution.test');
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
