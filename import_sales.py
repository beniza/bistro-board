import os
import re
import sqlite3
import pandas as pd
import numpy as np
import hashlib
import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(SCRIPT_DIR, "philos_sales.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create orders table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS orders (
        order_id TEXT PRIMARY KEY,
        channel TEXT NOT NULL,
        original_order_id TEXT NOT NULL,
        order_date DATETIME NOT NULL,
        status TEXT,
        subtotal REAL DEFAULT 0.0,
        packaging_charge REAL DEFAULT 0.0,
        delivery_charge REAL DEFAULT 0.0,
        discount REAL DEFAULT 0.0,
        tax REAL DEFAULT 0.0,
        grand_total REAL DEFAULT 0.0,
        commission REAL DEFAULT 0.0,
        other_charges REAL DEFAULT 0.0,
        net_payout REAL DEFAULT 0.0,
        items_summary TEXT,
        customer_name TEXT,
        customer_phone TEXT,
        order_type TEXT,
        sub_order_type TEXT
    )
    """)
    
    # Create order_payments table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS order_payments (
        payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT NOT NULL,
        payment_type TEXT NOT NULL,
        amount REAL NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
    )
    """)

    # Create import_log table (tracks each report file processed, for duplicate visibility)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS import_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_path TEXT NOT NULL,
        file_hash TEXT NOT NULL,
        channel TEXT NOT NULL,
        imported_at DATETIME NOT NULL,
        orders_new INTEGER DEFAULT 0,
        orders_duplicate INTEGER DEFAULT 0,
        status TEXT NOT NULL,
        message TEXT
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_import_log_hash ON import_log(file_hash)")

    conn.commit()
    conn.close()
    print("Database initialized successfully.")

def hash_file(path):
    sha256 = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            sha256.update(chunk)
    return sha256.hexdigest()

def is_already_imported(cursor, file_hash):
    cursor.execute("SELECT 1 FROM import_log WHERE file_hash = ? AND status = 'success'", (file_hash,))
    return cursor.fetchone() is not None

