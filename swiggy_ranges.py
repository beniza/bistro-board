import os
import pandas as pd

def find_header_and_read(path, sheet_name, keywords):
    df = pd.read_excel(path, sheet_name=sheet_name, header=None)
    for idx, row in df.iterrows():
        row_str = [str(val).strip() for val in row.tolist() if pd.notnull(val)]
        if all(any(kw in val for val in row_str) for kw in keywords):
            return pd.read_excel(path, sheet_name=sheet_name, header=idx)
    raise ValueError(f"Could not find header row with keywords {keywords}")

def check_swiggy():
    swiggy_dir = r"2026-Jan-Jun\Swiggy"
    files = sorted([f for f in os.listdir(swiggy_dir) if f.endswith('.xlsx')])
    print(f"Total Swiggy files: {len(files)}")
    for f in files:
        path = os.path.join(swiggy_dir, f)
        try:
            df = find_header_and_read(path, 'Order Level', ['Order ID', 'Order Date', 'Order Status'])
            df_clean = df[df['Order ID'].notnull()]
            df_clean = df_clean[df_clean['Order ID'].astype(str).str.isdigit()]
            dates = pd.to_datetime(df_clean['Order Date'], errors='coerce')
            print(f"File {f}: rows={len(df_clean)}, dates: {dates.min()} to {dates.max()}")
        except Exception as e:
            print(f"File {f}: Error: {e}")

if __name__ == "__main__":
    check_swiggy()
