import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../src/lib/server/db/schema.js';
import path from 'path';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.resolve(__dirname, '../.env') });

const SQLITE_DB_PATH = path.resolve(__dirname, '../../philos_sales.db');

if (!process.env.DATABASE_URL) {
	throw new Error('DATABASE_URL is not set in .env');
}

const client = neon(process.env.DATABASE_URL);
const db = drizzle(client, { schema });
async function main() {
	console.log('Connecting to SQLite database at:', SQLITE_DB_PATH);
	const sqlite = new Database(SQLITE_DB_PATH);

	try {
		console.log('Fetching orders from SQLite...');
		const orders = sqlite.prepare('SELECT * FROM orders').all();
		console.log(`Found ${orders.length} orders. Migrating...`);

		// Insert in chunks to avoid blowing up the Neon connection
		const chunkSize = 500;
		for (let i = 0; i < orders.length; i += chunkSize) {
			const chunk = orders.slice(i, i + chunkSize).map(row => ({
				order_id: row.order_id,
				channel: row.channel,
				original_order_id: row.original_order_id,
				order_date: new Date(row.order_date),
				status: row.status,
				subtotal: row.subtotal,
				packaging_charge: row.packaging_charge,
				delivery_charge: row.delivery_charge,
				discount: row.discount,
				tax: row.tax,
				grand_total: row.grand_total,
				commission: row.commission,
				other_charges: row.other_charges,
				net_payout: row.net_payout,
				items_summary: row.items_summary,
				customer_name: row.customer_name,
				customer_phone: row.customer_phone,
				order_type: row.order_type,
				sub_order_type: row.sub_order_type
			}));
			await db.insert(schema.orders).values(chunk).onConflictDoNothing();
			console.log(`Migrated orders: ${Math.min(i + chunkSize, orders.length)} / ${orders.length}`);
		}

		console.log('Fetching order_payments from SQLite...');
		const payments = sqlite.prepare('SELECT * FROM order_payments').all();
		console.log(`Found ${payments.length} order_payments. Migrating...`);
		for (let i = 0; i < payments.length; i += chunkSize) {
			const chunk = payments.slice(i, i + chunkSize).map(row => ({
				payment_id: row.payment_id,
				order_id: row.order_id,
				payment_type: row.payment_type,
				amount: row.amount
			}));
			await db.insert(schema.order_payments).values(chunk).onConflictDoNothing();
			console.log(`Migrated order_payments: ${Math.min(i + chunkSize, payments.length)} / ${payments.length}`);
		}

		console.log('Fetching expenses from SQLite...');
		const expensesData = sqlite.prepare('SELECT * FROM expenses').all();
		console.log(`Found ${expensesData.length} expenses. Migrating...`);
		for (let i = 0; i < expensesData.length; i += chunkSize) {
			const chunk = expensesData.slice(i, i + chunkSize).map(row => ({
				id: row.id,
				year: row.year,
				month: row.month,
				expense_id: row.expense_id,
				date: row.date,
				category: row.category,
				description: row.description,
				amount: row.amount,
				paid: row.paid,
				mode: row.mode,
				payment_date: row.payment_date,
				rating: row.rating,
				vendor_category: row.vendor_category,
				remarks: row.remarks
			}));
			await db.insert(schema.expenses).values(chunk).onConflictDoNothing();
			console.log(`Migrated expenses: ${Math.min(i + chunkSize, expensesData.length)} / ${expensesData.length}`);
		}

		console.log('Fetching income_register from SQLite...');
		const incomeData = sqlite.prepare('SELECT * FROM income_register').all();
		console.log(`Found ${incomeData.length} income_register rows. Migrating...`);
		for (let i = 0; i < incomeData.length; i += chunkSize) {
			const chunk = incomeData.slice(i, i + chunkSize).map(row => ({
				sl: row.sl,
				month: row.month,
				date: row.date,
				day: row.day,
				week_number: row.week_number,
				petpooja_actual: row.petpooja_actual,
				gst_5pct: row.gst_5pct,
				petpooja_net: row.petpooja_net,
				swiggy_gross: row.swiggy_gross,
				swiggy_payout: row.swiggy_payout,
				paper_bill: row.paper_bill,
				zomato_gross: row.zomato_gross,
				zomato_payout: row.zomato_payout,
				total_income: row.total_income,
				fed_bank: row.fed_bank,
				yes_bank: row.yes_bank,
				cash: row.cash
			}));
			await db.insert(schema.income_register).values(chunk).onConflictDoNothing();
			console.log(`Migrated income_register: ${Math.min(i + chunkSize, incomeData.length)} / ${incomeData.length}`);
		}

		console.log('Migration completed successfully!');
	} catch (error) {
		console.error('Error during migration:', error);
	} finally {
		sqlite.close();
		process.exit(0);
	}
}

main();
