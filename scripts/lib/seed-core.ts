import type { Sql } from 'postgres';
import { SEED_PRODUCTS } from '../../src/lib/menu';

/**
 * Seed katalog dengan ID stabil. Aman diulang; tidak menyentuh pesanan.
 * Status tersedia/habis hanya diisi saat produk pertama kali dibuat, supaya
 * perubahan stok oleh pemilik (npm run stok) tidak tertimpa oleh seed ulang.
 */
export async function seed(sql: Sql): Promise<number> {
	await sql.begin(async (tx) => {
		for (const p of SEED_PRODUCTS) {
			await tx`
				insert into kedai.products (id, category, name, description, price_idr, image, available, sort_order)
				values (${p.id}, ${p.category}, ${p.name}, ${p.description}, ${p.price_idr}, ${p.image}, ${p.available}, ${p.sort_order})
				on conflict (id) do update set
					category = excluded.category,
					name = excluded.name,
					description = excluded.description,
					price_idr = excluded.price_idr,
					image = excluded.image,
					sort_order = excluded.sort_order`;
		}
	});
	return SEED_PRODUCTS.length;
}

/** Mengembalikan status contoh (termasuk satu produk habis). Dipakai tes. */
export async function resetAvailability(sql: Sql) {
	for (const p of SEED_PRODUCTS) {
		await sql`update kedai.products set available = ${p.available}, price_idr = ${p.price_idr} where id = ${p.id}`;
	}
}
