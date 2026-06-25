import { db } from '$lib/server/db';
import { orders } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';

export const load = async () => {
	// Fetch the 50 most recent orders for the UI
	const recentOrders = await db.select()
		.from(orders)
		.orderBy(desc(orders.order_date))
		.limit(50);

	return {
		orders: recentOrders
	};
};
