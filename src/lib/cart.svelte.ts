/**
 * Keranjang di browser. Hanya menyimpan ID produk dan jumlah (harga selalu dari server),
 * plus kunci idempotensi untuk isi pesanan yang sedang dikirim. Bertahan saat reload lewat localStorage.
 */
import { MAX_QTY } from './menu';

const STORAGE = 'kedai-sore:keranjang:v1';

type Stored = { items: Record<string, number>; key?: string; sig?: string };

function load(): Stored {
	if (typeof localStorage === 'undefined') return { items: {} };
	try {
		const raw = JSON.parse(localStorage.getItem(STORAGE) ?? '{}') as Stored;
		const items: Record<string, number> = {};
		for (const [id, qty] of Object.entries(raw.items ?? {})) {
			if (/^[a-z0-9-]{1,40}$/.test(id) && Number.isInteger(qty) && qty > 0) items[id] = Math.min(qty, MAX_QTY);
		}
		return { items, key: raw.key, sig: raw.sig };
	} catch {
		return { items: {} };
	}
}

class Cart {
	items = $state<Record<string, number>>({});
	ready = $state(false);
	#key: string | undefined;
	#sig: string | undefined;

	init() {
		if (this.ready) return;
		const s = load();
		this.items = s.items;
		this.#key = s.key;
		this.#sig = s.sig;
		this.ready = true;
	}

	#save() {
		try {
			localStorage.setItem(STORAGE, JSON.stringify({ items: this.items, key: this.#key, sig: this.#sig }));
		} catch {
			// Mode privat atau penyimpanan penuh: keranjang tetap jalan selama halaman terbuka.
		}
	}

	qty(id: string): number {
		return this.items[id] ?? 0;
	}

	set(id: string, qty: number) {
		const next = { ...this.items };
		if (qty <= 0) delete next[id];
		else next[id] = Math.min(qty, MAX_QTY);
		this.items = next;
		this.#save();
	}

	add(id: string) {
		this.set(id, this.qty(id) + 1);
	}
	remove(id: string) {
		this.set(id, 0);
	}

	get entries(): [string, number][] {
		return Object.entries(this.items);
	}

	get count(): number {
		return Object.values(this.items).reduce((s, n) => s + n, 0);
	}

	/**
	 * Kunci idempotensi untuk isi pesanan tertentu. Isi yang sama → kunci yang sama
	 * (kirim ulang aman). Isi berubah → kunci baru.
	 */
	keyFor(nickname: string): string {
		const sig = JSON.stringify([nickname.trim(), [...this.entries].sort()]);
		if (!this.#key || this.#sig !== sig) {
			this.#key = crypto.randomUUID();
			this.#sig = sig;
			this.#save();
		}
		return this.#key;
	}

	/** Setelah server menolak kunci lama (konflik), pakai kunci baru untuk percobaan berikutnya. */
	dropKey() {
		this.#key = undefined;
		this.#sig = undefined;
		this.#save();
	}

	clear() {
		this.items = {};
		this.dropKey();
	}
}

export const cart = new Cart();
