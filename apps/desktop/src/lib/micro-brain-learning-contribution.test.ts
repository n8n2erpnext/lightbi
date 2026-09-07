import { describe, expect, it } from 'vitest';
import { microBrainMultipartRange } from './micro-brain-learning-contribution';

describe('Micro Brain direct R2 contribution transport', () => {
  it('uses exact 16 MiB multipart ranges without buffering the whole object in WebView code', () => {
    const part=16*1024*1024;
    expect(microBrainMultipartRange(part*2+7,1)).toEqual({offset:0,length:part});
    expect(microBrainMultipartRange(part*2+7,2)).toEqual({offset:part,length:part});
    expect(microBrainMultipartRange(part*2+7,3)).toEqual({offset:part*2,length:7});
    expect(()=>microBrainMultipartRange(part,2)).toThrow(/part_invalid/);
  });
});

it('keeps large contribution bytes in native streaming code instead of JS or Control Plane payloads', async () => {
  const { readFileSync } = await import('node:fs');
  const native = readFileSync(new URL('../../../../crates/lightbi-tauri/src/micro_brain_learning.rs', import.meta.url), 'utf8');
  expect(native).toContain('ReaderStream::new(file.take(request.length))');
  expect(native).toContain('client.put(url)');
  expect(native).not.toContain('read_to_end');
});

it('keeps consent withdrawal cleanup retryable and blocks complete after consent is withdrawn', async () => {
  const { readFileSync } = await import('node:fs');
  const source = readFileSync(new URL('./micro-brain-learning-contribution.ts', import.meta.url), 'utf8');
  expect(source).toContain("await discardLocal(pending.packageId);await api('abort',json({jobId:pending.jobId}));writePending(null)");
  expect(source).toContain("if(!contributionStillAllowed(pending)){await abortPending(pending);return;}await api('complete'");
  expect(source).toContain("if(pending&&pending.jobId!==job.id){await abortPending(pending);pending=null;}");
});


it('requires strict native Signed Transport for every Micro Brain learning control request', async () => {
  const { readFileSync } = await import('node:fs');
  const source = readFileSync(new URL('./micro-brain-learning-contribution.ts', import.meta.url), 'utf8');
  expect(source).toContain("import { signedNativeFetch } from './native-capabilities'");
  expect(source).toContain("signedNativeFetch(`${endpoint}/api/micro-brain/learning/${path}`");
  expect(source).not.toContain('externalFetch(`${endpoint}/api/micro-brain/learning/');
});


it("persists consent-withdrawal cleanup intent and retries only through signed native transport", async () => {
  const { readFileSync } = await import('node:fs');
  const source = readFileSync(new URL('./micro-brain-learning-contribution.ts', import.meta.url), 'utf8');
  expect(source).toContain("WITHDRAWAL_KEY");
  expect(source).toContain("requestMicroBrainRemoteWithdrawal");
  expect(source).toContain("'consent/withdraw'");
  expect(source).toContain("if(readWithdrawalPending()){await requestMicroBrainRemoteWithdrawal();return;}");
  expect(source).toContain("signedNativeFetch");
  expect(source).toContain("writeWithdrawalPending(false)");
});
