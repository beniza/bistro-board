import os
import sqlite3
from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from collections import Counter
import re
import pandas as pd

app = FastAPI(title="Philos Sales Dashboard API")

# Resolve path relative to script directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Use the real database when present locally (gitignored, never committed to this repo);
# fall back to the anonymized demo database otherwise (e.g. the public deployment).
_REAL_DB_ABS_PATH = os.path.join(BASE_DIR, "../philos_sales.db")
DB_PATH = "../philos_sales.db" if os.path.exists(_REAL_DB_ABS_PATH) else "../philos_demo.db"
DB_ABS_PATH = os.path.join(BASE_DIR, DB_PATH)

def get_db_connection():
    if not os.path.exists(DB_ABS_PATH):
        raise HTTPException(status_code=500, detail="Database file not found. Run importer first.")
    conn = sqlite3.connect(DB_ABS_PATH, timeout=30.0)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.row_factory = sqlite3.Row
    return conn

def apply_date_filters(query_body: str, start_date: str, end_date: str, params: list, has_where: bool = True):
    filters = []
    if start_date:
        filters.append("order_date >= ?")
        params.append(f"{start_date} 00:00:00")
    if end_date:
        filters.append("order_date <= ?")
        params.append(f"{end_date} 23:59:59")
        
    if not filters:
        return query_body
        
    filter_clause = " AND ".join(filters)
    if has_where:
        return f"{query_body} AND {filter_clause}"
    else:
        return f"{query_body} WHERE {filter_clause}"

def apply_ledger_date_filters(query_body: str, start_date: str, end_date: str, params: list, has_where: bool = True):
    filters = []
    if start_date:
        filters.append("date >= ?")
        params.append(start_date)
    if end_date:
        filters.append("date <= ?")
        params.append(end_date)
        
    if not filters:
        return query_body
        
    filter_clause = " AND ".join(filters)
    if has_where:
        return f"{query_body} AND {filter_clause}"
    else:
        return f"{query_body} WHERE {filter_clause}"

