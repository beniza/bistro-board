import sqlite3
import import_sales


def test_double_import_is_idempotent():
    conn = import_sales.get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM orders")
    orders_before_any_run = cursor.fetchone()[0]
    conn.close()

    first_result = import_sales.import_all()

    conn = import_sales.get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM orders")
    orders_after_first_run = cursor.fetchone()[0]
    conn.close()

    second_result = import_sales.import_all()

    conn = import_sales.get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM orders")
    orders_after_second_run = cursor.fetchone()[0]
    conn.close()

    # Row count must not change between the two runs: no double-counting.
    assert orders_after_first_run == orders_after_second_run, (
        f"orders table grew on re-import: {orders_after_first_run} -> {orders_after_second_run}"
    )

    # Second run must not report any brand-new orders (every file was already imported).
    assert second_result["orders_new"] == 0, (
        f"Expected 0 new orders on second run, got {second_result['orders_new']}"
    )

    # Second run must either skip every file (hash match) or classify every order as a duplicate.
    total_orders_seen_second_run = second_result["orders_new"] + second_result["orders_duplicate"]
    assert (
        second_result["files_skipped"] > 0
        or total_orders_seen_second_run == second_result["orders_inserted"]
    ), "Second run neither skipped files nor classified all orders as duplicates"

    print(
        f"PASS: test_double_import_is_idempotent "
        f"(before={orders_before_any_run}, after_run1={orders_after_first_run}, "
        f"after_run2={orders_after_second_run}, run2={second_result})"
    )


if __name__ == "__main__":
    test_double_import_is_idempotent()
