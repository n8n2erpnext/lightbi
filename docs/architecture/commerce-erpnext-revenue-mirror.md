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

Owner decision on 2026-08-31 selects **Paddle** as the intended payment provider for the 1.0 commerce path because Stripe is not the chosen market path. Payment-provider configuration is intentionally deferred; this contract freezes only the downstream shape.

The selected revenue-mirror topology is the existing HMAC-signed CP webhook adapter → dedicated n8n workflow → ERPNext. The direct ERPNext adapter remains a supported CP capability but is not the selected operational route for this mirror.

```text
Paddle (future configuration)
→ LightBI commerce authority
→ transactional outbox
→ signed webhook
→ n8n `LightBI Revenue Mirror to ERPNext (Paddle-ready)`
→ ERPNext `LightBI Order Mirror` / `LightBI Inc`
```

n8n remains downstream only. It must not generate or modify LightBI entitlement, payment or Trust state.

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

The inspected live path is now fixed for the scaffold. LightBI is a digital service, so ERPNext must not invent a warehouse lifecycle. The selected accounting mirror is:

`Sales Invoice (update_stock=0, service item) → Payment Entry (Debtors → Paddle Clearing)`

`Sales Order`, `Delivery Note`, `Stock Entry`, stock-ledger movement and fulfillment inventory are outside this integration. Company `LightBI Inc` owns service item `LIGHTBI-PRO`, its `LBI` accounting defaults, and `Paddle Clearing - LBI`. The service item is non-stock; an ERPNext warehouse default may exist as master metadata but is not execution authority and `update_stock=0` prevents stock movement.

Paddle is the intended Merchant of Record. Paddle therefore owns the official customer payment receipt/invoice. ERPNext may produce a branded **LightBI Purchase Invoice / Accounting Copy** for operational reference, but that document must explicitly state that it does not replace Paddle's official payment document.

`LightBI Order Mirror` remains as the integration ledger/idempotency checkpoint, not the final accounting document. Its state may advance through `received → invoiced → paid → reconciled` (or `error`) and it stores links to the resulting Sales Invoice/Payment Entry so retries can resume safely after a partial downstream commit.

## Event contract

The inactive Paddle-ready receiver consumes only `commerce.order.completed.v1`. Before activation, the provider/commerce adapter must supply:

- `orderId` — immutable LightBI order identity;
- `productCode` — bounded LightBI product code;
- `amountMinor` and `currency` — exact provider amount representation for audit;
- `providerAmount` — provider-decimal string in major units; n8n must not infer a currency exponent by dividing by 100;
- `accountingAmountVnd` — explicit VND accounting amount produced by the approved commerce/accounting policy;
- `quantity` — positive integer;
- `billingEmail` — optional validated customer contact for the ERP copy;
- `providerTransactionId` — Paddle transaction identity;
- `paidAt` — provider completion time;
- `accountId` or `organizationId`, plus `entitlementId` — opaque LightBI audit references only;
- `synthetic` — explicit test marker.

Business files, SQL text/results, BA findings and local LightBI datasets are never part of this event. Original provider amount and accounting amount are intentionally separate fields so currency/exchange policy cannot be silently guessed in n8n.

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

As of 2026-08-31 the downstream accounting scaffold is established but deliberately **inactive** until Paddle/provider configuration is authorized. ERPNext uses isolated Company `LightBI Inc` (`LBI`, VND), non-stock service item `LIGHTBI-PRO`, dedicated `LBI` accounts/cost center, `Paddle Clearing - LBI`, and `LightBI Order Mirror` as the retry/idempotency ledger. Existing sample companies are not commerce authority.

n8n workflow `lightbiRevenueMirror01` is now named **`LightBI Paddle Revenue → ERPNext Invoice + Clearing`**, remains inactive, and contains 26 nodes. It verifies the signed envelope before trusting business fields, validates the completed-commerce contract, checks/resumes the mirror ledger, creates/submits a non-stock Sales Invoice, creates/submits a Payment Entry into Paddle Clearing, and finalizes the mirror links/state. ERPNext credentials remain in n8n credential storage. HMAC/provider activation remains intentionally unresolved/fail-closed.

ERPNext email/print presentation is also scaffolded but disabled for live delivery. Email Template `LightBI Purchase Confirmation`, Print Format `LightBI Purchase Invoice`, and Notification `LightBI Purchase Confirmation` are bound together; the Notification remains `enabled=0`. The PDF identifies itself as an accounting/reference copy and states that Paddle, as Merchant of Record, provides the official receipt/invoice. A render-only synthetic proof produced a valid `%PDF` document of 24,004 bytes and the synthetic draft was deleted immediately; no email was sent.

A separate synthetic accounting proof successfully submitted one Sales Invoice and one Payment Entry, observed two GL entries for each accounting document, then cancelled both test documents. The tested Sales Invoice used `update_stock=0`; the integration is intentionally non-stock.

Still open before live activation: Paddle checkout/webhook configuration, provider adapter fields, approved currency/tax/FX policy, HMAC credential activation, CP connection/subscription wiring, synthetic outbox E2E, duplicate replay proof, downstream-failure retry/recovery proof, Paddle payout/fee reconciliation, and an explicit owner decision to enable the ERPNext customer-copy Notification. None of those open items may block LightBI checkout or entitlement authority.

## Source bookmarks

- [`../project-book/LIGHTBI_CONTROL_PLANE_MAP.md`](../project-book/LIGHTBI_CONTROL_PLANE_MAP.md) — CP commerce/integration foundation and authority boundaries.
- Private CP `src/domains/commerce/commerce-service.ts` — transaction + outbox event.
- Private CP `src/domains/integrations/erpnext-adapter.ts` — direct ERPNext delivery contract.
- Private CP `src/domains/integrations/integration-service.ts` — subscription and delivery idempotency.
- Private CP `src/domains/integrations/worker-handlers.ts` — asynchronous commerce event handler.
