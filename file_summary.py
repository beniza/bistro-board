import os
import pandas as pd

def parse_date(date_str):
    try:
        return pd.to_datetime(date_str)
    except:
        return pd.NaT

def summarize_counter():
    folder = r"C:\Users\BCS_Support\Documents\Admin\Philos\2026-Jan-Jun\Counter-Jan-Jun-2026"
    summary = []
    for file in sorted(os.listdir(folder)):
        if not file.endswith('.xlsx'):
            continue
        path = os.path.join(folder, file)
        try:
            # Counter header is at row 3 (0-indexed)
            df = pd.read_excel(path, sheet_name='Sheet1', skiprows=3)
            # Filter out rows that don't look like data (e.g. total rows or empty rows)
            # Column name for order ID is 'Order No.' or similar
            if 'Order No.' in df.columns:
                df_clean = df[df['Order No.'].notnull()]
                # Check for numeric order nos
                df_clean = df_clean[df_clean['Order No.'].astype(str).str.isdigit()]
                dates = pd.to_datetime(df_clean['Created'], errors='coerce')
                min_date = dates.min()
                max_date = dates.max()
                row_count = len(df_clean)
                summary.append({
                    "channel": "Counter",
                    "file": file,
                    "rows": row_count,
                    "min_date": str(min_date),
                    "max_date": str(max_date)
                })
            else:
                summary.append({
                    "channel": "Counter",
                    "file": file,
                    "rows": len(df),
                    "min_date": "N/A",
                    "max_date": "N/A",
                    "error": f"Order No. not in columns {df.columns.tolist()[:5]}"
                })
        except Exception as e:
            summary.append({
                "channel": "Counter",
                "file": file,
                "error": str(e)
            })
    return summary

def summarize_zomato():
    folder = r"C:\Users\BCS_Support\Documents\Admin\Philos\2026-Jan-Jun\Zomato-Jan-Jun-2026"
    summary = []
    for file in sorted(os.listdir(folder)):
        if not file.endswith('.xlsx'):
            continue
        path = os.path.join(folder, file)
        try:
            # Zomato header is at row 5 (0-indexed)
            df = pd.read_excel(path, sheet_name='Order Level', skiprows=5)
            # Filter out row 0 if it's #REF! or empty
            df_clean = df[df['Order ID'].notnull()]
            # Filter out #REF! or headers
            df_clean = df_clean[df_clean['Order ID'].astype(str).str.isdigit()]
            dates = pd.to_datetime(df_clean['Order Date'], errors='coerce')
            min_date = dates.min()
            max_date = dates.max()
            row_count = len(df_clean)
            summary.append({
                "channel": "Zomato",
                "file": file,
                "rows": row_count,
                "min_date": str(min_date),
                "max_date": str(max_date)
            })
        except Exception as e:
            summary.append({
                "channel": "Zomato",
                "file": file,
                "error": str(e)
            })
    return summary

def summarize_swiggy():
    folder = r"C:\Users\BCS_Support\Documents\Admin\Philos\2026-Jan-Jun\Swiggy"
    summary = []
    for file in sorted(os.listdir(folder)):
        if not file.endswith('.xlsx'):
            continue
        path = os.path.join(folder, file)
        try:
            # Swiggy header is at row 1 (0-indexed)
            df = pd.read_excel(path, sheet_name='Order Level', skiprows=1)
            # Filter out row if Order ID is not numeric
            df_clean = df[df['Order ID'].notnull()]
            df_clean = df_clean[df_clean['Order ID'].astype(str).str.isdigit()]
            dates = pd.to_datetime(df_clean['Order Date'], errors='coerce')
            min_date = dates.min()
            max_date = dates.max()
            row_count = len(df_clean)
            summary.append({
                "channel": "Swiggy",
                "file": file,
                "rows": row_count,
                "min_date": str(min_date),
                "max_date": str(max_date)
            })
        except Exception as e:
            summary.append({
                "channel": "Swiggy",
                "file": file,
                "error": str(e)
            })
    return summary

if __name__ == "__main__":
    c_sum = summarize_counter()
    z_sum = summarize_zomato()
    s_sum = summarize_swiggy()
    
    with open("file_summary_output.txt", "w", encoding="utf-8") as f:
        f.write("COUNTER FILES:\n")
        for s in c_sum:
            f.write(f"File: {s.get('file')}, Rows: {s.get('rows')}, Dates: {s.get('min_date')} to {s.get('max_date')}, Error: {s.get('error')}\n")
            
        f.write("\nZOMATO FILES:\n")
        for s in z_sum:
            f.write(f"File: {s.get('file')}, Rows: {s.get('rows')}, Dates: {s.get('min_date')} to {s.get('max_date')}, Error: {s.get('error')}\n")
            
        f.write("\nSWIGGY FILES:\n")
        for s in s_sum:
            f.write(f"File: {s.get('file')}, Rows: {s.get('rows')}, Dates: {s.get('min_date')} to {s.get('max_date')}, Error: {s.get('error')}\n")
            
    print("Done! Summary written to file_summary_output.txt")
