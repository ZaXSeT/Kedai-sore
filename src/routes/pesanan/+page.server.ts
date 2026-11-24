import { fail } from '@sveltejs/kit';
import { db } from '#lib/server/db.ts';
import { fromForm, listProducts, placeOrder } from '#lib/server/orders.ts';
import { hitRateLimit } from '#lib/server/rate-limit.ts';
import { logError } from '#lib/server/log.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ setHeaders }) => {
	setHeaders({ 'cache-control': 'no-store' });
	return { products: await listProducts(db()) };
};

export const actions: Actions = {
	default: async ({ request, getClientAddress }) => {
		const form = await request.formData();
		const input = fromForm(form);
		const nickname = typeof input.nickname === 'string' ? input.nickname : '';
		const sql = db();

		try {
			const limit = await hitRateLimit(sql, {
				action: 'pesanan',
				client: getClientAddress(),
				limit: 20,
				windowSec: 600
			});
			if (!limit.allowed) {
				return fail(429, {
					nickname,
					message: `Terlalu banyak percobaan dari perangkat ini. Coba lagi dalam ${Math.ceil(limit.retryAfterSec / 60)} menit.`
				});
			}

			const result = await placeOrder(sql, input);
			if (result.ok) return { receipt: result.receipt, replay: result.replay };

			switch (result.kind) {
				case 'invalid':
					return fail(400, { nickname, errors: result.errors });
				case 'unknown':
					return fail(400, {
						nickname,
						unknown: result.productIds,
						message: 'Ada item yang tidak lagi ada di menu. Item itu sudah dikeluarkan dari pesanan; periksa lalu kirim lagi.'
					});
				case 'unavailable':
					return fail(409, {
						nickname,
						unavailable: result.products,
						message: `${result.products.map((p) => p.name).join(', ')} baru saja habis. Pesanan belum dikirim. Hapus item itu, lalu kirim lagi.`
					});
				case 'conflict':
					return fail(409, {
						nickname,
						conflict: true,
						message: 'Isi pesanan berubah setelah percobaan sebelumnya. Periksa pesanan lalu ketuk Kirim pesanan sekali lagi.'
					});
			}
		} catch (e) {
			logError('pesanan', e);
			return fail(503, {
				nickname,
				message: 'Server belum bisa menyimpan pesanan. Keranjang masih utuh; kirim ulang aman dan tidak membuat pesanan ganda.'
			});
		}
	}
};
