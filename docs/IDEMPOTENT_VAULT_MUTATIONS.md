# Idempotent vault mutations

Deposit and withdraw are side effects. A client can lose the response after a
provider accepts a transaction and then retry. YieldVault now treats the
idempotency key as part of the mutation contract so a retry returns the
original terminal response and does not submit another ledger mutation.

## API contract

`POST /api/positions/deposit` and `POST /api/positions/withdraw` require an
`idempotencyKey` in the request body. It is 8–128 characters and may contain
letters, numbers, `.`, `_`, `:`, or `-`. The authenticated actor, operation,
and canonical request payload form the idempotency scope.

```json
{
  "user": "operator_a",
  "vaultId": "vault_primary",
  "amount": 100,
  "idempotencyKey": "deposit-2026-0001"
}
```

The key is generated once per logical action and reused for every client retry.
Do not generate it inside a generic HTTP retry loop.

## Result matrix

| Request | Behavior |
| --- | --- |
| First valid key | Submit one provider invocation, update vault/position, audit success |
| Same actor/operation/key and same payload | Return the stored result and transaction hash |
| Same key with changed amount/shares/vault | Return HTTP 409 conflict |
| Same key while first call is processing | Return HTTP 409 in-progress |
| Invalid or missing key | Return HTTP 400 validation error |
| Failed validation/provider call | Remove processing record; corrected retry may run |

The request fingerprint includes all mutation fields. Correlation IDs are not
part of the fingerprint, so a transport retry can supply a new request ID and
still receive the same response. The transaction lifecycle record and audit
event are created only by the first mutation.

## State machine

```text
absent --validated request--> processing --mutation success--> completed
   ^                              |                              |
   |                              +--failure/rollback------------+
   +----------------------corrected retry                         |
                                                                  +--same request: replay
                                                                  +--different request: conflict
```

The in-memory implementation performs the check synchronously before calling
the mock Stellar adapter. That prevents two JavaScript callers from interleaving
the check and provider submission in this process. A database implementation
must enforce the same property with a unique constraint and a transaction or
row lock.

## Provider and restart behavior

`transactionLifecycleService` retains provider identity, attempt count, state
history, and unknown outcomes. The idempotency record retains the terminal API
result. Both records must be durable before this service is deployed across
multiple processes.

The demo store is intentionally in memory, so a process restart clears all
records. A production adapter should persist at least:

- actor ID, operation, and idempotency key;
- canonical request fingerprint;
- processing/completed state;
- serialized terminal response;
- provider transaction ID;
- creation and completion timestamps.

Add a unique index on `(actor_id, operation, idempotency_key)`. On a duplicate
insert, compare the fingerprint. If the first row is processing, wait for its
terminal state or return a documented in-progress response. If the process
died after provider submission but before local completion, query the provider
by the stable provider reference before submitting anything new.

## Audit and observability

Only the first successful mutation emits the domain audit event. A replay is a
transport-level response and must not create a second deposit/withdraw event.
The transaction lifecycle stores the provider transaction hash so support can
reconcile an ambiguous timeout.

Log the actor, operation, key hash or redacted key, and replay/conflict outcome;
never log credentials or full request bodies. Metrics should use low-cardinality
labels such as operation and outcome. Useful counters are:

- `vault_idempotency_completed_total{operation}`;
- `vault_idempotency_replayed_total{operation}`;
- `vault_idempotency_conflict_total{operation}`;
- `vault_idempotency_in_progress_total{operation}`;
- `vault_provider_unknown_total{operation}`.

## Rollout checklist

- [ ] Clients generate one key for each logical deposit or withdrawal.
- [ ] Clients reuse that key after a timeout, with the same payload.
- [ ] API validation rejects missing, malformed, or overlong keys.
- [ ] Conflicting reuse returns a clear 409 response.
- [ ] Provider calls and domain audit events occur once.
- [ ] Transaction lifecycle status is reconciled by provider transaction ID.
- [ ] Durable storage and uniqueness constraints are added before multi-process deployment.
- [ ] Crash recovery queries unknown provider outcomes before retrying.
- [ ] Dashboards distinguish replay, conflict, provider failure, and success.

The issue-specific tests cover deposit and withdrawal replay, payload conflict,
actor/operation scope isolation, validation cleanup, canonical fingerprints,
in-flight protection, and completed-result replay. Existing lifecycle tests
continue to cover provider submission, confirmation, unknown outcomes, bounded
backoff, and restart-oriented state handling.

## Timeout and recovery playbook

When a client times out, first inspect the transaction status using the
provider transaction hash or the correlation ID. A timeout is not proof that
the deposit or withdrawal failed. The safe sequence is:

1. Keep the original idempotency key.
2. Keep the original amount/shares and vault ID unchanged.
3. Query the transaction lifecycle for `pending`, `submitted`, `unknown`, or
   terminal status.
4. Query the provider by its stable transaction reference if the status is
   `unknown`.
5. Retry the API request with the same key only when the client still needs the
   terminal response.
6. Compare the returned transaction hash with the lifecycle record.

Do not press a UI “retry” action that silently generates a new key. A new key
is a new mutation and can legitimately create a second provider invocation.

### Provider accepted, response lost

The provider may have committed while the server process was unable to finish
its local response. The durable solution is to derive or persist one provider
reference from the idempotency key, then reconcile that reference after
restart. The reconciler should mark the local record completed when the
provider confirms it, or mark it failed only after the provider proves it did
not commit. Never submit a second deposit merely because the first HTTP call
timed out.

### Provider rejected before mutation

