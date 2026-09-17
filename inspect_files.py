import os
import pandas as pd

def inspect_folder(folder_path, name):
    print(f"\n=================== {name} FOLDER ===================")
    if not os.path.exists(folder_path):
        print(f"Directory {folder_path} does not exist.")
        return
    
    files = [f for f in os.listdir(folder_path) if f.endswith('.xlsx')]
    print(f"Found {len(files)} Excel files in {folder_path}.")
    if not files:
        return
    
    # Let's inspect the first file
    sample_file = os.path.join(folder_path, files[0])
    print(f"\nInspecting sample file: {files[0]}")
    try:
        xl = pd.ExcelFile(sample_file)
        print(f"Sheet names: {xl.sheet_names}")
        
        for sheet in xl.sheet_names[:2]:  # inspect first 2 sheets at most
            print(f"\n--- Sheet: {sheet} ---")
            df = xl.parse(sheet, nrows=5)
            print("Columns:")
            print(df.columns.tolist())
            print("\nFirst 3 rows:")
            print(df.head(3).to_string())
            
            # Print full info summary
            df_full = xl.parse(sheet)
            print(f"Total shape: {df_full.shape}")
    except Exception as e:
        print(f"Error reading {files[0]}: {e}")

if __name__ == "__main__":
    base_dir = r"C:\Users\BCS_Support\Documents\Admin\Philos\2026-Jan-Jun"
    inspect_folder(os.path.join(base_dir, "Counter-Jan-Jun-2026"), "Counter")
    inspect_folder(os.path.join(base_dir, "Swiggy"), "Swiggy")
    inspect_folder(os.path.join(base_dir, "Zomato-Jan-Jun-2026"), "Zomato")
