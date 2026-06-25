# Generic POS & Aggregator Dashboard Template

A pluggable, configuration-driven business analytics dashboard for multi-channel restaurants. It integrates Counter POS, Swiggy, and Zomato sales reports alongside general business ledgers (Expenses and Income register).

---

## 📂 Directory Layout

* **`dashboard/`**: FastAPI python backend and vanilla HTML/CSS/JS frontend dashboard.
* **`sales_reports/`**: Excel report landing directories:
  * `counter/`: Daily register sheets from POS.
  * `swiggy/`: Weekly settlement annexure files.
  * `zomato/`: Weekly order level payout sheets.
* **`docs/`**: Kakkanad Business Register Excel ledger folder.
* **`fetch_emails.py`**: Auto-downloads reports matching custom subjects from Gmail.
* **`download_sheet.py`**: Syncs Google Sheets ledgers down to local files using a Service Account JSON.
* **`import_sales.py`**: Parses Excel reports into a unified database schema.
* **`import_register.py`**: Imports OpEx expenses and daily bank credits.

---

## 🚀 Getting Started

### 1. Setup Environment
Open your terminal inside this directory and set up a Python virtual environment:
```bash
# Create virtual environment
python -m venv venv

# Activate on Windows (PowerShell)
venv\Scripts\Activate.ps1

# Activate on Mac/Linux
source venv/bin/activate
```

### 2. Install Dependencies
Install all package dependencies defined in `pyproject.toml`:
```bash
pip install -e .
```

### 3. Configure Local Credentials
1. Duplicate `.env.example` and rename the copy to `.env`.
2. Add your Gmail credentials (with an App Password) and your Google Sheets ID:
   ```env
   GMAIL_USER=your-account@gmail.com
   GMAIL_APP_PASSWORD=your16charpassword
   GOOGLE_SHEET_ID=your_sheet_id
   ```
3. Place your Service Account JSON key inside the root directory and name it `google_credentials.json`.

---

## 📊 Testing with Seed Data

The project contains a pre-generated **Sample Seed Dataset** inside `sales_reports/` and `docs/` representing mock orders and ledger entries for **June 2026**.

To test the system immediately:
1. Start the server:
   ```bash
   python dashboard/main.py
   ```
2. Open your web browser to `http://127.0.0.1:8000`.
3. In the date range inputs (top-right), select **`2026-06-01` to `2026-06-30`** (the range of the mock data).
4. Click the **Sync Data** button.
5. Watch the real-time progress console sync and import the mock records. 

*Note: Since there are no live credentials configured yet, the sync will log warnings for Gmail/Google Sheets and seamlessly parse the pre-loaded local seed workbooks.*
