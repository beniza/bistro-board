import os
import pandas as pd
import sys

# Set standard output encoding to utf-8 if possible
try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

def log(msg, f=None):
    print(msg)
    if f:
        f.write(msg + "\n")

def inspect_counter(f):
    log("\n=================== INSPECTING COUNTER DATA ===================", f)
    file_path = r"C:\Users\BCS_Support\Documents\Admin\Philos\2026-Jan-Jun\Counter-Jan-Jun-2026\Philos-KKND-01.xlsx"
    df = pd.read_excel(file_path, sheet_name='Sheet1', nrows=50)
    for i, row in df.iterrows():
        non_null = {k: str(v) for k, v in row.to_dict().items() if pd.notnull(v)}
        log(f"Row {i}: {non_null}", f)

def inspect_swiggy_order_level(f):
    log("\n=================== INSPECTING SWIGGY ORDER LEVEL ===================", f)
    file_path = r"C:\Users\BCS_Support\Documents\Admin\Philos\2026-Jan-Jun\Swiggy\Annexure_1076417_02042026_1775125500235.xlsx"
    xl = pd.ExcelFile(file_path)
    df = xl.parse('Order Level', nrows=10)
    log(f"Columns: {df.columns.tolist()}", f)
    log("\nFirst 5 rows:", f)
    for i, row in df.head(5).iterrows():
        non_null = {k: str(v) for k, v in row.to_dict().items() if pd.notnull(v)}
        log(f"Row {i}: {non_null}", f)

def inspect_zomato_order_level(f):
    log("\n=================== INSPECTING ZOMATO ORDER LEVEL ===================", f)
    file_path = r"C:\Users\BCS_Support\Documents\Admin\Philos\2026-Jan-Jun\Zomato-Jan-Jun-2026\Philos-KKND-Zomato-01.xlsx"
    xl = pd.ExcelFile(file_path)
    df = xl.parse('Order Level', nrows=10)
    log(f"Columns: {df.columns.tolist()}", f)
    log("\nFirst 5 rows:", f)
    for i, row in df.head(5).iterrows():
        non_null = {k: str(v) for k, v in row.to_dict().items() if pd.notnull(v)}
        log(f"Row {i}: {non_null}", f)

if __name__ == "__main__":
    with open("inspection_output.txt", "w", encoding="utf-8") as f:
        inspect_counter(f)
        inspect_swiggy_order_level(f)
        inspect_zomato_order_level(f)

