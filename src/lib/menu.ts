/** Data toko dan katalog contoh. Harga dan status saat runtime dibaca dari tabel kedai.products. */

export const SHOP = {
	name: 'Kedai Sore',
	pickup: 'Kasir Kedai Sore, Jl. Bengawan No. 8 (alamat contoh), Bandung',
	hours: 'Setiap hari, 14.00–22.00 WIB'
} as const;

export type Category = 'kopi' | 'nonkopi' | 'camilan';

export const CATEGORIES: { id: Category; label: string }[] = [
	{ id: 'kopi', label: 'Kopi' },
	{ id: 'nonkopi', label: 'Nonkopi' },
	{ id: 'camilan', label: 'Camilan' }
];

export const MAX_QTY = 10;

export const SEED_PRODUCTS = [
	{
		id: 'es-kopi-sore',
		category: 'kopi',
		name: 'Es Kopi Sore',
		description: 'Espresso, susu segar, dan gula aren. Manis sedang, paling banyak dipesan pulang kerja.',
		price_idr: 24_000,
		image: 'es-kopi-sore',
		available: true,
		sort_order: 1
	},
	{
		id: 'americano',
		category: 'kopi',
		name: 'Americano',
		description: 'Espresso dan air dingin. Rasa bersih dengan sedikit asam buah, tanpa gula.',
		price_idr: 20_000,
		image: 'americano',
		available: true,
		sort_order: 2
	},
	{
		id: 'kopi-susu-pandan',
		category: 'kopi',
		name: 'Kopi Susu Pandan',
		description: 'Kopi susu dengan sirup pandan buatan sendiri. Wangi, lebih manis dari Es Kopi Sore.',
		price_idr: 26_000,
		image: 'kopi-susu-pandan',
		available: false,
		sort_order: 3
	},
	{
		id: 'teh-serai-jeruk',
		category: 'nonkopi',
		name: 'Es Teh Serai Jeruk',
		description: 'Teh hitam seduh dingin, serai, dan perasan jeruk nipis. Segar, tidak terlalu manis.',
		price_idr: 18_000,
		image: 'teh-serai-jeruk',
		available: true,
		sort_order: 4
	},
	{
		id: 'cokelat-sore',
		category: 'nonkopi',
		name: 'Cokelat Sore',
		description: 'Cokelat bubuk pekat dan susu segar, disajikan dingin. Cocok untuk yang tidak minum kopi.',
		price_idr: 22_000,
		image: 'cokelat-sore',
		available: true,
		sort_order: 5
	},
	{
		id: 'matcha-susu',
		category: 'nonkopi',
		name: 'Matcha Susu',
		description: 'Matcha dikocok dengan air, dituang ke susu dingin. Pahit lembut, sedikit manis.',
		price_idr: 25_000,
		image: 'matcha-susu',
		available: true,
		sort_order: 6
	},
	{
		id: 'roti-gula-aren',
		category: 'camilan',
		name: 'Roti Gula Aren',
		description: 'Roti sobek hangat dengan olesan mentega dan gula aren. Satu porsi empat potong.',
		price_idr: 20_000,
		image: 'roti-gula-aren',
		available: true,
		sort_order: 7
	},
	{
		id: 'pisang-goreng',
		category: 'camilan',
		name: 'Pisang Goreng Keju',
		description: 'Pisang kepok goreng renyah, parutan keju, dan susu kental manis.',
		price_idr: 18_000,
		image: 'pisang-goreng',
		available: true,
		sort_order: 8
	}
] as const;

export function rupiah(n: number): string {
	return 'Rp' + n.toLocaleString('id-ID').replace(/,/g, '.');
}
