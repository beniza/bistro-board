# Sales Data Verification and Business Ledger Report

This report outlines the data verification results, theme configurations, mobile-first updates, and the implementation details for connecting the restaurant's operational Google Sheet ledger (downloaded as an Excel file) directly to the dashboard.

---

## 1. Sales Data Accuracy Verification

To verify the database against the raw Excel files, we compared the overall order counts and customer paid totals across the three selling channels (January - May 2026).

### A. Reconciled Database vs Excel Totals

| Channel | Excel Orders | DB Orders | Excel Sales (INR) | DB Sales (INR) | Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Swiggy** | 1,601 | 1,601 | 1,277,872.76 | 1,277,872.76 | **100% Match** |
| **Zomato** | 1,282 | 1,282 | 1,021,969.20 | 1,021,969.20 | **100% Match** |
| **Counter** | 2,166 | 2,166 | 3,057,416.00 | 3,057,416.00 | **100% Match** |

*Note: Initially, there was a minor discrepancy of ₹23,912 in Counter Sales because the parser calculated totals instead of reading Excel's `Grand Total (₹)` directly. This was corrected to support part-payment rows (fallback to calculation when ₹0) and manual adjustments (use value if > ₹0), resulting in a perfect match.*

---

## 2. Business Ledger Connection (Google Sheet Integration)

The user's business ledger tracker (`docs/Kakkanad Business Register.xlsx`) has been successfully integrated into the dashboard database and frontend interface under a new **Business Ledger** tab.

### A. Database Ledger Schema
We created two database tables:
1. `expenses`: Stores individual operational disbursement records (date, category, description, amount, payment status, payment mode, remarks).
2. `income_register`: Stores daily overall revenue ledger values (date, Petpooja actual, GST collected, Petpooja net-of-tax, Swiggy gross, Swiggy payout, Zomato gross, Zomato payout, total daily receipts, bank credit channels, cash box).

An automated loader script ([import_register.py](file:///C:/Users/BCS_Support/Documents/Admin/Philos/import_register.py)) cleans the values, strips Indian numeric formats (removing commas like `1,69,799`), and writes the records to the database:
* **Imported Expenses records:** 2,040 transactions (ranging from March 2025 to December 2026).
* **Imported Income records:** 478 daily entries (ranging from April 2025 to July 2026).

### B. Business Ledger Dashboard Features
The newly implemented ledger dashboard tab offers:
* **P&L KPI Metrics:** Dynamically aggregates total income, total expenses, net profit surplus/deficit, and net profit margins over the selected date range.
* **Profitability Trend Chart:** A mixed chart displaying **Total Receipts** and **Total Expenses** as grouped columns, overlaid with a **Net Position** trend line to monitor profitability curves.
* **Expense Breakdown:** A donut chart showing category disbursements (e.g., Staff Salary, Meats, Rent, Electricity) and a summary table highlighting top expense targets.
* **Receipts Mix:** A donut chart detailing counter net collection, Swiggy gross, Zomato gross, and paper bills.
* **Transactions Journal:** A paginated table where users can toggle between the **Expense Journal** and **Income Journal**, filter entries using search terms, and export views.

---

## 3. Visual & Styling Implementation (Themes & Mobile First)

The interface is built to adapt dynamically to light/dark triggers and fits mobile screens out of the box.

### A. Theme Variables Configuration
The layout utilizes the following CSS theme classes in [style.css](file:///C:/Users/BCS_Support/Documents/Admin/Philos/dashboard/static/style.css):
* **Light Mode (`body.theme-light`):** Minimalist off-white and slate styling, light borders (`#e2e8f0`), and soft pastel translucent badge icon wrappers.
* **Dark Mode (`body.theme-dark`):** Sleek deep space dark mode (`#090b11`), charcoal backgrounds (`#151b26`), and glowing dark border accents.
* **Color Mode (`body.theme-color`):** The brand's original violet neon glow style featuring gradient cards, glassmorphism (`backdrop-filter`), and vibrant violet-magenta accent glows.

### B. JavaScript Bridge and Chart Themes
The theme engine in [app.js](file:///C:/Users/BCS_Support/Documents/Admin/Philos/dashboard/static/app.js) queries CSS variables dynamically using `getComputedStyle`:
- Updates chart background grids, line stroke colors, and font colors.
- Switches chart tooltips and rendering mode between `light` and `dark`.
- Stores the user's choice in `localStorage` to persist theme preference across visits.
- On mobile devices, the header button (`#mobile-theme-btn`) cycles through the themes in sequence.

### C. Mobile Layout Optimizations
* **Slide-out Navigation Drawer:** The sidebar drawer slide transition uses smooth cubic-bezier animations, triggered by the top bar hamburger button (`#hamburger-menu-btn`) and closed via sidebar clicks, the close icon (`#close-sidebar-btn`), or tapping outside.
* **Compact KPI Layout:** KPI cards stack vertically on small screens and automatically hide secondary labels to fit compact mobile viewports.
* **Responsive Pagination:** Prev/Next text on pagination buttons collapses into icon-only controls on screens smaller than 480px.
* **Inline SVG Icons:** We completely removed dependencies on FontAwesome, replacing them with fast, custom inline SVG graphics that style themselves based on current CSS variables.
