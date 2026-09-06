import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../../../..');
const advancedSource = readFileSync(resolve(root, 'apps/desktop/src/pages/Advanced.tsx'), 'utf8');
const gateSource = readFileSync(resolve(root, 'apps/desktop/src/components/advanced/AdvancedConnectionGate.tsx'), 'utf8');

function connectFlow(): string {
  const start = advancedSource.indexOf('const connect = async');
  const end = advancedSource.indexOf('const openFileSource = async', start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return advancedSource.slice(start, end);
}

describe('advanced saved-profile security lifecycle', () => {
  it('touches last-used only after saved-profile connection and schema discovery succeed', () => {
    const flow = connectFlow();
    const connectAt = flow.indexOf('await createAdvancedConnectionFromProfile');
    const schemaAt = flow.indexOf('await loadAdvancedSchema');
    const touchAt = flow.indexOf('await touchAdvancedProfile');
    expect(connectAt).toBeGreaterThanOrEqual(0);
    expect(schemaAt).toBeGreaterThan(connectAt);
    expect(touchAt).toBeGreaterThan(schemaAt);
  });

  it('saves a new profile only after connection and schema discovery succeed', () => {
    const flow = connectFlow();
    const connectAt = flow.indexOf('await createAdvancedConnection(connectionName');
    const schemaAt = flow.indexOf('await loadAdvancedSchema');
    const saveGuardAt = flow.indexOf('if (!profile && saveProfile)');
    const saveAt = flow.indexOf('await saveAdvancedProfile', saveGuardAt);
    expect(connectAt).toBeGreaterThanOrEqual(0);
    expect(schemaAt).toBeGreaterThan(connectAt);
    expect(saveGuardAt).toBeGreaterThan(schemaAt);
    expect(saveAt).toBeGreaterThan(saveGuardAt);
  });

  it('never refills a selected saved profile into the credential field', () => {
    const handlerStart = advancedSource.indexOf('const handleProfileChange =');
    const handlerEnd = advancedSource.indexOf('const createTableSqlPreview', handlerStart);
    const handler = advancedSource.slice(handlerStart, handlerEnd);
    expect(handler).not.toContain('setConnectionUrl(');
    expect(gateSource).toContain('type="password"');
    expect(gateSource).toContain('disabled={Boolean(selectedProfileId)}');
    expect(gateSource).toContain("selectedProfileId ? 'Encrypted credential from profile'");
  });
});
