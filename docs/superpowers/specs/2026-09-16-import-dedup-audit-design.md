# Import Duplicate Detection & Audit Trail — Design

> **Status**: Approved by user, ready for implementation plan
> **Scope**: Sales-only POC (Counter/Swiggy/Zomato order imports). Expense/reconciliation imports out of scope.

## Context

The unified sales dashboard the user asked for already exists and is deployed (bristo-board.vercel.app): FastAPI backend (`dashboard/main.py`) with 18 endpoints and 8 tabs (Overview, Economics, Counter, Orders, Ledger, Reconciliation, Payouts, Promo), backed by `orders` / `order_payments` tables in `philos_sales.db`. No rebuild is needed for that part.

The gap is duplicate-submission handling. Reports arrive via Gmail fetch (`fetch_emails.py`) or manual drop into `sales_reports/{counter,swiggy,zomato}/`, and can be duplicated in three ways:
1. The exact same file gets re-sent/re-fetched.
2. Report periods overlap (a weekly file and a monthly file both contain the same orders).
3. Staff manually re-upload/re-send a report under a different filename.

`import_sales.py` already tolerates all three at the data level: `orders.order_id` is a primary key (`channel_originalid`), and the import loop does `INSERT OR REPLACE`, deleting and reinserting `order_payments` for that order. Totals never double-count today. What's missing is visibility — there is no record of which files were processed, nor of how many orders in a given run were new vs. duplicates.

## Goals

- Detect and skip re-processing of byte-identical files already imported (efficiency).
- Count, per import run, how many orders were new vs. already existed (duplicates, silently auto-merged/overwritten as today).
- Surface these counts in the existing sync UI so duplication is visible instead of silent.
- No behavior change to how orders are stored — dedup already works; this adds instrumentation only.

## Non-goals

- No rejection or blocking of duplicate files/orders.
- No diffing of what changed between the original and duplicate submission (e.g. "amount changed from X to Y") — out of scope for this POC.
- No changes to expense or income-register import paths.

## Data model changes

New table in `philos_sales.db`:

```sql
CREATE TABLE IF NOT EXISTS import_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT NOT NULL,       -- relative path under sales_reports/
    file_hash TEXT NOT NULL,       -- SHA-256 of file bytes
    channel TEXT NOT NULL,         -- counter | swiggy | zomato
    imported_at DATETIME NOT NULL,
    orders_new INTEGER DEFAULT 0,
    orders_duplicate INTEGER DEFAULT 0,
    status TEXT NOT NULL,          -- success | error | skipped
    message TEXT
);
CREATE INDEX IF NOT EXISTS idx_import_log_hash ON import_log(file_hash);
```

`skipped` status = file hash matched a prior successful run; file was not re-parsed.

## Pipeline changes (`import_sales.py`)

For each file in `parse_counter()` / `parse_swiggy()` / `parse_zomato()` (or a shared wrapper around them):

1. Compute `file_hash = sha256(file_bytes)`.
2. If `import_log` has a row with this hash and `status='success'`, skip parsing this file entirely; write a `status='skipped'` row (or just log, not re-insert) and move to the next file.
3. Otherwise parse as today. Before each order's `INSERT OR REPLACE`, run `SELECT 1 FROM orders WHERE order_id=?` to classify new vs. duplicate; increment per-file counters.
4. After the file's orders are all written, insert one `import_log` row summarizing that file (`orders_new`, `orders_duplicate`, `status='success'`, or `status='error'` + `message` on exception — existing per-order try/except stays as-is).

This is additive to the existing loop — no change to the `INSERT OR REPLACE` / payments delete-then-reinsert logic.

## API changes (`dashboard/main.py`)

- Extend the in-memory `sync_status` dict (already populated by `execute_sync_task` and returned by `GET /api/sync-status`) with `orders_new` and `orders_duplicate` totals for the just-completed run, summed across `import_log` rows created during that run.
- New endpoint `GET /api/import-log`: returns the last N (e.g. 50) rows of `import_log`, most recent first, for a simple history view.

## UI changes (`dashboard/static/`)

- The existing "Sync Data" flow (button `btn-sync-data`, and whatever status panel currently shows sync progress) gets one more line on completion: e.g. "182 orders synced — 6 duplicates auto-merged." No new tab required; reuse the existing sync status panel/modal.
- Add a small collapsible "Import History" table (reuse existing `.table-container` styling) below the sync status panel, populated from `/api/import-log`, columns: File | Channel | Imported At | New | Duplicates | Status. This can live on the existing Overview tab near the sync controls, or wherever the sync button currently lives.

## Testing

- Existing `import_sales.py` has no formal test suite; this follows the codebase's existing convention of ad-hoc scripts (e.g. `debug_counter.py`, `inspect_files.py`).
- Add one small script-level check: re-run `import_sales.py` twice against the same `sales_reports/` folder and assert (a) `orders` row count is identical after both runs, (b) the second run's `import_log` entries show `status='skipped'` for every file (since hashes match) or `orders_duplicate == orders_new` from the first run's counts, whichever is simpler to assert given the hash short-circuit.
