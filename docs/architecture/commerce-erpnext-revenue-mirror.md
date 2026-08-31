# Commerce → ERPNext Optional Revenue Mirror

Status: canonical integration contract
Date: 2026-08-31
Scope: optional downstream mirroring of completed LightBI commerce orders into ERPNext for revenue tracking
Supersedes: none
Superseded by: none
Primary sources: ../project-book/LIGHTBI_CONTROL_PLANE_MAP.md and private CP `domains/commerce`, `domains/integrations`, `platform/events/outbox`

## Purpose

LightBI may mirror completed paid orders into the owner's ERPNext instance so product revenue can be followed alongside other business data. This mirror is an operational reporting option only. ERPNext is not payment authority, entitlement authority, license authority, Trust authority, or a required dependency for LightBI operation.

## Critical-path invariant

```text
payment provider webhook
→ LightBI validates/idempotently completes payment
→ LightBI commits order + payment + entitlement
→ LightBI commits `commerce.order.completed.v1` to transactional outbox
→ user success is independent of ERPNext/n8n
→ asynchronous worker mirrors downstream later
```

ERPNext or n8n downtime must never roll back or delay a valid LightBI payment, entitlement grant or account activation. Delivery failures remain retryable integration state.

## Existing control-plane foundation

Private CP already implements:

- `CommerceService.completePayment(...)` with payment-event idempotency;
- `commerce.order.completed.v1` emitted in the same DB transaction as order/payment/entitlement state;
- transactional outbox claim/deliver/fail lifecycle;
- integration connection/subscription/delivery tables from migration `061_integrations_delivery`;
- direct ERPNext adapter with secret-resolved API key/secret and event headers;
- worker handler subscribed to `commerce.order.completed.v1`;
- per-connection/outbox-event delivery idempotency and retry state.
## Preferred topology

The default path is direct CP worker → ERPNext API when the ERPNext endpoint is reachable safely and the receiver contract is sufficient. Existing n8n on the same VPS may be inserted as an optional orchestration/transform layer when richer mapping, notifications or future side effects justify it.

```text
LightBI CP outbox
   ├─ direct ERPNext adapter → ERPNext receiver
   └─ optional signed webhook → n8n workflow → ERPNext receiver/API
```

n8n is not an authority boundary. It must not generate or modify LightBI entitlement, payment or Trust state.

## ERPNext isolation

The existing ERPNext site contains substantial sample/business data. LightBI revenue tracking should use a dedicated company such as `LightBI Inc` (final legal/display name may be changed later) and dedicated masters so test/product revenue does not pollute unrelated sample companies.

Minimum isolated masters should include:

- dedicated Company;
- dedicated income/accounting defaults created by ERPNext company bootstrap;
- a LightBI product Item or bounded product-code mapping;
- a safe Customer strategy for online purchasers, preferably one generic online customer or deterministic customer creation only when needed;
- explicit external LightBI order/event identity for idempotency/audit.

No existing sample company should be reused merely because it already has convenient accounts/items.

## ERP document strategy

The revenue mirror should represent a completed paid LightBI order, not pretend to be an operational warehouse flow. The preferred final accounting document must be selected after inspecting the live ERPNext configuration.

A Sales Invoice is preferable if the goal is recognized paid revenue and the company/master setup supports safe creation. A Sales Order is acceptable as a non-accounting sales mirror if later accounting automation is intentionally separate. A dedicated staging DocType is acceptable only when standard documents cannot safely preserve idempotency and accounting semantics.
## Event contract

The downstream receiver consumes only `commerce.order.completed.v1`. Required business fields from current CP payload are:

- `orderId` — immutable LightBI order identity;
- `productCode` — LightBI commercial SKU/product code;
- `amountMinor` — integer minor-unit amount;
- `currency` — ISO 4217 currency;
- `quantity` — positive integer quantity;
- `accountId` or `organizationId` — opaque LightBI subject reference;
- `entitlementId` — LightBI entitlement reference for audit only, never ERP authority.

Provider payment IDs remain owned by the commerce/payment record and may be added to the downstream mapping only when required for reconciliation. Business files, SQL, BA results and local LightBI data are never included.

## Idempotency

The same LightBI outbox event may be retried many times. ERPNext/n8n must derive a unique external identity from `event_id` and/or `orderId` and return success for an already-created mirror rather than creating duplicates.

The CP integration delivery primary key `(connection_id, outbox_event_id)` is the upstream retry/idempotency boundary. Downstream idempotency is still mandatory because network timeouts may occur after ERPNext committed a document but before CP observed the response.

## Security

Credentials stay in secret storage/resolution and never in integration connection config or documentation. Direct ERPNext calls use a dedicated least-privilege API user/key, not Administrator credentials.

Production/public Internet endpoints must use HTTPS. For the same-VPS/LXD path, a private-only route may be used if the implementation explicitly preserves equivalent transport isolation and does not expose ERPNext API credentials or receiver endpoints publicly by accident.

If n8n is used, the LightBI→n8n webhook must use the existing HMAC-signed webhook adapter or an equivalently authenticated private channel. n8n→ERPNext credentials remain inside n8n credential storage or another approved secret resolver.
## Failure and retry behavior

Downstream failures are recorded in `lightbi_integration_deliveries` and propagated to the outbox worker so the event remains retryable under the existing backoff policy. Operators may inspect delivery attempts/errors without changing commerce authority.

Permanent mapping/configuration errors should disable or repair the integration connection rather than poisoning checkout. Replays must remain safe after configuration recovery.

## End-to-end acceptance

A complete proof should demonstrate:

1. create or reuse an isolated LightBI ERPNext company and minimum masters;
2. use a dedicated least-privilege ERPNext integration identity;
3. configure a CP integration connection/subscription for `commerce.order.completed.v1`;
4. submit one synthetic Internal commerce completion, not a real customer payment;
5. prove LightBI order + entitlement commit before downstream delivery;
6. prove exactly one ERPNext mirror document with LightBI external identity;
7. replay the same event and prove no duplicate ERP document;
8. simulate ERPNext/n8n failure and prove LightBI order/entitlement remains successful while delivery becomes retryable;
9. recover the downstream path and prove later delivery succeeds;
10. remove or clearly mark synthetic E2E records so they cannot be mistaken for real revenue.

## Current status

The CP side is foundation-complete and tested at adapter/migration level, but the live ERPNext receiver/configuration and end-to-end runtime proof are not yet established. The live ERPNext instance is inside LXD on the same VPS, and n8n is also available on the VPS as an optional orchestration path.

## Source bookmarks

- [`../project-book/LIGHTBI_CONTROL_PLANE_MAP.md`](../project-book/LIGHTBI_CONTROL_PLANE_MAP.md) — CP commerce/integration foundation and authority boundaries.
- Private CP `src/domains/commerce/commerce-service.ts` — transaction + outbox event.
- Private CP `src/domains/integrations/erpnext-adapter.ts` — direct ERPNext delivery contract.
- Private CP `src/domains/integrations/integration-service.ts` — subscription and delivery idempotency.
- Private CP `src/domains/integrations/worker-handlers.ts` — asynchronous commerce event handler.