@app.get("/api/kpis")
def get_kpis(start_date: str = Query(None), end_date: str = Query(None)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Overall KPIs
    overall_query = """
        SELECT 
            COUNT(*) as total_orders,
            SUM(grand_total) as total_sales,
            SUM(net_payout) as total_payout,
            AVG(grand_total) as aov
        FROM orders
        WHERE status NOT IN ('Cancelled', 'rejected', 'failed', 'Not Paid')
    """
    params_overall = []
    overall_query = apply_date_filters(overall_query, start_date, end_date, params_overall, has_where=True)
    overall = cursor.execute(overall_query, params_overall).fetchone()
    
    # 2. KPI Breakdown by channel
    channel_query = """
        SELECT 
            channel,
            COUNT(*) as orders,
            SUM(grand_total) as sales,
            SUM(net_payout) as payout,
            AVG(grand_total) as aov
        FROM orders
        WHERE status NOT IN ('Cancelled', 'rejected', 'failed', 'Not Paid')
    """
    params_channel = []
    channel_query = apply_date_filters(channel_query, start_date, end_date, params_channel, has_where=True)
    channel_query += " GROUP BY channel"
    channel_data = cursor.execute(channel_query, params_channel).fetchall()
    
    # 3. Cancellations KPI
    cancellations_query = """
        SELECT 
            COUNT(*) as cancelled_orders,
            SUM(grand_total) as cancelled_value
        FROM orders
        WHERE status IN ('Cancelled', 'rejected', 'failed', 'Cancelled/ Rejected Orders')
    """
    params_canc = []
    cancellations_query = apply_date_filters(cancellations_query, start_date, end_date, params_canc, has_where=True)
    cancellations = cursor.execute(cancellations_query, params_canc).fetchone()
    
    conn.close()
    
    return {
        "overall": {
            "total_orders": overall["total_orders"] or 0,
            "total_sales": overall["total_sales"] or 0.0,
            "total_payout": overall["total_payout"] or 0.0,
            "aov": overall["aov"] or 0.0,
            "cancelled_orders": cancellations["cancelled_orders"] or 0,
            "cancelled_value": cancellations["cancelled_value"] or 0.0
        },
        "channels": {
            row["channel"]: {
                "orders": row["orders"] or 0,
                "sales": row["sales"] or 0.0,
                "payout": row["payout"] or 0.0,
                "aov": row["aov"] or 0.0
            } for row in channel_data
        }
    }

@app.get("/api/sales-trends")
def get_sales_trends(
    groupby: str = Query("month", pattern="^(day|week|month)$"),
    start_date: str = Query(None),
    end_date: str = Query(None)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Determine the date format based on grouping
    if groupby == "day":
        date_expr = "strftime('%Y-%m-%d', order_date)"
    elif groupby == "week":
        date_expr = "strftime('%Y-%W', order_date)"
    else:
        date_expr = "strftime('%Y-%m', order_date)"
        
    query = f"""
        SELECT 
            {date_expr} as date_key,
            channel,
            SUM(grand_total) as sales,
            SUM(net_payout) as payout,
            COUNT(*) as orders
        FROM orders
        WHERE status NOT IN ('Cancelled', 'rejected', 'failed')
    """
    
    params = []
    query = apply_date_filters(query, start_date, end_date, params, has_where=True)
    query += f" GROUP BY date_key, channel ORDER BY date_key ASC"
    
    rows = cursor.execute(query, params).fetchall()
    conn.close()
    
    # Format response for frontend charting
    trends = {}
    for row in rows:
        key = row["date_key"]
        channel = row["channel"]
        if key not in trends:
            trends[key] = {}
        trends[key][channel] = {
            "sales": row["sales"] or 0.0,
            "payout": row["payout"] or 0.0,
            "orders": row["orders"] or 0
        }
        
    return trends

@app.get("/api/channel-economics")
def get_channel_economics(start_date: str = Query(None), end_date: str = Query(None)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = """
        SELECT 
            channel,
            SUM(grand_total) as gross_sales,
            SUM(discount) as total_discounts,
            SUM(commission) as commissions,
            SUM(other_charges) as other_fees,
            SUM(net_payout) as net_payout
        FROM orders
        WHERE status NOT IN ('Cancelled', 'rejected', 'failed')
    """
    params = []
    query = apply_date_filters(query, start_date, end_date, params, has_where=True)
    query += " GROUP BY channel"
    
    rows = cursor.execute(query, params).fetchall()
    conn.close()
    
    result = {}
    for row in rows:
        channel = row["channel"]
        result[channel] = {
            "gross_sales": row["gross_sales"] or 0.0,
            "total_discounts": row["total_discounts"] or 0.0,
            "commissions": row["commissions"] or 0.0,
            "other_fees": row["other_fees"] or 0.0,
            "net_payout": row["net_payout"] or 0.0
        }
        
    return result

@app.get("/api/counter-insights")
def get_counter_insights(start_date: str = Query(None), end_date: str = Query(None)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Top Items (parsed from items_summary)
    items_query = """
        SELECT items_summary
        FROM orders
        WHERE channel = 'Counter' 
          AND items_summary IS NOT NULL 
          AND status NOT IN ('Cancelled', 'rejected', 'failed')
    """
    params_items = []
    items_query = apply_date_filters(items_query, start_date, end_date, params_items, has_where=True)
    items_rows = cursor.execute(items_query, params_items).fetchall()
    
    item_counter = Counter()
    for row in items_rows:
        summary = row["items_summary"]
        if summary:
            items = [item.strip() for item in summary.split(',')]
            for item in items:
                if item:
                    item_cleaned = re.sub(r'\s+', ' ', item)
                    item_counter[item_cleaned] += 1
                    
    top_items = [{"name": item, "qty": count} for item, count in item_counter.most_common(15)]
    
    # 2. Payment Type breakdown
    payments_query = """
        SELECT op.payment_type, SUM(op.amount) as total_amount, COUNT(DISTINCT o.order_id) as order_count
        FROM order_payments op
        JOIN orders o ON op.order_id = o.order_id
        WHERE o.channel = 'Counter'
          AND o.status NOT IN ('Cancelled', 'rejected', 'failed')
    """
    params_payments = []
    payments_query = apply_date_filters(payments_query, start_date, end_date, params_payments, has_where=True)
    payments_query += " GROUP BY op.payment_type ORDER BY total_amount DESC"
    
    payments_rows = cursor.execute(payments_query, params_payments).fetchall()
    payments = [
        {
            "payment_type": row["payment_type"],
            "total_amount": row["total_amount"],
            "order_count": row["order_count"]
        } for row in payments_rows
    ]
    
    conn.close()
    
    return {
        "top_items": top_items,
        "payments": payments
    }

@app.get("/api/orders")
def get_orders(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    channel: str = Query(None),
    status: str = Query(None),
    search: str = Query(None),
    start_date: str = Query(None),
    end_date: str = Query(None)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    offset = (page - 1) * limit
    
    # Build query filter
    filters = []
    params = []
    
    if channel:
        filters.append("channel = ?")
        params.append(channel)
    if status:
        filters.append("status = ?")
        params.append(status)
    if search:
        filters.append("(original_order_id LIKE ? OR items_summary LIKE ? OR customer_name LIKE ?)")
        search_param = f"%{search}%"
        params.extend([search_param, search_param, search_param])
    if start_date:
        filters.append("order_date >= ?")
        params.append(f"{start_date} 00:00:00")
    if end_date:
        filters.append("order_date <= ?")
        params.append(f"{end_date} 23:59:59")
        
    filter_clause = f"WHERE {' AND '.join(filters)}" if filters else ""
    
    # Count total orders matching filters
    count_query = f"SELECT COUNT(*) FROM orders {filter_clause}"
    total_records = cursor.execute(count_query, params).fetchone()[0]
    
    # Fetch records
    query = f"""
        SELECT 
            order_id, channel, original_order_id, order_date, status,
            subtotal, discount, tax, grand_total, net_payout, items_summary
        FROM orders
        {filter_clause}
        ORDER BY order_date DESC
        LIMIT ? OFFSET ?
    """
    
    rows = cursor.execute(query, params + [limit, offset]).fetchall()
    conn.close()
    
    orders = []
    for row in rows:
        orders.append({
            "order_id": row["order_id"],
            "channel": row["channel"],
            "original_order_id": row["original_order_id"],
            "order_date": row["order_date"],
            "status": row["status"],
            "subtotal": row["subtotal"],
            "discount": row["discount"],
            "tax": row["tax"],
            "grand_total": row["grand_total"],
            "net_payout": row["net_payout"],
            "items_summary": row["items_summary"]
        })
        
    return {
        "total_records": total_records,
        "page": page,
        "limit": limit,
        "total_pages": (total_records + limit - 1) // limit,
        "data": orders
    }

@app.get("/api/item-breakup")
def get_item_breakup(
    item_name: str,
    start_date: str = Query(None),
    end_date: str = Query(None)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Build date query filters
    filters = ["channel = 'Counter'", "items_summary IS NOT NULL", "status NOT IN ('Cancelled', 'failed')"]
    params = []
    
    if start_date:
        filters.append("order_date >= ?")
        params.append(f"{start_date} 00:00:00")
    if end_date:
        filters.append("order_date <= ?")
        params.append(f"{end_date} 23:59:59")
        
    filter_clause = " AND ".join(filters)
    
    # Fetch orders containing the item name
    query = f"""
        SELECT order_date, order_type, items_summary
        FROM orders
        WHERE {filter_clause} AND items_summary LIKE ?
    """
    rows = cursor.execute(query, params + [f"%{item_name}%"]).fetchall()
    conn.close()
    
    # Process co-occurrences and sales trends in Python for accuracy
    daily_sales = {}
    order_types = {}
    co_occurrences = Counter()
    
    total_qty = 0
    total_orders = 0
    
    for row in rows:
        summary = row["items_summary"]
        # Ensure order date is formatted consistently
        try:
            date_str = pd.to_datetime(row["order_date"]).strftime('%Y-%m-%d')
        except:
            date_str = str(row["order_date"])[:10]
            
        o_type = row["order_type"] or "Dine In"
        # Clean type formatting e.g. "Dine In (3)" -> "Dine In"
        if "Dine In" in o_type:
            o_type = "Dine In"
        
        # Split items
        items = [item.strip() for item in summary.split(',')]
        # Count occurrences of exact item in this order
        item_qty = sum(1 for item in items if item == item_name)
        
        if item_qty > 0:
            total_qty += item_qty
            total_orders += 1
            
            # Daily Trend
            daily_sales[date_str] = daily_sales.get(date_str, 0) + item_qty
            
            # Order Type Mix
            order_types[o_type] = order_types.get(o_type, 0) + item_qty
            
            # Co-occurrences
            for other_item in items:
                if other_item != item_name:
                    co_occurrences[other_item] += item_qty
                    
    # Format daily trend
    sorted_dates = sorted(daily_sales.keys())
    trend = [{"date": d, "qty": daily_sales[d]} for d in sorted_dates]
    
    # Format order types
    type_mix = [{"name": k, "qty": v} for k, v in order_types.items()]
    
    # Format co-occurrences (top 5)
    frequently_bought_together = [{"name": k, "qty": v} for k, v in co_occurrences.most_common(5)]
    
    return {
        "item_name": item_name,
        "total_qty": total_qty,
        "total_orders": total_orders,
        "sales_trend": trend,
        "order_type_mix": type_mix,
        "frequently_bought_together": frequently_bought_together
    }

@app.get("/api/ledger-summary")
def get_ledger_summary(start_date: str = Query(None), end_date: str = Query(None)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Total Income
    inc_query = "SELECT SUM(total_income) as total FROM income_register"
    params_inc = []
    inc_query = apply_ledger_date_filters(inc_query, start_date, end_date, params_inc, has_where=False)
    inc_row = cursor.execute(inc_query, params_inc).fetchone()
    total_income = inc_row["total"] or 0.0
    
    # 2. Total Expenses
    exp_query = "SELECT SUM(amount) as total FROM expenses"
    params_exp = []
    exp_query = apply_ledger_date_filters(exp_query, start_date, end_date, params_exp, has_where=False)
    exp_row = cursor.execute(exp_query, params_exp).fetchone()
    total_expenses = exp_row["total"] or 0.0
    
    # 3. Monthly Trends for P&L
    inc_trend_query = """
        SELECT strftime('%Y-%m', date) as month_key, SUM(total_income) as income
        FROM income_register
    """
    params_inc_t = []
    inc_trend_query = apply_ledger_date_filters(inc_trend_query, start_date, end_date, params_inc_t, has_where=False)
    inc_trend_query += " GROUP BY month_key ORDER BY month_key ASC"
    inc_trend_rows = cursor.execute(inc_trend_query, params_inc_t).fetchall()
    
    exp_trend_query = """
        SELECT strftime('%Y-%m', date) as month_key, SUM(amount) as expenses
        FROM expenses
    """
    params_exp_t = []
    exp_trend_query = apply_ledger_date_filters(exp_trend_query, start_date, end_date, params_exp_t, has_where=False)
    exp_trend_query += " GROUP BY month_key ORDER BY month_key ASC"
    exp_trend_rows = cursor.execute(exp_trend_query, params_exp_t).fetchall()
    
    # Combine trends
    trend_dict = {}
    for r in inc_trend_rows:
        m = r["month_key"]
        if m:
            trend_dict[m] = {"income": r["income"] or 0.0, "expenses": 0.0}
            
    for r in exp_trend_rows:
        m = r["month_key"]
        if m:
            if m not in trend_dict:
                trend_dict[m] = {"income": 0.0, "expenses": 0.0}
            trend_dict[m]["expenses"] = r["expenses"] or 0.0
            
    trend_list = []
    for m in sorted(trend_dict.keys()):
        inc = trend_dict[m]["income"]
        exp = trend_dict[m]["expenses"]
        if inc == 0.0 and exp == 0.0:
            continue
        trend_list.append({
            "month": m,
            "income": inc,
            "expenses": exp,
            "profit": inc - exp
        })
        
    conn.close()
    
    net_profit = total_income - total_expenses
    margin = (net_profit / total_income * 100) if total_income > 0 else 0.0
    
    return {
        "summary": {
            "total_income": total_income,
            "total_expenses": total_expenses,
            "net_profit": net_profit,
            "profit_margin": margin
        },
        "trends": trend_list
    }

@app.get("/api/expenses-breakup")
def get_expenses_breakup(start_date: str = Query(None), end_date: str = Query(None)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = """
        SELECT category, SUM(amount) as total, COUNT(*) as count
        FROM expenses
    """
    params = []
    query = apply_ledger_date_filters(query, start_date, end_date, params, has_where=False)
    query += " GROUP BY category ORDER BY total DESC"
    
    rows = cursor.execute(query, params).fetchall()
    conn.close()
    
    return [
        {"category": r["category"], "amount": r["total"], "count": r["count"]}
        for r in rows
    ]

@app.get("/api/income-breakup")
def get_income_breakup(start_date: str = Query(None), end_date: str = Query(None)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = """
        SELECT 
            SUM(petpooja_net) as counter_net,
            SUM(gst_5pct) as counter_gst,
            SUM(swiggy_gross) as swiggy,
            SUM(zomato_gross) as zomato,
            SUM(paper_bill) as paper
        FROM income_register
    """
    params = []
    query = apply_ledger_date_filters(query, start_date, end_date, params, has_where=False)
    row = cursor.execute(query, params).fetchone()
    conn.close()
    
    return {
        "counter_net": row["counter_net"] or 0.0,
        "counter_gst": row["counter_gst"] or 0.0,
        "swiggy": row["swiggy"] or 0.0,
        "zomato": row["zomato"] or 0.0,
        "paper": row["paper"] or 0.0
    }

@app.get("/api/ledger-transactions")
def get_ledger_transactions(
    type: str = Query("expense", pattern="^(expense|income)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    search: str = Query(None),
    start_date: str = Query(None),
    end_date: str = Query(None)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    offset = (page - 1) * limit
    filters = []
    params = []
    
    if start_date:
        filters.append("date >= ?")
        params.append(start_date)
    if end_date:
        filters.append("date <= ?")
        params.append(end_date)
        
    if type == "expense":
        if search:
            filters.append("(category LIKE ? OR description LIKE ? OR remarks LIKE ?)")
            search_param = f"%{search}%"
            params.extend([search_param, search_param, search_param])
            
        filter_clause = f"WHERE {' AND '.join(filters)}" if filters else ""
        
        count_query = f"SELECT COUNT(*) FROM expenses {filter_clause}"
        total_records = cursor.execute(count_query, params).fetchone()[0]
        
        query = f"""
            SELECT id, date, category, description, amount, paid, mode, remarks
            FROM expenses
            {filter_clause}
            ORDER BY date DESC
            LIMIT ? OFFSET ?
        """
        rows = cursor.execute(query, params + [limit, offset]).fetchall()
        data = [dict(r) for r in rows]
    else:
        if search:
            filters.append("(month LIKE ? OR day LIKE ?)")
            search_param = f"%{search}%"
            params.extend([search_param, search_param])
            
        filter_clause = f"WHERE {' AND '.join(filters)}" if filters else ""
        
        count_query = f"SELECT COUNT(*) FROM income_register {filter_clause}"
        total_records = cursor.execute(count_query, params).fetchone()[0]
        
        query = f"""
            SELECT date, petpooja_actual, gst_5pct, petpooja_net, swiggy_gross, zomato_gross, total_income
            FROM income_register
            {filter_clause}
            ORDER BY date DESC
            LIMIT ? OFFSET ?
        """
        rows = cursor.execute(query, params + [limit, offset]).fetchall()
        data = [dict(r) for r in rows]
        
    conn.close()
    
    return {
        "total_records": total_records,
        "page": page,
        "limit": limit,
        "total_pages": (total_records + limit - 1) // limit,
        "data": data
    }

@app.get("/api/weekday-sales")
def get_weekday_sales(start_date: str = Query(None), end_date: str = Query(None)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = """
        SELECT 
            CAST(strftime('%w', order_date) AS INTEGER) as dow,
            channel,
            SUM(grand_total) as sales,
            COUNT(*) as orders
        FROM orders
        WHERE status NOT IN ('Cancelled', 'rejected', 'failed')
    """
    params = []
    query = apply_date_filters(query, start_date, end_date, params, has_where=True)
    query += " GROUP BY dow, channel ORDER BY dow ASC"
    
    rows = cursor.execute(query, params).fetchall()
    conn.close()
    
    result = {}
    days_map = {
        1: "Monday",
        2: "Tuesday",
        3: "Wednesday",
        4: "Thursday",
        5: "Friday",
        6: "Saturday"
    }
    
    for dow_num, dow_name in days_map.items():
        result[dow_name] = {"Counter": 0.0, "Swiggy": 0.0, "Zomato": 0.0, "total_sales": 0.0, "total_orders": 0}
        
    for row in rows:
        dow_num = row["dow"]
        if dow_num == 0 or dow_num not in days_map:
            continue
        dow_name = days_map[dow_num]
        channel = row["channel"]
        sales = row["sales"] or 0.0
        orders = row["orders"] or 0
        
        if channel in result[dow_name]:
            result[dow_name][channel] = sales
        result[dow_name]["total_sales"] += sales
        result[dow_name]["total_orders"] += orders
        
    return result

@app.get("/api/hourly-sales")
def get_hourly_sales(start_date: str = Query(None), end_date: str = Query(None)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = """
        SELECT 
            strftime('%H', order_date) as hour,
            channel,
            SUM(grand_total) as sales,
            COUNT(*) as orders
        FROM orders
        WHERE status NOT IN ('Cancelled', 'rejected', 'failed')
    """
    params = []
    query = apply_date_filters(query, start_date, end_date, params, has_where=True)
    query += " GROUP BY hour, channel ORDER BY hour ASC"
    
    rows = cursor.execute(query, params).fetchall()
    conn.close()
    
    result = {}
    for h in range(24):
        hour_str = f"{h:02d}"
        result[hour_str] = {"Counter": 0.0, "Swiggy": 0.0, "Zomato": 0.0, "total_sales": 0.0, "total_orders": 0}
        
    for row in rows:
        hour_str = row["hour"]
        if not hour_str:
            continue
        channel = row["channel"]
        sales = row["sales"] or 0.0
        orders = row["orders"] or 0
        
        if hour_str in result:
            if channel in result[hour_str]:
                result[hour_str][channel] = sales
            result[hour_str]["total_sales"] += sales
            result[hour_str]["total_orders"] += orders
            
    return result

@app.get("/api/daily-reconciliation")
def get_daily_reconciliation(start_date: str = Query(None), end_date: str = Query(None)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Query daily sales from orders table (grouped by date and channel)
    query_raw = """
        SELECT 
            strftime('%Y-%m-%d', order_date) as date_key,
            channel,
            SUM(grand_total) as raw_gross,
            SUM(net_payout) as raw_payout
        FROM orders
        WHERE status NOT IN ('Cancelled', 'rejected', 'failed', 'Not Paid')
    """
    params_raw = []
    query_raw = apply_date_filters(query_raw, start_date, end_date, params_raw, has_where=True)
    query_raw += " GROUP BY date_key, channel"
    
    raw_rows = cursor.execute(query_raw, params_raw).fetchall()
    
    # 2. Query daily sales from income_register table
    query_ledger = """
        SELECT 
            date as date_key,
            petpooja_actual,
            petpooja_net,
            swiggy_gross,
            swiggy_payout,
            zomato_gross,
            zomato_payout,
            total_income
        FROM income_register
    """
    params_led = []
    query_ledger = apply_ledger_date_filters(query_ledger, start_date, end_date, params_led, has_where=False)
    query_ledger += " ORDER BY date_key ASC"
    
    led_rows = cursor.execute(query_ledger, params_led).fetchall()
    conn.close()
    
    # Process raw rows into daily dict
    daily_raw = {}
    for row in raw_rows:
        d = row["date_key"]
        ch = row["channel"]
        if d not in daily_raw:
            daily_raw[d] = {"Counter_gross": 0.0, "Counter_payout": 0.0,
                            "Swiggy_gross": 0.0, "Swiggy_payout": 0.0,
                            "Zomato_gross": 0.0, "Zomato_payout": 0.0}
        
        daily_raw[d][f"{ch}_gross"] = row["raw_gross"] or 0.0
        daily_raw[d][f"{ch}_payout"] = row["raw_payout"] or 0.0
        
    # Merge with ledger
    merged = []
    for r in led_rows:
        d = r["date_key"]
        raw = daily_raw.get(d, {"Counter_gross": 0.0, "Counter_payout": 0.0,
                                "Swiggy_gross": 0.0, "Swiggy_payout": 0.0,
                                "Zomato_gross": 0.0, "Zomato_payout": 0.0})
        
        # Calculate variances
        counter_var = raw["Counter_gross"] - (r["petpooja_actual"] or 0.0)
        swiggy_var = raw["Swiggy_gross"] - (r["swiggy_gross"] or 0.0)
        zomato_var = raw["Zomato_gross"] - (r["zomato_gross"] or 0.0)
        
        # Net Payout (App reports actual cash credit: Counter gross + Swiggy payout + Zomato payout)
        actual_payout = raw["Counter_gross"] + raw["Swiggy_payout"] + raw["Zomato_payout"]
        ledger_total = r["total_income"] or 0.0
        payout_var = actual_payout - ledger_total
        
        merged.append({
            "date": d,
            "raw_counter": raw["Counter_gross"],
            "led_counter": r["petpooja_actual"] or 0.0,
            "counter_variance": counter_var,
            
            "raw_swiggy": raw["Swiggy_gross"],
            "led_swiggy": r["swiggy_gross"] or 0.0,
            "swiggy_variance": swiggy_var,
            
            "raw_zomato": raw["Zomato_gross"],
            "led_zomato": r["zomato_gross"] or 0.0,
            "zomato_variance": zomato_var,
            
            "raw_total_payout": actual_payout,
            "led_total_income": ledger_total,
            "payout_variance": payout_var
        })
        
    return merged

@app.get("/api/weekly-payouts")
def get_weekly_payouts(
    channel: str = Query(None),
    start_date: str = Query(None),
    end_date: str = Query(None)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    filters = ["status NOT IN ('Cancelled', 'rejected', 'failed', 'Not Paid')"]
    params = []
    if channel:
        filters.append("channel = ?")
        params.append(channel)
    if start_date:
        filters.append("order_date >= ?")
        params.append(f"{start_date} 00:00:00")
    if end_date:
        filters.append("order_date <= ?")
        params.append(f"{end_date} 23:59:59")
    
    where = "WHERE " + " AND ".join(filters)
    
    query = f"""
        SELECT 
            channel,
            strftime('%Y-W%W', order_date) as week_key,
            strftime('%Y-%m-%d', MIN(order_date)) as week_start,
            strftime('%Y-%m-%d', MAX(order_date)) as week_end,
            COUNT(*) as orders,
            ROUND(SUM(subtotal), 2) as subtotal,
            ROUND(SUM(packaging_charge), 2) as packaging,
            ROUND(SUM(discount), 2) as discount,
            ROUND(SUM(tax), 2) as tax_collected,
            ROUND(SUM(grand_total), 2) as gross_sales,
            ROUND(SUM(commission), 2) as commission,
            ROUND(SUM(other_charges), 2) as other_charges,
            ROUND(SUM(net_payout), 2) as net_payout
        FROM orders
        {where}
        GROUP BY channel, week_key
        ORDER BY week_key ASC, channel ASC
    """
    rows = cursor.execute(query, params).fetchall()
    conn.close()
    
    result = []
    for row in rows:
        gross = row["gross_sales"] or 0.0
        net = row["net_payout"] or 0.0
        comm = row["commission"] or 0.0
        other = row["other_charges"] or 0.0
        deduction_rate = ((comm + other) / gross * 100) if gross > 0 else 0.0
        result.append({
            "channel": row["channel"],
            "week_key": row["week_key"],
            "week_start": row["week_start"],
            "week_end": row["week_end"],
            "orders": row["orders"] or 0,
            "subtotal": row["subtotal"] or 0.0,
            "packaging": row["packaging"] or 0.0,
            "discount": row["discount"] or 0.0,
            "tax_collected": row["tax_collected"] or 0.0,
            "gross_sales": gross,
            "commission": comm,
            "other_charges": other,
            "total_deductions": round(comm + other, 2),
            "net_payout": net,
            "deduction_rate": round(deduction_rate, 2)
        })
    return result


@app.get("/api/payout-orders")
def get_payout_orders(
    channel: str = Query(None),
    week_key: str = Query(None),
    start_date: str = Query(None),
    end_date: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    offset = (page - 1) * limit
    filters = ["status NOT IN ('Cancelled', 'rejected', 'failed', 'Not Paid')"]
    params = []
    
    if channel:
        filters.append("channel = ?")
        params.append(channel)
    if week_key:
        filters.append("strftime('%Y-W%W', order_date) = ?")
        params.append(week_key)
    if start_date:
        filters.append("order_date >= ?")
        params.append(f"{start_date} 00:00:00")
    if end_date:
        filters.append("order_date <= ?")
        params.append(f"{end_date} 23:59:59")
    
    where = "WHERE " + " AND ".join(filters)
    
    count_q = f"SELECT COUNT(*) FROM orders {where}"
    total = cursor.execute(count_q, params).fetchone()[0]
    
    query = f"""
        SELECT order_id, channel, original_order_id, order_date, status,
               subtotal, packaging_charge, discount, tax, grand_total,
               commission, other_charges, net_payout, items_summary, order_type
        FROM orders
        {where}
        ORDER BY order_date DESC
        LIMIT ? OFFSET ?
    """
    rows = cursor.execute(query, params + [limit, offset]).fetchall()
    conn.close()
    
    data = []
    for row in rows:
        gross = row["grand_total"] or 0.0
        net = row["net_payout"] or 0.0
        comm = row["commission"] or 0.0
        other = row["other_charges"] or 0.0
        data.append({
            "order_id": row["order_id"],
            "channel": row["channel"],
            "original_order_id": row["original_order_id"],
            "order_date": row["order_date"],
            "status": row["status"],
            "subtotal": row["subtotal"] or 0.0,
            "packaging": row["packaging_charge"] or 0.0,
            "discount": row["discount"] or 0.0,
            "tax": row["tax"] or 0.0,
            "gross_sales": gross,
            "commission": comm,
            "other_charges": other,
            "net_payout": net,
            "items_summary": row["items_summary"],
            "order_type": row["order_type"]
        })
    
    return {
        "total_records": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit,
        "data": data
    }


@app.get("/api/promo-analysis")
def get_promo_analysis(
    channel: str = Query(None),
    start_date: str = Query(None),
    end_date: str = Query(None)
):
    import math
    conn = get_db_connection()
    cursor = conn.cursor()

    base_filters = ["status NOT IN ('Cancelled', 'rejected', 'failed', 'Not Paid')",
                    "channel IN ('Swiggy', 'Zomato')"]
    params = []
    if channel:
        base_filters.append("channel = ?")
        params.append(channel)
    if start_date:
        base_filters.append("order_date >= ?")
        params.append(f"{start_date} 00:00:00")
    if end_date:
        base_filters.append("order_date <= ?")
        params.append(f"{end_date} 23:59:59")
    where = "WHERE " + " AND ".join(base_filters)

    # --- Weekly promo vs volume ---
    weekly_q = f"""
        SELECT
            channel,
            strftime('%Y-W%W', order_date)         AS week_key,
            strftime('%Y-%m-%d', MIN(order_date))  AS week_start,
            strftime('%Y-%m-%d', MAX(order_date))  AS week_end,
            COUNT(*)                                AS total_orders,
            COUNT(CASE WHEN discount > 0 THEN 1 END) AS promo_orders,
            COUNT(CASE WHEN discount = 0 THEN 1 END) AS non_promo_orders,
            ROUND(SUM(discount), 2)                AS total_discount,
            ROUND(AVG(discount), 2)                AS avg_discount_all,
            ROUND(AVG(CASE WHEN discount > 0 THEN discount END), 2) AS avg_discount_when_promo,
            ROUND(SUM(grand_total), 2)             AS gross_sales,
            ROUND(AVG(grand_total), 2)             AS avg_order_value,
            ROUND(AVG(CASE WHEN discount > 0 THEN grand_total END), 2) AS avg_val_promo_orders,
            ROUND(AVG(CASE WHEN discount = 0 THEN grand_total END), 2) AS avg_val_no_promo,
            ROUND(SUM(net_payout), 2)              AS net_payout
        FROM orders
        {where}
        GROUP BY channel, week_key
        ORDER BY week_key ASC, channel ASC
    """
    weekly_rows = cursor.execute(weekly_q, params).fetchall()

    weekly = []
    for row in weekly_rows:
        tot = row["total_orders"] or 1
        promo_pct = round((row["promo_orders"] or 0) / tot * 100, 1)
        discount_per_order = round((row["total_discount"] or 0) / tot, 2)
        weekly.append({
            "channel": row["channel"],
            "week_key": row["week_key"],
            "week_start": row["week_start"],
            "week_end": row["week_end"],
            "total_orders": row["total_orders"] or 0,
            "promo_orders": row["promo_orders"] or 0,
            "non_promo_orders": row["non_promo_orders"] or 0,
            "promo_pct": promo_pct,
            "total_discount": row["total_discount"] or 0.0,
            "avg_discount_all": row["avg_discount_all"] or 0.0,
            "avg_discount_when_promo": row["avg_discount_when_promo"] or 0.0,
            "discount_per_order": discount_per_order,
            "gross_sales": row["gross_sales"] or 0.0,
            "avg_order_value": row["avg_order_value"] or 0.0,
            "avg_val_promo_orders": row["avg_val_promo_orders"] or 0.0,
            "avg_val_no_promo": row["avg_val_no_promo"] or 0.0,
            "net_payout": row["net_payout"] or 0.0,
        })

    # --- Pearson correlation: discount_per_order vs total_orders, per channel ---
    def pearson(xs, ys):
        n = len(xs)
        if n < 2: return 0.0
        mx, my = sum(xs)/n, sum(ys)/n
        num = sum((x-mx)*(y-my) for x, y in zip(xs, ys))
        dx = math.sqrt(sum((x-mx)**2 for x in xs))
        dy = math.sqrt(sum((y-my)**2 for y in ys))
        if dx == 0 or dy == 0: return 0.0
        return round(num / (dx * dy), 3)

    correlations = {}
    for ch in ['Swiggy', 'Zomato']:
        ch_rows = [w for w in weekly if w['channel'] == ch]
        xs = [w['total_discount'] for w in ch_rows]
        ys = [w['total_orders'] for w in ch_rows]
        correlations[ch] = pearson(xs, ys)

    # --- Discount bucket breakdown ---
    bucket_q = f"""
        SELECT channel,
            CASE
                WHEN discount = 0              THEN 'No Discount'
                WHEN discount > 0   AND discount <= 50  THEN '₹1 – ₹50'
                WHEN discount > 50  AND discount <= 100 THEN '₹51 – ₹100'
                WHEN discount > 100 AND discount <= 200 THEN '₹101 – ₹200'
                ELSE '₹200+'
            END AS bucket,
            COUNT(*)                        AS orders,
            ROUND(AVG(grand_total), 2)      AS avg_order_value,
            ROUND(SUM(discount), 2)         AS total_discount,
            ROUND(AVG(discount), 2)         AS avg_discount,
            ROUND(SUM(net_payout), 2)       AS net_payout
        FROM orders
        {where}
        GROUP BY channel, bucket
        ORDER BY channel, MIN(discount)
    """
    bucket_rows = cursor.execute(bucket_q, params).fetchall()
    buckets = [dict(row) for row in bucket_rows]

    # --- Daily data for scatter (discount vs orders count) ---
    daily_q = f"""
        SELECT channel,
            strftime('%Y-%m-%d', order_date) AS day,
            COUNT(*)                          AS orders,
            ROUND(SUM(discount), 2)           AS total_discount,
            ROUND(AVG(grand_total), 2)        AS avg_order_value,
            ROUND(SUM(net_payout), 2)         AS net_payout
        FROM orders
        {where}
        GROUP BY channel, day
        ORDER BY day ASC
    """
    daily_rows = cursor.execute(daily_q, params).fetchall()
    daily = [dict(row) for row in daily_rows]

    conn.close()
    return {
        "weekly": weekly,
        "correlations": correlations,
        "buckets": buckets,
        "daily": daily
    }


# Shared dictionary to store real-time data sync status and logs
sync_status = {
    "running": False,
    "stage": "idle", # "idle", "running", "completed", "failed"
    "message": "System idle",
    "progress_percent": 0,
    "log": [],
    "result": None
}

def execute_sync_task():
    global sync_status
    
    # Progress callback function
    def make_progress_callback(section_name):
        def cb(msg, step=None, total=None):
            # Format message
            log_msg = f"[{section_name}] {msg}"
            sync_status["log"].append(log_msg)
            sync_status["message"] = msg
            
            # Calculate dynamic progress percent if step and total are provided
            if step and total:
                # Say Gmail Fetch takes up to 45% of the progress bar
                if section_name == "Gmail Fetch":
                    sync_status["progress_percent"] = int((step / total) * 45)
            elif section_name == "Sales Import":
                # Sales takes 45% - 85%
                sync_status["progress_percent"] = 65
            elif section_name == "Register Import":
                # Register takes 85% - 95%
                sync_status["progress_percent"] = 90
        return cb

    try:
        import sys
        import os
        
        # Add parent directory to sys.path to find import scripts
        parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        if parent_dir not in sys.path:
            sys.path.insert(0, parent_dir)
            
        import import_sales
        import import_register
        import fetch_emails
        
        import importlib
        importlib.reload(import_sales)
        importlib.reload(import_register)
        importlib.reload(fetch_emails)
        
        # 1. Fetch latest emails
        sync_status["message"] = "Scanning Gmail for reports..."
        sync_status["log"].append("Connecting to Gmail to download new Swiggy, Zomato, and Counter reports...")
        email_status = fetch_emails.fetch_reports(progress_callback=make_progress_callback("Gmail Fetch"))
        
        # 2. Run sales import
        sync_status["message"] = "Importing Sales Orders..."
        sync_status["progress_percent"] = 50
        sales_results = import_sales.import_all(progress_callback=make_progress_callback("Sales Import"))
        
        # 3. Download latest Kakkanad Business Register from Google Sheets (if configured)
        sync_status["message"] = "Syncing ledger from Google Sheets..."
        sync_status["progress_percent"] = 80
        try:
            import download_sheet
            importlib.reload(download_sheet)
            download_sheet.download_register_sheet(progress_callback=make_progress_callback("Google Sheet Sync"))
        except Exception as g_err:
            sync_status["log"].append(f"[Google Sheet Sync] Warning: Could not sync sheet: {g_err}")
        
        # 4. Run register import
        sync_status["message"] = "Importing Kakkanad Business Register ledger data..."
        sync_status["progress_percent"] = 85
        register_results = import_register.import_all(progress_callback=make_progress_callback("Register Import"))
        
        # Finished!
        sync_status["progress_percent"] = 100
        sync_status["stage"] = "completed"
        sync_status["message"] = "Data sync completed successfully!"
        sync_status["log"].append("All sales and register reports imported successfully.")
        
        sync_status["result"] = {
            "status": "success",
            "email_fetch": email_status,
            "sales": sales_results,
            "register": register_results
        }
        
    except Exception as e:
        import traceback
        tb_str = traceback.format_exc()
        sync_status["stage"] = "failed"
        sync_status["message"] = f"Sync failed: {str(e)}"
        sync_status["log"].append(f"ERROR: Sync process crashed: {str(e)}\n{tb_str}")
        
    finally:
        sync_status["running"] = False

@app.post("/api/run-import")
def run_import(background_tasks: BackgroundTasks):
    global sync_status
    if sync_status["running"]:
        raise HTTPException(status_code=400, detail="Data sync is already running.")
        
    # Reset status
    sync_status["running"] = True
    sync_status["stage"] = "running"
    sync_status["message"] = "Initializing data sync process..."
    sync_status["progress_percent"] = 0
    sync_status["log"] = ["Starting data sync process..."]
    sync_status["result"] = None
    
    # Add background task
    background_tasks.add_task(execute_sync_task)
    
    return {"status": "started", "message": "Import process launched in background."}

@app.get("/api/sync-status")
def get_sync_status():
    return sync_status

@app.get("/api/import-log")
def get_import_log(limit: int = Query(50, ge=1, le=200)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT file_path, channel, imported_at, orders_new, orders_duplicate, status, message
        FROM import_log
        ORDER BY imported_at DESC, id DESC
        LIMIT ?
    """, (limit,))
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return {"entries": rows}


static_path = os.path.join(BASE_DIR, "static")
if not os.path.exists(static_path):
    os.makedirs(static_path)

app.mount("/", StaticFiles(directory=static_path, html=True), name="static")

@app.get("/")
def read_root():
    return FileResponse(os.path.join(static_path, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)
