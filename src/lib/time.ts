/** Utilitas waktu WIB (UTC+7, tanpa daylight saving). */
const OFFSET = 7 * 60 * 60_000;
const pad = (n: number) => String(n).padStart(2, '0');

export function wibDate(instant: Date): string {
	const t = new Date(instant.getTime() + OFFSET);
	return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function wibClock(instant: Date): string {
	const t = new Date(instant.getTime() + OFFSET);
	return `${pad(t.getUTCHours())}.${pad(t.getUTCMinutes())}`;
}

export function wibDayBounds(date: string): { from: Date; to: Date } | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
	if (!m) return null;
	const from = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) - OFFSET);
	return { from, to: new Date(from.getTime() + 24 * 60 * 60_000) };
}

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
/** "24 Nov 2026, 19.42 WIB" */
export function receiptStamp(iso: string): string {
	const d = new Date(iso);
	const t = new Date(d.getTime() + OFFSET);
	return `${t.getUTCDate()} ${BULAN[t.getUTCMonth()]} ${t.getUTCFullYear()}, ${wibClock(d)} WIB`;
}
