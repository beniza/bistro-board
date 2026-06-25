# Settings Tab — Design Proposal

## Overview

The Settings tab replaces all hardcoded configuration with a user-facing UI, organized into logical sections. Each data source can operate in one of two modes:

| Mode | Description |
|------|-------------|
| **Manual Upload** | User exports reports from external platforms and uploads `.xlsx` files through the dashboard |
| **Auto-Sync** | System pulls reports automatically using configured credentials (Gmail IMAP / Google API) |

Settings are persisted to a `settings.json` file (or a `settings` table in SQLite) so they survive restarts.

---

## Section 1 — Channel Management

> [!IMPORTANT]
> This section controls which sales channels are active in the system and how each one ingests data.

### Per-Channel Toggle (Counter / Swiggy / Zomato)

Each channel gets a card with:

| Setting | Type | Purpose |
|---------|------|---------|
| **Enabled** | Toggle | Show/hide this channel across the entire dashboard |
| **Ingest Mode** | Radio: `Manual Upload` · `Email Auto-Fetch` | How reports arrive |
| **Channel Label** | Text | Display name (default: "Counter", "Swiggy", "Zomato") — allows white-labeling |

### When Ingest Mode = Manual Upload

| Setting | Type | Purpose |
|---------|------|---------|
| **Upload Zone** | Drag-and-drop area | Accept `.xlsx` files for this channel |
| **Upload History** | Table | List of previously uploaded files with date, row count, and a delete/re-import action |

### When Ingest Mode = Email Auto-Fetch

| Setting | Type | Purpose |
|---------|------|---------|
| **Subject Keywords** | Tag input | Email subjects to match (defaults: `"Annexure"`, `"Settlement"` for Swiggy; `"Philos-KKND"` for Counter; etc.) |
| **Sender Keywords** | Tag input | Sender-address keywords for classification |
| **Filename Keywords** | Tag input | Attachment filename patterns for classification |

---

## Section 2 — Ledger / Register

> [!NOTE]
> The business register (Expenses + Income) currently comes from a single Google Sheet exported as Excel.

| Setting | Type | Purpose |
|---------|------|---------|
| **Ingest Mode** | Radio: `Manual Upload` · `Google Sheets Sync` | How the register arrives |
| **Expenses Sheet Name** | Text | Name of the Expenses tab inside the workbook (default: `"Expenses"`) |
| **Income Sheet Name** | Text | Name of the Income tab inside the workbook (default: `"Income"`) |

### When Ingest Mode = Manual Upload

| Setting | Type | Purpose |
|---------|------|---------|
| **Upload Zone** | Drag-and-drop | Accept the register `.xlsx` workbook |
| **Last Uploaded** | Info | Timestamp + filename of last upload |

### When Ingest Mode = Google Sheets Sync

| Setting | Type | Purpose |
|---------|------|---------|
| **Google Sheet ID** | Text | The spreadsheet ID from the URL |
| **Service Account JSON** | File upload | The `google_credentials.json` key file |
| **Connection Status** | Badge | Shows `Connected` / `Not Configured` / `Error` with a **Test Connection** button |

---

## Section 3 — Gmail Integration

> [!NOTE]
> This section only appears when **at least one channel** uses Email Auto-Fetch mode.

| Setting | Type | Purpose |
|---------|------|---------|
| **Gmail Address** | Email input | The Gmail account to connect to |
| **App Password** | Password input | Gmail App Password (16-char) |
| **Lookback Window** | Number (days) | How far back to scan for emails (default: `30`) |
| **Connection Status** | Badge | `Connected` / `Not Configured` / `Error` with **Test Connection** button |
| **IMAP Server** | Text (collapsed/advanced) | Default `imap.gmail.com` — allows other IMAP providers |
| **IMAP Port** | Number (collapsed/advanced) | Default `993` |

---

## Section 4 — Sync Schedule

| Setting | Type | Purpose |
|---------|------|---------|
| **Auto-Sync on Startup** | Toggle | Run a full sync when the server starts |
| **Scheduled Sync** | Toggle + Interval | Enable recurring sync every N hours (e.g., every 6h, 12h, 24h) |
| **Last Sync** | Info | Timestamp of the most recent successful sync |
| **Sync Now** | Button | Manually trigger a full pipeline run (same as current "Sync Data" button, but from Settings) |

---

## Section 5 — Data Management

| Setting | Type | Purpose |
|---------|------|---------|
| **Database Stats** | Info cards | Total orders, date range, DB file size, per-channel counts |
| **Purge Channel Data** | Button per channel | Delete all imported data for a specific channel (with confirmation modal) |
| **Purge All Data** | Danger button | Wipe the entire database and re-initialize (with confirmation) |
| **Export Database** | Button | Download `philos_sales.db` as a backup |
| **Import Database** | File upload | Restore from a previously exported `.db` file |

