import pandas as pd

def test_parse():
    path = r"C:\Users\BCS_Support\Documents\Admin\Philos\2026-Jan-Jun\Counter-Jan-Jun-2026\Philos-KKND-01.xlsx"
    df = pd.read_excel(path, sheet_name='Sheet1', header=4)
    val = df['Created'].iloc[500]
    print(f"Value at index 500: {repr(val)}, type: {type(val)}")
    try:
        parsed = pd.to_datetime(val)
        print("Direct parsed:", parsed)
    except Exception as e:
        print("Direct parse error:", e)
        
    # Let's try parsing the series and see if it fails at a specific format or something
    # What does pd.to_datetime(df['Created']) do if we don't coerce?
    try:
        pd.to_datetime(df['Created'])
        print("Series parsed successfully without coercion!")
    except Exception as e:
        print("Series parse error without coercion:", e)

if __name__ == "__main__":
    test_parse()
