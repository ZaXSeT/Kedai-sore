/**
 * npm run images — memotong foto sumber (assets-src/raw) menjadi kotak 480×480 WebP di static/menu.
 * Semua foto diberi perlakuan sama (crop rapat ke gelas/piring, saturasi dan kecerahan diseragamkan)
 * agar skala dan nuansanya konsisten di daftar menu.
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

mkdirSync('static/menu', { recursive: true });

// [sumber, nama keluaran, fokus x, fokus y, zoom (bagian sisi pendek yang diambil)]
const jobs: [string, string, number, number, number][] = [
	['pexels-32542054', 'es-kopi-sore', 0.44, 0.7, 0.62],
	['pexels-16785688', 'americano', 0.5, 0.55, 0.92],
	['pexels-4869290', 'kopi-susu-pandan', 0.52, 0.55, 1],
	['pexels-36825769', 'teh-serai-jeruk', 0.5, 0.5, 0.9],
	['pexels-8878710', 'cokelat-sore', 0.56, 0.52, 0.72],
	['pexels-8004561', 'matcha-susu', 0.66, 0.6, 0.78],
	['pexels-26584413', 'roti-gula-aren', 0.5, 0.62, 0.85],
	['pexels-37048319', 'pisang-goreng', 0.5, 0.68, 0.78]
];

for (const [src, out, fx, fy, zoom] of jobs) {
	const img = sharp(`assets-src/raw/${src}.jpg`);
	const { width: W = 0, height: H = 0 } = await img.metadata();
	const side = Math.round(Math.min(W, H) * zoom);
	const left = Math.max(0, Math.min(W - side, Math.round(fx * W - side / 2)));
	const top = Math.max(0, Math.min(H - side, Math.round(fy * H - side / 2)));
	const info = await img
		.extract({ left, top, width: side, height: side })
		.resize(480, 480)
		.modulate({ saturation: 0.9, brightness: 1.03 })
		.webp({ quality: 72, effort: 6 })
		.toFile(`static/menu/${out}.webp`);
	console.log(`${out}.webp ${info.width}×${info.height} ${(info.size / 1024).toFixed(0)} KB`);
}
