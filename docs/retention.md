# Game retention policy

The `games` table grows with every session and nothing prunes it. This policy
deletes abandoned and long-stale games. It is enforced by
`lib/retention.ts` (pure, tested selection logic) and
`scripts/cleanup-games.mjs` (the CLI wrapper).

## Rules

A game is deleted when **either** rule applies:

1. **Stale**: `updated_at` is older than **14 days**, provided the game is not
   among the **25 most recently updated** games. A game from last week is never
   touched.
2. **Empty lobby**: the game has **zero players** and is older than **24 hours**,
   regardless of the newest-25 rule. Abandoned lobbies are the bulk of the growth.

An unparseable `updated_at` is never treated as deletable. Ages are computed
against a caller-supplied `now`, and candidates are processed oldest first.

## Dry run (default)

Reads the URL and anon key from `SUPABASE_URL` / `SUPABASE_ANON_KEY`, falling
back to the values hardcoded in `lib/supabase.ts` when either is missing. The
anon key can `SELECT`, which is all a dry run needs.

```sh
node scripts/cleanup-games.mjs
```

## Apply

```sh
SUPABASE_SERVICE_ROLE_KEY=... node scripts/cleanup-games.mjs --apply
```

`--apply` additionally requires `SUPABASE_SERVICE_ROLE_KEY` in the environment,
because the anon key has no delete rights. Without it the script prints a
one-line explanation and exits non-zero without deleting anything. A dry run is
always a safe first step; only `--apply` performs deletions.

## Delete order

Per game, rows are deleted in this explicit order:

1. `answers`
2. `players`
3. the `game` row

`lib/database.types.ts` declares no foreign-key relationships, so `ON DELETE
CASCADE` must not be assumed; the manual order guarantees no orphan rows.

Running the script never deletes a game that wasn't in the printed plan, and
deletes nothing at all when the candidate list is empty.