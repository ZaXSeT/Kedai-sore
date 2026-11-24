import { error } from '@sveltejs/kit';
import { dev } from '$app/env';
import { db } from '#lib/server/db.ts';
import { listProducts } from '#lib/server/orders.ts';
import type { PageServerLoad } from './$types';

// Kanvas 1200×630 untuk membuat static/og.jpg (lihat README). Hanya tersedia saat dev.
export const load: PageServerLoad = async () => {
	if (!dev) error(404, 'Tidak ditemukan');
	return { products: await listProducts(db()) };
};