---

## Section 6 — Display Preferences

| Setting | Type | Purpose |
|---------|------|---------|
| **Currency Symbol** | Text | Default `₹` — allows `$`, `€`, etc. |
| **Date Format** | Dropdown | `DD/MM/YYYY`, `MM/DD/YYYY`, `YYYY-MM-DD` |
| **Default Date Range** | Dropdown | `Last 7 days`, `Last 30 days`, `This Month`, `Last Month`, `Custom` |
| **Theme** | Radio | `Light` / `Dark` / `System` (if not already in the header) |

---

## Proposed UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│  ⚙ Settings                                                │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                  │
│ Channels │  ┌─ Counter ─────────────────────────────────┐   │
│          │  │ [✓] Enabled                               │   │
│ Ledger   │  │ Mode: (•) Manual Upload  ( ) Email Fetch  │   │
│          │  │                                            │   │
│ Gmail    │  │ ┌──────────────────────────────────────┐   │   │
│          │  │ │  📂 Drop .xlsx files here or Browse  │   │   │
│ Schedule │  │ └──────────────────────────────────────┘   │   │
│          │  │                                            │   │
│ Data     │  │ Upload History:                            │   │
│          │  │ ┌──────────────┬────────┬────────┐         │   │
│ Display  │  │ │ Filename     │ Date   │ Rows   │         │   │
│          │  │ ├──────────────┼────────┼────────┤         │   │
│          │  │ │ june_pos.xlsx│ Jun 20 │ 1,247  │         │   │
│          │  │ └──────────────┴────────┴────────┘         │   │
│          │  └────────────────────────────────────────────┘   │
│          │                                                   │
│          │  ┌─ Swiggy ──────────────────────────────────┐   │
│          │  │ ...                                       │   │
│          │  └────────────────────────────────────────────┘   │
│          │                                                   │
│          │  ┌─ Zomato ──────────────────────────────────┐   │
│          │  │ ...                                       │   │
│          │  └────────────────────────────────────────────┘   │
└──────────┴──────────────────────────────────────────────────┘
```

- **Left sidebar** — section navigation (scrollspy or click-to-jump)
- **Right content** — cards for each section, collapsible

---

## What Changes in the Backend

| Current | Proposed |
|---------|----------|
| Credentials in `.env` file | Stored in `settings.json` + editable via API |
| Hardcoded email subjects/keywords | Persisted per-channel classification rules |
| Hardcoded folder paths | Dynamic: temp upload dir for manual, configured dir for auto |
| Single "Sync Data" button triggers everything | Granular: sync only configured auto-fetch sources; manual uploads import immediately on upload |
| No file upload endpoint | New `POST /api/upload/{channel}` and `POST /api/upload/register` endpoints |
| No settings API | New `GET/PUT /api/settings` endpoints |

### New API Endpoints Needed

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/settings` | `GET` | Retrieve all current settings |
| `/api/settings` | `PUT` | Update settings (partial update) |
| `/api/settings/test-gmail` | `POST` | Test Gmail IMAP connection |
| `/api/settings/test-gsheet` | `POST` | Test Google Sheets connection |
| `/api/upload/{channel}` | `POST` | Upload `.xlsx` for a sales channel |
| `/api/upload/register` | `POST` | Upload the business register workbook |
| `/api/uploads/{channel}` | `GET` | List upload history for a channel |
| `/api/uploads/{id}` | `DELETE` | Remove an uploaded file and its imported data |
| `/api/data/purge/{channel}` | `DELETE` | Purge all data for a channel |
| `/api/data/export` | `GET` | Download DB backup |
| `/api/data/import` | `POST` | Restore DB from upload |

---

## Priority Ranking

If you want to implement incrementally:

| Priority | Section | Reason |
|----------|---------|--------|
| 🔴 P0 | **Channel Ingest Mode + Manual Upload** | Core ask — lets users upload without configuring credentials |
| 🔴 P0 | **Ledger Ingest Mode + Manual Upload** | Same — upload register without Google Sheets |
| 🟠 P1 | **Gmail Integration settings** | Moves credentials out of `.env` into the UI |
| 🟠 P1 | **Google Sheets Integration settings** | Same for Sheets |
| 🟡 P2 | **Data Management** | Useful for maintenance, less critical for initial launch |
| 🟡 P2 | **Sync Schedule** | Nice-to-have automation |
| 🟢 P3 | **Display Preferences** | Polish — currency, date format, theme |
| 🟢 P3 | **Channel Labels** | White-labeling is a future concern |
