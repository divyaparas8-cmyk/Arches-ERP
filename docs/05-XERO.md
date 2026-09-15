# 05 — Xero Integration

Do this in a Xero demo company first. Never point at the live organisation until the client says so.

## 1. Setup

1. Create a free Xero developer account and a **demo company (UK)** — GBP, 20% VAT.
2. In the developer portal, create an app of type **Web app**. Note the Client ID and Client Secret.
3. Redirect URI: `http://localhost:3000/api/xero/callback` for dev, plus the production URL later.
4. Scopes: `openid profile email accounting.transactions accounting.contacts accounting.settings offline_access`.
   `offline_access` is required — without it there is no refresh token and the connection dies after 30 minutes.
5. `npm i xero-node`.

Env:
```
XERO_CLIENT_ID=
XERO_CLIENT_SECRET=
XERO_REDIRECT_URI=http://localhost:3000/api/xero/callback
XERO_ENCRYPTION_KEY=      # 32-byte key for encrypting tokens at rest
```

## 2. Connection flow

- `GET /api/xero/connect` — build the consent URL with a signed `state`, redirect.
- `GET /api/xero/callback` — exchange the code, call `updateTenants()`, store into the single `xero_connection` row: `connected`, `org` (tenant name), `tenant_id`, encrypted `access_token` and `refresh_token`, `expires_at`, `last_sync`.
- `POST /api/xero/disconnect` — revoke and clear the row.

**Token refresh.** Access tokens last 30 minutes; refresh tokens 60 days and rotate on every use. Wrap every API call in `withXero()` which checks `expires_at`, refreshes when under 5 minutes remain, and persists the new pair before proceeding. A rotated refresh token that fails to persist locks the client out of their own accounts — write it in the same transaction as the call that triggered the refresh.

## 3. Mapping

| Arches | Xero |
|---|---|
| Client | Contact — match on name, create if absent, store `xero_contact_id` on the client |
| Order | ACCREC Invoice, `Reference` = order id (`ARC-1042`) |
| Deposit invoice | One line: "Deposit — 50% of order [ARC-####]", 50% of order value |
| Balance invoice | One line: "Balance — order [ARC-####]" plus a shipping line when shipping > 0 |
| Revenue account | Nominated sales account — default `200` (Merch revenue), configurable |
| Tax | `OUTPUT2` (20% VAT on income) for UK clients; `ZERORATEDOUTPUT` for exports — ask the client per market |
| Due date | Invoice date + 14 days, configurable |

Send amounts as decimal pounds (`amountPence / 100`), rounded to 2dp. Xero is the system of record for VAT arithmetic — send `LineAmount` exclusive of tax and let Xero compute.

## 4. Push

`pushInvoice(orderId, kind: 'deposit' | 'balance')`:

1. Load the order and compute the amount with `lib/pricing.ts`.
2. Resolve or create the Xero contact.
3. `createInvoices()` with `Status: 'AUTHORISED'` (not DRAFT — the client wants it sendable).
4. On success, in one transaction: update `xero_records` with `ref` (Xero's `InvoiceNumber`), `xero_invoice_id`, `status = 'synced'`, `amount_pence`, `synced_at`, `note = 'Awaiting payment in Xero'`; write an activity entry `Invoice INV-#### created in Xero` with actor `Xero`; stamp `xero_connection.last_sync`.
5. On failure: `status = 'error'`, `last_error` = Xero's message, activity entry `Xero sync failed — [message]`. Do not throw past the UI; show the error on the invoice row with a retry.

**Idempotency.** Before creating, check `xero_records.xero_invoice_id`. If set, update the existing invoice rather than creating a duplicate. Duplicate invoices in a client's accounts are the worst failure mode here.

**Auto-push** fires on the stage 3 → 4 transition when `xero_connection.auto_push` is true.

## 5. Pull

`Sync now`:
1. Push every `queued` record.
2. For every `synced` record with an `xero_invoice_id`, `getInvoice()` and read `AmountPaid` / `AmountDue` / `Status`.
3. Update `paid_pence` and `note`. When a deposit invoice is fully paid and the order is at stage 4, surface it — do **not** auto-advance the stage. Accounting confirms the transition manually; that is deliberate.
4. Stamp `last_sync`.

**Webhooks are better than polling** if the client's plan allows: subscribe to the Invoices topic, verify the `x-xero-signature` HMAC, and process events into the same update path. Build polling first; webhooks are an add-on if time allows.

## 6. Failure modes to handle

- Tenant disconnected by the client in Xero → 401 with `TokenExpired`. Set `connected = false`, show a Reconnect prompt, don't retry in a loop.
- Rate limit (60 calls/min per tenant, 5000/day) → respect `Retry-After`, back off.
- Validation error (missing account code, bad tax type) → `status = 'error'` with the message shown verbatim. These are configuration problems, not bugs.
- Network timeout mid-create → on retry, search invoices by `Reference = orderId` before creating, to avoid a duplicate.

## 7. Before go-live

- Replace the placeholder circled `X` mark with the official Xero brand mark per Xero's brand guidelines.
- Confirm the sales account code and VAT treatment with the client's bookkeeper.
- Move from the demo company to the live tenant and re-run the connect flow.
- Confirm token encryption is on and the key is in the production secret store, not the repo.
