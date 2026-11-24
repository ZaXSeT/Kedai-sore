import { db } from '#lib/server/db.ts';
import { listProducts } from '#lib/server/orders.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ setHeaders }) => {
	// Status habis bisa berubah kapan saja: menu selalu dibaca segar.
	setHeaders({ 'cache-control': 'no-store' });
	return { products: await listProducts(db()) };
};
