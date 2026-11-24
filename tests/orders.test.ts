import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { fromForm, listProducts, ownerOrders, placeOrder, setAvailability } from '../src/lib/server/orders';
import { hitRateLimit } from '../src/lib/server/rate-limit';
import { resetAvailability, seed } from '../scripts/lib/seed-core';
import { migrate } from '../scripts/lib/migrate-core';

const sql = postgres(process.env.TEST_DATABASE_URL!, { max: 4, onnotice: () => {} });

const k1Items = [
	{ productId: 'es-kopi-sore', quantity: 2 },
	{ productId: 'roti-gula-aren', quantity: 1 }
];

async function counts() {
	const [o] = await sql<{ n: number }[]>`select count(*)::int as n from kedai.orders`;
	const [i] = await sql<{ n: number }[]>`select count(*)::int as n from kedai.order_items`;
	return { orders: o.n, items: i.n };
}

beforeEach(async () => {
	await sql`truncate kedai.orders, kedai.order_items, kedai.rate_limits restart identity cascade`;
	await seed(sql);
	await resetAvailability(sql);
});

afterAll(async () => {
	await sql.end();
});

describe('K1 · 2 Es Kopi Sore + 1 Roti Gula Aren', () => {
	it('menyimpan satu pesanan berisi 3 item senilai Rp68.000', async () => {
		const res = await placeOrder(sql, { idempotencyKey: randomUUID(), nickname: 'Sinta', items: k1Items });
		expect(res.ok).toBe(true);
		if (!res.ok) return;
		expect(res.replay).toBe(false);
		expect(res.receipt).toMatchObject({ nickname: 'Sinta', itemCount: 3, total: 68_000 });
		expect(res.receipt.code).toMatch(/^[A-Z0-9]{4}$/);
		expect(res.receipt.lines).toEqual([
			{ productId: 'es-kopi-sore', name: 'Es Kopi Sore', unitPrice: 24_000, quantity: 2, lineTotal: 48_000 },
			{ productId: 'roti-gula-aren', name: 'Roti Gula Aren', unitPrice: 20_000, quantity: 1, lineTotal: 20_000 }
		]);

		const [kasir] = await ownerOrders(sql, { code: res.receipt.code.toLowerCase() });
		expect(kasir).toMatchObject({ itemCount: 3, total: 68_000 });
		expect(await counts()).toEqual({ orders: 1, items: 2 });
	});

	it('harga kiriman browser diabaikan; total dihitung dari server', async () => {
		const res = await placeOrder(sql, {
			idempotencyKey: randomUUID(),
			nickname: 'Sinta',
			total: 1000,
			items: k1Items.map((i) => ({ ...i, price: 1, unitPrice: 1 }))
		});
		expect(res.ok && res.receipt.total).toBe(68_000);
	});

	it('harga yang berubah di katalog tidak mengubah pesanan lama', async () => {
		const res = await placeOrder(sql, { idempotencyKey: randomUUID(), nickname: 'Sinta', items: k1Items });
		await sql`update kedai.products set price_idr = 30000 where id = 'es-kopi-sore'`;
		const [kasir] = await ownerOrders(sql, { code: res.ok ? res.receipt.code : '' });
		expect(kasir.total).toBe(68_000);
	});
});

describe('K2 · item habis setelah masuk keranjang', () => {
	it('menolak tanpa menulis, menyebut item yang berubah, lalu berhasil setelah diperbaiki', async () => {
		await setAvailability(sql, 'roti-gula-aren', false);
		const before = await counts();
		const res = await placeOrder(sql, { idempotencyKey: randomUUID(), nickname: 'Sinta', items: k1Items });
		expect(res).toEqual({ ok: false, kind: 'unavailable', products: [{ id: 'roti-gula-aren', name: 'Roti Gula Aren' }] });
		expect(await counts()).toEqual(before);

		const fixed = await placeOrder(sql, {
			idempotencyKey: randomUUID(),
			nickname: 'Sinta',
			items: [{ productId: 'es-kopi-sore', quantity: 2 }]
		});
		expect(fixed.ok && fixed.receipt.total).toBe(48_000);
	});

	it('produk contoh "Kopi Susu Pandan" berstatus habis', async () => {
		const products = await listProducts(sql);
		expect(products).toHaveLength(8);
		expect(products.filter((p) => !p.available).map((p) => p.id)).toEqual(['kopi-susu-pandan']);
		const res = await placeOrder(sql, {
			idempotencyKey: randomUUID(),
			nickname: 'Sinta',
			items: [{ productId: 'kopi-susu-pandan', quantity: 1 }]
		});
		expect(res.ok === false && res.kind).toBe('unavailable');
	});
});

