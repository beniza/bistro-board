import os
import pandas as pd

def find_header_and_read(path, sheet_name, keywords):
    # Read the excel file with no header to inspect rows
    df = pd.read_excel(path, sheet_name=sheet_name, header=None)
    for idx, row in df.iterrows():
        row_str = [str(val).strip() for val in row.tolist() if pd.notnull(val)]
        # Check if all keywords are present in the row
        if all(any(kw in val for val in row_str) for kw in keywords):
            print(f"File {os.path.basename(path)}: Found header at row {idx}")
            # Re-read with this row as header
            df_actual = pd.read_excel(path, sheet_name=sheet_name, header=idx)
            return df_actual, idx
    raise ValueError(f"Could not find header row with keywords {keywords}")

def inspect_all():
    base_dir = r"C:\Users\BCS_Support\Documents\Admin\Philos\2026-Jan-Jun"
    
    print("\n--- COUNTER FILES ---")
    counter_dir = os.path.join(base_dir, "Counter-Jan-Jun-2026")
    for f in sorted(os.listdir(counter_dir)):
        if f.endswith('.xlsx'):
            path = os.path.join(counter_dir, f)
            try:
                df, idx = find_header_and_read(path, 'Sheet1', ['Order No.', 'Items', 'Grand Total'])
                print(f"  {f}: shape={df.shape}, cols={df.columns.tolist()[:5]}")
                # Get date range
                dates = pd.to_datetime(df['Created'], errors='coerce')
                print(f"  Dates: {dates.min()} to {dates.max()}")
            except Exception as e:
                print(f"  Error {f}: {e}")

    print("\n--- ZOMATO FILES ---")
    zomato_dir = os.path.join(base_dir, "Zomato-Jan-Jun-2026")
    for f in sorted(os.listdir(zomato_dir)):
        if f.endswith('.xlsx'):
            path = os.path.join(zomato_dir, f)
            try:
                df, idx = find_header_and_read(path, 'Order Level', ['Order ID', 'Order Date', 'Res. name'])
                print(f"  {f}: shape={df.shape}, cols={df.columns.tolist()[:5]}")
                dates = pd.to_datetime(df['Order Date'], errors='coerce')
                print(f"  Dates: {dates.min()} to {dates.max()}")
            except Exception as e:
                print(f"  Error {f}: {e}")

    print("\n--- SWIGGY FILES ---")
    swiggy_dir = os.path.join(base_dir, "Swiggy")
    for f in sorted(os.listdir(swiggy_dir))[:5]:  # print first 5 files
        if f.endswith('.xlsx'):
            path = os.path.join(swiggy_dir, f)
            try:
                df, idx = find_header_and_read(path, 'Order Level', ['Order ID', 'Order Date', 'Order Status'])
                print(f"  {f}: shape={df.shape}, cols={df.columns.tolist()[:5]}")
                dates = pd.to_datetime(df['Order Date'], errors='coerce')
                print(f"  Dates: {dates.min()} to {dates.max()}")
            except Exception as e:
                print(f"  Error {f}: {e}")

if __name__ == "__main__":
    inspect_all()
