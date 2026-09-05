// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { completeLightBIAccountMfa, loadLightBIAccount, loginLightBIEmailAccount, registerLightBIEmailAccount, requestLightBIPasswordReset } from './account-api';
import { currentLicenseTier } from './distribution-pairing';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(async (command: string) => command === 'account_session_token' ? null : undefined) }));

describe('LightBI account client',()=>{
  beforeEach(()=>{localStorage.clear();vi.restoreAllMocks();vi.unstubAllEnvs();delete (window as any).__TAURI_INTERNALS__;});
  it('accepts only server-authoritative entitlement state',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({authenticated:true,account:{id:'a',email:'user@example.com',provider:'google',created_at:''},entitlement:{tier:'pro',status:'active',max_devices:2},devices:[]}),{status:200,headers:{'content-type':'application/json'}})));
    const account=await loadLightBIAccount('https://distribution.test');
    expect(account?.entitlement.tier).toBe('pro');
    expect(currentLicenseTier()).toBe('pro');
  });
  it('downgrades local state when the server rejects the session',async()=>{
    localStorage.setItem('lightbi-license-tier','pro');
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({authenticated:false}),{status:401,headers:{'content-type':'application/json'}})));
    expect(await loadLightBIAccount('https://distribution.test')).toBeNull();
    expect(currentLicenseTier()).toBe('basic');
  });
  it('does not misclassify a signed-transport 401 as an unauthenticated account session',async()=>{
    localStorage.setItem('lightbi-license-tier','pro');
    localStorage.setItem('lightbi-account-entitlement-checked-at',String(Date.now()));
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({error:'attestation_device_signature_invalid'}),{status:401,headers:{'content-type':'application/json'}})));
    await expect(loadLightBIAccount('https://distribution.test')).rejects.toThrow(/attestation_device_signature_invalid/);
    expect(currentLicenseTier()).toBe('pro');
  });
  it('keeps recent Pro state during a temporary account-service outage',async()=>{
    localStorage.setItem('lightbi-license-tier','pro');
    localStorage.setItem('lightbi-account-entitlement-checked-at',String(Date.now()));
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({error:'temporary_unavailable'}),{status:503,headers:{'content-type':'application/json'}})));
    await expect(loadLightBIAccount('https://distribution.test')).rejects.toThrow(/temporary_unavailable/);
    expect(currentLicenseTier()).toBe('pro');
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
    const result=await loginLightBIEmailAccount('user@example.com','a-secure-password','https://distribution.test');
    expect(result.status).toBe('authenticated');
    if(result.status==='authenticated')expect(result.account?.account.provider).toBe('password');
    expect(fetchMock.mock.calls[0][0]).toBe('https://distribution.test/api/account/login');
  });
  it('moves native account requests through the Tauri transport instead of WebView cookies/CORS',async()=>{
    (window as any).__TAURI_INTERNALS__={};
    vi.mocked(invoke).mockImplementation(async (command: string) => {
      if(command==='account_session_token')return null;
      if(command==='native_http_request')return {status:202,headers:{'content-type':'application/json'},body:Array.from(new TextEncoder().encode('{"accepted":true}'))};
      return undefined;
    });
    await registerLightBIEmailAccount({email:'native@example.com',password:'a-secure-password'},'https://distribution.test');
    expect(invoke).toHaveBeenCalledWith('native_http_request',expect.objectContaining({request:expect.objectContaining({url:'https://distribution.test/api/account/register',method:'POST'})}));
  });
  it('awaits native installation trust before sending a protected account request',async()=>{
    vi.stubEnv('VITE_LIGHTBI_CHANNEL','internal');
    (window as any).__TAURI_INTERNALS__={};
    const order:string[]=[];
    vi.mocked(invoke).mockImplementation(async (command: string,args?:any) => {
      if(command==='ensure_installation_trust'){
        order.push('trust');
        return {status:'issued',installationId:args?.installationId,releaseId:'release:test',certificateId:'cert-test',expiresAt:new Date(Date.now()+60*60*1000).toISOString(),runtimeSha256:'a'.repeat(64),runtimeSize:1,productionAuthority:false};
      }
      if(command==='account_session_token')return null;
      if(command==='native_http_request'){
        order.push('request');
        return {status:202,headers:{'content-type':'application/json'},body:Array.from(new TextEncoder().encode('{"accepted":true}')),signedTransport:true};
      }
      return undefined;
    });
    await registerLightBIEmailAccount({email:'native@example.com',password:'a-secure-password'},'https://distribution.test');
    expect(order).toEqual(['trust','request']);
  });
  it('repairs a local certificate-key mismatch once before retrying the protected request',async()=>{
    vi.stubEnv('VITE_LIGHTBI_CHANNEL','internal');
    (window as any).__TAURI_INTERNALS__={};
    const order:string[]=[];
    let requestCount=0;
    vi.mocked(invoke).mockImplementation(async (command: string,args?:any) => {
      if(command==='ensure_installation_trust'){
        order.push('trust');
        return {status:'issued',installationId:args?.installationId,releaseId:'release:test',certificateId:'cert-test',expiresAt:new Date(Date.now()+3600000).toISOString(),runtimeSha256:'a'.repeat(64),runtimeSize:1,productionAuthority:false};
      }
      if(command==='account_session_token')return null;
      if(command==='native_http_request'){
        requestCount+=1; order.push(`request-${requestCount}`);
        if(requestCount===1)throw new Error('Signed transport required: Installation certificate device-key binding mismatch.');
        return {status:202,headers:{'content-type':'application/json'},body:Array.from(new TextEncoder().encode('{"accepted":true}')),signedTransport:true};
      }
      return undefined;
    });
    await registerLightBIEmailAccount({email:'native@example.com',password:'a-secure-password'},'https://distribution.test');
    expect(order).toEqual(['trust','request-1','trust','request-2']);
  });
  it('returns the server MFA challenge instead of misreporting a successful password as sign-in failure',async()=>{
    const fetchMock=vi.fn().mockResolvedValue(new Response(JSON.stringify({authenticated:false,mfaRequired:true,challengeId:'challenge-12345678901234567890',methods:['totp','recovery'],expiresIn:300}),{status:200,headers:{'content-type':'application/json'}}));
    vi.stubGlobal('fetch',fetchMock);
    const result=await loginLightBIEmailAccount('user@example.com','a-secure-password','https://distribution.test');
    expect(result).toMatchObject({status:'mfa_required',methods:['totp','recovery'],expiresIn:300});
  });

  it('stores a native token only after a valid MFA challenge completes',async()=>{
    (window as any).__TAURI_INTERNALS__={};
    const summary={authenticated:true,account:{id:'a',email:'user@example.com',provider:'password',created_at:''},entitlement:{tier:'basic',status:'active',max_devices:1},devices:[]};
    vi.mocked(invoke).mockImplementation(async (command: string,args?:any) => {
      if(command==='account_session_token')return command==='account_session_token'? (vi.mocked(invoke).mock.calls.some(call=>call[0]==='store_account_session_token')?'native-token':null):null;
      if(command==='store_account_session_token')return undefined;
      if(command==='native_http_request'){
        const url=args?.request?.url as string;
        const payload=url.endsWith('/api/v1/account/mfa/verify')?{ok:true,data:{status:'authenticated',sessionKind:'native',token:'native-token'}}:summary;
        return {status:200,headers:{'content-type':'application/json'},body:Array.from(new TextEncoder().encode(JSON.stringify(payload)))};
      }
      return undefined;
    });
    const account=await completeLightBIAccountMfa('challenge-12345678901234567890','totp','123456','https://distribution.test');
    expect(account?.account.email).toBe('user@example.com');
    expect(invoke).toHaveBeenCalledWith('store_account_session_token',{token:'native-token'});
  });

  it('requests password reset without exposing whether the account exists',async()=>{
    const fetchMock=vi.fn().mockResolvedValue(new Response(JSON.stringify({accepted:true}),{status:202,headers:{'content-type':'application/json'}}));
    vi.stubGlobal('fetch',fetchMock);
    await requestLightBIPasswordReset('unknown@example.com','https://distribution.test');
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