describe('K3 · klik ganda dan kirim ulang', () => {
	it('permintaan kembar bersamaan menghasilkan satu pesanan dengan kode yang sama', async () => {
		const input = { idempotencyKey: randomUUID(), nickname: 'Sinta', items: k1Items };
		const results = await Promise.all([placeOrder(sql, input), placeOrder(sql, input), placeOrder(sql, input)]);
		const codes = results.map((r) => (r.ok ? r.receipt.code : null));
		expect(new Set(codes).size).toBe(1);
		expect(codes[0]).not.toBeNull();
		expect(results.filter((r) => r.ok && r.replay)).toHaveLength(2);
		expect(await counts()).toEqual({ orders: 1, items: 2 });
	});

	it('kirim ulang setelah respons terputus mengembalikan kode yang sama (urutan item tidak berpengaruh)', async () => {
		const key = randomUUID();
		const first = await placeOrder(sql, { idempotencyKey: key, nickname: 'Sinta', items: k1Items });
		const retry = await placeOrder(sql, { idempotencyKey: key, nickname: 'Sinta', items: [...k1Items].reverse() });
		expect(retry.ok && retry.replay).toBe(true);
		expect(retry.ok && first.ok && retry.receipt.code === first.receipt.code).toBe(true);
		expect(await counts()).toEqual({ orders: 1, items: 2 });
	});

	it('kunci lama dengan isi berbeda menghasilkan konflik', async () => {
		const key = randomUUID();
		await placeOrder(sql, { idempotencyKey: key, nickname: 'Sinta', items: k1Items });
		const other = await placeOrder(sql, {
			idempotencyKey: key,
			nickname: 'Sinta',
			items: [{ productId: 'americano', quantity: 1 }]
		});
		expect(other).toEqual({ ok: false, kind: 'conflict' });
		const renamed = await placeOrder(sql, { idempotencyKey: key, nickname: 'Bimo', items: k1Items });
		expect(renamed).toEqual({ ok: false, kind: 'conflict' });
		expect(await counts()).toEqual({ orders: 1, items: 2 });
	});
});

describe('K4 · input tidak sah', () => {
	const key = () => randomUUID();
	const cases: [string, unknown, string][] = [
		['keranjang kosong', { idempotencyKey: key(), nickname: 'Sinta', items: [] }, 'items'],
		['jumlah 0', { idempotencyKey: key(), nickname: 'Sinta', items: [{ productId: 'americano', quantity: 0 }] }, 'items'],
		['jumlah 11', { idempotencyKey: key(), nickname: 'Sinta', items: [{ productId: 'americano', quantity: 11 }] }, 'items'],
		['jumlah pecahan', { idempotencyKey: key(), nickname: 'Sinta', items: [{ productId: 'americano', quantity: 1.5 }] }, 'items'],
		['produk ganda', { idempotencyKey: key(), nickname: 'Sinta', items: [{ productId: 'americano', quantity: 1 }, { productId: 'americano', quantity: 2 }] }, 'items'],
		['ID berformat aneh', { idempotencyKey: key(), nickname: 'Sinta', items: [{ productId: "x'; drop table", quantity: 1 }] }, 'items'],
		['tanpa nama', { idempotencyKey: key(), nickname: ' ', items: k1Items }, 'nickname'],
		['kunci bukan UUID', { idempotencyKey: 'abc', nickname: 'Sinta', items: k1Items }, 'idempotencyKey']
	];
	for (const [label, input, field] of cases) {
		it(`menolak ${label}`, async () => {
			const res = await placeOrder(sql, input);
			expect(res.ok === false && res.kind).toBe('invalid');
			if (res.ok === false && res.kind === 'invalid') expect(Object.keys(res.errors)).toContain(field);
			expect(await counts()).toEqual({ orders: 0, items: 0 });
		});
	}

	it('menolak ID produk tak dikenal tanpa menulis sebagian', async () => {
		const res = await placeOrder(sql, {
			idempotencyKey: randomUUID(),
			nickname: 'Sinta',
			items: [{ productId: 'es-kopi-sore', quantity: 1 }, { productId: 'kopi-gratis', quantity: 1 }]
		});
		expect(res).toEqual({ ok: false, kind: 'unknown', productIds: ['kopi-gratis'] });
		expect(await counts()).toEqual({ orders: 0, items: 0 });
	});

	it('pesanan baru setelah sukses memakai kunci baru dan kode berbeda', async () => {
		const a = await placeOrder(sql, { idempotencyKey: randomUUID(), nickname: 'Sinta', items: k1Items });
		const b = await placeOrder(sql, { idempotencyKey: randomUUID(), nickname: 'Sinta', items: k1Items });
		expect(a.ok && b.ok && a.receipt.code !== b.receipt.code).toBe(true);
		expect(await counts()).toEqual({ orders: 2, items: 4 });
	});

	it('fromForm mengurai item berulang dan menandai jumlah tidak sah', () => {
		const fd = new FormData();
		fd.set('key', 'k');
		fd.set('nickname', 'Sinta');
		fd.append('item', 'es-kopi-sore:2');
		fd.append('item', 'roti-gula-aren:x');
		expect(fromForm(fd)).toEqual({
			idempotencyKey: 'k',
			nickname: 'Sinta',
			items: [
				{ productId: 'es-kopi-sore', quantity: 2 },
				{ productId: 'roti-gula-aren', quantity: NaN }
			]
		});
	});
});

describe('Inisialisasi dan pembatasan laju', () => {
	it('seed dan migrasi aman diulang; stok yang diubah pemilik dan pesanan tetap utuh', async () => {
		await placeOrder(sql, { idempotencyKey: randomUUID(), nickname: 'Sinta', items: k1Items });
		await setAvailability(sql, 'americano', false);
		await seed(sql);
		await seed(sql);
		expect(await migrate(sql, () => {})).toEqual([]);
		const products = await listProducts(sql);
		expect(products).toHaveLength(8);
		expect(products.find((p) => p.id === 'americano')?.available).toBe(false);
		expect(await counts()).toEqual({ orders: 1, items: 2 });
	});

	it('membatasi pengiriman per klien', async () => {
		const opts = { action: 'pesanan', client: '198.51.100.7', limit: 2, windowSec: 600 };
		const hits = [];
		for (let i = 0; i < 3; i++) hits.push((await hitRateLimit(sql, opts)).allowed);
		expect(hits).toEqual([true, true, false]);
	});
});
