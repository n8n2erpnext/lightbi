import {describe,expect,it} from 'vitest';
import {compareAppVersions} from './update-store';

describe('native update version ordering',()=>{
  it('orders beta patch releases without treating an older manifest as an update',()=>{
    expect(compareAppVersions('0.9.2-beta.7','0.9.1-beta.7')).toBe(1);
    expect(compareAppVersions('0.9.1-beta.7','0.9.2-beta.7')).toBe(-1);
    expect(compareAppVersions('0.9.1-beta.7','0.9.1-beta.7')).toBe(0);
  });
  it('treats stable as newer than prerelease of the same core',()=>expect(compareAppVersions('1.0.0','1.0.0-beta.1')).toBe(1));
});
