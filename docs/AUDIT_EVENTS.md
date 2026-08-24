# YieldVault audit events

YieldVault records a structured audit event for every completed state-changing
position operation. The event is intended for operator investigation,
reconciliation, and compliance-oriented integration tests.

## Event schema

```json
{
  "id": "audit_…",
  "version": 1,
  "actor": "operator-1",
  "action": "vault.deposit",
  "target": "vault_…",
  "correlationId": "req_…",
  "outcome": "success",
  "before": { "totalAssets": 1000, "totalShares": 1000 },
  "after": { "totalAssets": 1100, "totalShares": 1100 },
  "timestamp": "2026-08-24T00:00:00.000Z"
}
```

| Field | Rule |
| --- | --- |
| `id` | Unique, server-generated identifier. |
| `version` | Numeric schema version, currently `1`. |
| `actor` | Authenticated operation subject, bounded to 256 characters. |
| `action` | Stable operation name such as `vault.deposit`. |
| `target` | Vault or resource affected by the operation. |
| `correlationId` | Request ID used to join logs and transaction receipts. |
| `outcome` | `success` for committed transitions or `failure` for explicit failures. |
| `before` | Redacted bounded summary before the state transition. |
| `after` | Redacted bounded summary after the state transition. |
| `timestamp` | Server-generated ISO timestamp. |

## Operation semantics

The position service records an event only after the mocked chain invocation,
store update, and position update have succeeded. This ordering ensures a
success event never claims a state transition that was not committed locally.

Deposit events record the vault asset/share totals before and after the
deposit, together with the normalized amount and minted shares. Withdrawal
events record the position shares and vault totals before and after the
withdrawal, together with the normalized returned assets. Full withdrawals
record zero remaining shares even though the position record is removed.

Failed requests that do not mutate state do not emit a success event. This is
important for an operator searching for committed changes: a missing event is
not confused with a failed authorization attempt.

## Query API

`GET /api/audit` returns bounded audit history. The endpoint requires
`X-Audit-Role: admin` or `X-Audit-Role: auditor`. It accepts:

- `actor` — exact actor filter.
- `target` — exact vault/resource filter.
- `correlationId` — exact request filter.
- `limit` — page size capped at 100.
- `offset` — non-negative page offset.

The response includes `events` and pagination metadata. Events are returned
newest first. Filtering is applied before pagination so operators can page
through a narrow investigation without downloading unrelated history.

## Redaction rules

Audit metadata is recursively sanitized before storage. Strings are limited to
256 characters and collections are limited to 20 entries. Keys containing
`secret`, `token`, `password`, `credential`, `privateKey`, or `mnemonic` become
`[REDACTED]`. Deeply nested or oversized data is truncated. Raw wallet
credentials and provider response bodies must never be placed in an event.

The redaction boundary is deliberately before the Map insertion, not only at
HTTP serialization time. This protects in-process consumers and future storage
adapters from accidentally persisting sensitive values.

## Correlation and reconciliation

The request ID middleware creates or accepts the `X-Request-Id` value and the
position controller passes it to the service. Operators can use the same value
to join the audit event, application logs, transaction receipt, and any future
downstream trace. If a service call is made directly without a request context,
the event uses `unknown` and should be treated as lower-confidence telemetry.

For reconciliation, compare the `before` and `after` totals to the operation's
conversion result and transaction receipt. A deposit should increase both
vault totals by the conversion result. A withdrawal should reduce totals by
the returned asset amount and share count. Any mismatch is a correctness issue
and should block automated settlement until reviewed.

## Compatibility, retention, and rollback

The audit collection and endpoint are additive to the existing in-memory
store. Consumers must ignore unknown fields and use `version` to handle future
schema changes. A persistent deployment should map these records to an
append-only table with indexes on actor, target, correlation ID, and timestamp.

The current store has no durable retention layer, matching the rest of the
repository. Production rollout should add retention and access logging at the
storage adapter, not by weakening the event schema. Reverting the feature is
safe without a data migration because position and transaction records retain
their existing shapes.

## Review checklist

- Every successful deposit emits one event.
- Every partial withdrawal emits one event.
- Every full withdrawal emits one event.
- Failed reads and authorization errors do not claim success.
- Actor and correlation values are present.
- Before/after summaries are bounded and redacted.
- Audit reads reject missing or unauthorized roles.
- Filters compose correctly before pagination.
- Schema version is asserted in tests.
- CI runs the complete test suite without disabled checks.

## Incident response questions

When an event does not match a transaction receipt, ask:

1. Was the event recorded after the local state write?
2. Does the correlation ID appear in request logs?
3. Do the before totals match the preceding audit event?
4. Do the after totals match the returned conversion result?
5. Was the operation partial or a full position close?
6. Was the vault synchronized before the calculation?
7. Did the mocked provider return a successful transaction hash?
8. Did a client retry after an ambiguous response?
9. Is the event schema version supported by the reader?
10. Did redaction alter only sensitive metadata?

The answers should be recorded with the incident rather than editing the event.
Audit records are evidence and must remain append-only in a persistent adapter.

## Future persistence adapter

A database-backed adapter should preserve the Map-facing service contract while
adding a unique key on event ID, indexes for the three query filters, and an
append-only permission model. It should write the event in the same transaction
as the position state transition or use an equivalent transactional outbox.
