# ZEX sales portal integration guide

The sales portal owns member registration, sponsors, the sales tree, commission rules and payouts. ZEX owns customer authentication, subscriptions and verified payment facts. Connect a portal member to a ZEX account once, then consume signed events and a recovery feed. The portal never needs ZEX database access or ZEX consumer credentials.

This is the version 1 implementation handoff. The integration defaults to disabled; deployment, partner credentials and real provider validation must be completed before production use. The machine-readable API contract is [openapi.yaml](openapi.yaml).

## Responsibilities

| ZEX team | Sales portal team |
| --- | --- |
| Host the Connect page and existing ZEX login and signup | Register members and record the sponsor before connecting |
| Verify the current ZEX account and explicit sharing consent | Keep each Connect request tied to the initiating portal session |
| Store the immutable member to ZEX account mapping | Complete the callback through a server request |
| Verify payments and adjustments with the payment provider | Receive and durably store signed events |
| Send events with retries and expose recovery APIs | Calculate commissions, maintain the tree and handle payouts |
| Operate ZEX billing and its provider credentials | Recover missed events and reconcile portal state |

The portal may create a pending member or tree position at registration and activate its sales status after an eligible sale. That is a portal rule. ZEX does not create tree nodes, select sponsors or calculate multi-level earnings.

## Version 1 payment rules

Only `sale.confirmed` with `data.commission_eligible: true` can start an acquisition commission. ZEX emits at most one eligible acquisition per connected customer and partner. Renewals and other nonqualifying paid orders can still appear as `sale.confirmed` with `commission_eligible: false`; they must not create a new acquisition payout.

An active subscription, a successful browser redirect, an authorized PhonePe mandate, an app purchase notification and `subscription.updated` are not proof of a paid sale. ZEX confirms the actual charged provider order. Amounts use integer INR paise: `49900` means INR 499.00. For PhonePe, the customer charge includes a separately declared provider fee when present. The event does not use a catalog price or estimate merchant settlement. Decide the commission base and tax treatment in the portal's approved compensation policy.

Connect the account before starting the qualifying purchase. Linking an existing subscriber exposes current status but does not assign historical acquisition credit. Provider payment time, original purchase evidence and the link boundary determine eligibility. Restores, already paid accounts, test purchases, free trials and unsupported financial evidence must not become new acquisition commissions. Conservative eligibility checks can report a paid order without making it commission eligible.

For Google Play, version 1 requires the provider's subscription start time to follow the link, the paid order to match the immutable first observed source order, and both order creation and processing to be within one minute of the subscription start. Linked replacements and out-of-app resubscriptions do not qualify as a first acquisition. Consequently, verified trial conversions, delayed initial payments, upgrades and resubscriptions can produce a true paid sale fact with eligibility false. PhonePe requires a verified completed debit and the original setup with new-subscription history. The portal must honor the supplied eligibility result rather than guessing from the amount or active status.

`sale_kind` is `acquisition` for an eligible first acquisition, `renewal` only when an earlier verified paid fact is already recorded for that subscription, and `other` for remaining paid observations. An initial observation that lacks qualifying evidence is `other`; do not label every noneligible payment a renewal. Each sale supplies an `eligibility_reason`:

| Value | Meaning |
| --- | --- |
| `eligible_first_acquisition` | All version 1 acquisition checks passed |
| `existing_subscription_history` | The source history or link boundary does not establish a new acquisition |
| `initial_payment_not_verified` | Payment is verified, but the required first-payment evidence is absent |
| `acquisition_already_recorded` | This customer's acquisition was already recorded |
| `subscription_not_active` | The relevant subscription is not active or in grace at observation |

`sale.adjusted` refers to the original `sale_id` and a stable `adjustment_id`. Its positive `amount_minor` is the amount refunded or charged back; the portal applies the corresponding commission reversal according to its stored policy. Subscription cancellation alone does not imply a refund, and a refund is not inferred from an expired subscription.

