import os
import pandas as pd

def find_header_and_read(path, sheet_name, keywords):
    df = pd.read_excel(path, sheet_name=sheet_name, header=None)
    for idx, row in df.iterrows():
        row_str = [str(val).strip() for val in row.tolist() if pd.notnull(val)]
        if all(any(kw in val for val in row_str) for kw in keywords):
            return pd.read_excel(path, sheet_name=sheet_name, header=idx)
    raise ValueError(f"Could not find header row with keywords {keywords}")

def inspect():
    base_dir = r"C:\Users\BCS_Support\Documents\Admin\Philos\2026-Jan-Jun"
    
    print("--- COUNTER MONTH DISTRIBUTION ---")
    counter_dir = os.path.join(base_dir, "Counter-Jan-Jun-2026")
    for f in sorted(os.listdir(counter_dir)):
        if f.endswith('.xlsx'):
            path = os.path.join(counter_dir, f)
            try:
                df = find_header_and_read(path, 'Sheet1', ['Order No.', 'Items', 'Grand Total'])
                dates = pd.to_datetime(df['Created'], errors='coerce')
                months = dates.dt.to_period('M').value_counts()
                print(f"File {f}: size={os.path.getsize(path)}")
                for month, count in months.items():
                    print(f"  {month}: {count} rows")
            except Exception as e:
                print(f"  Error {f}: {e}")

    print("\n--- ZOMATO MONTH DISTRIBUTION ---")
    zomato_dir = os.path.join(base_dir, "Zomato-Jan-Jun-2026")
    for f in sorted(os.listdir(zomato_dir)):
        if f.endswith('.xlsx'):
            path = os.path.join(zomato_dir, f)
            try:
                df = find_header_and_read(path, 'Order Level', ['Order ID', 'Order Date', 'Res. name'])
                dates = pd.to_datetime(df['Order Date'], errors='coerce')
                months = dates.dt.to_period('M').value_counts()
                print(f"File {f}: size={os.path.getsize(path)}")
                for month, count in months.items():
                    print(f"  {month}: {count} rows")
            except Exception as e:
                print(f"  Error {f}: {e}")

    print("\n--- SWIGGY MONTH DISTRIBUTION ---")
    swiggy_dir = os.path.join(base_dir, "Swiggy")
    all_swiggy_months = {}
    for f in sorted(os.listdir(swiggy_dir)):
        if f.endswith('.xlsx'):
            path = os.path.join(swiggy_dir, f)
            try:
                df = find_header_and_read(path, 'Order Level', ['Order ID', 'Order Date', 'Order Status'])
                dates = pd.to_datetime(df['Order Date'], errors='coerce')
                months = dates.dt.to_period('M').value_counts()
                for month, count in months.items():
                    all_swiggy_months[month] = all_swiggy_months.get(month, 0) + count
            except Exception as e:
                print(f"  Error {f}: {e}")
    print("Swiggy Total Payouts by Month:")
    for month, count in sorted(all_swiggy_months.items()):
        print(f"  {month}: {count} rows")

if __name__ == "__main__":
    inspect()
