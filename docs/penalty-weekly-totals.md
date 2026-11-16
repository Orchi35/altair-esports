# Penalty Arena weekly totals

The weekly board keeps each player's highest completed round, as before. Weeks
start Monday at 00:00 UTC (unchanged). The all-time board is now the sum of those
weekly personal bests, including the current week. Improving 900 to 1,200 in the
same week adds 300; a lower/repeated round adds nothing. A new week's best is a
new contribution. All-time scores can exceed the 1,800-point round limit.

Submission updates the session receipt, weekly record and cumulative contribution
in the same Redis Lua transaction. Existing ownership and anti-replay checks still
apply. Shot mechanics, round points and instantaneous timing do not change.

## Storage and transition

All keys use `altair:penalty:v1:`:

- `week:YYYY-MM-DD`: existing public weekly board; existing expiry/pruning remain.
- `all`: existing single-round record, retained for private review/legacy ownership;
  no longer served as the public all-time board.
- `weekly-contribution:v2:YYYY-MM-DD`: permanent hash of normalized player keys to
  weekly personal bests; prevents double counting even when public rows expire.
- `weekly-totals:v2`: permanent sorted set, normalized player key to total points.
- `weekly-total-names:v2`: display names for total-board entries.
- `weekly-totals-migrated:v2`: completed migration marker.

The first all-time read or completed-round submission imports all **still stored**
weekly boards using SCAN. Canonicalized aliases are merged by highest score per
week. Imports add only a previously uncounted improvement and are safe to retry
after interruption or concurrent requests. The marker is written only after all
scan pages succeed. No production mutation is performed during local builds/tests.

Old weekly boards expired after 14 days. An old all-time single-round record cannot
reconstruct missing weekly history, so expired weeks are not guessed or imported.
Existing IDs, owner tokens and old score records are preserved.

For a future authorized leaderboard reset, archive/reset **all** new total,
contribution, name and migration keys along with the old boards. Resetting only
`all` or `week:*` will not reset accumulated totals. Ownership reset is separate.
Rolling back the application keeps the previous single-round boards readable;
after rollback writes, remove only the migration marker on re-upgrade so any
still-retained weekly improvements are re-imported idempotently.