Google Play financial verification uses [orders.get](https://developers.google.com/android-publisher/api-ref/rest/v3/orders/get) as well as subscription ownership and test-purchase checks. The API requires the `androidpublisher` OAuth scope. Verify actual deployed identity access to the app's order and financial data before enabling sales events; successful subscription verification does not prove that order lookup is authorized.

PhonePe verifies a completed debit and polls a known refund through the [documented refund status API](https://developer.phonepe.com/payment-gateway/autopay/standard-checkout/refund). Refund callbacks must be authenticated and durably recorded before polling. Unknown refund IDs cannot be discovered by this lookup: missed callbacks need provider replay or a reconciled provider report. Version 1 does not promise automatic discovery of undocumented PhonePe chargebacks or create a renewal charging scheduler.

## Addresses and credentials

Agree the ZEX API base URL with the ZEX team. All paths below are relative to that API origin.

The current portal origin is `https://cybernetworking.vercel.app`. These are the agreed default portal routes; the portal team must implement them before the integration is enabled:

- Callback: `https://cybernetworking.vercel.app/api/integrations/zex/callback`.
- Webhook: `https://cybernetworking.vercel.app/api/integrations/zex/webhook`.

The future portal origin may be `https://mlm.zex4u.com`. That change requires explicit ZEX callback and webhook configuration changes. ZEX accepts one exact configured callback URL. It does not accept arbitrary `return_to` values, wildcard origins or callbacks selected by the browser.

| Credential | Sender and receiver | Storage |
| --- | --- | --- |
| `X-Zex-Partner-Key` | Portal backend to ZEX partner API | Portal server secret and ZEX secret store |
| Webhook signing secret | ZEX signs; portal verifies | ZEX secret store and portal server secret |
| ZEX consumer JWT | ZEX Connect page to ZEX authorize endpoint | Existing ZEX authentication only |

The partner key and webhook secret are distinct random secrets, each at least 32 characters. Neither authenticates a ZEX customer. Never share Firebase service credentials, payment credentials, the consumer JWT signing secret or internal-service keys with the portal. Never put either integration secret in `NEXT_PUBLIC_` variables, browser JavaScript, links or logs.

## Connect an account from start to finish

1. The user registers and signs in to the portal. The portal allocates an immutable opaque `external_member_id` such as `MEMBER-42`, and stores the sponsor in its own database. Do not use email or phone as this permanent identifier.
2. The user clicks **Connect ZEX**. The portal backend identifies the member from its authenticated session, generates at least 32 random bytes of callback `state`, and allocates stable create and complete idempotency keys for this attempt. Store the request owner, a hash of `state`, the keys and expiry on the portal server.
3. The portal backend calls `POST /api/v1/integrations/mlm/connect-sessions`, passing the member ID, state and the exact configured callback URL. Send the partner key and `Idempotency-Key` headers. Persist the returned `request_id` before returning its `connect_url` to the browser. On a network timeout, repeat the identical request with the same idempotency key.
4. The browser navigates to the returned ZEX URL, for example `https://zex4u.com/connect/mlm#request=<opaque-token>`. The token is in a fragment so HTTP servers and referrers do not receive it. ZEX captures it into tab session storage, removes URL parameters and validates the request. Do not rewrite the link to put the token in a query string.
5. ZEX uses its existing phone OTP, Google or existing email/password sign-in. A new user can create a ZEX account with a verified phone or Google identity, name and explicit ZEX terms/privacy consent. The user must use the same account when signing in to the Android app; matching email or phone across unrelated Firebase identities is not an account merge.
6. ZEX shows a masked current account, the portal member reference and the sharing consent. The user can switch accounts or cancel. Confirming sends a current consumer JWT to `/connect/authorize`. This authorizes a candidate account; the permanent link is not created yet.
7. ZEX redirects to the configured portal callback with `request_id`, `state` and a short-lived `code`. Cancellation returns `error=access_denied` instead of a code. The callback is a portal **server endpoint**; it must not mark a member connected based on query parameters alone.
8. The portal callback verifies the current portal session, original request owner, exact request ID and callback state. Only then does its backend call `POST /connect-sessions/{request_id}/complete` with the code, partner key and the original completion idempotency key. Both authorization and completion must happen within the request's ten-minute lifetime.
9. ZEX atomically creates or confirms the exact mapping and returns `partner_id`, `external_member_id`, `zex_user_id` and `linked_at`. The portal stores that mapping without replacing another account's link, marks its attempt completed, then redirects to a fixed clean portal page. Do not keep callback code/state in the final browser URL.
10. The user purchases through the normal ZEX app or supported ZEX website checkout. ZEX verifies provider state and publishes payment/status events. The portal updates sales and earnings from those facts.

There is no `account.linked` webhook in version 1. The complete response and member status API confirm linking. If the complete response is lost, retry completion with the same request ID, code and completion idempotency key, or query the member status API. A different completion key cannot redeem an already completed request.

Request status values are `pending`, `authorized`, `completed`, `cancelled` and derived `expired`. Request records are cleaned up after their expiry plus the configured recovery window, currently 24 hours. Do not use them as a permanent history store. Link and event records follow the account lifecycle separately.

## Partner API examples

All examples use fictitious member IDs. Supply the real API origin and credentials only in server configuration.

```http
POST /api/v1/integrations/mlm/connect-sessions
Content-Type: application/json
X-Zex-Partner-Key: <server-only partner key>
Idempotency-Key: <stable key for this attempt>

{
  "external_member_id": "MEMBER-42",
  "state": "<cryptographically random callback state>",
  "callback_url": "https://cybernetworking.vercel.app/api/integrations/zex/callback"
}
```

```json
{
  "request_id": "e604d425-df00-46bd-9553-59fb92ea7959",
  "external_member_id": "MEMBER-42",
  "status": "pending",
  "expires_at": "2026-10-15T12:10:00Z",
  "connect_url": "https://zex4u.com/connect/mlm#request=<opaque-token>"
}
```

`external_member_id` is 1–128 characters and matches `^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$`. `state` is 16–512 printable ASCII characters without spaces; use random base64url bytes rather than a member ID. `Idempotency-Key` is 1–128 printable ASCII characters without spaces. Reusing a create key with changed input returns `MLM_IDEMPOTENCY_CONFLICT`.

```http
POST /api/v1/integrations/mlm/connect-sessions/e604d425-df00-46bd-9553-59fb92ea7959/complete
Content-Type: application/json
X-Zex-Partner-Key: <server-only partner key>
Idempotency-Key: <stable completion key for this attempt>

{"code":"<one-time code from the validated callback>"}
```

```json
{
  "partner_id": "cybernetworking",
  "external_member_id": "MEMBER-42",
  "zex_user_id": "3e08366f-e264-4370-8f18-6bd6abe34924",
  "linked_at": "2026-10-15T12:02:00Z"
}
```

`GET /connect-sessions/{request_id}` returns the request status and expiry without the bearer request token or candidate account. `GET /members/{external_member_id}` provides the current link and subscription snapshot. These paths require the partner key and apply only to the configured partner. A link is one-to-one within that partner; remapping an existing member or customer to another account returns `MLM_LINK_CONFLICT`.

## Portal callback example

The following TypeScript handler illustrates the server boundary. Implement the `portalStore` adapter using durable records and unique constraints; it is the portal's existing session/database code. `requirePortalMember` must use the server session, never a member ID from the URL. The example security helpers are provided in [mlm-security.mjs](examples/mlm-security.mjs).

```ts
import { callbackStateMatches } from "@/lib/zex-security";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const currentMember = await requirePortalMember(request);
  const query = new URL(request.url).searchParams;
  // Reject duplicate parameters rather than choosing one value.
  for (const key of ["request_id", "state", "code", "error"]) {
    if (query.getAll(key).length > 1) return new Response("Invalid callback", { status: 400 });
  }
  const pending = await portalStore.findConnectAttempt(query.get("request_id"));
  if (!pending || pending.memberId !== currentMember.id
      || !callbackStateMatches(query.get("state"), pending.stateHash)) {
    return new Response("Invalid callback", { status: 400 });
  }
  if (query.get("error") === "access_denied") {
    await portalStore.markCancelledIfPending(pending.id);
    return cleanRedirect("/account/zex?connection=cancelled");
  }
  const code = query.get("code");
  if (!code || query.has("error")) return new Response("Invalid callback", { status: 400 });
  const response = await fetch(`${process.env.ZEX_API_BASE_URL}/api/v1/integrations/mlm/connect-sessions/${encodeURIComponent(pending.requestId)}/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Zex-Partner-Key": process.env.ZEX_PARTNER_API_KEY!,
      "Idempotency-Key": pending.completeKey,
    },
    body: JSON.stringify({ code }),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    // Keep the same completeKey for timeout/5xx retries. Map terminal errors
    // to a safe portal message; never log callback query strings or the code.
    return new Response("Connection could not be confirmed. Return to the portal to retry.", {
      status: 502, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
    });
  }
  const link = await response.json(); // Validate against the Link schema.
  if (link.external_member_id !== pending.externalMemberId
      || link.partner_id !== process.env.ZEX_PARTNER_ID) throw new Error("Connection owner mismatch");
  // Transaction: assert any existing mapping is identical, insert mapping,
  // and mark this attempt completed. Do not hold a DB lock during fetch().
  await portalStore.completeWithExactLink(pending.id, currentMember.id, link);
  return cleanRedirect("/account/zex?connection=connected");
}

