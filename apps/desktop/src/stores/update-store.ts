import { create } from 'zustand';
import type { LightBIReleaseArtifact, LightBIReleaseManifest } from '@lightbi/core-types';
import { lightBIDistributionEndpoint } from '../lib/distribution-pairing';
import { isNativeLightBI } from '../lib/native-runtime';
import { trackUpdateEvent } from '../lib/app-usage-telemetry';

export type UpdateStatus = 'idle' | 'checking' | 'up_to_date' | 'available' | 'downloading' | 'failed';

export function compareAppVersions(left: string, right: string): number {
  const parse = (value: string) => { const [core, pre=''] = value.replace(/^v/,'').split('-',2); return { core:core.split('.').map(Number), pre }; };
  const a=parse(left),b=parse(right);
  for(let index=0;index<3;index+=1){const av=a.core[index]||0,bv=b.core[index]||0;if(av!==bv)return av>bv?1:-1;}
  if(a.pre===b.pre)return 0;if(!a.pre)return 1;if(!b.pre)return -1;return a.pre.localeCompare(b.pre,undefined,{numeric:true});
}

export function currentReleasePlatform(userAgent = navigator.userAgent, platform = navigator.platform): 'windows' | 'linux' | 'macos' | null {
  const value = `${userAgent} ${platform}`.toLowerCase();
  if (value.includes('windows') || value.includes('win32') || value.includes('win64')) return 'windows';
  if (value.includes('linux') || value.includes('x11')) return 'linux';
  if (value.includes('macintosh') || value.includes('mac os') || value.includes('macintel')) return 'macos';
  return null;
}

type UpdateStore = {
  status: UpdateStatus;
  manifest: LightBIReleaseManifest | null;
  artifact: LightBIReleaseArtifact | null;
  error: string;
  checkedAt: number | null;
  check: (force?: boolean) => Promise<void>;
  install: () => Promise<void>;
};

export const useUpdateStore = create<UpdateStore>((set,get)=>({
  status:'idle',manifest:null,artifact:null,error:'',checkedAt:null,
  check:async(force=false)=>{
    if(!isNativeLightBI())return;
    if(!force&&get().checkedAt&&Date.now()-get().checkedAt!<6*60*60*1000)return;
    set({status:'checking',error:''});
    try{
      const response=await fetch(`${lightBIDistributionEndpoint()}/api/releases/latest`);
      if(!response.ok)throw new Error('Update service is temporarily unavailable.');
      const catalog=await response.json() as {latest?:LightBIReleaseManifest};
      const manifest=catalog.latest;
      if(!manifest||manifest.schema_version!=='lightbi.release.v1')throw new Error('Update manifest is invalid.');
      const platform=currentReleasePlatform();
      if(!platform)throw new Error('This operating system is not supported by the native updater.');
      const artifact=manifest.artifacts.find(item=>item.platform===platform&&item.architecture==='x86_64')??manifest.artifacts.find(item=>item.platform===platform)??null;
      if(!artifact)throw new Error(`No compatible ${platform} artifact is available.`);
      const current=import.meta.env.VITE_LIGHTBI_VERSION??'0.9.1-beta.7';
      const available=compareAppVersions(manifest.version,current)>0;
      set({status:available?'available':'up_to_date',manifest,artifact,checkedAt:Date.now(),error:''});
      if(available)trackUpdateEvent('update_available');
    }catch(cause){set({status:'failed',error:cause instanceof Error?cause.message:'Update check failed.',checkedAt:Date.now()});}
  },
  install:async()=>{
    const {artifact}=get();if(!artifact)return;
    set({status:'downloading',error:''});trackUpdateEvent('update_download_started');
    try{
      const {invoke}=await import('@tauri-apps/api/core');
      await invoke('install_verified_update',{url:artifact.url,sha256:artifact.sha256});
      trackUpdateEvent('update_install_started');
    }catch(cause){trackUpdateEvent('update_download_failed');set({status:'failed',error:cause instanceof Error?cause.message:'Update failed.'});}
  },
}));
