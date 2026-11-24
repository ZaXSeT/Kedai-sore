/** npm run db:seed — mengisi katalog menu contoh. Aman dijalankan ulang. */
import postgres from 'postgres';
import { databaseUrl } from './lib/env';
import { seed } from './lib/seed-core';

const sql = postgres(databaseUrl(), { max: 1, prepare: false, onnotice: () => {} });
try {
	const n = await seed(sql);
	const [{ products }] = await sql<{ products: number }[]>`select count(*)::int as products from kedai.products`;
	const [{ orders }] = await sql<{ orders: number }[]>`select count(*)::int as orders from kedai.orders`;
	console.log(`Seed selesai: ${n} produk diperbarui. Total produk ${products}, pesanan tersimpan ${orders}.`);
} finally {
	await sql.end();
}