function cleanRedirect(path: string) {
  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL(path, process.env.PORTAL_ORIGIN).href,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
```

Use a Secure, HttpOnly portal session cookie with a SameSite policy that permits the top-level callback, commonly `Lax`. If the original portal session is unavailable, require that member to sign in and start Connect again; possession of a callback code must never substitute for portal-session ownership. Disable query-string logging for the callback in hosting, error tracking and analytics. Add `no-store` and `no-referrer` to every callback response, including auth failures.

## Receive signed events

ZEX posts the same immutable event shape to the configured webhook and exposes it in the recovery feed:

```json
{
  "event_id": "65bf8735-bdaf-44c1-8979-635d06d48bf5",
  "sequence": 24,
  "type": "sale.confirmed",
  "version": 1,
  "occurred_at": "2026-10-15T12:05:00Z",
  "partner_id": "cybernetworking",
  "external_member_id": "MEMBER-42",
  "data": {
    "sale_id": "1b16a2af-e945-4414-a69c-d0198954e08b",
    "subscription_id": "a39d8c34-0e91-4051-8ab9-8ee126df900d",
    "product_code": "<ZEX catalog plan code>",
    "source": "play",
    "amount_minor": 49900,
    "currency": "INR",
    "paid_at": "2026-10-15T12:05:00Z",
    "sale_kind": "acquisition",
    "commission_eligible": true,
    "eligibility_reason": "eligible_first_acquisition"
  }
}
```

| Event | Meaning and portal action |
| --- | --- |
| `subscription.updated` | Current subscription status and period fields; update the status display without paying a commission |
| `sale.confirmed` | A verified paid order; create the sale once and calculate a commission only when eligible |
| `sale.adjusted` | Verified adjustment to the original sale; apply the policy reversal once per adjustment ID |

For `sale.adjusted`, `data` contains `sale_id`, `adjustment_id`, `reason` (`refund` or `chargeback`), positive `amount_minor`, `currency: INR` and nullable `adjusted_at`. `occurred_at` is the event's recorded occurrence time; `adjusted_at` is the provider adjustment time when available. Do not invent a timestamp when it is null.

For `subscription.updated`, `data` contains `subscription_id`, `product_code`, `source`, `status`, nullable `current_period_start` and `current_period_end`, `auto_renew` and `cancel_at_period_end`. A cancellation scheduled for period end can retain paid access until expiry. Unknown status values should be displayed conservatively and must not create an earning.

Each webhook includes:

```http
Content-Type: application/json
X-Zex-Webhook-Id: <event UUID>
X-Zex-Webhook-Timestamp: <delivery time as Unix seconds>
X-Zex-Webhook-Signature: v1=<lowercase hex digest>
```

The digest is `HMAC-SHA256(webhookSecret, timestamp + "." + exactRawBodyBytes)`. Check it before JSON parsing, compare digests in constant time, accept delivery timestamps within five minutes and verify the event header ID equals `event_id`. Keep server clocks synchronized. Retries keep the event ID but carry a new delivery timestamp and signature; old `occurred_at` values are valid on delayed events.

The runnable helper [mlm-security.mjs](examples/mlm-security.mjs) handles the raw-body limit, signature, timestamp and envelope checks. Copy it into the portal's server code and validate `data` against the matching OpenAPI event schema before applying business logic.

```ts
import { readRawWebhook, verifyZexWebhook } from "@/lib/zex-security";
export const runtime = "nodejs";

export async function POST(request: Request) {
  let event;
  try {
    const raw = await readRawWebhook(request);
    event = verifyZexWebhook(raw, request.headers,
      process.env.ZEX_WEBHOOK_SECRET!, process.env.ZEX_PARTNER_ID!);
    validateEventData(event); // Use the corresponding OpenAPI schema.
  } catch {
    return new Response(null, { status: 401 });
  }
  try {
    // Insert into a durable inbox with UNIQUE(partner_id,event_id).
    // Its pending row is the worker queue. A duplicate is already durable.
    await portalStore.insertWebhookInboxIfAbsent(event);
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 503 });
  }
}
```

Return 2xx only after the event is durably stored. Keep the HTTP receiver fast: ZEX's delivery timeout is four seconds. Do commission work in a separate worker. ZEX retries non-2xx and network failures without a fixed attempt limit: backoff starts at ten seconds, doubles and caps at one hour. The recovery feed works independently of delivery attempts. Redirects are not followed. Configure a direct endpoint that does not redirect between domains, authentication middleware or trailing-slash variants.

## Process duplicates and out of order delivery

Store an inbox row unique on `(partner_id, event_id)`. In a database transaction, lock the inbox item, validate the member mapping, write the sale/adjustment or snapshot, then mark the inbox row processed. Rollback all of these together on failure. A webhook retry and a recovery-feed replay must enter the same processing path.

Use additional unique constraints on `(partner_id, sale_id)` and `(partner_id, adjustment_id)`. A duplicate event ID alone is not the full financial guard. Store commission entries under the sale and the policy version used, so reprocessing does not apply changed commission settings to old sales. Keep the original sponsor/tree attribution according to the portal's immutable sale policy.

If an adjustment arrives before its sale, store it as pending and recover the original sale before calculating the reversal. Never create an unmatched negative earning. For subscription snapshots, apply a newer `sequence` only to that subscription's status. Continue processing every unique sale and adjustment even if its sequence is below a more recently received snapshot.

Do not advance the recovery cursor to the largest webhook sequence. Webhooks can arrive out of order and a larger sequence does not prove earlier events have been received.

## Recover missed events and current status

Call `GET /api/v1/integrations/mlm/events?cursor=0&limit=50` with the partner key. `cursor` is the last feed sequence committed by the portal; `limit` is 1–100, default 50.

```json
{
  "events": [],
  "next_cursor": 24,
  "has_more": false
}
```

1. Load the portal's durable recovery cursor, starting at zero.
2. Fetch a page. Validate partner, event schemas, ascending sequence and cursor movement.
3. In one portal transaction, insert each returned event into the same durable inbox and save `next_cursor`. Repeated pages are safe because of the inbox constraint.
4. Continue while `has_more` is true, then poll periodically and after outages.
5. Let the inbox worker apply facts. If processing fails, preserve the pending inbox row; the checkpoint only guarantees durable receipt.

ZEX serializes sequence allocation with transaction commit within a partner's stream. The feed does not skip a lower sequence because a later transaction committed first. Sequences need not be contiguous: privacy filtering and account lifecycle changes can remove visibility. `occurred_at` is not the cursor and can be older than a previously delivered event.

Use `GET /members/{external_member_id}` when the portal needs a current link or subscription snapshot, such as after callback recovery or a suspected stale status. A current status snapshot cannot recreate historical monetary events and must never synthesize a sale. Events are processed asynchronously: billing changes queue work immediately and workers normally check every five seconds; reconciliation and provider outages can delay publication. The normal status sweep is approximately fifteen minutes. Each prior verified sale is reconciled independently for adjustments, normally every six hours, so a newer billing cycle does not hide an older sale's refund. These intervals are not a delivery SLA.

The API exposes only the configured partner's connected members. It excludes email, phone, Firebase identifiers, purchase tokens and raw provider payloads from event data. Stop displaying shared state when the member endpoint reports no connection. Handle account deletion, access revocation and legally retained financial records through the agreed portal lifecycle process; no version 1 unlink or deletion webhook is promised. The recovery feed is not a permanent backup of accounts that ZEX has erased.

## Errors and retry policy

Errors use this envelope:

```json
{"error":{"code":"MLM_REQUEST_EXPIRED","message":"This connection request has expired"}}
```

| HTTP status and code | Action |
| --- | --- |
| `400 MLM_REQUEST_INVALID` | Correct malformed input or restart Connect; do not retry changed input under the old create key |
| `401 MLM_UNAUTHORIZED` | Correct the server partner credential; do not expose the key in diagnostics |
| `401 UNAUTHORIZED` on authorize | Reauthenticate the ZEX customer |
| `403 MLM_ACCOUNT_UNAVAILABLE` | Stop linking; the customer account is unavailable |
| `409 MLM_REQUEST_USED` | Query member/request status; reuse the original complete key only for an exact completion retry |
| `409 MLM_LINK_CONFLICT` | Keep the existing mapping; require a support resolution rather than overwriting it |
| `409 MLM_IDEMPOTENCY_CONFLICT` | Restore the original request body/key pair or create a new attempt |
| `410 MLM_REQUEST_EXPIRED` | Start a new Connect request |
| `404 NOT_FOUND` | Integration may be disabled or route unavailable; check deployment configuration |
| `429` | Back off and retry within the request lifetime; do not loop in the browser |
| `5xx` or network timeout | Retry the same operation with its original idempotency key; use recovery APIs for uncertain results |

Error messages are for safe display; use `error.code` for program logic. Never include provider bodies, request tokens, callback codes, state or secrets in logs.

## Configuration and release sequence

| ZEX variable | Purpose |
| --- | --- |
| `MLM_INTEGRATION_ENABLED` | Default `false`; enable only after configuration and validation |
| `MLM_PARTNER_ID` | Stable partner namespace, currently intended as `cybernetworking` |
| `MLM_PARTNER_NAME` | Human-readable partner name on the consent page |
| `MLM_CONNECT_PAGE_URL` | ZEX-hosted page, normally `https://zex4u.com/connect/mlm` |
| `MLM_CALLBACK_URL` | Defaults to `https://cybernetworking.vercel.app/api/integrations/zex/callback`; override with the exact callback on the deployed portal domain |
| `MLM_WEBHOOK_URL` | Defaults to `https://cybernetworking.vercel.app/api/integrations/zex/webhook`; override with the direct receiver on the deployed portal domain |
| `MLM_PARTNER_API_KEY` | Dedicated server secret, distinct from webhook and consumer secrets |
| `MLM_WEBHOOK_SECRET` | Dedicated signing secret shared only with the portal backend |

