# Project Rules — POS Dashboard Template

## Workspace Boundaries

- **All generated files must stay within this workspace** (`POS-Dashboard-Template/`).
- If a file absolutely must be created or modified outside the workspace, **ask the user for explicit permission first** and explain why.
- Never write project files to temp directories, the Desktop, home directory, or any path outside this workspace.

## Project Structure

- **Backend**: `dashboard/main.py` — FastAPI application, all API endpoints go here.
- **Frontend**: `dashboard/static/` — vanilla HTML, CSS, and JS. No frameworks, no Tailwind.
- **Data importers**: `import_sales.py`, `import_register.py`, `fetch_emails.py`, `download_sheet.py` in the project root.
- **Database**: `philos_sales.db` (SQLite) in the project root.
- **Configuration**: `settings.json` in the project root for user-facing settings.
- **Reports landing**: `sales_reports/{counter,swiggy,zomato}/` for uploaded/fetched Excel files.
- **Ledger files**: `docs/` for the business register workbook.
- **Design docs**: `docs/` for proposals and specifications.

## Code Style

- Use vanilla CSS for all styling — no CSS frameworks unless the user explicitly requests one.
- Match the existing dark/light theme system in `dashboard/static/style.css`.
- Follow existing API patterns in `dashboard/main.py` (FastAPI, SQLite with WAL mode, `sqlite3.Row` row factory).
- Preserve all existing comments and docstrings unrelated to your changes.

## Design Documents

- The settings tab design spec is at `docs/settings_tab_proposal.md`. Follow its priority ranking (P0 → P1 → P2 → P3) when implementing.
