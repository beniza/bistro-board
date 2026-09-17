import os
import sqlite3
import tempfile
import import_sales


def test_schema_and_helpers():
    fd, tmp_path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    os.remove(tmp_path)  # let sqlite create it fresh

    original_db_path = import_sales.DB_PATH
    import_sales.DB_PATH = tmp_path
    try:
        import_sales.init_db()

        conn = import_sales.get_db_connection()
        cursor = conn.cursor()

        # Table exists with expected columns
        cursor.execute("PRAGMA table_info(import_log)")
        columns = {row[1] for row in cursor.fetchall()}
        expected = {"id", "file_path", "file_hash", "channel", "imported_at",
                    "orders_new", "orders_duplicate", "status", "message"}
        assert expected.issubset(columns), f"Missing columns: {expected - columns}"

        # hash_file is deterministic
        sample_file = __file__  # this test file itself, always exists
        h1 = import_sales.hash_file(sample_file)
        h2 = import_sales.hash_file(sample_file)
        assert h1 == h2, "hash_file should be deterministic for the same file"
        assert len(h1) == 64, "sha256 hex digest should be 64 chars"

        # Not imported yet
        assert import_sales.is_already_imported(cursor, h1) is False

        # After logging a 'success' row, it should be considered already imported
        import_sales.log_import(cursor, "fake/path.xlsx", h1, "Counter", 5, 2, "success")
        conn.commit()
        assert import_sales.is_already_imported(cursor, h1) is True

        # A 'skipped' status row for a different hash should NOT count as already imported
        import_sales.log_import(cursor, "fake/other.xlsx", "deadbeef", "Counter", 0, 0, "skipped")
        conn.commit()
        assert import_sales.is_already_imported(cursor, "deadbeef") is False

        conn.close()
        print("PASS: test_schema_and_helpers")
    finally:
        import_sales.DB_PATH = original_db_path
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


if __name__ == "__main__":
    test_schema_and_helpers()
