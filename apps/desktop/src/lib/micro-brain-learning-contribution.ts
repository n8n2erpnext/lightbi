import { getOrCreateInstallationId, anonymousPairingEnabled, lightBIDistributionEndpoint } from './distribution-pairing';
import { buildGenerationManifest } from './generation-manifest';
import { signedNativeFetch } from './native-capabilities';
import { isNativeLightBI, requireNativeInstallationTrust } from './native-runtime';
import {
  consumeMicroBrainLearningEvidence,
  readMicroBrainLearningState,
  snapshotMicroBrainLearningEvidence,
  type MicroBrainLearningEvidenceSnapshot,
} from './micro-brain-privacy';

const PENDING_KEY = 'lightbi.micro-brain.contribution.pending.v1';
const WITHDRAWAL_KEY = 'lightbi.micro-brain.contribution.withdrawal-pending.v1';
const PART_BYTES = 16 * 1024 * 1024;
const MAX_PART_WINDOW = 32;

type LearningJob = { id:string; payload?:{ maxBytes?:number } };
type PollResult = { job:LearningJob|null; pollAfterSeconds?:number; pollJitterSeconds?:number };
type StagedPackage = { packageId:string; compressedBytes:number; manifest:Record<string,unknown> };
type PendingContribution = { schemaVersion:'lightbi.micro-brain.contribution.pending.v1'; jobId:string; packageId:string; compressedBytes:number; manifest:Record<string,unknown>; evidence:MicroBrainLearningEvidenceSnapshot };
type Prepared = { jobId:string; deduplicated?:boolean; completed?:boolean; mode?:'single'|'multipart'; expectedBytes?:number; grant?:{url:string}; totalParts?:number; uploadedParts?:Array<{partNumber:number;etag:string;sizeBytes:number}> };

type NativeUploadResult={uploadedBytes:number;etag:string;status:number};
let timer:number|null=null, running=false, stopped=false;

function pendingStorage(): Storage | null { try{return typeof localStorage==='undefined'?null:localStorage;}catch{return null;} }
function readPending():PendingContribution|null{try{const value=JSON.parse(pendingStorage()?.getItem(PENDING_KEY)||'null');return value?.schemaVersion==='lightbi.micro-brain.contribution.pending.v1'?value:null;}catch{return null;}}
function writePending(value:PendingContribution|null){try{const storage=pendingStorage();if(!storage)return;value?storage.setItem(PENDING_KEY,JSON.stringify(value)):storage.removeItem(PENDING_KEY);}catch{}}
function readWithdrawalPending():boolean{try{return pendingStorage()?.getItem(WITHDRAWAL_KEY)==='1';}catch{return false;}}
function writeWithdrawalPending(value:boolean){try{const storage=pendingStorage();if(!storage)return;value?storage.setItem(WITHDRAWAL_KEY,'1'):storage.removeItem(WITHDRAWAL_KEY);}catch{}}
async function invoke<T>(command:string,args:Record<string,unknown>):Promise<T>{const api=await import('@tauri-apps/api/core');return api.invoke<T>(command,args);}
async function api<T>(path:string,init:RequestInit={}):Promise<T>{const endpoint=lightBIDistributionEndpoint();const response=await signedNativeFetch(`${endpoint}/api/micro-brain/learning/${path}`,init);const value=await response.json().catch(()=>({})) as Record<string,unknown>;if(!response.ok)throw new Error(typeof value.error==='string'?value.error:`micro_brain_learning_http_${response.status}`);return value as T;}
function json(body:unknown):RequestInit{return{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}};
function contributionStillAllowed(pending?:PendingContribution){const state=readMicroBrainLearningState();if(!state.learningEnabled||!anonymousPairingEnabled())return false;if(pending&&(state.evidence.retrievals<pending.evidence.retrievals||state.evidence.abstentions<pending.evidence.abstentions))return false;return true;}
async function discardLocal(packageId:string){await invoke('discard_micro_brain_learning_package',{packageId}).catch(()=>undefined);}
export async function requestMicroBrainRemoteWithdrawal():Promise<boolean>{
  writeWithdrawalPending(true);
  const pending=readPending();if(pending){await discardLocal(pending.packageId);writePending(null);}
  if(!isNativeLightBI()||import.meta.env.VITE_LIGHTBI_CHANNEL!=='internal')return false;
  try{
    const installationId=getOrCreateInstallationId();await requireNativeInstallationTrust(installationId);
    for(let attempt=0;attempt<4;attempt+=1){const result=await api<{complete:boolean;cleanupPending?:number}>('consent/withdraw',json({}));if(result.complete){writeWithdrawalPending(false);return true;}}
  }catch{/* durable local intent is retried by the contribution loop */}
  return false;
}
async function abortPending(pending:PendingContribution){await discardLocal(pending.packageId);await api('abort',json({jobId:pending.jobId}));writePending(null);}

