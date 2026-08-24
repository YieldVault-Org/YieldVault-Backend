# YieldVault amount and fee policy

This document defines the canonical arithmetic used by deposit previews,
deposits, withdrawals, fee quotes, and API responses. The policy is kept in
`src/utils/math.js` and is deliberately shared by every state-changing path.

## Supported units

| Rule | Value | Behavior |
| --- | --- | --- |
| Decimal places | 6 | Values are represented to six fractional digits. |
| Minimum unit | `0.000001` | Smaller values are rejected. |
| Maximum amount | `1e12` | Larger values are rejected before mutation. |
| Rounding | nearest | Only supported values are normalized. |
| Empty-vault price | `1` | First deposits mint one share per asset. |

An amount is valid only when it is finite, non-negative, and within the maximum.
Mutation inputs such as a deposit amount or withdrawal share count must also be
strictly positive. Read-side totals may be zero when a vault is empty.

## Why a shared helper matters

Preview and execution must agree at boundary values. If a preview rounds one
way and execution rounds another way, clients can display a share count that is
not executable or a withdrawal amount that silently loses value. The quote
helpers return both the result and the policy metadata so this agreement is
visible to clients and testable without inspecting implementation details.

The execution flow is:

1. Validate the user amount as a finite supported value.
2. Synchronize the vault's accrued assets.
3. Calculate shares or assets through the canonical conversion helper.
4. Submit the mocked invocation with the normalized input.
5. Mutate totals using the same normalized result.
6. Return the conversion and policy metadata.

No provider call occurs before steps one through three succeed. This prevents
unsupported precision from creating an external transaction that cannot be
represented in local state.

## Conversion equations

For a non-empty vault:

```text
shares = round(assets * totalShares / totalAssets)
assets = round(shares * totalAssets / totalShares)
pricePerShare = round(totalAssets / totalShares)
```

The first deposit into an empty vault uses a one-to-one ratio. A vault with no
shares returns zero for a share-to-asset conversion because no ownership claim
exists. These rules avoid division by zero and make empty-state behavior
explicit for clients.

## Boundary behavior

- Zero is valid for stored totals and read-side calculations.
- Zero is invalid for a deposit or withdrawal request.
- Negative values are always rejected.
- Non-finite values are rejected, including `NaN`, `Infinity`, and strings.
- Values with more than six fractional digits are rejected, not truncated.
- Amounts above `1e12` are rejected before a transaction is submitted.
- A conversion result is rounded to the same six-decimal precision.

Rejecting extra precision is intentional. Silent truncation can understate a
deposit, overstate a withdrawal, or cause preview and execution to disagree.
Applications that need finer units must first make a versioned protocol change.

## Fee policy

Fees are supplied in basis points. The denominator is 10,000 and the maximum
fee is 10,000 basis points (100%). A fee above that maximum is an input error;
it is not clamped. Management fees are prorated by days and performance fees
apply only to positive profit. Losses do not create a performance fee or a
negative net profit.

Fee helpers use the same six-decimal rounder as conversion helpers. This keeps
fee quotes stable at common boundary values and avoids floating-point dust in
the API.

## API behavior

`GET /api/vaults/:id/deposit-preview?amount=` returns a quote without changing
state. Deposit and withdrawal responses include a `conversion` object. The
object contains the normalized input, result, price per share, and:

```json
{
  "decimalPlaces": 6,
  "minimumUnit": 0.000001,
  "rounding": "nearest"
}
```

Clients should show the normalized values returned by the server rather than
recomputing with local floating-point rules. Unsupported values receive the
normal `400` error contract before the mock transaction is created.

## Compatibility

Existing clients sending supported amounts continue to receive the same share
and asset values. The new preview route and `conversion` response field are
additive. Clients that ignore unknown fields remain compatible. A future change
to decimal places, rounding, or maximum amount must be versioned and documented
because it can change value calculations.

## Testing and operations

The policy suite covers empty vaults, one-to-one conversions, yield ratios,
round trips, smallest units, maximums, unsupported precision, fee caps, and
serialization. Operators should record the policy metadata with any financial
reconciliation so a later policy version can be distinguished from historical
calculations.

If a rollout needs to be reversed, revert the additive preview and metadata
changes together with the helper policy change. Stored values use the existing
six-decimal representation, so no data migration is required for rollback.

## Review checklist

Reviewers should confirm the following for every amount-bearing change:

- Inputs are normalized before any external invocation.
- Empty-vault and zero-share behavior is explicit.
- The same helper is used by preview and execution.
- Conversion results are rounded exactly once at the boundary.
- Fees cannot exceed the basis-point cap.
- Negative, non-finite, and over-maximum values fail closed.
- Tests include the minimum unit and the maximum amount.
- Tests compare preview output with persisted execution state.
- API documentation names the precision and rounding mode.
- Rollback does not require rewriting stored positions.

These checks are especially important for changes to share accounting because a
small arithmetic difference can compound across many deposits and withdrawals.
The policy metadata is therefore part of the review surface, not merely a UI
hint.

## Example reconciliation record

An operator comparing a preview with execution can retain the following
fields:

```json
{
  "vaultId": "vault_example",
  "input": 125.5,
  "quotedShares": 100.4,
  "executedShares": 100.4,
  "pricePerShare": 1.25,
  "decimalPlaces": 6,
  "rounding": "nearest"
}
```

If the quoted and executed values differ for identical vault totals, the
operation should be treated as a correctness incident and investigated with
the transaction and request identifiers. The server-side quote helper is the
source of truth for the comparison.

The same reconciliation applies to partial withdrawals: compare normalized
shares, returned assets, and the post-operation vault totals. Never infer the
result from a client-side floating-point calculation.

For incident review, record the vault totals before the operation, the policy
metadata returned by the quote, the normalized request, the transaction hash,
and the totals after execution. This makes a mismatch reproducible and keeps
the remediation focused on a specific policy boundary.

This record is sufficient for reconciliation without exposing wallet secrets or
internal implementation details.
