/**
 * Akses pemilik: tandai produk tersedia atau habis.
 *   npm run stok                              → daftar produk dan statusnya
 *   npm run stok -- roti-gula-aren habis
 *   npm run stok -- roti-gula-aren tersedia
 */
import postgres from 'postgres';
import { databaseUrl } from './lib/env';
import { listProducts, setAvailability } from '../src/lib/server/orders';
import { rupiah } from '../src/lib/menu';

const [id, status] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const sql = postgres(databaseUrl(), { max: 1, prepare: false, onnotice: () => {} });
try {
	if (id) {
		if (status !== 'habis' && status !== 'tersedia') {
			console.error('Status harus "habis" atau "tersedia".');
			process.exitCode = 1;
		} else {
			const [row] = await setAvailability(sql, id, status === 'tersedia');
			console.log(row ? `${row.name}: ${row.available ? 'tersedia' : 'habis'}` : `Produk "${id}" tidak ada.`);
		}
	}
	for (const p of await listProducts(sql)) {
		console.log(`${p.available ? '  tersedia' : '  HABIS   '}  ${p.id.padEnd(18)} ${p.name.padEnd(22)} ${rupiah(p.price_idr)}`);
	}
} finally {
	await sql.end();
}