async function stage(job:LearningJob):Promise<PendingContribution|null>{const evidence=snapshotMicroBrainLearningEvidence();if(evidence.abstentions<=0){await api('skip',json({jobId:job.id,reason:'no_local_learning_evidence'}));return null;}const generation=buildGenerationManifest();const staged=await invoke<StagedPackage>('stage_micro_brain_learning_package',{request:{abstentions:evidence.abstentions,generationId:generation.generation_id,appVersion:generation.app_version,platform:navigator.platform||'unknown',domain:'cross_domain'}});const pending:PendingContribution={schemaVersion:'lightbi.micro-brain.contribution.pending.v1',jobId:job.id,packageId:staged.packageId,compressedBytes:staged.compressedBytes,manifest:staged.manifest,evidence};writePending(pending);return pending;}
async function uploadRange(pending:PendingContribution,url:string,offset:number,length:number){if(!contributionStillAllowed(pending))throw new Error('micro_brain_learning_consent_withdrawn');return invoke<NativeUploadResult>('upload_micro_brain_learning_part',{request:{packageId:pending.packageId,url,offset,length}});}
async function finishAccepted(pending:PendingContribution){consumeMicroBrainLearningEvidence(pending.evidence);await discardLocal(pending.packageId);writePending(null);}

export function microBrainMultipartRange(totalBytes:number,partNumber:number){if(!Number.isSafeInteger(totalBytes)||totalBytes<1||!Number.isInteger(partNumber)||partNumber<1)throw new Error('micro_brain_learning_part_invalid');const totalParts=Math.ceil(totalBytes/PART_BYTES);if(partNumber>totalParts)throw new Error('micro_brain_learning_part_invalid');const offset=(partNumber-1)*PART_BYTES;return{offset,length:Math.min(PART_BYTES,totalBytes-offset)};}

async function processJob(job:LearningJob){let pending=readPending();if(pending&&pending.jobId!==job.id){await abortPending(pending);pending=null;}if(!contributionStillAllowed(pending||undefined)){if(pending)await abortPending(pending);return;}pending=pending??await stage(job);if(!pending)return;if(!contributionStillAllowed(pending)){await abortPending(pending);return;}
  const prepared=await api<Prepared>('prepare',json({jobId:job.id,manifest:pending.manifest}));if(prepared.deduplicated||prepared.completed){await finishAccepted(pending);return;}if(prepared.mode==='single'){if(!prepared.grant?.url)throw new Error('micro_brain_learning_single_grant_missing');await uploadRange(pending,prepared.grant.url,0,pending.compressedBytes);if(!contributionStillAllowed(pending)){await abortPending(pending);return;}await api('complete',json({jobId:job.id}));await finishAccepted(pending);return;}if(prepared.mode!=='multipart'||!prepared.totalParts)throw new Error('micro_brain_learning_prepare_invalid');
  const uploaded=new Set((prepared.uploadedParts||[]).map(part=>part.partNumber));const missing=Array.from({length:prepared.totalParts},(_,index)=>index+1).filter(part=>!uploaded.has(part));for(let start=0;start<missing.length;start+=MAX_PART_WINDOW){if(!contributionStillAllowed(pending)){await abortPending(pending);return;}const window=missing.slice(start,start+MAX_PART_WINDOW);const granted=await api<{grants:Array<{partNumber:number;url:string}>}>('parts/grant',json({jobId:job.id,partNumbers:window}));for(const grant of granted.grants){const range=microBrainMultipartRange(pending.compressedBytes,grant.partNumber);const result=await uploadRange(pending,grant.url,range.offset,range.length);await api('parts/report',json({jobId:job.id,partNumber:grant.partNumber,etag:result.etag,sizeBytes:result.uploadedBytes}));}}
  if(!contributionStillAllowed(pending)){await abortPending(pending);return;}await api('complete',json({jobId:job.id}));await finishAccepted(pending);
}

async function tick(){if(stopped||running)return;running=true;let next=300,jitter=90;try{if(!isNativeLightBI()||import.meta.env.VITE_LIGHTBI_CHANNEL!=='internal')return;if(readWithdrawalPending()){await requestMicroBrainRemoteWithdrawal();return;}const pending=readPending();if(pending&&!contributionStillAllowed(pending)){await abortPending(pending);return;}if(!contributionStillAllowed())return;const installationId=getOrCreateInstallationId();await requireNativeInstallationTrust(installationId);const polled=await api<PollResult>('poll');next=Math.max(60,Math.min(3600,Number(polled.pollAfterSeconds)||300));jitter=Math.max(0,Math.min(300,Number(polled.pollJitterSeconds)||90));if(polled.job)await processJob(polled.job);}catch(error){if(String(error).includes('consent_withdrawn')){const pending=readPending();if(pending)await abortPending(pending);}else console.warn('Micro Brain contribution deferred.',error);}finally{running=false;if(!stopped){const delay=(next+Math.floor(Math.random()*(jitter+1)))*1000;timer=window.setTimeout(()=>void tick(),delay);}}}
export function startMicroBrainContributionLoop(){if(timer!==null||stopped||!isNativeLightBI()||import.meta.env.VITE_LIGHTBI_CHANNEL!=='internal')return;timer=window.setTimeout(()=>{timer=null;void tick();},10_000);}
export function stopMicroBrainContributionLoop(){stopped=true;if(timer!==null){window.clearTimeout(timer);timer=null;}}
