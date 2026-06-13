# AGENT HANDOFF: Guarded SUM Phase B Corrective Pass

## Summary
The corrective pass for Guarded SUM Phase B has been successfully completed, including the final SQL cast corrective. All trust and edge-case concerns raised have been resolved without modifying any UI, display, or taxonomy files.

## Changes Made
1. **Explicit VARCHAR Cast**: Updated  to explicitly cast the measure to  before performing string replacements. This prevents implicit type casting issues when DuckDB automatically infers columns as numeric types.
2. **JS Decimals Blocked**: Updated  to strictly allow only integer JS numbers (using ) and explicitly block JS decimals.
3. **Stress Test Labels**: Renamed  to  and added a clean  case to clarify the policy.
4. **Hidden Alias Quoting**: Updated  to construct the hidden malformed alias using  to ensure any inner quotes or special characters are safely escaped for DuckDB. Added a regression test validating this.
5. **Warning Verbiage**: Modified the execution warning string in both  and  to explicitly state 
6. **Stale Comment Removed**: Updated the fallback comment in  to accurately describe the executor architecture.

## Verification
- Local unit tests in  covering these cases executed and passed.
- Entire test suite (
[1m[30m[46m RUN [49m[39m[22m [36mv4.1.8 [39m[90m/home/ubuntu[39m

 [31m❯[39m .bun/install/cache/gensync@1.0.0-4049f5e8f1219d89@@@1/test/index.test.js [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/json-schema-traverse@0.4.1@@@1/spec/index.spec.js [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/pg-protocol@1.14.0@@@1/dist/inbound-parser.test.js [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m n8n2erpnext/LightBI/apps/desktop/verify.spec.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m n8n2erpnext/LightBI/apps/desktop/concurrency.spec.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/pg-protocol@1.14.0@@@1/dist/outbound-serializer.test.js [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/pg-protocol@1.14.0@@@1/src/outbound-serializer.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m thaiduy.digital/sample/src/tests/unit/get-pathnames.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/pg-protocol@1.14.0@@@1/src/inbound-parser.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m thaiduy.digital/sample/src/tests/unit/sitemap.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/@tailwindcss/typography@0.5.19@@@1/src/index.test.js [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/next@16.2.7@@@1/dist/diagnostics/build-diagnostics.test.js [2m([22m[2m0 test[22m[2m)[22m
TAP version 13
 [31m❯[39m .codex/.tmp/plugins/plugins/plugin-eval/tests/plugin-eval.test.js [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/next@16.2.7@@@1/dist/telemetry/post-telemetry-payload.test.js [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/next@16.2.7@@@1/dist/trace/trace.test.js [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/tsconfig-paths@3.15.0@@@1/lib/__tests__/config-loader.test.js [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/tsconfig-paths@3.15.0@@@1/lib/__tests__/filesystem.test.js [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/tsconfig-paths@3.15.0@@@1/lib/__tests__/mapping-entry.test.js [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/tsconfig-paths@3.15.0@@@1/lib/__tests__/match-path-async.test.js [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/tsconfig-paths@3.15.0@@@1/lib/__tests__/match-path-sync.test.js [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/tsconfig-paths@3.15.0@@@1/lib/__tests__/try-path.test.js [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/tsconfig-paths@3.15.0@@@1/lib/__tests__/tsconfig-loader.test.js [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/tsconfig-paths@3.15.0@@@1/src/__tests__/config-loader.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/tsconfig-paths@3.15.0@@@1/src/__tests__/filesystem.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/tsconfig-paths@3.15.0@@@1/src/__tests__/mapping-entry.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/tsconfig-paths@3.15.0@@@1/src/__tests__/match-path-async.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/tsconfig-paths@3.15.0@@@1/src/__tests__/match-path-sync.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/tsconfig-paths@3.15.0@@@1/src/__tests__/try-path.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/tsconfig-paths@3.15.0@@@1/src/__tests__/tsconfig-loader.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m thaiduy.digital/sample/src/tests/unit/components/comment-editor.test.tsx [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m thaiduy.digital/sample/src/tests/unit/lib/posthog-identity.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m thaiduy.digital/sample/src/tests/unit/lib/posthog-sanitize.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m thaiduy.digital/sample/src/tests/unit/utils/get-ip.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m thaiduy.digital/sample/src/tests/e2e/authenticated/comment.test.ts [2m([22m[2m0 test[22m[2m)[22m
TAP version 13
# Subtest: prepare writes private key locally and emits a public connector request
ok 1 - prepare writes private key locally and emits a public connector request
  ---
  duration_ms: 1496.399125
  type: 'test'
  ...
# Subtest: skill documents picker lookup and local destination confirmation
ok 2 - skill documents picker lookup and local destination confirmation
  ---
  duration_ms: 3.704371
  type: 'test'
  ...
# Subtest: plugin registers the editable local destination confirmation MCP tool
ok 3 - plugin registers the editable local destination confirmation MCP tool
  ---
  duration_ms: 42.330487
  type: 'test'
  ...
# Subtest: local destination confirmation suggests a path and accepts an override
ok 4 - local destination confirmation suggests a path and accepts an override
  ---
  duration_ms: 44.709334
  type: 'test'
  ...
# Subtest: local destination confirmation rejects an out-of-workspace override
ok 5 - local destination confirmation rejects an out-of-workspace override
  ---
  duration_ms: 43.803451
  type: 'test'
  ...
# Subtest: local destination confirmation stops when the developer cancels
ok 6 - local destination confirmation stops when the developer cancels
  ---
  duration_ms: 39.678599
  type: 'test'
  ...
# Subtest: skill metadata describes safe API key setup
ok 7 - skill metadata describes safe API key setup
  ---
  duration_ms: 0.333881
  type: 'test'
  ...
# Subtest: plugin and app tiles use the same OpenAI Platform logo
ok 8 - plugin and app tiles use the same OpenAI Platform logo # SKIP monorepo OpenAI Platform app icon is not available in this repository
  ---
  duration_ms: 0.266401
  type: 'test'
  ...
# Subtest: skill asks before building API-backed apps when any usable key exists
ok 9 - skill asks before building API-backed apps when any usable key exists
  ---
  duration_ms: 2.226247
  type: 'test'
  ...
# Subtest: skill forbids credential inspection that can print secrets
ok 10 - skill forbids credential inspection that can print secrets
  ---
  duration_ms: 1.165924
  type: 'test'
  ...
# Subtest: skill makes the key-choice gate impossible to miss
ok 11 - skill makes the key-choice gate impossible to miss
  ---
  duration_ms: 1.535205
  type: 'test'
  ...
# Subtest: skill documents the connector-owned picker boundary
ok 12 - skill documents the connector-owned picker boundary
  ---
  duration_ms: 0.445761
  type: 'test'
  ...
# Subtest: skill keeps deterministic mechanics out of the hosted-picker branch
ok 13 - skill keeps deterministic mechanics out of the hosted-picker branch
  ---
  duration_ms: 0.252801
  type: 'test'
  ...
# Subtest: skill keeps secure setup narration brief
ok 14 - skill keeps secure setup narration brief
  ---
  duration_ms: 0.225721
  type: 'test'
  ...
# Subtest: skill prefers ignored env files and warns before tracked secret writes
ok 15 - skill prefers ignored env files and warns before tracked secret writes
  ---
  duration_ms: 0.298721
  type: 'test'
  ...
# Subtest: eval matrix includes local picker boundary and two-field joke app use case
ok 16 - eval matrix includes local picker boundary and two-field joke app use case
  ---
  duration_ms: 0.774442
  type: 'test'
  ...
# Subtest: openai-docs defers to API key skill for implementation tasks
ok 17 - openai-docs defers to API key skill for implementation tasks # SKIP monorepo OpenAI docs skill paths are not available in this repository
  ---
  duration_ms: 0.285201
  type: 'test'
  ...
 [31m❯[39m .codex/.tmp/plugins/plugins/openai-developers/tests/openai-platform-api-key.test.mjs [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m thaiduy.digital/sample/src/tests/e2e/authenticated/guestbook.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m thaiduy.digital/sample/src/tests/e2e/unauthenticated/home.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m thaiduy.digital/sample/src/tests/e2e/unauthenticated/like-button.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m thaiduy.digital/sample/src/tests/e2e/unauthenticated/rss.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m thaiduy.digital/sample/src/tests/e2e/unauthenticated/sitemap.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m thaiduy.digital/sample/src/tests/e2e/unauthenticated/theme.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m thaiduy.digital/sample/src/tests/e2e/unauthenticated/view.test.ts [2m([22m[2m0 test[22m[2m)[22m
TAP version 13
# Subtest: Playwright visualization starter templates
    # Subtest: visual regression starter uses deterministic browser settings
    ok 1 - visual regression starter uses deterministic browser settings
      ---
      duration_ms: 1.607085
      type: 'test'
      ...
    # Subtest: PDF starter exports with print background and explicit margins
    ok 2 - PDF starter exports with print background and explicit margins
      ---
      duration_ms: 3.42565
      type: 'test'
      ...
    1..2
ok 1 - Playwright visualization starter templates
  ---
  duration_ms: 6.78546
  type: 'suite'
  ...
 [31m❯[39m .codex/.tmp/plugins/plugins/build-web-data-visualization/assets/templates/playwright-starters.test.ts [2m([22m[2m0 test[22m[2m)[22m
1..1
# tests 2
# suites 1
# pass 2
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 24.428993
 [31m❯[39m .bun/install/cache/@better-auth/core@1.5.6@@@1/src/instrumentation/instrumentation.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/@better-auth/core@1.5.6@@@1/src/oauth2/refresh-access-token.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/@better-auth/core@1.5.6@@@1/src/oauth2/validate-token.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/@better-auth/core@1.5.6@@@1/src/utils/ip.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/next@16.2.7@@@1/dist/telemetry/events/mcp-telemetry.test.js [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/next@16.2.7@@@1/dist/trace/report/index.test.js [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/@better-auth/core@1.5.6@@@1/src/db/adapter/get-id-field.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/datetime.test.ts [2m([22m[2m0 test[22m[2m)[22m
# Subtest: decrypt writes the API key to the env file without printing it
ok 18 - decrypt writes the API key to the env file without printing it
  ---
  duration_ms: 872.132774
  type: 'test'
  ...
 [31m❯[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/file.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/to-json-schema.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/datetime.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/file.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/to-json-schema.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/gensync/1.0.0-4049f5e8f1219d89@@@1/test/index.test.js [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/json-schema-traverse/0.4.1@@@1/spec/index.spec.js [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/pg-protocol/1.14.0@@@1/dist/inbound-parser.test.js [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/pg-protocol/1.14.0@@@1/dist/outbound-serializer.test.js [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/pg-protocol/1.14.0@@@1/src/inbound-parser.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/pg-protocol/1.14.0@@@1/src/outbound-serializer.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/next/16.2.7@@@1/dist/diagnostics/build-diagnostics.test.js [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/next/16.2.7@@@1/dist/telemetry/post-telemetry-payload.test.js [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/next/16.2.7@@@1/dist/trace/trace.test.js [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/tsconfig-paths/3.15.0@@@1/src/__tests__/config-loader.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/tsconfig-paths/3.15.0@@@1/src/__tests__/filesystem.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/tsconfig-paths/3.15.0@@@1/src/__tests__/mapping-entry.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/tsconfig-paths/3.15.0@@@1/src/__tests__/match-path-async.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/tsconfig-paths/3.15.0@@@1/src/__tests__/match-path-sync.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/tsconfig-paths/3.15.0@@@1/src/__tests__/try-path.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/tsconfig-paths/3.15.0@@@1/src/__tests__/tsconfig-loader.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/tsconfig-paths/3.15.0@@@1/lib/__tests__/config-loader.test.js [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/tsconfig-paths/3.15.0@@@1/lib/__tests__/filesystem.test.js [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/tsconfig-paths/3.15.0@@@1/lib/__tests__/mapping-entry.test.js [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/tsconfig-paths/3.15.0@@@1/lib/__tests__/match-path-async.test.js [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/tsconfig-paths/3.15.0@@@1/lib/__tests__/match-path-sync.test.js [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/tsconfig-paths/3.15.0@@@1/lib/__tests__/try-path.test.js [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/tsconfig-paths/3.15.0@@@1/lib/__tests__/tsconfig-loader.test.js [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/@tailwindcss/typography/0.5.19@@@1/src/index.test.js [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/next/16.2.7@@@1/dist/telemetry/events/mcp-telemetry.test.js [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/next/16.2.7@@@1/dist/trace/report/index.test.js [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/@better-auth/core/1.5.6@@@1/src/instrumentation/instrumentation.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/@better-auth/core/1.5.6@@@1/src/oauth2/validate-token.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/@better-auth/core/1.5.6@@@1/src/oauth2/refresh-access-token.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/@better-auth/core/1.5.6@@@1/src/utils/ip.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/datetime.test.ts [2m([22m[2m0 test[22m[2m)[22m
# Subtest: decrypt updates an existing env var without printing the API key
ok 19 - decrypt updates an existing env var without printing the API key
  ---
  duration_ms: 1744.703789
  type: 'test'
  ...
 [31m❯[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/file.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/to-json-schema.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/datetime.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/file.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/to-json-schema.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/template-literal.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 92[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/string.test.ts [2m([22m[2m46 tests[22m[2m)[22m[33m 326[2mms[22m[39m
 [31m❯[39m .bun/install/cache/@better-auth/core/1.5.6@@@1/src/db/adapter/get-id-field.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/async-parsing.test.ts [2m([22m[2m23 tests[22m[2m)[22m[33m 548[2mms[22m[39m
   [33m[2m✓[22m[39m async validation multiple errors 2 [33m 502[2mms[22m[39m
 [31m❯[39m .local/share/pnpm/store/v11/projects/2606d39d623c1cbc91660c9d784bba08/sample/src/tests/unit/get-pathnames.test.ts [2m([22m[2m0 test[22m[2m)[22m
# Subtest: decrypt tightens permissions on an existing env file
ok 20 - decrypt tightens permissions on an existing env file
  ---
  duration_ms: 2441.093477
  type: 'test'
  ...
 [31m❯[39m .local/share/pnpm/store/v11/projects/2606d39d623c1cbc91660c9d784bba08/sample/src/tests/unit/sitemap.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/concurrency.spec.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/verify.spec.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .local/share/pnpm/store/v11/projects/2606d39d623c1cbc91660c9d784bba08/sample/src/tests/e2e/authenticated/comment.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .local/share/pnpm/store/v11/projects/2606d39d623c1cbc91660c9d784bba08/sample/src/tests/e2e/authenticated/guestbook.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .local/share/pnpm/store/v11/projects/2606d39d623c1cbc91660c9d784bba08/sample/src/tests/e2e/unauthenticated/home.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .local/share/pnpm/store/v11/projects/2606d39d623c1cbc91660c9d784bba08/sample/src/tests/e2e/unauthenticated/like-button.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .local/share/pnpm/store/v11/projects/2606d39d623c1cbc91660c9d784bba08/sample/src/tests/e2e/unauthenticated/rss.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .local/share/pnpm/store/v11/projects/2606d39d623c1cbc91660c9d784bba08/sample/src/tests/e2e/unauthenticated/sitemap.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .local/share/pnpm/store/v11/projects/2606d39d623c1cbc91660c9d784bba08/sample/src/tests/e2e/unauthenticated/theme.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .local/share/pnpm/store/v11/projects/2606d39d623c1cbc91660c9d784bba08/sample/src/tests/e2e/unauthenticated/view.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .local/share/pnpm/store/v11/projects/2606d39d623c1cbc91660c9d784bba08/sample/src/tests/unit/components/comment-editor.test.tsx [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .local/share/pnpm/store/v11/projects/2606d39d623c1cbc91660c9d784bba08/sample/src/tests/unit/lib/posthog-identity.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .local/share/pnpm/store/v11/projects/2606d39d623c1cbc91660c9d784bba08/sample/src/tests/unit/lib/posthog-sanitize.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [31m❯[39m .local/share/pnpm/store/v11/projects/2606d39d623c1cbc91660c9d784bba08/sample/src/tests/unit/utils/get-ip.test.ts [2m([22m[2m0 test[22m[2m)[22m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/async-parsing.test.ts [2m([22m[2m23 tests[22m[2m)[22m[33m 525[2mms[22m[39m
   [33m[2m✓[22m[39m async validation multiple errors 2 [33m 503[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/async-parsing.test.ts [2m([22m[2m23 tests[22m[2m)[22m[33m 525[2mms[22m[39m
   [33m[2m✓[22m[39m async validation multiple errors 2 [33m 502[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/async-parsing.test.ts [2m([22m[2m23 tests[22m[2m)[22m[33m 525[2mms[22m[39m
   [33m[2m✓[22m[39m async validation multiple errors 2 [33m 502[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/string.test.ts [2m([22m[2m47 tests[22m[2m)[22m[33m 336[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/string.test.ts [2m([22m[2m46 tests[22m[2m)[22m[32m 293[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/string.test.ts [2m([22m[2m47 tests[22m[2m)[22m[33m 343[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/template-literal.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 95[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/standard-schema.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 33[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/catch.test.ts [2m([22m[2m18 tests[22m[2m)[22m[32m 45[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/template-literal.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 86[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/index.test.ts [2m([22m[2m60 tests[22m[2m)[22m[32m 94[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/from-json-schema.test.ts [2m([22m[2m72 tests[22m[2m)[22m[32m 91[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/mini/tests/object.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 24[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/record.test.ts [2m([22m[2m24 tests[22m[2m)[22m[32m 72[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/from-json-schema.test.ts [2m([22m[2m72 tests[22m[2m)[22m[32m 82[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/mini/tests/index.test.ts [2m([22m[2m60 tests[22m[2m)[22m[32m 72[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/index.test.ts [2m([22m[2m60 tests[22m[2m)[22m[32m 97[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/index.test.ts [2m([22m[2m60 tests[22m[2m)[22m[32m 96[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/standard-schema.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 33[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/template-literal.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 90[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/index.test.ts [2m([22m[2m60 tests[22m[2m)[22m[32m 96[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/string.test.ts [2m([22m[2m76 tests[22m[2m)[22m[32m 75[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/mini/tests/index.test.ts [2m([22m[2m60 tests[22m[2m)[22m[32m 74[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/record.test.ts [2m([22m[2m21 tests[22m[2m)[22m[32m 72[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/string.test.ts [2m([22m[2m76 tests[22m[2m)[22m[32m 76[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/tuple.test.ts [2m([22m[2m18 tests[22m[2m)[22m[32m 70[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/mini/tests/index.test.ts [2m([22m[2m62 tests[22m[2m)[22m[32m 83[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/discriminated-unions.test.ts [2m([22m[2m23 tests[22m[2m)[22m[32m 80[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/validations.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 39[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/mini/tests/index.test.ts [2m([22m[2m62 tests[22m[2m)[22m[32m 77[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/discriminated-unions.test.ts [2m([22m[2m23 tests[22m[2m)[22m[32m 73[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/to-json-schema-methods.test.ts [2m([22m[2m89 tests[22m[2m)[22m[32m 71[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/discriminated-unions.test.ts [2m([22m[2m22 tests[22m[2m)[22m[32m 77[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/string.test.ts [2m([22m[2m76 tests[22m[2m)[22m[32m 74[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/mini/tests/checks.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 21[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/string.test.ts [2m([22m[2m76 tests[22m[2m)[22m[32m 77[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/to-json-schema-methods.test.ts [2m([22m[2m89 tests[22m[2m)[22m[32m 79[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/to-json-schema-methods.test.ts [2m([22m[2m89 tests[22m[2m)[22m[32m 87[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/tuple.test.ts [2m([22m[2m18 tests[22m[2m)[22m[32m 65[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/discriminated-unions.test.ts [2m([22m[2m22 tests[22m[2m)[22m[32m 71[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/to-json-schema-methods.test.ts [2m([22m[2m89 tests[22m[2m)[22m[32m 76[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/codec.test.ts [2m([22m[2m22 tests[22m[2m)[22m[32m 76[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/mini/tests/codec.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 60[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/from-json-schema.test.ts [2m([22m[2m55 tests[22m[2m)[22m[32m 69[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/record.test.ts [2m([22m[2m24 tests[22m[2m)[22m[32m 78[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/object.test.ts [2m([22m[2m59 tests[22m[2m)[22m[32m 69[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/from-json-schema.test.ts [2m([22m[2m55 tests[22m[2m)[22m[32m 69[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/codec.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 69[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/error.test.ts [2m([22m[2m27 tests[22m[2m)[22m[32m 72[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/record.test.ts [2m([22m[2m21 tests[22m[2m)[22m[32m 64[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/mini/tests/codec.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 68[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/object.test.ts [2m([22m[2m51 tests[22m[2m)[22m[32m 64[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/codec.test.ts [2m([22m[2m22 tests[22m[2m)[22m[32m 78[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/codec.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 64[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/object.test.ts [2m([22m[2m51 tests[22m[2m)[22m[32m 70[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/error.test.ts [2m([22m[2m27 tests[22m[2m)[22m[32m 63[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/error.test.ts [2m([22m[2m27 tests[22m[2m)[22m[32m 67[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/object.test.ts [2m([22m[2m59 tests[22m[2m)[22m[32m 69[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/mini/tests/codec.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 64[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/error.test.ts [2m([22m[2m27 tests[22m[2m)[22m[32m 63[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/mini/tests/codec.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 57[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/refine.test.ts [2m([22m[2m20 tests[22m[2m)[22m[32m 59[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/refine.test.ts [2m([22m[2m20 tests[22m[2m)[22m[32m 59[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/object.test.ts [2m([22m[2m37 tests[22m[2m)[22m[32m 26[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/number.test.ts [2m([22m[2m29 tests[22m[2m)[22m[32m 57[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/error-utils.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 58[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/number.test.ts [2m([22m[2m29 tests[22m[2m)[22m[32m 58[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/core/tests/locales/he.test.ts [2m([22m[2m36 tests[22m[2m)[22m[32m 47[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/core/tests/locales/ru.test.ts [2m([22m[2m38 tests[22m[2m)[22m[32m 21[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/core/tests/locales/he.test.ts [2m([22m[2m36 tests[22m[2m)[22m[32m 53[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/default.test.ts [2m([22m[2m20 tests[22m[2m)[22m[32m 51[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/error-utils.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 54[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/core/tests/locales/he.test.ts [2m([22m[2m36 tests[22m[2m)[22m[32m 50[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/refine.test.ts [2m([22m[2m18 tests[22m[2m)[22m[32m 52[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/partial.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 49[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/partial.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 45[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/refine.test.ts [2m([22m[2m18 tests[22m[2m)[22m[32m 53[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/preprocess.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 64[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/partial.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 101[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/partial.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 69[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/preprocess.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 60[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/number.test.ts [2m([22m[2m26 tests[22m[2m)[22m[32m 100[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/core/tests/extend.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/codec-examples.test.ts [2m([22m[2m19 tests[22m[2m)[22m[32m 80[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/mini/tests/string.test.ts [2m([22m[2m27 tests[22m[2m)[22m[32m 40[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/core/tests/locales/he.test.ts [2m([22m[2m36 tests[22m[2m)[22m[32m 53[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/codec-examples.test.ts [2m([22m[2m19 tests[22m[2m)[22m[32m 52[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/codec-examples.test.ts [2m([22m[2m19 tests[22m[2m)[22m[32m 53[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/number.test.ts [2m([22m[2m26 tests[22m[2m)[22m[32m 54[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/default.test.ts [2m([22m[2m20 tests[22m[2m)[22m[32m 48[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/transform.test.ts [2m([22m[2m19 tests[22m[2m)[22m[32m 43[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/primitive.test.ts [2m([22m[2m71 tests[22m[2m)[22m[32m 29[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/intersection.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 43[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/error-utils.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 42[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/error-utils.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 48[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/transform.test.ts [2m([22m[2m18 tests[22m[2m)[22m[32m 45[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/default.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 48[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/union.test.ts [2m([22m[2m18 tests[22m[2m)[22m[32m 45[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/codec-examples.test.ts [2m([22m[2m19 tests[22m[2m)[22m[32m 46[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/mini/tests/string.test.ts [2m([22m[2m27 tests[22m[2m)[22m[32m 47[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/transform.test.ts [2m([22m[2m19 tests[22m[2m)[22m[32m 42[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/default.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 47[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/catch.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 39[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/optional.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 42[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/catch.test.ts [2m([22m[2m18 tests[22m[2m)[22m[32m 41[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/core/tests/locales/ru.test.ts [2m([22m[2m38 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/transform.test.ts [2m([22m[2m18 tests[22m[2m)[22m[32m 45[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/enum.test.ts [2m([22m[2m19 tests[22m[2m)[22m[32m 31[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/mini/tests/string.test.ts [2m([22m[2m27 tests[22m[2m)[22m[32m 46[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/union.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 37[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/intersection.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 40[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/catch.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 49[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/optional.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 40[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/union.test.ts [2m([22m[2m18 tests[22m[2m)[22m[32m 48[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/mini/tests/string.test.ts [2m([22m[2m27 tests[22m[2m)[22m[32m 42[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/preprocess.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 39[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/intersection.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 46[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/preprocess.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 42[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/continuability.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 36[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/function.test.ts [2m([22m[2m18 tests[22m[2m)[22m[32m 35[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/intersection.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 42[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/continuability.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 39[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/function.test.ts [2m([22m[2m18 tests[22m[2m)[22m[32m 37[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/enum.test.ts [2m([22m[2m19 tests[22m[2m)[22m[32m 30[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/standard-schema.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 32[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/validations.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 38[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/continuability.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 42[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/map.test.ts [2m([22m[2m12 tests[22m[2m)[22m[32m 37[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/enum.test.ts [2m([22m[2m19 tests[22m[2m)[22m[32m 36[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/validations.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 38[2mms[22m[39m
[90mstdout[2m | .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/duckdb-preview-sandbox.test.ts[2m > [22m[2mDuckDB Preview Sandbox[2m > [22m[2m3. group_by count correct
[22m[39mTRACE [SANDBOX] result.rows.length: [33m2[39m

[90mstdout[2m | .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/duckdb-preview-sandbox.test.ts[2m > [22m[2mDuckDB Preview Sandbox[2m > [22m[2m3.5 group_by with 300 rows and limit 1
[22m[39mTRACE [SANDBOX] result.rows.length: [33m1[39m

[90mstdout[2m | .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/duckdb-preview-sandbox.test.ts[2m > [22m[2mDuckDB Preview Sandbox[2m > [22m[2m4. trend count correct
[22m[39mTRACE [SANDBOX] result.rows.length: [33m2[39m

[90mstdout[2m | .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/duckdb-preview-sandbox.test.ts[2m > [22m[2mDuckDB Preview Sandbox[2m > [22m[2m4.5 trend with 300 rows and limit 1
[22m[39mTRACE [SANDBOX] result.rows.length: [33m1[39m

[90mstdout[2m | .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/duckdb-preview-sandbox.test.ts[2m > [22m[2mDuckDB Preview Sandbox[2m > [22m[2m5. distribution count correct
[22m[39mTRACE [SANDBOX] result.rows.length: [33m2[39m

[90mstdout[2m | .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/duckdb-preview-sandbox.test.ts[2m > [22m[2mDuckDB Preview Sandbox[2m > [22m[2m5.5 distribution with 300 rows and limit 1
[22m[39mTRACE [SANDBOX] result.rows.length: [33m1[39m

[90mstdout[2m | .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/duckdb-preview-sandbox.test.ts[2m > [22m[2mDuckDB Preview Sandbox[2m > [22m[2m6. relationship filters non-null pairs
[22m[39mTRACE [SANDBOX] result.rows.length: [33m2[39m

[90mstdout[2m | .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/duckdb-preview-sandbox.test.ts[2m > [22m[2mDuckDB Preview Sandbox[2m > [22m[2m7. max 100 rows enforced
[22m[39mTRACE [SANDBOX] result.rows.length: [33m100[39m

[90mstdout[2m | .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/duckdb-preview-sandbox.test.ts[2m > [22m[2mDuckDB Preview Sandbox[2m > [22m[2m8. input rows not mutated
[22m[39mTRACE [SANDBOX] result.rows.length: [33m1[39m

[90mstdout[2m | .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/duckdb-preview-sandbox.test.ts[2m > [22m[2mDuckDB Preview Sandbox[2m > [22m[2m9. safeSqlPreview.sql nonsense does not affect result
[22m[39mTRACE [SANDBOX] result.rows.length: [33m1[39m

[90mstdout[2m | .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/duckdb-preview-sandbox.test.ts[2m > [22m[2mDuckDB Preview Sandbox[2m > [22m[2m10. count semantics correct
[22m[39mTRACE [SANDBOX] result.rows.length: [33m1[39m

 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/duckdb-preview-sandbox.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 38[2mms[22m[39m
[90mstdout[2m | n8n2erpnext/LightBI/apps/desktop/src/lib/duckdb-preview-sandbox.test.ts[2m > [22m[2mDuckDB Preview Sandbox[2m > [22m[2m3. group_by count correct
[22m[39mTRACE [SANDBOX] result.rows.length: [33m2[39m

[90mstdout[2m | n8n2erpnext/LightBI/apps/desktop/src/lib/duckdb-preview-sandbox.test.ts[2m > [22m[2mDuckDB Preview Sandbox[2m > [22m[2m3.5 group_by with 300 rows and limit 1
[22m[39mTRACE [SANDBOX] result.rows.length: [33m1[39m

[90mstdout[2m | n8n2erpnext/LightBI/apps/desktop/src/lib/duckdb-preview-sandbox.test.ts[2m > [22m[2mDuckDB Preview Sandbox[2m > [22m[2m4. trend count correct
[22m[39mTRACE [SANDBOX] result.rows.length: [33m2[39m

[90mstdout[2m | n8n2erpnext/LightBI/apps/desktop/src/lib/duckdb-preview-sandbox.test.ts[2m > [22m[2mDuckDB Preview Sandbox[2m > [22m[2m4.5 trend with 300 rows and limit 1
[22m[39mTRACE [SANDBOX] result.rows.length: [33m1[39m

[90mstdout[2m | n8n2erpnext/LightBI/apps/desktop/src/lib/duckdb-preview-sandbox.test.ts[2m > [22m[2mDuckDB Preview Sandbox[2m > [22m[2m5. distribution count correct
[22m[39mTRACE [SANDBOX] result.rows.length: [33m2[39m

[90mstdout[2m | n8n2erpnext/LightBI/apps/desktop/src/lib/duckdb-preview-sandbox.test.ts[2m > [22m[2mDuckDB Preview Sandbox[2m > [22m[2m5.5 distribution with 300 rows and limit 1
[22m[39mTRACE [SANDBOX] result.rows.length: [33m1[39m

[90mstdout[2m | n8n2erpnext/LightBI/apps/desktop/src/lib/duckdb-preview-sandbox.test.ts[2m > [22m[2mDuckDB Preview Sandbox[2m > [22m[2m6. relationship filters non-null pairs
[22m[39mTRACE [SANDBOX] result.rows.length: [33m2[39m

[90mstdout[2m | n8n2erpnext/LightBI/apps/desktop/src/lib/duckdb-preview-sandbox.test.ts[2m > [22m[2mDuckDB Preview Sandbox[2m > [22m[2m7. max 100 rows enforced
[22m[39mTRACE [SANDBOX] result.rows.length: [33m100[39m

[90mstdout[2m | n8n2erpnext/LightBI/apps/desktop/src/lib/duckdb-preview-sandbox.test.ts[2m > [22m[2mDuckDB Preview Sandbox[2m > [22m[2m8. input rows not mutated
[22m[39mTRACE [SANDBOX] result.rows.length: [33m1[39m

[90mstdout[2m | n8n2erpnext/LightBI/apps/desktop/src/lib/duckdb-preview-sandbox.test.ts[2m > [22m[2mDuckDB Preview Sandbox[2m > [22m[2m9. safeSqlPreview.sql nonsense does not affect result
[22m[39mTRACE [SANDBOX] result.rows.length: [33m1[39m

[90mstdout[2m | n8n2erpnext/LightBI/apps/desktop/src/lib/duckdb-preview-sandbox.test.ts[2m > [22m[2mDuckDB Preview Sandbox[2m > [22m[2m10. count semantics correct
[22m[39mTRACE [SANDBOX] result.rows.length: [33m1[39m

 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/duckdb-preview-sandbox.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 37[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/tuple.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 31[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/map.test.ts [2m([22m[2m12 tests[22m[2m)[22m[32m 35[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/recursive-types.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 30[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/primitive.test.ts [2m([22m[2m71 tests[22m[2m)[22m[32m 41[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/function.test.ts [2m([22m[2m18 tests[22m[2m)[22m[32m 38[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/primitive.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 35[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/mini/tests/object.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 26[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/prefault.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 21[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/continuability.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 37[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/array.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 32[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/union.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 36[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/number.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/validations.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 36[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/function.test.ts [2m([22m[2m18 tests[22m[2m)[22m[32m 36[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/object.test.ts [2m([22m[2m37 tests[22m[2m)[22m[32m 24[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/async-refinements.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 23[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/primitive.test.ts [2m([22m[2m71 tests[22m[2m)[22m[32m 29[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/map.test.ts [2m([22m[2m12 tests[22m[2m)[22m[32m 33[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/array.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 31[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/tuple.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 33[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/display-formatter.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 41[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/array.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 42[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/backend-preview-executor.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 35[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/map.test.ts [2m([22m[2m12 tests[22m[2m)[22m[32m 37[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/core/tests/locales/ru.test.ts [2m([22m[2m38 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/async-refinements.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 23[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/enum.test.ts [2m([22m[2m19 tests[22m[2m)[22m[32m 41[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/primitive.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 42[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/detached-methods.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 30[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/standard-schema.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 35[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/hash.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 24[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/array.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 34[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/assignability.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/mini/tests/checks.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/duckdb-logical-plan.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/pickomit.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 25[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/detached-methods.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 33[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/recursive-types.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 28[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/primitive.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 31[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/nonoptional.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 24[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/pickomit.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 26[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/preprocess.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 25[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/primitive.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 31[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/pipe.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 25[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/recursive-types.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 27[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/pipe.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 24[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/literal.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 25[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/hash.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 28[2mms[22m[39m
 [32m✓[39m .bun/install/cache/@better-auth/core@1.5.6@@@1/src/utils/fetch-metadata.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 29[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/string-formats.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 28[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/object.test.ts [2m([22m[2m37 tests[22m[2m)[22m[32m 26[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/primitive.test.ts [2m([22m[2m71 tests[22m[2m)[22m[32m 30[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/error.test.ts [2m([22m[2m29 tests[22m[2m)[22m[32m 29[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/nonoptional.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 23[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/mini/tests/checks.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 21[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/set.test.ts [2m([22m[2m12 tests[22m[2m)[22m[32m 26[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/set.test.ts [2m([22m[2m12 tests[22m[2m)[22m[32m 28[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/hash.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 30[2mms[22m[39m
 [32m✓[39m .bun/install/cache/@better-auth/core@1.5.6@@@1/src/context/request-state.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 22[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/record.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 18[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/error.test.ts [2m([22m[2m29 tests[22m[2m)[22m[32m 28[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/preprocess.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 26[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/recursive-types.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 29[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/error.test.ts [2m([22m[2m29 tests[22m[2m)[22m[32m 28[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/async-parsing.test.ts [2m([22m[2m24 tests[22m[2m)[22m[32m 25[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/set.test.ts [2m([22m[2m12 tests[22m[2m)[22m[32m 29[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/literal.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 31[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/pickomit.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 26[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/assignability.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 22[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/string-formats.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 25[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/pipe.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 26[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/business-signal-detector.test.ts [2m([22m[2m24 tests[22m[2m)[22m[32m 26[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/mini/tests/number.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/async-refinements.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 30[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/error.test.ts [2m([22m[2m29 tests[22m[2m)[22m[32m 35[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/set.test.ts [2m([22m[2m12 tests[22m[2m)[22m[32m 29[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/literal.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 36[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/string-formats.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 61[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/pipe.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 27[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/object.test.ts [2m([22m[2m37 tests[22m[2m)[22m[32m 26[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/readonly.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 24[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/preprocess.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 24[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/readonly.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 26[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/async-parsing.test.ts [2m([22m[2m24 tests[22m[2m)[22m[32m 30[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/hash.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 23[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/string-formats.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 25[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/core/tests/locales/el.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 26[2mms[22m[39m
 [32m✓[39m .bun/install/cache/@better-auth/core/1.5.6@@@1/src/utils/fetch-metadata.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 29[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/async-parsing.test.ts [2m([22m[2m24 tests[22m[2m)[22m[32m 41[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/mini/tests/object.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/readonly.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 32[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/pickomit.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 28[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/preprocess.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 35[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/firstparty.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/readonly.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 24[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/nonoptional.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 24[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/duckdb-logical-plan.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/optional.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 24[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/async-refinements.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 23[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/core/tests/locales/el.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 26[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/readonly.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/mini/tests/computed.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/lazy.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 23[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/core/tests/locales/hr.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 23[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/business-signal-detector.test.ts [2m([22m[2m24 tests[22m[2m)[22m[32m 23[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/function.test.ts [2m([22m[2m18 tests[22m[2m)[22m[32m 23[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/optional.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 25[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/assignability.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/mini/tests/checks.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/discriminated-unions.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/core/tests/locales/es.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 23[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/async-parsing.test.ts [2m([22m[2m24 tests[22m[2m)[22m[32m 24[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/backend-preview-executor.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 51[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/display-formatter.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 59[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/business-view-candidate-generator.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/question-suggestion-renderer.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/refine.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/core/tests/locales/es.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 22[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/mini/tests/object.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 21[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/core/tests/locales/uz.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 23[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/coerce.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 22[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/prefault.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/catch.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 21[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/lazy.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 22[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/catch.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/core/tests/locales/es.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 23[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/nested-refine.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 28[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/core/tests/record-constructor.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 22[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/coerce.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 26[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/assignability.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 22[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/core/tests/locales/uz.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 24[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/refine.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 23[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/core/tests/locales/es.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 26[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/coerce.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 24[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/registries.test.ts [2m([22m[2m20 tests[22m[2m)[22m[32m 21[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/core/tests/record-constructor.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/promise.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 22[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/lazy.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 24[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/promise.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 22[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/core/tests/locales/hr.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 21[2mms[22m[39m
 [32m✓[39m .bun/install/cache/@better-auth/core/1.5.6@@@1/src/context/request-state.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 21[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/apply.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/core/tests/index.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 17[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/date.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/registries.test.ts [2m([22m[2m20 tests[22m[2m)[22m[32m 22[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/mini/tests/number.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 21[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/core/tests/locales/uz.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 24[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/apply.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/registries.test.ts [2m([22m[2m20 tests[22m[2m)[22m[32m 21[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/refine.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 21[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/literal.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 24[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/nonoptional.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 30[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/lazy.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 22[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/validations.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/nullable.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/nested-refine.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 23[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/guided-investigation-pipeline.cross-domain.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/discriminated-unions.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/catch.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 19[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/function.test.ts [2m([22m[2m18 tests[22m[2m)[22m[32m 24[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/pickomit.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 17[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/apply.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 21[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/promise.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 25[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/nested-refine.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 23[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/business-signal-detector.coverage.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/registries.test.ts [2m([22m[2m20 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/mini/tests/number.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 21[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/record.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/coerce.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 27[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/function.test.ts [2m([22m[2m18 tests[22m[2m)[22m[32m 21[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/transformer.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 18[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/partials.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 17[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/promise.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 21[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/core/tests/extend.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/mini/tests/number.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/guided-investigation-pipeline.cross-domain.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/discriminated-unions.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/core/tests/locales/uz.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/function.test.ts [2m([22m[2m18 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/prefault.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/coerce.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 28[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/refine.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 23[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/date.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/core/tests/locales/be.test.ts [2m([22m[2m38 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/set.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/nested-refine.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/nullable.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/discriminated-unions.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 25[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/coerce.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/prefault.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 19[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/tuple.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/catch.test.ts [2m([22m[2m17 tests[22m[2m)[22m[32m 19[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/domain-knowledge-catalog.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 18[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/map.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/tuple.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/coerce.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 19[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/core/tests/locales/be.test.ts [2m([22m[2m38 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/transformer.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 18[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/validations.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 17[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/validations.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/semantic.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/record.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/coerce.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 19[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/transformer.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 17[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/partials.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/transformer.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 17[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/core/tests/index.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 17[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/partials.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/custom.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 17[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/core/tests/locales/ru.test.ts [2m([22m[2m38 tests[22m[2m)[22m[32m 17[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/set.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/map.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/local-duckdb-executor.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/record.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/readonly.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/intersection.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 17[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/array.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/validations.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 25[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/core/tests/extend.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 21[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/custom.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 22[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/intersection.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/pickomit.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/date.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 26[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/core/tests/index.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 33[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/object-augmentation.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/stringbool.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/custom.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 19[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/parser.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/number.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/date.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 18[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/dataset-understanding-contract.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 17[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/intersection.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/bigint.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/stringbool.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/mini/tests/computed.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/pickomit.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/partials.test.ts [2m([22m[2m15 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/dataset-understanding-contract.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/number.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/core/tests/locales/tr.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/intersection.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/safe-sql-preview.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/local-duckdb-executor.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/stringbool.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 19[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/core/tests/locales/be.test.ts [2m([22m[2m38 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/promise.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/stringbool.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/readonly.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/default.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 17[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/core/tests/extend.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/domain-knowledge-catalog.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/number.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/core/tests/index.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 18[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/core/tests/recursive-tuples.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/core/tests/locales/tr.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/default.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/tuple.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/pickomit.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 18[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/semantic.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/promise.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/core/tests/locales/tr.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/core/tests/locales/tr.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 19[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/generics.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/array.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/set.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/core/tests/locales/be.test.ts [2m([22m[2m38 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/async-refinements.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/async-refinements.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/source-preflight.test.ts [2m([22m[2m21 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/core/tests/record-constructor.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 18[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/array.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/tuple.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/source-preflight.test.ts [2m([22m[2m21 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/mini/tests/recursive-types.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/default.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/core/tests/locales/fr.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/business-signal-detector.coverage.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 22[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/mini/tests/recursive-types.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/promise.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/promise.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 19[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/set.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/core/tests/locales/fr.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/input-intent.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/default.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/mini/tests/recursive-types.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 25[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/mini/tests/recursive-types.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/instanceof.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 8[2mms[22m[39m
[90mstdout[2m | n8n2erpnext/LightBI/apps/desktop/src/lib/investigation-session.test.ts[2m > [22m[2mInvestigation Session[2m > [22m[2m1. session can store rows
[22m[39mTRACE [SESSION] rows.length: [33m1[39m

[90mstdout[2m | n8n2erpnext/LightBI/apps/desktop/src/lib/investigation-session.test.ts[2m > [22m[2mInvestigation Session[2m > [22m[2m2. rows are capped at 1000
[22m[39mTRACE [SESSION] rows.length: [33m1000[39m

[90mstdout[2m | n8n2erpnext/LightBI/apps/desktop/src/lib/investigation-session.test.ts[2m > [22m[2mInvestigation Session[2m > [22m[2m3. rows are cloned or preserved safely
[22m[39mTRACE [SESSION] rows.length: [33m1[39m

[90mstdout[2m | n8n2erpnext/LightBI/apps/desktop/src/lib/investigation-session.test.ts[2m > [22m[2mInvestigation Session[2m > [22m[2m4. session without rows remains valid
[22m[39mTRACE [SESSION] rows.length: [33m0[39m

[90mstdout[2m | n8n2erpnext/LightBI/apps/desktop/src/lib/investigation-session.test.ts[2m > [22m[2mInvestigation Session[2m > [22m[2m5. creating session does not mutate input rows
[22m[39mTRACE [SESSION] rows.length: [33m1000[39m

 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/investigation-session.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/business-signal-detector.real-vietnamese.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/describe-meta-checks.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/core/tests/record-constructor.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/core/tests/recursive-tuples.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/optional.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/parser.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 11[2mms[22m[39m
[90mstdout[2m | .bun/install/cache/@better-auth/core@1.5.6@@@1/src/db/test/get-tables.test.ts[2m > [22m[2mgetAuthTables[2m > [22m[2mshould merge additionalFields into verification table metadata
[22m[39m{ fieldName: [32m'new_field'[39m, type: [32m'string'[39m }

 [32m✓[39m .bun/install/cache/@better-auth/core@1.5.6@@@1/src/db/test/get-tables.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/array.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m .bun/install/cache/@better-auth/core/1.5.6@@@1/src/env/logger.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/business-view-generator.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/core/tests/recursive-tuples.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/generics.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/result-validator-contract.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/recursive.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 9[2mms[22m[39m
[90mstdout[2m | .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/investigation-session.test.ts[2m > [22m[2mInvestigation Session[2m > [22m[2m1. session can store rows
[22m[39mTRACE [SESSION] rows.length: [33m1[39m

[90mstdout[2m | .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/investigation-session.test.ts[2m > [22m[2mInvestigation Session[2m > [22m[2m2. rows are capped at 1000
[22m[39mTRACE [SESSION] rows.length: [33m1000[39m

[90mstdout[2m | .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/investigation-session.test.ts[2m > [22m[2mInvestigation Session[2m > [22m[2m3. rows are cloned or preserved safely
[22m[39mTRACE [SESSION] rows.length: [33m1[39m

[90mstdout[2m | .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/investigation-session.test.ts[2m > [22m[2mInvestigation Session[2m > [22m[2m4. session without rows remains valid
[22m[39mTRACE [SESSION] rows.length: [33m0[39m

[90mstdout[2m | .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/investigation-session.test.ts[2m > [22m[2mInvestigation Session[2m > [22m[2m5. creating session does not mutate input rows
[22m[39mTRACE [SESSION] rows.length: [33m1000[39m

 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/map.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/investigation-session.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/business-view-generator.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/duckdb-preview-runtime.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/core/tests/recursive-tuples.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/async-refinements.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/numeric-health-gate.test.ts [2m([22m[2m12 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/input-intent.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/parser.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/question-plan-generator.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/generics.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/unions.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/duckdb-preview-runtime.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/recursive.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/mini/tests/assignability.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/parser.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/async-refinements.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 11[2mms[22m[39m
[90mstdout[2m | .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/trace.test.ts[2m > [22m[2mLive Trace[2m > [22m[2mtraces Delivery Performance Reports dataset
[22m[39m1. DATASET COLUMNS: [ [32m'Ngày báo cáo'[39m, [32m'Tuyến xe'[39m, [32m'Tên lái xe'[39m, [32m'Đánh giá'[39m, [32m'Mã tài kiện'[39m ]
2. DETECTED SIGNALS: [ [32m'report_date'[39m, [32m'route'[39m, [32m'driver'[39m, [32m'satisfaction'[39m, [32m'shipment'[39m ]
3. GENERATED PERSPECTIVES: [ [32m'operations'[39m, [32m'customer'[39m ]
4. EVALUATED BUSINESS VIEWS:

View: logistics_journey
Required: driver, route, delivery_status
Matched: driver, route
Missing: delivery_status
Reason: 2 of 3 signals found, minimum 3 required.

View: driver_performance
Required: driver, sla
Matched: driver
Missing: sla
Reason: 1 of 2 signals found, minimum 2 required.

View: delivery_sla
Required: sla, route
Matched: route
Missing: sla
Reason: 1 of 2 signals found, minimum 2 required.

View: route_performance
Required: route, delivery_status
Matched: route
Missing: delivery_status
Reason: 1 of 2 signals found, minimum 2 required.

View: warehouse_flow
Required: warehouse, shipment
Matched: shipment
Missing: warehouse
Reason: 1 of 2 signals found, minimum 2 required.

View: customer_segmentation
Required: customer, segment
Matched: 
Missing: customer, segment
Reason: 0 of 2 signals found, minimum 2 required.

View: customer_contribution
Required: customer, revenue
Matched: 
Missing: customer, revenue
Reason: 0 of 2 signals found, minimum 2 required.

View: customer_retention
Required: customer, retention
Matched: 
Missing: customer, retention
Reason: 0 of 2 signals found, minimum 2 required.

View: purchase_behavior
Required: customer, purchase_behavior
Matched: 
Missing: customer, purchase_behavior
Reason: 0 of 2 signals found, minimum 2 required.

 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/trace.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/question-plan-generator.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/unions.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/base.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/mini/tests/computed.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/business-confidence-engine.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/business-confidence-engine.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/question-suggestion-renderer.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/nullable.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/stores/display-preferences-store.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m .bun/install/cache/@better-auth/core@1.5.6@@@1/src/env/logger.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 18[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/business-signal-detector.real-vietnamese.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/numeric-health-gate.test.ts [2m([22m[2m12 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/runtime-boundary-contract.test.ts [2m([22m[2m12 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/safe-sql-compiler.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/dataset-capability-engine.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/optional.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/map.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/unions.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/all-errors.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m .bun/install/cache/@better-auth/core/1.5.6@@@1/src/utils/deprecate.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/recursive.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/business-view-candidate-generator.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/brand.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/runtime-boundary-contract.test.ts [2m([22m[2m12 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/nullable.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/mini/tests/assignability.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/bigint.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/complex.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/brand.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/optional.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/optional.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/all-errors.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/preview-result-contract.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/relationship-discovery.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/mini/tests/assignability.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/preview-result-contract.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/virtual-dataset-planner.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/mapping-overlay-flow.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 10[2mms[22m[39m
[90mstdout[2m | n8n2erpnext/LightBI/apps/desktop/src/lib/trace.test.ts[2m > [22m[2mLive Trace[2m > [22m[2mtraces Delivery Performance Reports dataset
[22m[39m1. DATASET COLUMNS: [ [32m'Ngày báo cáo'[39m, [32m'Tuyến xe'[39m, [32m'Tên lái xe'[39m, [32m'Đánh giá'[39m, [32m'Mã tài kiện'[39m ]
2. DETECTED SIGNALS: [ [32m'report_date'[39m, [32m'route'[39m, [32m'driver'[39m, [32m'satisfaction'[39m, [32m'shipment'[39m ]
3. GENERATED PERSPECTIVES: [ [32m'operations'[39m, [32m'customer'[39m ]
4. EVALUATED BUSINESS VIEWS:

View: logistics_journey
Required: driver, route, delivery_status
Matched: driver, route
Missing: delivery_status
Reason: 2 of 3 signals found, minimum 3 required.

View: driver_performance
Required: driver, sla
Matched: driver
Missing: sla
Reason: 1 of 2 signals found, minimum 2 required.

View: delivery_sla
Required: sla, route
Matched: route
Missing: sla
Reason: 1 of 2 signals found, minimum 2 required.

View: route_performance
Required: route, delivery_status
Matched: route
Missing: delivery_status
Reason: 1 of 2 signals found, minimum 2 required.

View: warehouse_flow
Required: warehouse, shipment
Matched: shipment
Missing: warehouse
Reason: 1 of 2 signals found, minimum 2 required.

View: customer_segmentation
Required: customer, segment
Matched: 
Missing: customer, segment
Reason: 0 of 2 signals found, minimum 2 required.

View: customer_contribution
Required: customer, revenue
Matched: 
Missing: customer, revenue
Reason: 0 of 2 signals found, minimum 2 required.

View: customer_retention
Required: customer, retention
Matched: 
Missing: customer, retention
Reason: 0 of 2 signals found, minimum 2 required.

View: purchase_behavior
Required: customer, purchase_behavior
Matched: 
Missing: customer, purchase_behavior
Reason: 0 of 2 signals found, minimum 2 required.

 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/trace.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/safe-sql-preview.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/mini/tests/assignability.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/mini/tests/computed.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/workspace-understanding-state.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/dataset-health-engine.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/brand.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 12[2mms[22m[39m
[90mstdout[2m | n8n2erpnext/LightBI/apps/desktop/src/lib/stress_test.test.ts[2m > [22m[2mGuarded SUM Stress Test[2m > [22m[2mruns the stress test scenarios
[22m[39m--- GUARDED SUM STRESS TEST PHASE 1 ---

[CASE] Clean Int
- Gate: isSafeForSum=true, needsCleansing=false, parseRate=1.00
- Path: SUM
- Warnings: None
- Actual SQL SUM: 6000 (dropped 0 rows)

[CASE] Clean Decimal
- Gate: isSafeForSum=false, needsCleansing=false, parseRate=0.00
- Path: COUNT
- Warnings: None
- Actual SQL SUM: N/A (dropped 0 rows)

[CASE] EU Format (Comma as decimal)
- Gate: isSafeForSum=false, needsCleansing=false, parseRate=0.00
- Path: COUNT
- Warnings: None
- Actual SQL SUM: N/A (dropped 0 rows)

[CASE] US Mixed Decimal
- Gate: isSafeForSum=false, needsCleansing=false, parseRate=0.00
- Path: COUNT
- Warnings: None
- Actual SQL SUM: N/A (dropped 0 rows)

[CASE] US Integer Thousands
- Gate: isSafeForSum=true, needsCleansing=true, parseRate=1.00
- Path: SUM
- Warnings: Measure 'val' underwent silent cleansing (drop rate: 0.0% or stripped chars) to enable SUM.
- Actual SQL SUM: 3000 (dropped 0 rows)

[CASE] VND Currency
- Gate: isSafeForSum=true, needsCleansing=true, parseRate=1.00
- Path: SUM
- Warnings: Measure 'val' underwent silent cleansing (drop rate: 0.0% or stripped chars) to enable SUM.
- Actual SQL SUM: 1000000 (dropped 1 rows)

[CASE] USD Currency
- Gate: isSafeForSum=true, needsCleansing=true, parseRate=1.00
- Path: SUM
- Warnings: Measure 'val' underwent silent cleansing (drop rate: 0.0% or stripped chars) to enable SUM.
- Actual SQL SUM: 3000 (dropped 0 rows)

[CASE] Garbage Mixed
- Gate: isSafeForSum=false, needsCleansing=false, parseRate=0.00
- Path: COUNT
- Warnings: None
- Actual SQL SUM: N/A (dropped 0 rows)

[CASE] Late Row Anomaly
- Gate: isSafeForSum=true, needsCleansing=false, parseRate=1.00
- Path: SUM
- Warnings: Guarded SUM detected 3 malformed values skipped during SUM aggregation.
- Actual SQL SUM: 50000 (dropped 3 rows)
  => ✅ CATCH: Tail rows dropped 3 times, captured natively by DuckDB. Warning present: YES

 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/stress_test.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/bigint.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 11[2mms[22m[39m
[90mstdout[2m | .bun/install/cache/@better-auth/core/1.5.6@@@1/src/db/test/get-tables.test.ts[2m > [22m[2mgetAuthTables[2m > [22m[2mshould merge additionalFields into verification table metadata
[22m[39m{ fieldName: [32m'new_field'[39m, type: [32m'string'[39m }

 [32m✓[39m .bun/install/cache/@better-auth/core/1.5.6@@@1/src/db/test/get-tables.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/nativeEnum.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/nativeEnum.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/brand.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 12[2mms[22m[39m
TAP version 13
# Subtest: choosePath keeps fast items
ok 1 - choosePath keeps fast items
  ---
  duration_ms: 1.949366
  type: 'test'
  ...
 [31m❯[39m .codex/.tmp/plugins/plugins/plugin-eval/fixtures/ts-python-sample/tests/sample.test.ts [2m([22m[2m0 test[22m[2m)[22m
1..1
# tests 1
# suites 0
# pass 1
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 18.098014
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/apply.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 23[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/custom.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/generics.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/unions.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/instanceof.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/bigint.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/custom.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/perspective-candidate-generator.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/generics.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/instanceof.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/workspace-understanding-state.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/readonly.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/relationship-discovery.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/dataset-capability-engine.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 10[2mms[22m[39m
[90mstdout[2m | .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/regression.test.ts[2m > [22m[2mRegression Audit[2m > [22m[2manalyzes the dataset
[22m[39mSIGNALS DETECTED: [ [32m'report_date'[39m, [32m'route'[39m, [32m'driver'[39m, [32m'satisfaction'[39m, [32m'shipment'[39m ]
PERSPECTIVES: [ [32m'operations'[39m, [32m'customer'[39m ]
VIEWS: []
QUESTIONS: [33m0[39m
--- REJECTED VIEWS ANALYSIS ---

View: logistics_journey
Required: driver, route, delivery_status
Matched: driver, route
Missing: delivery_status
Reason: 2 of 3 signals found, minimum 3 required.

View: driver_performance
Required: driver, sla
Matched: driver
Missing: sla
Reason: 1 of 2 signals found, minimum 2 required.

View: delivery_sla
Required: sla, route
Matched: route
Missing: sla
Reason: 1 of 2 signals found, minimum 2 required.

View: route_performance
Required: route, delivery_status
Matched: route
Missing: delivery_status
Reason: 1 of 2 signals found, minimum 2 required.

View: warehouse_flow
Required: warehouse, shipment
Matched: shipment
Missing: warehouse
Reason: 1 of 2 signals found, minimum 2 required.

 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/regression.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/mapping-overlay-flow.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/all-errors.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/nativeEnum.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/recursive.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/virtual-dataset-planner.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/enum.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/dataset-health-engine.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 23[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/bigint.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/bigint.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 38[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/analysis-opportunity-actions.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 17[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/decision-readiness-engine.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 10[2mms[22m[39m
[90mstdout[2m | .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/stress_test.test.ts[2m > [22m[2mGuarded SUM Stress Test[2m > [22m[2mruns the stress test scenarios
[22m[39m--- GUARDED SUM STRESS TEST PHASE 1 ---

[CASE] Clean Int
- Gate: isSafeForSum=true, needsCleansing=false, parseRate=1.00
- Path: SUM
- Warnings: None
- Actual SQL SUM: 6000 (dropped 0 rows)

[CASE] Clean Decimal
- Gate: isSafeForSum=false, needsCleansing=false, parseRate=0.00
- Path: COUNT
- Warnings: None
- Actual SQL SUM: N/A (dropped 0 rows)

[CASE] EU Format (Comma as decimal)
- Gate: isSafeForSum=false, needsCleansing=false, parseRate=0.00
- Path: COUNT
- Warnings: None
- Actual SQL SUM: N/A (dropped 0 rows)

[CASE] US Mixed Decimal
- Gate: isSafeForSum=false, needsCleansing=false, parseRate=0.00
- Path: COUNT
- Warnings: None
- Actual SQL SUM: N/A (dropped 0 rows)

[CASE] US Integer Thousands
- Gate: isSafeForSum=true, needsCleansing=true, parseRate=1.00
- Path: SUM
- Warnings: Measure 'val' underwent silent cleansing (drop rate: 0.0% or stripped chars) to enable SUM.
- Actual SQL SUM: 3000 (dropped 0 rows)

[CASE] VND Currency
- Gate: isSafeForSum=true, needsCleansing=true, parseRate=1.00
- Path: SUM
- Warnings: Measure 'val' underwent silent cleansing (drop rate: 0.0% or stripped chars) to enable SUM.
- Actual SQL SUM: 1000000 (dropped 1 rows)

[CASE] USD Currency
- Gate: isSafeForSum=true, needsCleansing=true, parseRate=1.00
- Path: SUM
- Warnings: Measure 'val' underwent silent cleansing (drop rate: 0.0% or stripped chars) to enable SUM.
- Actual SQL SUM: 3000 (dropped 0 rows)

[CASE] Garbage Mixed
- Gate: isSafeForSum=false, needsCleansing=false, parseRate=0.00
- Path: COUNT
- Warnings: None
- Actual SQL SUM: N/A (dropped 0 rows)

[CASE] Late Row Anomaly
- Gate: isSafeForSum=true, needsCleansing=false, parseRate=1.00
- Path: SUM
- Warnings: Guarded SUM detected 3 malformed values skipped during SUM aggregation.
- Actual SQL SUM: 50000 (dropped 3 rows)
  => ✅ CATCH: Tail rows dropped 3 times, captured natively by DuckDB. Warning present: YES

 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/stress_test.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/all-errors.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/bigint.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/nativeEnum.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/standard-schema.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 10[2mms[22m[39m
[90mstdout[2m | n8n2erpnext/LightBI/apps/desktop/src/lib/regression.test.ts[2m > [22m[2mRegression Audit[2m > [22m[2manalyzes the dataset
[22m[39mSIGNALS DETECTED: [ [32m'report_date'[39m, [32m'route'[39m, [32m'driver'[39m, [32m'satisfaction'[39m, [32m'shipment'[39m ]
PERSPECTIVES: [ [32m'operations'[39m, [32m'customer'[39m ]
VIEWS: []
QUESTIONS: [33m0[39m
--- REJECTED VIEWS ANALYSIS ---

View: logistics_journey
Required: driver, route, delivery_status
Matched: driver, route
Missing: delivery_status
Reason: 2 of 3 signals found, minimum 3 required.

View: driver_performance
Required: driver, sla
Matched: driver
Missing: sla
Reason: 1 of 2 signals found, minimum 2 required.

View: delivery_sla
Required: sla, route
Matched: route
Missing: sla
Reason: 1 of 2 signals found, minimum 2 required.

View: route_performance
Required: route, delivery_status
Matched: route
Missing: delivery_status
Reason: 1 of 2 signals found, minimum 2 required.

View: warehouse_flow
Required: warehouse, shipment
Matched: shipment
Missing: warehouse
Reason: 1 of 2 signals found, minimum 2 required.

 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/regression.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/safe-sql-compiler.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/complex.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/data-intake-preview-rows.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/data-intake-preview-rows.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/execution-guard.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/execution-guard.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/perspective-candidate-generator.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/enum.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m .bun/install/cache/@better-auth/core@1.5.6@@@1/src/utils/deprecate.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/complex.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/standard-schema.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/standard-schema.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/instanceof.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/stores/display-preferences-store.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/mini/tests/error.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/decision-readiness-engine.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/runtime-planner-preview.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/runtime-sandbox-policy.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/complex.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/expected-result-contract.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/enum.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/guided-investigation-pipeline.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/canonical-row-projection.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/enum.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/standard-schema.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/analysis-runtime-contract.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/runtime-planner-preview.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/expected-result-contract.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/guarded-sum-bridge.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/batch-inspection.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/canonical-row-projection.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/guided-investigation-pipeline.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/nullable.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/instanceof.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/analysis-runtime-contract.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/advanced-handoff-contract.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/mini/tests/standard-schema.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/preprocess-types.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 7[2mms[22m[39m
[90mstdout[2m | n8n2erpnext/LightBI/apps/desktop/src/lib/audit-views.test.ts[2m > [22m[2mAudit Views[2m > [22m[2mextracts all views
[22m[39m
=== PERSPECTIVE: operations ===

VIEW: logistics_journey
Required: driver, route, delivery_status
Optional: warehouse, shipment
MinimumRequired: 3

VIEW: driver_performance
Required: driver, sla
Optional: delivery_status
MinimumRequired: 2

VIEW: delivery_sla
Required: sla, route
Optional: driver
MinimumRequired: 2

VIEW: route_performance
Required: route, delivery_status
Optional: driver, warehouse
MinimumRequired: 2

VIEW: warehouse_flow
Required: warehouse, shipment
Optional: delivery_status
MinimumRequired: 2

=== PERSPECTIVE: revenue ===

VIEW: revenue_performance
Required: revenue, order
Optional: discount
MinimumRequired: 2

VIEW: revenue_trend
Required: revenue
Optional: order
MinimumRequired: 1

VIEW: branch_performance
Required: revenue, branch
Optional: order
MinimumRequired: 2

VIEW: salesperson_performance
Required: revenue, salesperson
Optional: order, discount
MinimumRequired: 2

VIEW: discount_impact
Required: revenue, discount
Optional: order
MinimumRequired: 2

VIEW: order_performance
Required: revenue, order
Optional: none
MinimumRequired: 2

=== PERSPECTIVE: inventory ===

VIEW: inventory_health
Required: inventory, stock_movement
Optional: sku
MinimumRequired: 2

VIEW: inventory_aging
Required: sku, inventory
Optional: warehouse
MinimumRequired: 2

VIEW: stock_movement
Required: sku, stock_movement
Optional: warehouse
MinimumRequired: 2

VIEW: replenishment_risk
Required: inventory, replenishment
Optional: sku
MinimumRequired: 2

VIEW: supplier_inventory_analysis
Required: inventory, supplier
Optional: sku
MinimumRequired: 2

VIEW: product_performance
Required: product, stock_movement
Optional: inventory
MinimumRequired: 2

=== PERSPECTIVE: customer ===

VIEW: customer_segmentation
Required: customer, segment
Optional: revenue
MinimumRequired: 2

VIEW: customer_contribution
Required: customer, revenue
Optional: segment
MinimumRequired: 2

VIEW: customer_retention
Required: customer, retention
Optional: segment
MinimumRequired: 2

VIEW: purchase_behavior
Required: customer, purchase_behavior
Optional: order_count
MinimumRequired: 2

=== PERSPECTIVE: performance ===

VIEW: target_achievement
Required: target, achievement
Optional: productivity
MinimumRequired: 2

VIEW: kpi_monitoring
Required: kpi, actual
Optional: target
MinimumRequired: 2

VIEW: efficiency_analysis
Required: productivity, utilization
Optional: efficiency
MinimumRequired: 2

VIEW: operational_performance
Required: target, achievement
Optional: utilization
MinimumRequired: 2

VIEW: department_performance
Required: department, achievement
Optional: target
MinimumRequired: 2

=== PERSPECTIVE: finance ===

VIEW: profitability_analysis
Required: profit, revenue
Optional: cost
MinimumRequired: 2

VIEW: margin_analysis
Required: margin, revenue
Optional: cost
MinimumRequired: 2

VIEW: cost_impact
Required: cost, profit
Optional: revenue
MinimumRequired: 2

VIEW: expense_review
Required: expense, cost
Optional: none
MinimumRequired: 2

VIEW: supplier_cost_analysis
Required: supplier_cost, cost
Optional: none
MinimumRequired: 2

 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/audit-views.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/date.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/anyunknown.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/chart-preview-model.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/result-validator-contract.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/ai-briefing-contract.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/instanceof.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/anyunknown.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/runtime-sandbox-policy.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/nullable.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/description.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/nullable.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/pipeline.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/anyunknown.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/describe-meta-checks.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/chart-preview-model.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/runtime-preview.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/dataset-understanding-domain-coverage.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/ai-briefing-contract.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/guarded-sum-bridge.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/mini/tests/standard-schema.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/pipeline.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/pipeline.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/advanced-handoff-contract.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/runtime-preview.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/void.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/generics.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/date.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/mini/tests/standard-schema.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/anyunknown.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/description.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/description.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 10[2mms[22m[39m
[90mstdout[2m | .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/audit-views.test.ts[2m > [22m[2mAudit Views[2m > [22m[2mextracts all views
[22m[39m
=== PERSPECTIVE: operations ===

VIEW: logistics_journey
Required: driver, route, delivery_status
Optional: warehouse, shipment
MinimumRequired: 3

VIEW: driver_performance
Required: driver, sla
Optional: delivery_status
MinimumRequired: 2

VIEW: delivery_sla
Required: sla, route
Optional: driver
MinimumRequired: 2

VIEW: route_performance
Required: route, delivery_status
Optional: driver, warehouse
MinimumRequired: 2

VIEW: warehouse_flow
Required: warehouse, shipment
Optional: delivery_status
MinimumRequired: 2

=== PERSPECTIVE: revenue ===

VIEW: revenue_performance
Required: revenue, order
Optional: discount
MinimumRequired: 2

VIEW: revenue_trend
Required: revenue
Optional: order
MinimumRequired: 1

VIEW: branch_performance
Required: revenue, branch
Optional: order
MinimumRequired: 2

VIEW: salesperson_performance
Required: revenue, salesperson
Optional: order, discount
MinimumRequired: 2

VIEW: discount_impact
Required: revenue, discount
Optional: order
MinimumRequired: 2

VIEW: order_performance
Required: revenue, order
Optional: none
MinimumRequired: 2

=== PERSPECTIVE: inventory ===

VIEW: inventory_health
Required: inventory, stock_movement
Optional: sku
MinimumRequired: 2

VIEW: inventory_aging
Required: sku, inventory
Optional: warehouse
MinimumRequired: 2

VIEW: stock_movement
Required: sku, stock_movement
Optional: warehouse
MinimumRequired: 2

VIEW: replenishment_risk
Required: inventory, replenishment
Optional: sku
MinimumRequired: 2

VIEW: supplier_inventory_analysis
Required: inventory, supplier
Optional: sku
MinimumRequired: 2

VIEW: product_performance
Required: product, stock_movement
Optional: inventory
MinimumRequired: 2

=== PERSPECTIVE: customer ===

VIEW: customer_segmentation
Required: customer, segment
Optional: revenue
MinimumRequired: 2

VIEW: customer_contribution
Required: customer, revenue
Optional: segment
MinimumRequired: 2

VIEW: customer_retention
Required: customer, retention
Optional: segment
MinimumRequired: 2

VIEW: purchase_behavior
Required: customer, purchase_behavior
Optional: order_count
MinimumRequired: 2

=== PERSPECTIVE: performance ===

VIEW: target_achievement
Required: target, achievement
Optional: productivity
MinimumRequired: 2

VIEW: kpi_monitoring
Required: kpi, actual
Optional: target
MinimumRequired: 2

VIEW: efficiency_analysis
Required: productivity, utilization
Optional: efficiency
MinimumRequired: 2

VIEW: operational_performance
Required: target, achievement
Optional: utilization
MinimumRequired: 2

VIEW: department_performance
Required: department, achievement
Optional: target
MinimumRequired: 2

=== PERSPECTIVE: finance ===

VIEW: profitability_analysis
Required: profit, revenue
Optional: cost
MinimumRequired: 2

VIEW: margin_analysis
Required: margin, revenue
Optional: cost
MinimumRequired: 2

VIEW: cost_impact
Required: cost, profit
Optional: revenue
MinimumRequired: 2

VIEW: expense_review
Required: expense, cost
Optional: none
MinimumRequired: 2

VIEW: supplier_cost_analysis
Required: supplier_cost, cost
Optional: none
MinimumRequired: 2

 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/audit-views.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/nan.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/mini/tests/apply.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/describe-meta-checks.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/safeparse.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/safeparse.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/global-config.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/anyunknown.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/dataset-understanding-domain-coverage.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/instanceof.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/bigint.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/locales_ro.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/nullable.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/describe-meta-checks.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/mini/tests/standard-schema.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/anyunknown.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/locales_ka.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/mini/tests/apply.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/mini/tests/apply.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/pipeline.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/url.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/batch-inspection.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/custom.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/locales_ka.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/anyunknown.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/object-augmentation.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/preprocess-types.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/nan.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/generics.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/description.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/date.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/duckdb-wasm-loader.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/custom.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/generics.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/instanceof.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/analysis-opportunity-actions.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/custom.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/nan.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/literal.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/nan.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/mini/tests/brand.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/locales_ro.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/object-augmentation.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/date.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/safeparse.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/mini/tests/apply.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/mini/tests/brand.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/description.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/firstparty.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/void.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/url.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/safeparse.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/mini/tests/brand.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/nan.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/description.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/base.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/mini/tests/error.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/anyunknown.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/base.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/description.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/base.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/mini/tests/error.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/description.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/literal.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/url.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/mapping-overlay-state.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/literal.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/void.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/object-augmentation.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/mini/tests/brand.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/url.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/dataset-capabilities.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/nan.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/nan.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/void.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/void.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/void.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/literal.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/deepmasking.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/core/tests/locales/nl.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/dataset-capabilities.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/void.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/nan.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/branded.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m .local/share/pnpm/store/v11/projects/2d8000191de965b287bd2140a249df0f/apps/desktop/src/lib/mapping-overlay-state.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/mini/tests/error.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/mini/tests/prototypes.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/object-in-es5-env.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/prototypes.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/object-in-es5-env.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 17[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/object-in-es5-env.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 29[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/void.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m n8n2erpnext/LightBI/apps/desktop/src/lib/duckdb-wasm-loader.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/object-in-es5-env.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/branded.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/base.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/base.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/prototypes.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/branded.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/base.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/branded.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/mini/tests/prototypes.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/global-config.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/deepmasking.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/core/tests/locales/en.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/parseUtil.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/core/tests/locales/en.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/firstparty.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/prototypes.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/core/tests/locales/en.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/prototypes.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/core/tests/locales/nl.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/core/tests/locales/nl.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/base.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/mini/tests/prototypes.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/firstparty.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/mini/tests/prototypes.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/firstparty.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/parseUtil.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/core/tests/locales/nl.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/firstparty.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/core/tests/locales/en.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/parseUtil.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/parseUtil.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/mini/tests/functions.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/jitless-allows-eval.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/mini/tests/functions.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/mini/tests/functions.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/json.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/mini/tests/functions.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/jitless-allows-eval.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/firstparty.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/json.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/coalesce.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/json.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/coalesce.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/json.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/coalesce.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/coalesce.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v4/classic/tests/fix-json-issue.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v4/classic/tests/fix-json-issue.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 5[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/firstparty.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/masking.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v4/classic/tests/fix-json-issue.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/mocker.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v4/classic/tests/fix-json-issue.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/mocker.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/language-server.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/masking.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/mocker.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/masking.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/mocker.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/language-server.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.3.6@@@1/src/v3/tests/firstpartyschematypes.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/language-server.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/language-server.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/firstpartyschematypes.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod/4.4.3@@@1/src/v3/tests/masking.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/deepmasking.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/firstpartyschematypes.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.3.6@@@1/src/v3/tests/firstpartyschematypes.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 3[2mms[22m[39m
 [32m✓[39m .bun/install/cache/zod@4.4.3@@@1/src/v3/tests/deepmasking.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 2[2mms[22m[39m

[2m Test Files [22m [1m[31m110 failed[39m[22m[2m | [22m[1m[32m770 passed[39m[22m[90m (880)[39m
[2m      Tests [22m [1m[32m8150 passed[39m[22m[90m (8150)[39m
[2m     Errors [22m [1m[31m10 errors[39m[22m
[2m   Start at [22m 08:45:35
[2m   Duration [22m 91.08s[2m (transform 11.90s, setup 0ms, import 91.75s, tests 19.79s, environment 106ms)[22m) executed and all 447 tests passed perfectly.
