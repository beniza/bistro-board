import { pgTable, serial, integer, text, real, timestamp } from 'drizzle-orm/pg-core';

export const orders = pgTable('orders', {
	order_id: text('order_id').primaryKey(),
	channel: text('channel').notNull(),
	original_order_id: text('original_order_id').notNull(),
	order_date: timestamp('order_date').notNull(),
	status: text('status'),
	subtotal: real('subtotal').default(0.0),
	packaging_charge: real('packaging_charge').default(0.0),
	delivery_charge: real('delivery_charge').default(0.0),
	discount: real('discount').default(0.0),
	tax: real('tax').default(0.0),
	grand_total: real('grand_total').default(0.0),
	commission: real('commission').default(0.0),
	other_charges: real('other_charges').default(0.0),
	net_payout: real('net_payout').default(0.0),
	items_summary: text('items_summary'),
	customer_name: text('customer_name'),
	customer_phone: text('customer_phone'),
	order_type: text('order_type'),
	sub_order_type: text('sub_order_type')
});

export const order_payments = pgTable('order_payments', {
	payment_id: serial('payment_id').primaryKey(),
	order_id: text('order_id').notNull().references(() => orders.order_id, { onDelete: 'cascade' }),
	payment_type: text('payment_type').notNull(),
	amount: real('amount').notNull()
});

export const expenses = pgTable('expenses', {
	id: serial('id').primaryKey(),
	year: integer('year'),
	month: text('month'),
	expense_id: integer('expense_id'),
	date: text('date'), // Storing as string based on Python script
	category: text('category'),
	description: text('description'),
	amount: real('amount'),
	paid: text('paid'),
	mode: text('mode'),
	payment_date: text('payment_date'),
	rating: integer('rating'),
	vendor_category: text('vendor_category'),
	remarks: text('remarks')
});

export const income_register = pgTable('income_register', {
	sl: integer('sl').primaryKey(),
	month: text('month'),
	date: text('date'),
	day: text('day'),
	week_number: integer('week_number'),
	petpooja_actual: real('petpooja_actual'),
	gst_5pct: real('gst_5pct'),
	petpooja_net: real('petpooja_net'),
	swiggy_gross: real('swiggy_gross'),
	swiggy_payout: real('swiggy_payout'),
	paper_bill: real('paper_bill'),
	zomato_gross: real('zomato_gross'),
	zomato_payout: real('zomato_payout'),
	total_income: real('total_income'),
	fed_bank: real('fed_bank'),
	yes_bank: real('yes_bank'),
	cash: real('cash')
});
