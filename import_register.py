import os
import sqlite3
import pandas as pd
import numpy as np

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(SCRIPT_DIR, "philos_sales.db")
REGISTER_PATH = os.path.join(SCRIPT_DIR, r"docs\Kakkanad Business Register.xlsx")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.row_factory = sqlite3.Row
    return conn

def clean_float(val):
    if pd.isnull(val):
        return 0.0
    val_str = str(val).strip().replace(',', '')
    try:
        return float(val_str)
    except ValueError:
        return 0.0

def init_register_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create expenses table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year INTEGER,
        month TEXT,
        expense_id INTEGER,
        date TEXT,
        category TEXT,
        description TEXT,
        amount REAL,
        paid TEXT,
        mode TEXT,
        payment_date TEXT,
        rating INTEGER,
        vendor_category TEXT,
        remarks TEXT
    )
    """)
    
    # Create income_register table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS income_register (
        sl INTEGER PRIMARY KEY,
        month TEXT,
        date TEXT,
        day TEXT,
        week_number INTEGER,
        petpooja_actual REAL,
        gst_5pct REAL,
        petpooja_net REAL,
        swiggy_gross REAL,
        swiggy_payout REAL,
        paper_bill REAL,
        zomato_gross REAL,
        zomato_payout REAL,
        total_income REAL,
        fed_bank REAL,
        yes_bank REAL,
        cash REAL
    )
    """)
    
    conn.commit()
    conn.close()
    print("Ledger Tables initialized.")

def import_expenses():
    print("Importing Expenses...")
    if not os.path.exists(REGISTER_PATH):
        print(f"Register file {REGISTER_PATH} not found.")
        return 0
        
    df = pd.read_excel(REGISTER_PATH, sheet_name='Expenses')
    # Strip columns
    df.columns = [str(c).strip() for c in df.columns]
    
    # Convert dates to string format
    df['Date_parsed'] = pd.to_datetime(df['Date'], errors='coerce').dt.strftime('%Y-%m-%d')
    df['Payment_Date_parsed'] = pd.to_datetime(df['Payment Date'], errors='coerce').dt.strftime('%Y-%m-%d')
    
    # Fix December 2026 typo (should be December 2025)
    def fix_date_typos(row):
        date_parsed = row['Date_parsed']
        if pd.notnull(date_parsed) and date_parsed.startswith('2026-12') and str(row.get('Month')).strip() == '12-Dec':
            row['Date_parsed'] = '2025-12-' + date_parsed.split('-')[2]
            row['Year'] = 2025
            
        pay_parsed = row['Payment_Date_parsed']
        if pd.notnull(pay_parsed) and pay_parsed.startswith('2026-12') and str(row.get('Month')).strip() == '12-Dec':
            row['Payment_Date_parsed'] = '2025-12-' + pay_parsed.split('-')[2]
            
        return row

    df = df.apply(fix_date_typos, axis=1)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM expenses") # Clear previous data
    
    inserted = 0
    for idx, row in df.iterrows():
        # Category or Amount or Date must be valid
        amount = row.get('Amount')
        if pd.isnull(amount) or pd.isnull(row.get('Category')):
            continue
            
        amount_val = clean_float(amount)
        if amount_val == 0.0:
            continue
            
        expense_id = row.get('ID')
        expense_id_val = int(expense_id) if pd.notnull(expense_id) and str(expense_id).strip().replace('.', '', 1).isdigit() else None
        
        cursor.execute("""
        INSERT INTO expenses (
            year, month, expense_id, date, category, description,
            amount, paid, mode, payment_date, rating, vendor_category, remarks
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            int(row.get('Year')) if pd.notnull(row.get('Year')) and str(row.get('Year')).strip().replace('.0','').isdigit() else None,
            str(row.get('Month')) if pd.notnull(row.get('Month')) else None,
            expense_id_val,
            row.get('Date_parsed'),
            str(row.get('Category')).strip(),
            str(row.get('Description')).strip() if pd.notnull(row.get('Description')) else None,
            amount_val,
            str(row.get('Paid?')).strip() if pd.notnull(row.get('Paid?')) else None,
            str(row.get('Mode')).strip() if pd.notnull(row.get('Mode')) else None,
            row.get('Payment_Date_parsed'),
            int(row.get('Rating')) if pd.notnull(row.get('Rating')) and str(row.get('Rating')).strip().replace('.0','').isdigit() else 0,
            str(row.get('Vendor Category')).strip() if pd.notnull(row.get('Vendor Category')) else None,
            str(row.get('Remarks')).strip() if pd.notnull(row.get('Remarks')) else None
        ))
        inserted += 1
        
    conn.commit()
    conn.close()
    print(f"Imported {inserted} Expenses records.")
    return inserted

def import_income():
    print("Importing Income Register...")
    if not os.path.exists(REGISTER_PATH):
        print(f"Register file {REGISTER_PATH} not found.")
        return 0
        
    df = pd.read_excel(REGISTER_PATH, sheet_name='Income')
    # Strip columns
    df.columns = [str(c).strip() for c in df.columns]
    
    df['Date_parsed'] = pd.to_datetime(df['Date'], errors='coerce').dt.strftime('%Y-%m-%d')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM income_register") # Clear previous data
    
    inserted = 0
    for idx, row in df.iterrows():
        sl_val = row.get('Sl')
        if pd.isnull(sl_val) or not str(sl_val).strip().replace('.0','').isdigit():
            continue
            
        date_val = row.get('Date_parsed')
        if pd.isnull(date_val):
            continue
            
        cursor.execute("""
        INSERT INTO income_register (
            sl, month, date, day, week_number,
            petpooja_actual, gst_5pct, petpooja_net,
            swiggy_gross, swiggy_payout, paper_bill,
            zomato_gross, zomato_payout, total_income,
            fed_bank, yes_bank, cash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            int(sl_val),
            str(row.get('Month')) if pd.notnull(row.get('Month')) else None,
            date_val,
            str(row.get('Day')) if pd.notnull(row.get('Day')) else None,
            int(row.get('Week Number')) if pd.notnull(row.get('Week Number')) and str(row.get('Week Number')).strip().replace('.0','').isdigit() else None,
            clean_float(row.get('Petpooja Actual')),
            clean_float(row.get('GST 5%')),
            clean_float(row.get('Petpooja')),
            clean_float(row.get('Swiggy')),
            clean_float(row.get('Swiggy Payout')),
            clean_float(row.get('Paper Bill')),
            clean_float(row.get('Zomato')),
            clean_float(row.get('Zomato Payout')),
            clean_float(row.get('Total')),
            clean_float(row.get('FED BANK')),
            clean_float(row.get('YES BANK')),
            clean_float(row.get('Cash'))
        ))
        inserted += 1
        
    conn.commit()
    conn.close()
    print(f"Imported {inserted} Income records.")
    return inserted

def import_all(progress_callback=None):
    def log_progress(msg):
        print(msg)
        if progress_callback:
            progress_callback(msg)
            
    log_progress("Initializing Kakkanad Business Register database tables...")
    init_register_db()
    
    log_progress("Importing Kakkanad Business Register Expenses sheet...")
    exp_count = import_expenses()
    log_progress(f"Expenses import complete: imported {exp_count} records.")
    
    log_progress("Importing Kakkanad Business Register Income sheet...")
    inc_count = import_income()
    log_progress(f"Income import complete: imported {inc_count} records.")
    
    log_progress("Business Register data import complete.")
    return {"expenses": exp_count, "income": inc_count}

if __name__ == "__main__":
    import_all()
