import { db } from '$lib/server/db';
import { income_register } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';

export const load = async () => {
	// Fetch the most recent 50 ledger entries
	const ledger = await db.select()
		.from(income_register)
		.orderBy(desc(income_register.date))
		.limit(50);

	return {
		ledger
	};
};
