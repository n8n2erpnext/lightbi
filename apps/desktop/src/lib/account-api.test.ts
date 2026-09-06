// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { beginLightBIGoogleLogin, completeLightBIAccountMfa, LightBIDeviceLimitError, loadLightBIAccount, loginLightBIEmailAccount, registerLightBIEmailAccount, replaceLightBIDeviceSlot, requestLightBIPasswordReset } from './account-api';
import { currentLicenseTier } from './distribution-pairing';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(async (command: string) => command === 'account_session_token' ? null : undefined) }));
vi.mock('@tauri-apps/plugin-opener', () => ({ openUrl: vi.fn(async () => undefined) }));

describe('LightBI account client',()=>{
  beforeEach(()=>{localStorage.clear();vi.restoreAllMocks();vi.unstubAllEnvs();delete (window as any).__TAURI_INTERNALS__;});
  it('accepts only server-authoritative entitlement state',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({authenticated:true,account:{id:'a',email:'user@example.com',provider:'google',created_at:''},entitlement:{tier:'pro',status:'active',max_devices:2},devices:[]}),{status:200,headers:{'content-type':'application/json'}})));
    const account=await loadLightBIAccount('https://distribution.test');
    expect(account?.entitlement.tier).toBe('pro');
    expect(currentLicenseTier()).toBe('pro');
  });
  it('single-flights concurrent account session refreshes for the same endpoint',async()=>{
    const fetchMock=vi.fn(async()=>{
      await new Promise(resolve=>setTimeout(resolve,10));
      return new Response(JSON.stringify({authenticated:false}),{status:401,headers:{'content-type':'application/json'}});
    });
    vi.stubGlobal('fetch',fetchMock);
    const [first,second]=await Promise.all([
      loadLightBIAccount('https://distribution.test'),
      loadLightBIAccount('https://distribution.test'),
    ]);
    expect(first).toBeNull();
    expect(second).toBeNull();
    expect(fetchMock).toHaveBeenCalledOnce();
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
        const payload=url.endsWith('/api/account/native/mfa/verify')?{ok:true,data:{status:'authenticated',sessionKind:'native',token:'native-token'}}:summary;
        return {status:200,headers:{'content-type':'application/json'},body:Array.from(new TextEncoder().encode(JSON.stringify(payload)))};
      }
      return undefined;
    });
    const account=await completeLightBIAccountMfa('challenge-12345678901234567890','totp','123456','https://distribution.test');
    expect(account?.account.email).toBe('user@example.com');
    expect(invoke).toHaveBeenCalledWith('store_account_session_token',{token:'native-token'});
  });

  it('persists a native email login token before the authenticated session read',async()=>{
    (window as any).__TAURI_INTERNALS__={};
    let token:string|null=null;
    const summary={authenticated:true,account:{id:'acct-native-email',email:'native@example.com',provider:'password',created_at:''},entitlement:{tier:'basic',status:'active',max_devices:1},devices:[]};
    vi.mocked(invoke).mockImplementation(async (command:string,args?:any)=>{
      if(command==='ensure_installation_trust')return {status:'issued'} as any;
      if(command==='account_session_token')return token;
      if(command==='store_account_session_token'){token=args?.token??null;return undefined;}
      if(command==='native_http_request'){
        const request=args?.request;
        if(String(request?.url).endsWith('/api/account/login'))return {status:200,headers:{'content-type':'application/json'},body:Array.from(new TextEncoder().encode(JSON.stringify({authenticated:true,token:'native-email-token'}))),signedTransport:true};
        if(String(request?.url).endsWith('/api/account/session')){
          expect(request.headers.authorization).toBe('Bearer native-email-token');
          return {status:200,headers:{'content-type':'application/json'},body:Array.from(new TextEncoder().encode(JSON.stringify(summary))),signedTransport:true};
        }
      }
      return undefined;
    });
    const result=await loginLightBIEmailAccount('native@example.com','a-secure-password','https://distribution.test');
    expect(result.status).toBe('authenticated');
    expect(token).toBe('native-email-token');
  });

  it('routes native MFA through protected account transport and persists its token',async()=>{
    (window as any).__TAURI_INTERNALS__={};
    let token:string|null=null;
    const summary={authenticated:true,account:{id:'acct-native-mfa',email:'mfa@example.com',provider:'password',created_at:''},entitlement:{tier:'basic',status:'active',max_devices:1},devices:[]};
    vi.mocked(invoke).mockImplementation(async (command:string,args?:any)=>{
      if(command==='ensure_installation_trust')return {status:'issued'} as any;
      if(command==='account_session_token')return token;
      if(command==='store_account_session_token'){token=args?.token??null;return undefined;}
      if(command==='native_http_request'){
        const request=args?.request;
        if(String(request?.url).endsWith('/api/account/native/mfa/verify'))return {status:200,headers:{'content-type':'application/json'},body:Array.from(new TextEncoder().encode(JSON.stringify({ok:true,data:{status:'authenticated',sessionKind:'native',token:'native-mfa-token'}}))),signedTransport:true};
        if(String(request?.url).endsWith('/api/account/session')){
          expect(request.headers.authorization).toBe('Bearer native-mfa-token');
          return {status:200,headers:{'content-type':'application/json'},body:Array.from(new TextEncoder().encode(JSON.stringify(summary))),signedTransport:true};
        }
        throw new Error(`unexpected native URL: ${request?.url}`);
      }
      return undefined;
    });
    const account=await completeLightBIAccountMfa('challenge-12345678901234567890','totp','123456','https://distribution.test');
    expect(account?.account.id).toBe('acct-native-mfa');
    expect(token).toBe('native-mfa-token');
  });

  it('clears a stale native bearer when the authoritative session is unauthenticated',async()=>{
    (window as any).__TAURI_INTERNALS__={};
    let token:string|null='stale-native-token';
    vi.mocked(invoke).mockImplementation(async (command:string,args?:any)=>{
      if(command==='ensure_installation_trust')return {status:'issued'} as any;
      if(command==='account_session_token')return token;
      if(command==='store_account_session_token'){token=args?.token??null;return undefined;}
      if(command==='native_http_request')return {status:401,headers:{'content-type':'application/json'},body:Array.from(new TextEncoder().encode('{"authenticated":false}')),signedTransport:true};
      return undefined;
    });
    expect(await loadLightBIAccount('https://distribution.test')).toBeNull();
    expect(token).toBeNull();
  });

  it('persists the native Google handoff token before reading the desktop session',async()=>{
    vi.useFakeTimers();
    try{
      (window as any).__TAURI_INTERNALS__={};
      let token:string|null=null;
      const summary={authenticated:true,account:{id:'acct-google',email:'google@example.com',provider:'google',created_at:''},entitlement:{tier:'basic',status:'active',max_devices:1},devices:[]};
      vi.mocked(invoke).mockImplementation(async (command:string,args?:any)=>{
        if(command==='ensure_installation_trust')return {status:'issued'} as any;
        if(command==='account_session_token')return token;
        if(command==='store_account_session_token'){token=args?.token??null;return undefined;}
        if(command==='native_http_request'){
          const request=args?.request;
          if(String(request?.url).endsWith('/api/account/device-login/start'))return {status:200,headers:{'content-type':'application/json'},body:Array.from(new TextEncoder().encode(JSON.stringify({loginId:'login-google',authorizationUrl:'https://lightbi-next.example/api/auth/google/native-start?state=state-12345678901234567890',expiresIn:60}))),signedTransport:true};
          if(String(request?.url).endsWith('/api/account/device-login/status'))return {status:200,headers:{'content-type':'application/json'},body:Array.from(new TextEncoder().encode(JSON.stringify({status:'complete',token:'native-google-token'}))),signedTransport:true};
          if(String(request?.url).endsWith('/api/account/session')){
            expect(request.headers.authorization).toBe('Bearer native-google-token');
            return {status:200,headers:{'content-type':'application/json'},body:Array.from(new TextEncoder().encode(JSON.stringify(summary))),signedTransport:true};
          }
        }
        return undefined;
      });
      const pending=beginLightBIGoogleLogin('https://distribution.test');
      await vi.advanceTimersByTimeAsync(1600);
      const account=await pending;
      expect(account?.account.provider).toBe('google');
      expect(token).toBe('native-google-token');
    }finally{vi.useRealTimers();}
  });

  it('surfaces a native email device-slot limit as an explicit replacement handoff',async()=>{
    (window as any).__TAURI_INTERNALS__={};
    vi.mocked(invoke).mockImplementation(async (command:string,args?:any)=>{
      if(command==='ensure_installation_trust')return {status:'issued'} as any;
      if(command==='account_session_token')return null;
      if(command==='native_http_request'&&String(args?.request?.url).endsWith('/api/account/login'))return {status:200,headers:{'content-type':'application/json'},body:Array.from(new TextEncoder().encode(JSON.stringify({authenticated:false,mfaRequired:false,passkeyRequired:false,deviceLimitReached:true,nativeLoginId:'login-device-limit',replacementUrl:'https://lightbi-next.example/account#device-replace=token-123',expiresIn:600,maxDevices:1}))),signedTransport:true};
      return undefined;
    });
    const result=await loginLightBIEmailAccount('native@example.com','a-secure-password','https://distribution.test');
    expect(result).toEqual({status:'device_limit',deviceLimit:{loginId:'login-device-limit',replacementUrl:'https://lightbi-next.example/account#device-replace=token-123',expiresIn:600,maxDevices:1}});
  });

  it('keeps polling the same native login after explicit device replacement and stores the resulting token',async()=>{
    vi.useFakeTimers();
    try{
      (window as any).__TAURI_INTERNALS__={};
      let token:string|null=null;let statusReads=0;
      const summary={authenticated:true,account:{id:'acct-replaced',email:'replace@example.com',provider:'google',created_at:''},entitlement:{tier:'basic',status:'active',max_devices:1},devices:[]};
      vi.mocked(invoke).mockImplementation(async (command:string,args?:any)=>{
        if(command==='ensure_installation_trust')return {status:'issued'} as any;
        if(command==='account_session_token')return token;
        if(command==='store_account_session_token'){token=args?.token??null;return undefined;}
        if(command==='native_http_request'){
          const request=args?.request;
          if(String(request?.url).endsWith('/api/account/device-login/status')){
            statusReads+=1;
            const payload=statusReads===1?{status:'device_limit',expiresIn:600}:{status:'complete',token:'replacement-native-token'};
            return {status:200,headers:{'content-type':'application/json'},body:Array.from(new TextEncoder().encode(JSON.stringify(payload))),signedTransport:true};
          }
          if(String(request?.url).endsWith('/api/account/session')){
            expect(request.headers.authorization).toBe('Bearer replacement-native-token');
            return {status:200,headers:{'content-type':'application/json'},body:Array.from(new TextEncoder().encode(JSON.stringify(summary))),signedTransport:true};
          }
        }
        return undefined;
      });
      const pending=replaceLightBIDeviceSlot({loginId:'login-device-limit',replacementUrl:'https://lightbi-next.example/account#device-replace=token-123',expiresIn:600,maxDevices:1},'https://distribution.test');
      await vi.advanceTimersByTimeAsync(3200);
      const account=await pending;
      expect(account?.account.id).toBe('acct-replaced');
      expect(token).toBe('replacement-native-token');
      expect(statusReads).toBeGreaterThanOrEqual(2);
    }finally{vi.useRealTimers();}
  });

  it('turns Google polling device-limit state into a resumable typed error instead of a raw server error',async()=>{
    vi.useFakeTimers();
    try{
      (window as any).__TAURI_INTERNALS__={};
      vi.mocked(invoke).mockImplementation(async (command:string,args?:any)=>{
        if(command==='ensure_installation_trust')return {status:'issued'} as any;
        if(command==='account_session_token')return null;
        if(command==='native_http_request'){
          const request=args?.request;
          if(String(request?.url).endsWith('/api/account/device-login/start'))return {status:200,headers:{'content-type':'application/json'},body:Array.from(new TextEncoder().encode(JSON.stringify({loginId:'login-google-limit',authorizationUrl:'https://lightbi-next.example/api/auth/google/native-start?state=state-12345678901234567890',expiresIn:60}))),signedTransport:true};
          if(String(request?.url).endsWith('/api/account/device-login/status'))return {status:200,headers:{'content-type':'application/json'},body:Array.from(new TextEncoder().encode(JSON.stringify({status:'device_limit',replacementUrl:'https://lightbi-next.example/account#device-replace=google-token',expiresIn:600,maxDevices:3}))),signedTransport:true};
        }
        return undefined;
      });
      const pending=beginLightBIGoogleLogin('https://distribution.test').catch(error=>error);
      await vi.advanceTimersByTimeAsync(1600);
      const failure=await pending;
      expect(failure).toMatchObject({name:'LightBIDeviceLimitError',details:{loginId:'login-google-limit',maxDevices:3}} satisfies Partial<LightBIDeviceLimitError>);
    }finally{vi.useRealTimers();}
  });

  it('requests password reset without exposing whether the account exists',async()=>{
    const fetchMock=vi.fn().mockResolvedValue(new Response(JSON.stringify({accepted:true}),{status:202,headers:{'content-type':'application/json'}}));
    vi.stubGlobal('fetch',fetchMock);
    await requestLightBIPasswordReset('unknown@example.com','https://distribution.test');
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
