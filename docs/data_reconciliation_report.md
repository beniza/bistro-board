# 🔍 Sales Data Reconciliation Report: App Reports vs. Manual Register

**Prepared for:** Owner, Philos Kakkanad  
**Author:** Business Analyst  
**Date:** June 24, 2026  
**Reconciliation Period:** January 1, 2026 – May 31, 2026 (5-Month Overlap)  
**Database Reference:** [philos_sales.db](file:///C:/Users/BCS_Support/Documents/Admin/Philos/philos_sales.db)

---

## 1. Executive Summary

A detailed comparative audit was performed between the **Raw App Reports** (extracted directly from Swiggy, Zomato, and POS transaction files) and the **Manual Business Register** (recorded in your Kakkanad Business Register ledger). 

We discovered that your business register under-reports your true net cash profits by **INR 333,837.94** across this 5-month period. This discrepancy occurs because the manual register applies conservative "standard deductions" (25% for Swiggy/Zomato and 5% for Counter sales) when logging income, whereas the actual bank payouts received are significantly higher.

---

## 2. Channel-by-Channel Reconciliation

### 🍔 Swiggy Delivery Channel
* **Standard Deduction Assumption in Ledger:** **25.0%** (payout recorded as 75.0% of estimated sales).
* **Actual Platform Deduction (App Reports):** **19.56%** (net bank payout is **80.44%** of gross sales).
* **Reconciliation Table (Jan - May 2026):**

| Month | App Report Gross | Ledger Sales | Variance (Gross) | App Report Payout | Ledger Payout * | Variance (Bank Payout) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Jan 2026** | INR 243,038.92 | INR 172,221.00 | +INR 70,817.92 | INR 196,820.66 | INR 0.00 | **+INR 196,820.66** |
| **Feb 2026** | INR 211,227.06 | INR 150,526.00 | +INR 60,701.06 | INR 171,042.11 | INR 0.00 | **+INR 171,042.11** |
| **Mar 2026** | INR 283,926.91 | INR 202,798.00 | +INR 81,128.91 | INR 229,709.54 | INR 0.00 | **+INR 229,709.54** |
| **Apr 2026** | INR 247,367.99 | INR 176,685.00 | +INR 70,682.99 | INR 197,606.99 | INR 0.00 | **+INR 197,606.99** |
| **May 2026** | INR 292,311.88 | INR 207,565.00 | +INR 84,746.88 | INR 232,744.89 | INR 0.00 | **+INR 232,744.89** |
| **Total** | **INR 1,277,872.76** | **INR 909,795.00** | **+INR 368,077.76** | **INR 1,027,924.19** | **INR 0.00** | **+INR 1,027,924.19** |

*Note: Swiggy and Zomato payouts are not recorded on daily rows in the manual ledger (entered as blank/NaN), leading to a ₹0 ledger payout entry in daily tracking.*

* **Key Finding:** Swiggy's actual contract rates and fees are much better than assumed. By recording only your estimated sales column (₹909,795) instead of the actual bank payouts received (₹1,027,924.19), your cash receipts are under-reported by **INR 118,129.19** for Swiggy.

---

### 🍅 Zomato Delivery Channel
* **Standard Deduction Assumption in Ledger:** **25.0%** (payout recorded as 75.0% of estimated sales).
* **Actual Platform Deduction (App Reports):** **22.85%** (net bank payout is **77.15%** of gross sales).
* **Reconciliation Table (Jan - May 2026):**

| Month | App Report Gross | Ledger Sales | Variance (Gross) | App Report Payout | Ledger Payout | Variance (Bank Payout) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Jan 2026** | INR 158,635.80 | INR 112,813.00 | +INR 45,822.80 | INR 122,554.81 | INR 0.00 | **+INR 122,554.81** |
| **Feb 2026** | INR 175,702.32 | INR 125,180.00 | +INR 50,522.32 | INR 135,710.12 | INR 0.00 | **+INR 135,710.12** |
| **Mar 2026** | INR 222,077.10 | INR 158,621.00 | +INR 63,456.10 | INR 171,528.80 | INR 0.00 | **+INR 171,528.80** |
| **Apr 2026** | INR 202,945.19 | INR 144,435.00 | +INR 58,510.19 | INR 156,944.85 | INR 0.00 | **+INR 156,944.85** |
| **May 2026** | INR 262,608.79 | INR 185,085.00 | +INR 77,523.79 | INR 201,667.32 | INR 0.00 | **+INR 201,667.32** |
| **Total** | **INR 1,021,969.20** | **INR 726,134.00** | **+INR 295,835.20** | **INR 788,405.90** | **INR 0.00** | **+INR 788,405.90** |

* **Key Finding:** Zomato platform fees and deductions total 22.85% (excluding tax adjustments), which is slightly higher than Swiggy but still lower than your 25% assumption. Comparing your estimated register sales (₹726,134.00) vs. actual bank payout (₹788,405.90) reveals an under-reported cash receipt of **INR 62,271.90**.

---

### 🏪 Counter Sales (Dine-in / Direct Pickups)
* **Standard Deduction Assumption in Ledger:** **5.0%** (ledger net column `Petpooja` is recorded as exactly 95.0% of POS gross).
* **Actual Retention (App Reports):** **100.0%** (zero platform fees or deductions are paid on direct in-store orders).
* **Reconciliation Table (Jan - May 2026):**

| Month | App Report Gross | Ledger Gross | Variance (Gross) | App Report Payout | Ledger Net (`Petpooja`) | Variance (Net Payout) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Jan 2026** | INR 601,583.00 | INR 600,601.00 | +INR 982.00 | INR 601,583.00 | INR 570,570.95 | **+INR 31,012.05** |
| **Feb 2026** | INR 513,016.00 | INR 513,829.00 | -INR 813.00 | INR 513,016.00 | INR 488,137.55 | **+INR 24,878.45** |
| **Mar 2026** | INR 568,883.00 | INR 564,918.00 | +INR 3,965.00 | INR 568,883.00 | INR 536,672.10 | **+INR 32,210.90** |
| **Apr 2026** | INR 615,760.00 | INR 616,190.00 | -INR 430.00 | INR 615,760.00 | INR 585,380.50 | **+INR 30,379.50** |
| **May 2026** | INR 685,477.00 | INR 684,759.00 | +INR 718.00 | INR 685,477.00 | INR 650,521.05 | **+INR 34,955.95** |
| **Total** | **INR 2,984,719.00** | **INR 2,980,297.00** | **+INR 4,422.00** | **INR 2,984,719.00** | **INR 2,831,282.15** | **+INR 153,436.85** |

* **Key Finding:** Your daily gross sales recorded in the POS match your manual register's `Petpooja Actual` column with near-perfect accuracy (99.85% correlation). However, your ledger net column `Petpooja` automatically deducts 5%. Since Counter sales retain 100% of revenue, you actually received **INR 153,436.85 MORE** cash in hand than what is recorded on the net side of the register.

---

## 3. Cumulative Summary & Profit Variance

When we aggregate all channels for the 5-month period (January - May 2026):

| Channel | Actual App Bank Payout | Ledger Recorded Net | Variance (True Gain) | Actual Payout Ratio | Ledger Payout Ratio |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Counter Sale** | INR 2,984,719.00 | INR 2,831,282.15 | **+INR 153,436.85** | 100.0% | 95.0% |
| **Swiggy** | INR 1,027,924.19 | INR 909,795.00 * | **+INR 118,129.19** | 80.4% | 71.2% * |
| **Zomato** | INR 788,405.90 | INR 726,134.00 * | **+INR 62,271.90** | 77.1% | 71.1% * |
| **Total** | **INR 4,801,049.09** | **INR 4,467,211.15** | **+INR 333,837.94** | **91.0%** | **84.6%** |

*\*Note: The ledger columns `Swiggy` and `Zomato` are treated as net estimates because no daily payouts were recorded.*

### 💡 High-Value Strategic Insights

1. **You Are ₹3.33 Lakhs Richer Than You Think:**  
   Your true cash position is **INR 333,837.94 higher** than your business register totals across these 5 months. Your net profits are higher by this exact amount, raising your margins.
2. **The 25% Delivery Deduction Myth:**  
   While Swiggy and Zomato advertise high commission rates, your blended actual deduction (including packaging and delivery fees collected from customers) is only **19.6% for Swiggy** and **22.9% for Zomato** (averaging a combined **21.0%** leakage). You are keeping 4% more on every online transaction than assumed.
3. **The 5% Counter Deduction is Lost Cash in Books:**  
   Your register penalizes Counter sales by 5%. Since in-store sales require no platform fees, this 5% discount on the net column is hiding **₹1.53 Lakhs** of actual cash revenue that you retained.

---

## 4. Recommendations for Your Register Bookkeeping

1. **Stop Applying standard Deductions to Sales Columns:**  
   Record the **actual gross POS sales** for Counter, Swiggy, and Zomato in their respective gross columns.
2. **Log Weekly/Monthly Bank Payouts Directly:**  
   Instead of leaving the `Swiggy Payout` and `Zomato Payout` columns blank, reconcile them weekly when you receive the bank payout summary emails. Log the actual bank credits directly in those columns.
3. **Link Your Dashboard to Reconcile Automatically:**  
   Our live sales dashboard at **[http://127.0.0.1:8000](http://127.0.0.1:8000)** uses the actual database tables to show the true numbers. Recommending using the dashboard's "Platform Economics" tab as the source of truth for monthly tax filings and performance reviews.
