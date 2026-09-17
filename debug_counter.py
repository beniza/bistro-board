import pandas as pd
import sys

def sanitize(val):
    return str(val).replace('\u20b9', 'INR')

def inspect_kknd_01():
    path = r"C:\Users\BCS_Support\Documents\Admin\Philos\2026-Jan-Jun\Counter-Jan-Jun-2026\Philos-KKND-01.xlsx"
    df = pd.read_excel(path, sheet_name='Sheet1', header=4)
    
    with open("debug_counter_output.txt", "w", encoding="utf-8") as f:
        f.write(f"Shape: {df.shape}\n")
        f.write(f"Columns: {[sanitize(col) for col in df.columns.tolist()]}\n")
        f.write(f"Null values in 'Created': {df['Created'].isnull().sum()}\n")
        
        # Check what unique types/values are in 'Created'
        created_vals = df['Created'].dropna()
        f.write(f"Types in Created column:\n{created_vals.apply(type).value_counts().to_string()}\n")
        
        # Print some non-string values or sample of created
        f.write("\nSample of 'Created' column:\n")
        f.write(created_vals.head(50).to_string() + "\n")
        
        # Convert created to datetime with format, let's see how many parse successfully
        parsed = pd.to_datetime(df['Created'], errors='coerce')
        f.write(f"\nParsed successfully: {parsed.notnull().sum()}\n")
        f.write(f"Failed to parse count: {df['Created'].notnull().sum() - parsed.notnull().sum()}\n")
        if (df['Created'].notnull().sum() - parsed.notnull().sum()) > 0:
            f.write("Sample of failed parses:\n")
            f.write(df['Created'][parsed.isnull() & df['Created'].notnull()].head(20).to_string() + "\n")

        # Let's inspect rows where 'Created' is not null but failed or succeeded, and what values are there
        # Let's look at the distribution of values in 'Order No.' to see if there are totals, part payments, etc.
        f.write("\nOrder No. value counts (top 20):\n")
        f.write(df['Order No.'].value_counts().head(20).to_string() + "\n")

if __name__ == "__main__":
    inspect_kknd_01()