ZEX derives request and result capabilities using a separate HMAC domain and server-only signing material. The portal does not receive that material. Secret rotation can invalidate unfinished Connect requests; finish or restart outstanding attempts during a coordinated rotation. The current webhook contract has one active signing secret and no key ID, so coordinate a rotation window and use the feed to recover any delivery interrupted during it.

Apply migrations `137_mlm_partner_integration` and `138_mlm_billing_facts` after their existing account-lifecycle prerequisites. Keep the feature disabled while applying schema and deploying compatible ZEX API/web artifacts. Nonsecret production variables belong in the ConfigMap/AKS overlay; integration secrets belong in Azure Key Vault and its existing secret delivery mechanism.

The portal team must first deploy its session-bound create/callback workflow, durable database constraints, webhook inbox, event worker and recovery cursor. Configure the portal's server-only API origin, partner ID, partner key, signing secret and own origin. Ensure the callback and webhook bypass unrelated page-login redirects while still performing their own required verification. Confirm hosting query/body logging and error reporting redact the sensitive routes.

Before activation, the ZEX owner must verify Google Play API access to real order data, RTDN configuration, production purchase evidence and adjustment access. PhonePe owner must verify completed debit amounts, authenticated refund callbacks and known-refund polling with the actual configured account/API version. Sandbox and license-test transactions must not create eligible sales. Keep existing payment/release flags unchanged unless separately authorized.

