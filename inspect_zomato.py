import os
import pandas as pd

def inspect_zomato_details():
    file_path = r"C:\Users\BCS_Support\Documents\Admin\Philos\2026-Jan-Jun\Zomato-Jan-Jun-2026\Philos-KKND-Zomato-01.xlsx"
    df = pd.read_excel(file_path, sheet_name='Order Level', nrows=20)
    print("Row inspection:")
    for i, row in df.iterrows():
        non_null = {f"Col_{idx}": v for idx, v in enumerate(row.tolist()) if pd.notnull(v)}
        print(f"Row {i}: {non_null}")

if __name__ == "__main__":
    inspect_zomato_details()
