/**
 * Checkout Kedai Sore. Semua fungsi menerima koneksi `sql` agar bisa diuji langsung ke database tes.
 *
 * Satu transaksi: cek kunci idempotensi → baca harga dan stok dari server → tulis pesanan + item.
 * Retry dengan kunci dan isi yang sama mengembalikan pesanan yang sama (kode ambil tidak berubah).
 * Kunci lama dengan isi berbeda ditolak sebagai konflik.
 */
import type { Sql, TransactionSql } from 'postgres';
import { createHash, randomInt } from 'node:crypto';
import { z } from 'zod';
import { MAX_QTY, type Category } from '../menu';

export type Product = {
	id: string;
	category: Category;
	name: string;
	description: string;
	price_idr: number;
	image: string;
	available: boolean;
};

export type ReceiptLine = { productId: string; name: string; unitPrice: number; quantity: number; lineTotal: number };
export type Receipt = {
	code: string;
	nickname: string;
	lines: ReceiptLine[];
	itemCount: number;
	total: number;
	createdAt: string;
};

export async function listProducts(sql: Sql): Promise<Product[]> {
	return sql<Product[]>`
		select id, category, name, description, price_idr, image, available
		from kedai.products
		order by sort_order, id`;
}

// ——— Validasi ———

export const orderInput = z.object({
	idempotencyKey: z.uuid({ error: 'Sesi pesanan tidak dikenali. Muat ulang halaman lalu kirim lagi.' }),
	nickname: z
		.string({ error: 'Isi nama panggilan.' })
		.trim()
		.min(2, { error: 'Nama panggilan minimal 2 huruf.' })
		.max(30, { error: 'Nama panggilan maksimal 30 karakter.' })
		.regex(/^[\p{L}\p{M} .'-]+$/u, { error: 'Gunakan huruf, spasi, titik, atau tanda hubung.' }),
	items: z
		.array(
			z.object({
				productId: z.string().regex(/^[a-z0-9-]{1,40}$/, { error: 'Produk tidak dikenali.' }),
				quantity: z
					.number({ error: 'Jumlah harus angka.' })
					.int({ error: 'Jumlah harus bilangan bulat.' })
					.min(1, { error: 'Jumlah minimal 1.' })
					.max(MAX_QTY, { error: `Maksimal ${MAX_QTY} per produk.` })
			}),
			{ error: 'Pesanan kosong.' }
		)
		.min(1, { error: 'Pesanan masih kosong. Tambahkan minimal satu item.' })
		.max(20, { error: 'Terlalu banyak baris pesanan.' })
		.refine((items) => new Set(items.map((i) => i.productId)).size === items.length, {
			error: 'Ada produk yang tercantum dua kali.'
		})
});

export type OrderInput = z.input<typeof orderInput>;
export type OrderFieldErrors = Partial<Record<'idempotencyKey' | 'nickname' | 'items', string>>;

/** Mengurai field formulir checkout: key, nickname, dan item berulang "id:jumlah". */
export function fromForm(form: FormData): Record<string, unknown> {
	const str = (k: string) => {
		const v = form.get(k);
		return typeof v === 'string' ? v.slice(0, 80) : undefined;
	};
	const items = form
		.getAll('item')
		.slice(0, 40)
		.map((raw) => {
			const [productId, qty] = String(raw).slice(0, 60).split(':');
			return { productId, quantity: /^\d{1,3}$/.test(qty ?? '') ? Number(qty) : NaN };
		});
	return { idempotencyKey: str('key'), nickname: str('nickname'), items };
}

/** Sidik isi permintaan yang tidak bergantung pada urutan item. */
export function requestHash(nickname: string, items: { productId: string; quantity: number }[]): string {
	const canonical = JSON.stringify({
		n: nickname,
		i: [...items].sort((a, b) => a.productId.localeCompare(b.productId)).map((i) => [i.productId, i.quantity])
	});
	return createHash('sha256').update(canonical).digest('hex');
}

const CODE_ALPHABET = 'ACDEFGHJKLMNPQRTUVWXY34679';
export function generateCode(): string {
	let s = '';
	for (let i = 0; i < 4; i++) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
	return s;
}

// ——— Checkout ———

export type PlaceOrderResult =
	| { ok: true; receipt: Receipt; replay: boolean }
	| { ok: false; kind: 'invalid'; errors: OrderFieldErrors }
	| { ok: false; kind: 'unknown'; productIds: string[] }
	| { ok: false; kind: 'unavailable'; products: { id: string; name: string }[] }
	| { ok: false; kind: 'conflict' };

async function loadReceipt(tx: Sql | TransactionSql, orderId: bigint | number | string): Promise<Receipt> {
	const [o] = await tx<{ code: string; nickname: string; item_count: number; total_idr: number; created_at: Date }[]>`
		select code, nickname, item_count, total_idr, created_at from kedai.orders where id = ${orderId}`;
	const lines = await tx<{ product_id: string; name: string; unit_price_idr: number; quantity: number }[]>`
		select product_id, name, unit_price_idr, quantity from kedai.order_items where order_id = ${orderId} order by id`;
	return {
		code: o.code,
		nickname: o.nickname,
		itemCount: o.item_count,
		total: o.total_idr,
		createdAt: o.created_at.toISOString(),
		lines: lines.map((l) => ({
			productId: l.product_id,
			name: l.name,
			unitPrice: l.unit_price_idr,
			quantity: l.quantity,
			lineTotal: l.unit_price_idr * l.quantity
		}))
	};
}

class Abort {
	constructor(public result: PlaceOrderResult) {}
}

export async function placeOrder(sql: Sql, raw: unknown): Promise<PlaceOrderResult> {
	const parsed = orderInput.safeParse(raw);
	if (!parsed.success) {
		const errors: OrderFieldErrors = {};
		for (const issue of parsed.error.issues) {
			const key = issue.path[0] as keyof OrderFieldErrors;
			if (key && !errors[key]) errors[key] = issue.message;
		}
		return { ok: false, kind: 'invalid', errors };
	}
	const input = parsed.data;
	const hash = requestHash(input.nickname, input.items);

	for (let attempt = 0; attempt < 5; attempt++) {
		try {
			return await sql.begin(async (tx) => {
				// 1. Kunci yang sudah dipakai: kembalikan pesanan yang sama, atau tolak jika isinya beda.
				const replay = async (): Promise<PlaceOrderResult | null> => {
					const [prev] = await tx<{ id: string; request_hash: string }[]>`
						select id, request_hash from kedai.orders where idempotency_key = ${input.idempotencyKey}`;
					if (!prev) return null;
					if (prev.request_hash !== hash) return { ok: false, kind: 'conflict' };
					return { ok: true, receipt: await loadReceipt(tx, prev.id), replay: true };
				};
				const earlier = await replay();
				if (earlier) return earlier;

				// 2. Harga dan stok dibaca dari server; isi browser hanya ID dan jumlah.
				const ids = input.items.map((i) => i.productId);
				const products = await tx<Pick<Product, 'id' | 'name' | 'price_idr' | 'available'>[]>`
					select id, name, price_idr, available from kedai.products
					where id = any(${ids}::text[])
					for share`;
				const byId = new Map(products.map((p) => [p.id, p]));
				const unknown = ids.filter((id) => !byId.has(id));
				if (unknown.length) throw new Abort({ ok: false, kind: 'unknown', productIds: unknown });
				const soldOut = products.filter((p) => !p.available).map((p) => ({ id: p.id, name: p.name }));
				if (soldOut.length) throw new Abort({ ok: false, kind: 'unavailable', products: soldOut });

				const lines = input.items.map((i) => {
					const p = byId.get(i.productId)!;
					return { productId: p.id, name: p.name, unitPrice: p.price_idr, quantity: i.quantity };
				});
				const total = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
				const itemCount = lines.reduce((s, l) => s + l.quantity, 0);

				// 3. Tulis pesanan. Jika permintaan kembar menulis lebih dulu, baca hasilnya.
				const [order] = await tx<{ id: string }[]>`
					insert into kedai.orders (code, idempotency_key, request_hash, nickname, item_count, total_idr)
					values (${generateCode()}, ${input.idempotencyKey}, ${hash}, ${input.nickname}, ${itemCount}, ${total})
					on conflict on constraint orders_idempotency_key do nothing
					returning id`;
				if (!order) {
					const twin = await replay();
					if (twin) return twin;
					throw new Error('Kunci idempotensi bentrok tetapi pesanan tidak ditemukan');
				}

				for (const l of lines) {
					await tx`
						insert into kedai.order_items (order_id, product_id, name, unit_price_idr, quantity)
						values (${order.id}, ${l.productId}, ${l.name}, ${l.unitPrice}, ${l.quantity})`;
				}
				return { ok: true, receipt: await loadReceipt(tx, order.id), replay: false } as PlaceOrderResult;
			});
		} catch (e) {
			if (e instanceof Abort) return e.result;
			const err = e as { code?: string; constraint_name?: string };
			if (err?.code === '23505' && err.constraint_name === 'orders_code_key') continue; // kode ambil bentrok
			throw e;
		}
	}
	throw new Error('Gagal membuat kode ambil unik setelah 5 percobaan.');
}

/** Daftar pesanan untuk CLI pemilik (kasir). */
export async function ownerOrders(sql: Sql, opts: { from: Date; to: Date } | { code: string }) {
	const orders =
		'code' in opts
			? await sql<{ id: string }[]>`select id from kedai.orders where code = ${opts.code.toUpperCase()}`
			: await sql<{ id: string }[]>`
				select id from kedai.orders
				where created_at >= ${opts.from} and created_at < ${opts.to}
				order by created_at`;
	return Promise.all(orders.map((o) => loadReceipt(sql, o.id)));
}

export async function setAvailability(sql: Sql, productId: string, available: boolean) {
	return sql<{ id: string; name: string; available: boolean }[]>`
		update kedai.products set available = ${available} where id = ${productId}
		returning id, name, available`;
}