def log_import(cursor, file_path, file_hash, channel, orders_new, orders_duplicate, status, message=None):
    cursor.execute("""
        INSERT INTO import_log (file_path, file_hash, channel, imported_at, orders_new, orders_duplicate, status, message)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        file_path, file_hash, channel,
        datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        orders_new, orders_duplicate, status, message
    ))

def find_header_and_read(path, sheet_name, keywords):
    df = pd.read_excel(path, sheet_name=sheet_name, header=None)
    keywords_lower = [kw.lower() for kw in keywords]
    for idx, row in df.iterrows():
        row_str = [str(val).strip().lower() for val in row.tolist() if pd.notnull(val)]
        if all(any(kw in val for val in row_str) for kw in keywords_lower):
            # Re-read Excel from this row index
            return pd.read_excel(path, sheet_name=sheet_name, header=idx), idx
    raise ValueError(f"Could not find header row with keywords {keywords}")

def _normalize_col_name(name):
    return re.sub(r'[^a-z0-9]', '', str(name).lower())

def find_col(df, candidate):
    """Find the column whose name matches `candidate` once both are lowercased and
    stripped of punctuation/whitespace/newlines. Source reports (e.g. Zomato settlement
    exports) periodically re-word column headers or shift the numbered/lettered formula
    references embedded in them (e.g. "...[(13)+(16)]" becoming "...[(19)+(22)]") without
    changing the underlying meaning - matching on a normalized prefix survives that drift.
    Returns None if no column matches."""
    normalized_candidate = _normalize_col_name(candidate)
    for col in df.columns:
        if _normalize_col_name(col).startswith(normalized_candidate):
            return col
    return None

def parse_counter(cursor):
    print("Parsing Counter sales...")
    folder = os.path.join(SCRIPT_DIR, r"sales_reports\counter")
    if not os.path.exists(folder):
        folder = os.path.join(SCRIPT_DIR, r"2026-Jan-Jun\Counter-Jan-Jun-2026")
    if not os.path.exists(folder):
        print(f"Counter folder {folder} not found.")
        return [], 0, []

    orders = {}
    files_skipped = 0
    files_processed = []
    files = sorted([f for f in os.listdir(folder) if f.endswith('.xlsx')])

    for file in files:
        path = os.path.join(folder, file)
        file_hash = hash_file(path)
        if is_already_imported(cursor, file_hash):
            print(f"  Skipping already-imported Counter file: {file}")
            log_import(cursor, os.path.relpath(path, SCRIPT_DIR), file_hash, "Counter", 0, 0, "skipped")
            files_skipped += 1
            continue
        print(f"  Reading Counter file: {file}")
        try:
            try:
                df, idx = find_header_and_read(path, 'Sheet1', ['Order No.', 'Items', 'Grand Total'])
                is_new_format = False
            except ValueError:
                # Newer Petpooja "Orders: Master Report" export - different columns, one row per order
                df, idx = find_header_and_read(path, 'Sheet1', ['Invoice No.', 'Payment Type', 'Total (₹)'])
                is_new_format = True

            if is_new_format:
                for i, row in df.iterrows():
                    invoice_val = row.get('Invoice No.')
                    if pd.isnull(invoice_val):
                        continue

                    invoice_str = str(invoice_val).strip()
                    if not invoice_str.replace('.', '', 1).isdigit():
                        continue

                    order_no = int(float(invoice_str))
                    db_order_id = f"Counter_{order_no}"

                    subtotal = float(row.get('My Amount (₹)', 0.0))
                    discount = float(row.get('Discount (₹)', 0.0))
                    tax = float(row.get('Total Tax (₹)', 0.0))
                    round_off = float(row.get('Round Off', 0.0))

                    grand_total = float(row.get('Total (₹)', 0.0))
                    if grand_total == 0.0:
                        grand_total = subtotal + tax - discount + round_off

                    pay_type = str(row.get('Payment Type', 'Cash')).strip()
                    raw_status = str(row.get('Status', 'Printed')).strip()
                    # This export reports unsettled bills via Payment Type = "Not Paid" rather than
                    # a status value. Existing dashboard queries already filter out status = 'Not Paid',
                    # so map it onto status here to keep unsettled bills out of revenue totals.
                    status = "Not Paid" if pay_type == "Not Paid" else raw_status

                    cust_name = str(row.get('Name')) if pd.notnull(row.get('Name')) else None
                    cust_phone = str(row.get('Phone')) if pd.notnull(row.get('Phone')) else None

                    order_record = {
                        "order_id": db_order_id,
                        "channel": "Counter",
                        "original_order_id": str(order_no),
                        "order_date": pd.to_datetime(row.get('Date'), format='mixed').strftime('%Y-%m-%d %H:%M:%S'),
                        "status": status,
                        "subtotal": subtotal,
                        "packaging_charge": 0.0,
                        "delivery_charge": float(row.get('Delivery Charge', 0.0)),
                        "discount": discount,
                        "tax": tax,
                        "grand_total": grand_total,
                        "commission": 0.0,
                        "other_charges": 0.0,
                        "net_payout": grand_total,
                        "items_summary": None,
                        "customer_name": cust_name,
                        "customer_phone": cust_phone,
                        "order_type": str(row.get('Order Type', 'Dine In')).strip(),
                        "sub_order_type": str(row.get('Sub Order Type')).strip() if pd.notnull(row.get('Sub Order Type')) else None,
                        "source_file": path,
                        "payments": []
                    }

                    if grand_total > 0:
                        order_record["payments"].append({
                            "payment_type": pay_type,
                            "amount": grand_total
                        })

                    orders[db_order_id] = order_record

                files_processed.append(path)
                continue

            # Temporary holder for the current order when parsing lines
            current_order_id = None

            for i, row in df.iterrows():
                order_no_val = row.get('Order No.')
                if pd.isnull(order_no_val):
                    continue
                    
                order_no_str = str(order_no_val).strip()
                # Skip total rows or non-numeric order numbers
                if not order_no_str.replace('.', '', 1).isdigit():
                    continue
                    
                order_no = int(float(order_no_str))
                db_order_id = f"Counter_{order_no}"
                
                # Check if this row is a new main order or a payment split
                created_val = row.get('Created')
                items_val = row.get('Items')
                
                if pd.notnull(created_val) and pd.notnull(items_val):
                    # Main Order Row
                    current_order_id = db_order_id
                    
                    subtotal = float(row.get('My Amount (₹)', 0.0))
                    discount = float(row.get('Total Discount (₹)', 0.0))
                    tax = float(row.get('Total Tax (₹)', 0.0))
                    round_off = float(row.get('Round Off (₹)', 0.0))
                    
                    # For Counter, use Grand Total (₹) directly if > 0, else calculate (e.g. for Part Payments)
                    grand_total = float(row.get('Grand Total (₹)', 0.0))
                    if grand_total == 0.0:
                        grand_total = subtotal + tax - discount + round_off
                    
                    # Payment Type on main row
                    pay_type = str(row.get('Payment Type', 'Cash')).strip()
                    
                    # Clean customer info if present
                    cust_name = str(row.get('Customer Name')) if pd.notnull(row.get('Customer Name')) else None
                    cust_phone = str(row.get('Customer Phone')) if pd.notnull(row.get('Customer Phone')) else None
                    
                    orders[db_order_id] = {
                        "order_id": db_order_id,
                        "channel": "Counter",
                        "original_order_id": str(order_no),
                        "order_date": pd.to_datetime(created_val, format='mixed').strftime('%Y-%m-%d %H:%M:%S'),
                        "status": str(row.get('Status', 'Printed')).strip(),
                        "subtotal": subtotal,
                        "packaging_charge": 0.0,
                        "delivery_charge": float(row.get('Delivery Charge (₹)', 0.0)),
                        "discount": discount,
                        "tax": tax,
                        "grand_total": grand_total,
                        "commission": 0.0,
                        "other_charges": 0.0,
                        "net_payout": grand_total,
                        "items_summary": str(items_val).strip(),
                        "customer_name": cust_name,
                        "customer_phone": cust_phone,
                        "order_type": str(row.get('Order Type', 'Dine In')).strip(),
                        "sub_order_type": str(row.get('Sub Order Type', '')).strip() if pd.notnull(row.get('Sub Order Type')) else None,
                        "source_file": path,
                        "payments": []
                    }
                    
                    # If it's not a part payment, record the payment details
                    if pay_type != "Part Payment" and grand_total > 0:
                        orders[db_order_id]["payments"].append({
                            "payment_type": pay_type,
                            "amount": grand_total
                        })
                else:
                    # Payment split row
                    # It should belong to the current_order_id or match the order_no
                    target_order_id = db_order_id
                    if target_order_id in orders:
                        pay_type = str(row.get('Payment Type', 'Cash')).strip()
                        # For split row, the paid amount is in 'Grand Total (₹)'
                        amount = float(row.get('Grand Total (₹)', 0.0))
                        if amount > 0 and pay_type != 'nan':
                            orders[target_order_id]["payments"].append({
                                "payment_type": pay_type,
                                "amount": amount
                            })

            files_processed.append(path)
        except Exception as e:
            print(f"Error parsing Counter file {file}: {e}")

    print(f"Parsed {len(orders)} Counter orders.")
    return list(orders.values()), files_skipped, files_processed

def parse_zomato(cursor):
    print("Parsing Zomato sales...")
    folder = os.path.join(SCRIPT_DIR, r"sales_reports\zomato")
    if not os.path.exists(folder):
        folder = os.path.join(SCRIPT_DIR, r"2026-Jan-Jun\Zomato-Jan-Jun-2026")
    if not os.path.exists(folder):
        print(f"Zomato folder {folder} not found.")
        return [], 0, []

    orders = {}
    files_skipped = 0
    files_processed = []
    files = sorted([f for f in os.listdir(folder) if f.endswith('.xlsx')])

    for file in files:
        path = os.path.join(folder, file)
        file_hash = hash_file(path)
        if is_already_imported(cursor, file_hash):
            print(f"  Skipping already-imported Zomato file: {file}")
            log_import(cursor, os.path.relpath(path, SCRIPT_DIR), file_hash, "Zomato", 0, 0, "skipped")
            files_skipped += 1
            continue
        try:
            df, idx = find_header_and_read(path, 'Order Level', ['Order ID', 'Order Date', 'Res. name'])

            # Zomato periodically re-words these columns or shifts the numbered/lettered
            # formula references embedded in their labels (e.g. when they add a new fee
            # line item upstream). Resolve the actual column names once per file via
            # normalized-prefix matching so that drift doesn't silently zero these out.
            order_date_col = find_col(df, 'Order Date') or 'Order Date'
            promo_discount_col = find_col(df, 'Restaurant discount Promo')
            other_discount_col = find_col(df, 'Restaurant discount BOGO')
            net_order_value_col = find_col(df, 'Net order value')
            # Older exports had separate "Service fee" and "Payment mechanism fee" columns;
            # newer exports combine them into one "Service fee & payment mechanism fee" column.
            combined_fee_col = find_col(df, 'Service fee payment mechanism fee')
            service_fee_col = find_col(df, 'Service fee') if not combined_fee_col else None
            gov_charges_col = find_col(df, 'Government charges')
            other_ded_col = find_col(df, 'Other order-level deductions')
            service_tax_col = find_col(df, 'Taxes on service')
            net_payout_col = find_col(df, 'Order level Payout')

            for i, row in df.iterrows():
                order_id_val = row.get('Order ID')
                if pd.isnull(order_id_val):
                    continue
                order_id_str = str(order_id_val).strip()
                if not order_id_str.isdigit():
                    continue

                db_order_id = f"Zomato_{order_id_str}"

                subtotal = float(row.get('Subtotal (items total)', 0.0))
                packaging = float(row.get('Packaging charge', 0.0))
                delivery = float(row.get('Delivery charge for restaurants on self logistics', 0.0))

                promo_discount = float(row.get(promo_discount_col, 0.0)) if promo_discount_col else 0.0
                other_discount = float(row.get(other_discount_col, 0.0)) if other_discount_col else 0.0
                discount = promo_discount + other_discount

                tax = float(row.get('Total GST collected from customers', 0.0))
                grand_total = float(row.get(net_order_value_col, 0.0)) if net_order_value_col else 0.0
                if grand_total == 0.0:
                    # Fallback formula
                    grand_total = subtotal + packaging + delivery - discount + tax

                if combined_fee_col:
                    commission = float(row.get(combined_fee_col, 0.0))
                else:
                    service_fee = float(row.get(service_fee_col, 0.0)) if service_fee_col else 0.0
                    pay_mechanism_fee = float(row.get('Payment mechanism fee', 0.0))
                    commission = service_fee + pay_mechanism_fee

                gov_charges = float(row.get(gov_charges_col, 0.0)) if gov_charges_col else 0.0
                other_ded = float(row.get(other_ded_col, 0.0)) if other_ded_col else 0.0
                service_tax = float(row.get(service_tax_col, 0.0)) if service_tax_col else 0.0
                other_charges = gov_charges + other_ded + service_tax

                net_payout = float(row.get(net_payout_col, 0.0)) if net_payout_col else 0.0

                pay_type = str(row.get('Mode of payment', 'ONLINE')).strip()

                orders[db_order_id] = {
                    "order_id": db_order_id,
                    "channel": "Zomato",
                    "original_order_id": order_id_str,
                    "order_date": pd.to_datetime(row.get(order_date_col), format='mixed').strftime('%Y-%m-%d %H:%M:%S'),
                    "status": str(row.get('Order status (Delivered/ Cancelled/ Rejected)', 'DELIVERED')).strip(),
                    "subtotal": subtotal,
                    "packaging_charge": packaging,
                    "delivery_charge": delivery,
                    "discount": discount,
                    "tax": tax,
                    "grand_total": grand_total,
                    "commission": commission,
                    "other_charges": other_charges,
                    "net_payout": net_payout,
                    "items_summary": None,
                    "customer_name": None,
                    "customer_phone": None,
                    "order_type": str(row.get('Order type', 'O2')).strip(),
                    "sub_order_type": None,
                    "source_file": path,
                    "payments": [{
                        "payment_type": pay_type,
                        "amount": grand_total
                    }]
                }

            files_processed.append(path)
        except Exception as e:
            print(f"Error parsing Zomato file {file}: {e}")

    print(f"Parsed {len(orders)} Zomato orders.")
    return list(orders.values()), files_skipped, files_processed

def parse_swiggy(cursor):
    print("Parsing Swiggy sales...")
    folder = os.path.join(SCRIPT_DIR, r"sales_reports\swiggy")
    if not os.path.exists(folder):
        folder = os.path.join(SCRIPT_DIR, r"2026-Jan-Jun\Swiggy")
    if not os.path.exists(folder):
        print(f"Swiggy folder {folder} not found.")
        return [], 0, []

    orders = {}
    files_skipped = 0
    files_processed = []
    files = sorted([f for f in os.listdir(folder) if f.endswith('.xlsx')])

    for file in files:
        path = os.path.join(folder, file)
        file_hash = hash_file(path)
        if is_already_imported(cursor, file_hash):
            print(f"  Skipping already-imported Swiggy file: {file}")
            log_import(cursor, os.path.relpath(path, SCRIPT_DIR), file_hash, "Swiggy", 0, 0, "skipped")
            files_skipped += 1
            continue
        try:
            df, idx = find_header_and_read(path, 'Order Level', ['Order ID', 'Order Date', 'Order Status'])
            for i, row in df.iterrows():
                order_id_val = row.get('Order ID')
                if pd.isnull(order_id_val):
                    continue
                order_id_str = str(order_id_val).strip()
                if not order_id_str.isdigit():
                    continue
                
                db_order_id = f"Swiggy_{order_id_str}"
                
                subtotal = float(row.get('Item Total', 0.0))
                packaging = float(row.get('Packaging Charges', 0.0))
                discount = float(row.get('Restaurant Discount Share [3a+3b]', 0.0))
                tax = float(row.get('GST Collected', 0.0))
                grand_total = float(row.get('Total Customer Paid [4+5]', 0.0))
                
                commission = float(row.get('Commission', 0.0))
                total_swiggy_fees = float(row.get('Total Swiggy Fees\n[6+7+8-9+10+11+12+13+14+15+16]', 0.0))
                total_taxes = float(row.get('Total Taxes\n[19+20+21]', 0.0))
                
                other_charges = total_swiggy_fees - commission + total_taxes
                net_payout = float(row.get('Net Payout for Order (after taxes)\n[A-B-C-D]', 0.0))
                
                pay_type = str(row.get('Order Payment Type', 'ONLINE')).strip()
                
                orders[db_order_id] = {
                    "order_id": db_order_id,
                    "channel": "Swiggy",
                    "original_order_id": order_id_str,
                    "order_date": pd.to_datetime(row.get('Order Date'), format='mixed').strftime('%Y-%m-%d %H:%M:%S'),
                    "status": str(row.get('Order Status', 'delivered')).strip(),
                    "subtotal": subtotal,
                    "packaging_charge": packaging,
                    "delivery_charge": 0.0, # Not explicitly detailed at order level for restaurant payouts
                    "discount": discount,
                    "tax": tax,
                    "grand_total": grand_total,
                    "commission": commission,
                    "other_charges": other_charges,
                    "net_payout": net_payout,
                    "items_summary": None,
                    "customer_name": None,
                    "customer_phone": None,
                    "order_type": str(row.get('Order Category', 'Swiggy')).strip(),
                    "sub_order_type": None,
                    "source_file": path,
                    "payments": [{
                        "payment_type": pay_type,
                        "amount": grand_total
                    }]
                }

            files_processed.append(path)
        except Exception as e:
            print(f"Error parsing Swiggy file {file}: {e}")

    print(f"Parsed {len(orders)} Swiggy orders.")
    return list(orders.values()), files_skipped, files_processed

def import_all(progress_callback=None):
    def log_progress(msg):
        print(msg)
        if progress_callback:
            progress_callback(msg)

    log_progress("Initializing sales database tables...")
    init_db()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("PRAGMA foreign_keys = OFF")

    log_progress("Parsing Counter sales reports from Excel files...")
    counter_orders, counter_skipped, counter_processed = parse_counter(cursor)
    log_progress(f"Counter parsing complete: parsed {len(counter_orders)} orders ({counter_skipped} files already imported, skipped).")

    log_progress("Parsing Zomato sales reports from Excel files...")
    zomato_orders, zomato_skipped, zomato_processed = parse_zomato(cursor)
    log_progress(f"Zomato parsing complete: parsed {len(zomato_orders)} orders ({zomato_skipped} files already imported, skipped).")

    log_progress("Parsing Swiggy sales reports from Excel files...")
    swiggy_orders, swiggy_skipped, swiggy_processed = parse_swiggy(cursor)
    log_progress(f"Swiggy parsing complete: parsed {len(swiggy_orders)} orders ({swiggy_skipped} files already imported, skipped).")

    all_orders = counter_orders + zomato_orders + swiggy_orders
    files_skipped = counter_skipped + zomato_skipped + swiggy_skipped
    log_progress(f"Total parsed orders from all channels: {len(all_orders)}. Starting database import...")

    orders_inserted = 0
    payments_inserted = 0
    orders_new = 0
    orders_duplicate = 0
    # Seed every successfully-read file with a zero-count entry first, so a file whose
    # orders all get superseded by a later overlapping file (e.g. a rolling cumulative
    # export) still gets logged as "success" and isn't needlessly re-parsed next run.
    file_stats = {}
    for path in counter_processed:
        file_stats[("Counter", path)] = {"new": 0, "duplicate": 0}
    for path in zomato_processed:
        file_stats[("Zomato", path)] = {"new": 0, "duplicate": 0}
    for path in swiggy_processed:
        file_stats[("Swiggy", path)] = {"new": 0, "duplicate": 0}

    # Parsing may have already opened an implicit transaction (e.g. log_import()
    # calls for skipped files during parse_counter/parse_zomato/parse_swiggy).
    # Commit that before starting the explicit transaction below.
    conn.commit()
    cursor.execute("BEGIN TRANSACTION")

    for idx, order in enumerate(all_orders):
        if idx % 1000 == 0 and idx > 0:
            log_progress(f"Saving sales orders: {idx}/{len(all_orders)} stored...")

        try:
            cursor.execute("SELECT 1 FROM orders WHERE order_id = ?", (order["order_id"],))
            is_duplicate = cursor.fetchone() is not None

            key = (order["channel"], order["source_file"])
            stats = file_stats.setdefault(key, {"new": 0, "duplicate": 0})
            if is_duplicate:
                stats["duplicate"] += 1
                orders_duplicate += 1
            else:
                stats["new"] += 1
                orders_new += 1

            cursor.execute("""
            INSERT OR REPLACE INTO orders (
                order_id, channel, original_order_id, order_date, status,
                subtotal, packaging_charge, delivery_charge, discount, tax,
                grand_total, commission, other_charges, net_payout, items_summary,
                customer_name, customer_phone, order_type, sub_order_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                order["order_id"], order["channel"], order["original_order_id"], order["order_date"], order["status"],
                order["subtotal"], order["packaging_charge"], order["delivery_charge"], order["discount"], order["tax"],
                order["grand_total"], order["commission"], order["other_charges"], order["net_payout"], order["items_summary"],
                order["customer_name"], order["customer_phone"], order.get("order_type"), order.get("sub_order_type")
            ))
            orders_inserted += 1

            cursor.execute("DELETE FROM order_payments WHERE order_id = ?", (order["order_id"],))

            for payment in order["payments"]:
                cursor.execute("""
                INSERT INTO order_payments (order_id, payment_type, amount)
                VALUES (?, ?, ?)
                """, (order["order_id"], payment["payment_type"], payment["amount"]))
                payments_inserted += 1

        except Exception as e:
            print(f"Error inserting order {order['order_id']}: {e}")

    log_progress("Recording per-file import history...")
    for (channel, source_file_path), stats in file_stats.items():
        file_hash = hash_file(source_file_path)
        rel_path = os.path.relpath(source_file_path, SCRIPT_DIR)
        log_import(cursor, rel_path, file_hash, channel, stats["new"], stats["duplicate"], "success")

    cursor.execute("COMMIT")
    cursor.execute("PRAGMA foreign_keys = ON")

    log_progress("Sales import saved. Optimizing database file size (VACUUM)...")
    cursor.execute("VACUUM")
    conn.close()

    log_progress(
        f"Sales Import Complete: {orders_inserted} orders and {payments_inserted} payment details updated "
        f"({orders_new} new, {orders_duplicate} duplicates auto-merged, {files_skipped} files skipped)."
    )

    return {
        "orders_inserted": orders_inserted,
        "payments_inserted": payments_inserted,
        "counter_orders": len(counter_orders),
        "zomato_orders": len(zomato_orders),
        "swiggy_orders": len(swiggy_orders),
        "orders_new": orders_new,
        "orders_duplicate": orders_duplicate,
        "files_skipped": files_skipped
    }

if __name__ == "__main__":
    import_all()