If the provider rejects before a ledger mutation, the processing record may be
removed or marked failed according to the durable adapter policy. A corrected
request should use a new key when its payload changes. Reusing the old key with
new amount/shares must remain a conflict so support can distinguish correction
from replay.

## Persistence migration

For the current mock store, restart behavior is intentionally explicit: all
maps are process memory and are lost when the process exits. Before production
deployment, introduce a migration with a table similar to:

```sql
create table vault_idempotency_records (
  actor_id text not null,
  operation text not null,
  idempotency_key text not null,
  request_fingerprint char(64) not null,
  status text not null,
  response_json text,
  provider_tx_id text,
  created_at timestamp not null,
  completed_at timestamp,
  primary key (actor_id, operation, idempotency_key)
);
```

The exact types depend on the deployed database, but the uniqueness boundary
must not be omitted. Store the response in a canonical serialization, or store
the fields required to reconstruct the same contract response. Encrypt or
protect sensitive response data according to the vault data policy.

The migration should be rolled out in phases:

1. deploy the table and uniqueness constraint without changing request flow;
2. dual-write records while the in-memory path remains the compatibility read;
3. compare fingerprints, status, and provider hashes in shadow checks;
4. switch reads to durable completed records;
5. remove process-local fallback only after restart drills pass.

During a rolling deployment, two versions may receive the same request. Both
must use the same durable uniqueness constraint. A process-local Map cannot
protect against two pods or two workers.

## Security considerations

The actor used for scoping must come from authentication, not from a mutable
client field alone. The controller currently receives the user in the request
contract because this demo uses loose mock identities; a production gateway
must bind it to the authenticated principal before invoking the service.

Keys are identifiers, not bearer credentials. Do not put tokens, secrets, or
full wallet material in them. Store only a digest or a redacted form in logs.
The request fingerprint detects changed inputs but does not make sensitive
payloads safe to log.

Apply rate limits to repeated conflicts and in-progress polls. An attacker
who guesses another actor’s key should still fail actor authorization before
seeing a terminal response. Provider transaction IDs should be treated as
operational data and should not be exposed beyond the normal transaction
status contract.

## Test matrix for adapters

Any provider-backed implementation should run this matrix against a fake
provider and a fresh store fixture:

| Case | Provider calls | State expectation | Audit events |
| --- | ---: | --- | ---: |
| first deposit succeeds | 1 | completed | 1 |
| same deposit retry | 0 additional | original result | 0 additional |
| same key, amount changed | 0 additional | conflict | 0 additional |
| concurrent same-key deposit | 1 | one position delta | 1 |
| first withdrawal succeeds | 1 | shares reduced once | 1 |
| same withdrawal retry | 0 additional | original receipt | 0 additional |
| timeout with unknown provider result | 1 | unknown/reconcile | 1 operational record |
| provider rejection | 1 | failed/no false success | 1 failure record |
| process restart before retry | 0 duplicate submits | durable lookup | unchanged |

The matrix separates domain state from transport response. A test that only
asserts HTTP 200 can miss a duplicate provider call or duplicate audit event.
Count provider invocations and inspect vault totals, position shares,
transaction lifecycle records, and audit rows after every case.

## Design decisions

The key is intentionally not normalized by trimming or case-folding. A client
must send the same exact key on a retry; silently changing it would create a
new scope and hide client bugs. Validation occurs before any vault lookup or
provider call, which keeps malformed requests from reserving state.

The fingerprint uses recursively sorted object keys so equivalent JSON object
ordering cannot produce a false conflict. Arrays remain ordered because they
represent ordered input. Numeric normalization is left to the existing amount
and share conversion policies, ensuring the fingerprint describes the values
the mutation actually receives.

Terminal results are returned as the original result shape. This avoids a
compatibility break for clients and preserves the original provider hash. A
future API may add replay metadata, but that metadata must be additive and
must not be used as a reason to execute the provider again.

The implementation removes a processing record when a synchronous mutation
throws. This is appropriate for the mock provider, where no asynchronous
submission can remain after the function returns. A real adapter must instead
persist an unknown state whenever the provider outcome is ambiguous and let a
reconciler decide whether another attempt is safe.

## Maintainer review prompts

Reviewers should ask which exact business fields participate in the
fingerprint, whether the actor is authenticated, and whether the provider
reference is stable across transport retries. They should inspect the before
and after vault totals, the position share delta, transaction count, and audit
count in the duplicate-request test. A passing response assertion alone is
not sufficient evidence of idempotency.

Any change to the request schema must update validation, the fingerprint
payload, API examples, and the conflict tests together. Any change to provider
submission must preserve the rule that `begin` happens before submission and
`complete` happens only after the domain state and audit event are written.

The minimum release evidence is a clean focused suite, a clean full suite, and
a review of provider-call counts. Keep the migration limitation visible until
durable records and restart drills are complete.

When reviewing a new mutation, also verify that:

- the key is required at the route boundary;
- the authenticated actor is included in the scope;
- every side-effecting input is fingerprinted;
- the provider call occurs after the processing record;
- the result is completed after state and audit writes;
- failures do not leave an uninspectable duplicate path;
- timeout reconciliation has a stable provider reference;
- conflict responses are safe to expose to clients;
- metrics do not contain keys, wallet data, or raw payloads;
- documentation names the current persistence limitation.

This review list should be copied into provider adapter changes and revisited
when the mock store is replaced with a durable database.

Release owners should record the provider reconciliation drill and the
rollback plan alongside the deployment change.

That evidence belongs in the PR discussion so future maintainers can audit
the decision without reconstructing production history.
