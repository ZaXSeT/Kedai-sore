/**
 * Akses pemilik/kasir: daftar pesanan pickup.
 *   npm run pesanan                         → pesanan hari ini (WIB)
 *   npm run pesanan -- --tanggal 2026-11-24
 *   npm run pesanan -- --kode G7NM          → satu pesanan berdasarkan kode ambil
 */
import postgres from 'postgres';
import { argValue, databaseUrl } from './lib/env';
import { ownerOrders, type Receipt } from '../src/lib/server/orders';
import { rupiah } from '../src/lib/menu';
import { wibClock, wibDate, wibDayBounds } from '../src/lib/time';

const code = argValue('kode');
const date = argValue('tanggal') ?? wibDate(new Date());
const bounds = wibDayBounds(date);
if (!code && !bounds) {
	console.error('Format: --tanggal YYYY-MM-DD atau --kode ABCD');
	process.exit(1);
}

function print(r: Receipt) {
	console.log(`\n${r.code}  ${r.nickname}  ·  ${wibClock(new Date(r.createdAt))} WIB  ·  ${r.itemCount} item`);
	for (const l of r.lines) {
		console.log(`   ${String(l.quantity).padStart(2)} × ${l.name.padEnd(22)} ${rupiah(l.lineTotal).padStart(10)}`);
	}
	console.log(`   ${'Total, bayar di kasir'.padEnd(27)} ${rupiah(r.total).padStart(10)}`);
}

const sql = postgres(databaseUrl(), { max: 1, prepare: false, onnotice: () => {} });
try {
	const orders = code ? await ownerOrders(sql, { code }) : await ownerOrders(sql, bounds!);
	console.log(code ? `\nKedai Sore · kode ${code.toUpperCase()}` : `\nKedai Sore · pesanan ${date}`);
	console.log('─'.repeat(48));
	if (orders.length === 0) console.log(code ? 'Kode tidak ditemukan.' : 'Belum ada pesanan.');
	orders.forEach(print);
	console.log('─'.repeat(48));
	if (!code) {
		console.log(`${orders.length} pesanan · ${rupiah(orders.reduce((s, o) => s + o.total, 0))}\n`);
	}
} finally {
	await sql.end();
}