After the portal URL and DNS are ready, verify the configured callback/webhook defaults or explicitly override them, provision the secrets and partner identity, deploy the compatible artifacts, verify runtime configuration on every replica, then explicitly enable the integration. Confirm the portal endpoint accepts a signed test fixture before sending real customer data. No endpoint in this guide is claimed to be deployed by the implementation handoff.

## Acceptance tests

| Test | Expected result |
| --- | --- |
| New member, existing ZEX customer | Correct member/account mapping after callback session/state validation |
| New member, new ZEX customer | Explicit signup/consent, then connection; same sign-in reaches the Android account |
| Cancel before login or confirmation | No permanent mapping; portal receives validated cancellation state |
| Wrong portal session, changed state or duplicate callback parameters | Callback rejected without calling complete |
| Account switches while authorize is pending | Old browser response cannot connect the newly selected account |
| Repeated create or lost completion response | Original idempotency key returns the same outcome; no duplicate mapping |
| Conflicting member/customer mapping | Existing link preserved; conflict returned |
| Purchase predates connection or is restored | Status visible; no historical acquisition credit |
| Confirmed production INR first purchase | One eligible sale, exact provider amount, one commission ledger entry |
| Renewal or other nonqualifying charge | Sale may be reported with eligibility false; no acquisition payout |
| Trial, pending debit, mandate-only activation, test purchase | No eligible paid sale |
| Partial/full refund or supported chargeback | Original sale referenced; adjustment applied once; cumulative reversal bounded |
| Refund of an older cycle after renewal | Original sale remains independently reconcilable |
| Webhook duplicate, 5xx, timeout or out of order delivery | Durable retry/recovery; no lost or duplicate earning |
| Changed body, wrong secret, stale timestamp or wrong partner | Signature/envelope rejected |
| Receiver outage followed by feed recovery | Every visible event stored once; cursor moves only with durable inbox writes |
| Account deletion begins | No new exports or linking; portal lifecycle reconciliation handles removal |
| Integration disabled | Partner API is unavailable and existing ZEX billing continues normally |

From the directory containing this guide, run the portable example checks with `node --test examples/mlm-security.test.mjs`. Repository unit/build tests do not replace the portal callback test, effective production permissions or real provider validation above.
