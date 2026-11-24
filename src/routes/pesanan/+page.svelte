<script lang="ts">
	import { enhance } from '$app/forms';
	import { refreshAll } from '$app/navigation';
	import { tick, untrack } from 'svelte';
	import Seo from '#lib/components/Seo.svelte';
	import { cart } from '#lib/cart.svelte.ts';
	import { MAX_QTY, SHOP, rupiah } from '#lib/menu.ts';
	import { receiptStamp } from '#lib/time.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	type Receipt = NonNullable<NonNullable<typeof form>['receipt']>;

	let nickname = $state(untrack(() => form?.nickname ?? ''));
	let submitting = $state(false);
	let networkError = $state(false);
	let formEl: HTMLFormElement | undefined = $state();
	let statusEl: HTMLElement | undefined = $state();
	let receiptHeading: HTMLElement | undefined = $state();

	let errors = $derived<Record<string, string>>(form?.errors ?? {});
	let message = $derived(form?.message ?? '');
	let receipt = $derived<Receipt | null>(form?.receipt ?? null);
	// Item yang dilaporkan habis oleh server saat kirim (bisa lebih baru dari data halaman).
	let flagged = $derived(
		new Set<string>(
			((form as { unavailable?: { id: string }[] } | null)?.unavailable ?? []).map((p) => p.id)
		)
	);

	const byId = $derived(new Map(data.products.map((p) => [p.id, p])));
	const lines = $derived(
		cart.entries
			.filter(([id]) => byId.has(id))
			.map(([id, qty]) => {
				const product = byId.get(id)!;
				return { product, qty, soldOut: !product.available || flagged.has(id) };
			})
	);
	// Item habis tidak ikut dihitung: total selalu menggambarkan yang bisa dibayar.
	const payable = $derived(lines.filter((l) => !l.soldOut));
	const count = $derived(payable.reduce((s, l) => s + l.qty, 0));
	const total = $derived(payable.reduce((s, l) => s + l.qty * l.product.price_idr, 0));
	const blocked = $derived(lines.some((l) => l.soldOut));

	// ID di keranjang yang tidak ada lagi di menu dibuang diam-diam.
	$effect(() => {
		if (!cart.ready) return;
		for (const [id] of cart.entries) if (!byId.has(id)) cart.remove(id);
	});

	function fillExample() {
		nickname = 'Sinta';
	}

	function startOver() {
		receipt = null;
		networkError = false;
		message = '';
		nickname = '';
	}
</script>

<Seo
	title="Pesanan · Kedai Sore"
	description="Periksa pesanan, tulis nama panggilan, lalu kirim. Ambil dan bayar di kasir Kedai Sore. Proyek konsep dengan data contoh."
/>

<div class="wrap page">
	{#if receipt}
		<section class="done" aria-labelledby="judul-struk">
			<div class="receipt">
				<p class="shop">KEDAI SORE</p>
				<p class="small">{SHOP.pickup}</p>
				<p class="small">{receiptStamp(receipt.createdAt)}</p>
				<hr />
				<h1 id="judul-struk" tabindex="-1" bind:this={receiptHeading}>
					<span>Kode ambil</span>
					<strong>{receipt.code}</strong>
				</h1>
				<p class="who">Atas nama {receipt.nickname}</p>
				<hr />
				<ul>
					{#each receipt.lines as l (l.productId)}
						<li>
							<span>{l.quantity} × {l.name}</span>
							<span>{rupiah(l.lineTotal)}</span>
						</li>
						<li class="unit"><span>@ {rupiah(l.unitPrice)}</span></li>
					{/each}
				</ul>
				<hr />
				<p class="total"><span>TOTAL · {receipt.itemCount} item</span><span>{rupiah(receipt.total)}</span></p>
				<p class="small center">Bayar di kasir saat mengambil.<br />Tunjukkan kode ambil ini.</p>
			</div>
			<p class="status" role="status">Pesanan tersimpan. Kasir mencari pesananmu dengan kode {receipt.code}.</p>
			<a class="btn quiet" href="/" onclick={startOver}>Buat pesanan baru</a>
		</section>
	{:else}
		<a class="back" href="/">Kembali ke menu</a>
		<h1 class="title">Pesanan kamu</h1>

		{#if !cart.ready}
			<p class="muted">Memuat keranjang…</p>
			<noscript><p>Halaman pesanan memerlukan JavaScript untuk membaca keranjang.</p></noscript>
		{:else if lines.length === 0}
			<div class="empty">
				<p>Keranjang masih kosong.</p>
				<a class="btn" href="/">Pilih dari menu</a>
			</div>
		{:else}
			<div class="cols">
				<section aria-labelledby="judul-isi">
					<h2 id="judul-isi" class="visually-hidden">Isi pesanan</h2>
					<ul class="lines">
						{#each lines as l (l.product.id)}
							<li class:soldout={l.soldOut}>
								<img src={`/menu/${l.product.image}.webp`} alt="" width="480" height="480" />
								<div class="info">
									<p class="name">{l.product.name}</p>
									<p class="unit-price">
										{rupiah(l.product.price_idr)}
										{#if l.soldOut}<span class="tag">Habis</span>{/if}
									</p>
									{#if l.soldOut}
										<p class="line-msg">Item ini baru saja habis. Hapus untuk melanjutkan.</p>
									{/if}
								</div>
								<div class="controls">
									{#if !l.soldOut}
										<div class="stepper" role="group" aria-label={`Jumlah ${l.product.name}`}>
											<button
												type="button"
												onclick={() => cart.set(l.product.id, l.qty - 1)}
												aria-label={`Kurangi ${l.product.name}`}>−</button
											>
											<output aria-live="polite">{l.qty}</output>
											<button
												type="button"
												onclick={() => cart.add(l.product.id)}
												disabled={l.qty >= MAX_QTY}
												aria-label={`Tambah ${l.product.name}`}>+</button
											>
										</div>
									{/if}
									<button
										type="button"
										class="remove"
										onclick={() => cart.remove(l.product.id)}
										aria-label={`Hapus ${l.product.name}`}>Hapus</button
									>
								</div>
							</li>
						{/each}
					</ul>
					<a class="more" href="/">Tambah item lain</a>
				</section>

				<form
					method="POST"
					class="checkout"
					novalidate
					bind:this={formEl}
					use:enhance={({ cancel, formData }) => {
						if (submitting) return cancel();
						submitting = true;
						networkError = false;
						// Kunci idempotensi yang sama untuk isi yang sama: klik ganda dan kirim ulang aman.
						formData.set('key', cart.keyFor(nickname));
						formData.delete('item');
						for (const [id, qty] of cart.entries) formData.append('item', `${id}:${qty}`);
						return async ({ result, update }) => {
							submitting = false;
							if (result.type === 'error') {
								networkError = true;
								await tick();
								statusEl?.focus();
								return;
							}
							await update({ reset: false });
							if (result.type === 'success') {
								cart.clear();
								await tick();
								window.scrollTo({ top: 0 });
								receiptHeading?.focus();
								return;
							}
							if (result.type === 'failure') {
								const d = result.data as { conflict?: boolean; unknown?: string[] } | undefined;
								if (d?.conflict) cart.dropKey();
								for (const id of d?.unknown ?? []) cart.remove(id);
								await refreshAll();
							}
							await tick();
							(document.querySelector<HTMLElement>('[aria-invalid="true"]') ?? statusEl)?.focus();
						};
					}}
				>
					<div class="pickup">
						<h2>Ambil di</h2>
						<p>{SHOP.pickup}</p>
						<p class="muted">Bayar di kasir saat mengambil. Tidak ada pembayaran online.</p>
					</div>

					<p class="demo-flag">
						Proyek konsep · gunakan data contoh.
						<button type="button" class="linkish" onclick={fillExample}>Isi contoh</button>
					</p>
					<div class="field">
						<label for="nickname">Nama panggilan</label>
						<input
							id="nickname"
							name="nickname"
							type="text"
							autocomplete="nickname"
							maxlength="30"
							bind:value={nickname}
							aria-invalid={errors.nickname ? 'true' : undefined}
							aria-describedby="hint-nama{errors.nickname ? ' err-nama' : ''}"
						/>
						<p class="hint" id="hint-nama">Kasir memanggil nama ini saat pesanan siap.</p>
						{#if errors.nickname}<p class="field-error" id="err-nama">{errors.nickname}</p>{/if}
					</div>

					<div class="totals">
						<p><span>{count} item</span><span>{rupiah(total)}</span></p>
						<p class="grand"><span>Total dibayar di kasir</span><strong>{rupiah(total)}</strong></p>
					</div>

					<div aria-live="polite">
						{#if networkError}
							<div class="notice" tabindex="-1" bind:this={statusEl}>
								<p>
									Koneksi terputus sebelum pesanan dikonfirmasi. Kirim ulang aman: pesanan yang sama
									tidak akan tercatat dua kali.
								</p>
								<button type="button" class="btn quiet" onclick={() => formEl?.requestSubmit()}
									>Kirim ulang</button
								>
							</div>
						{:else if message || errors.items || errors.idempotencyKey}
							<p class="notice" tabindex="-1" bind:this={statusEl}>
								{message || errors.items || errors.idempotencyKey}
							</p>
						{/if}
					</div>

					<button class="btn send" type="submit" disabled={submitting || blocked}>
						{submitting ? 'Mengirim pesanan…' : 'Kirim pesanan'}
					</button>
					{#if blocked}<p class="hint">Hapus item yang habis untuk mengirim pesanan.</p>{/if}
				</form>
			</div>
		{/if}
	{/if}
</div>

<style>
	.page {
		padding-block: 1.25rem 3rem;
	}
	.back {
		display: inline-block;
		font-weight: 650;
		color: var(--leaf-deep);
		padding-block: 0.4rem;
	}
	.title {
		font-size: clamp(2rem, 8vw, 2.8rem);
		font-weight: 800;
		color: var(--leaf-deep);
		margin: 0.5rem 0 1.25rem;
	}
	.muted {
		color: var(--soft);
	}
	.empty {
		display: grid;
		gap: 1rem;
		justify-items: start;
		padding-block: 1rem 2rem;
	}
	.cols {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 2rem;
	}
	.lines {
		list-style: none;
		margin: 0;
		padding: 0;
		border-top: 2px solid var(--ink);
	}
	.lines li {
		display: grid;
		grid-template-columns: 4rem minmax(0, 1fr);
		gap: 0.25rem 0.9rem;
		padding-block: 0.9rem;
		border-bottom: 1px dashed var(--line);
	}
	.lines img {
		grid-row: span 2;
		width: 4rem;
		height: 4rem;
		object-fit: cover;
		border-radius: 0.8rem;
	}
	.lines li.soldout img {
		filter: grayscale(1);
		opacity: 0.6;
	}
	.name {
		font-weight: 700;
		font-size: 1.1rem;
	}
	.unit-price {
		color: var(--soft);
		display: flex;
		gap: 0.5rem;
		align-items: center;
		flex-wrap: wrap;
	}
	.tag {
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--alert);
		background: #f6e3df;
		padding: 0.1rem 0.55rem;
		border-radius: 999px;
	}
	.line-msg {
		color: var(--alert);
		font-weight: 600;
		font-size: 0.92rem;
		margin-top: 0.2rem;
	}
	.controls {
		grid-column: 2;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}
	.remove {
		border: 0;
		background: none;
		color: var(--alert);
		font-weight: 650;
		text-decoration: underline;
		padding: 0.5rem 0.25rem;
		cursor: pointer;
	}
	.more {
		display: inline-block;
		margin-top: 0.9rem;
		font-weight: 650;
		color: var(--leaf-deep);
	}

	.checkout {
		background: var(--paper);
		border: 1px solid var(--line);
		border-radius: 1.25rem;
		padding: 1.25rem;
		display: grid;
		gap: 1rem;
		align-self: start;
	}
	.pickup h2 {
		font-size: 1.15rem;
	}
	.pickup p {
		margin-top: 0.2rem;
	}
	.demo-flag {
		font-size: 0.9rem;
		background: var(--butter);
		border-radius: 0.6rem;
		padding: 0.5rem 0.75rem;
	}
	.linkish {
		background: none;
		border: 0;
		padding: 0.25rem;
		font-weight: 700;
		color: var(--leaf-deep);
		text-decoration: underline;
		cursor: pointer;
	}
	.field label {
		display: block;
		font-weight: 650;
		margin-bottom: 0.3rem;
	}
	.field input {
		width: 100%;
		min-height: 3rem;
		padding: 0.6rem 0.8rem;
		border: 1.5px solid #8d958e;
		border-radius: 0.7rem;
		font: inherit;
		font-size: 1.05rem;
		color: var(--ink);
		background: #fff;
	}
	.field input[aria-invalid='true'] {
		border: 2px solid var(--alert);
	}
	.hint {
		font-size: 0.85rem;
		color: var(--soft);
		margin-top: 0.3rem;
	}
	.field-error {
		color: var(--alert);
		font-weight: 650;
		font-size: 0.95rem;
		margin-top: 0.3rem;
	}
	.totals {
		border-top: 1px dashed var(--line);
		padding-top: 0.75rem;
		display: grid;
		gap: 0.25rem;
	}
	.totals p {
		display: flex;
		justify-content: space-between;
		color: var(--soft);
	}
	.totals .grand {
		color: var(--ink);
		font-weight: 650;
		font-size: 1.05rem;
	}
	.grand strong {
		font-family: var(--display);
		font-size: 1.45rem;
	}
	.notice {
		display: grid;
		gap: 0.75rem;
		justify-items: start;
		background: #fbeeea;
		border-left: 4px solid var(--alert);
		padding: 0.75rem 0.9rem;
		border-radius: 0 0.5rem 0.5rem 0;
		font-weight: 550;
	}
	.send {
		width: 100%;
		min-height: 3.4rem;
		font-size: 1.2rem;
	}

	/* Struk */
	.done {
		display: grid;
		justify-items: center;
		gap: 1.25rem;
		padding-top: 0.5rem;
	}
	.receipt {
		width: 100%;
		max-width: 22rem;
		background: #fff;
		padding: 1.5rem 1.25rem 1.75rem;
		font-family: var(--mono);
		font-size: 0.9rem;
		color: #222;
		box-shadow: 0 1px 0 var(--line), 0 10px 24px rgb(31 36 32 / 0.08);
		mask:
			conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) 50% / 14px 100%;
	}
	.shop {
		text-align: center;
		font-weight: 600;
		font-size: 1.15rem;
		letter-spacing: 0.08em;
	}
	.small {
		text-align: center;
		font-size: 0.78rem;
		color: #555;
		margin-top: 0.2rem;
	}
	.center {
		text-align: center;
	}
	hr {
		border: 0;
		border-top: 1.5px dashed #999;
		margin: 0.9rem 0;
	}
	.receipt h1 {
		font-family: var(--mono);
		display: grid;
		justify-items: center;
		gap: 0.25rem;
	}
	.receipt h1:focus {
		outline: none;
	}
	.receipt h1 span {
		font-size: 0.85rem;
		font-weight: 500;
	}
	.receipt h1 strong {
		font-size: 2.9rem;
		letter-spacing: 0.18em;
		padding-left: 0.18em;
		line-height: 1;
	}
	.who {
		text-align: center;
		margin-top: 0.4rem;
	}
	.receipt ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.receipt li {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
	}
	.receipt li.unit {
		color: #666;
		font-size: 0.8rem;
		margin-bottom: 0.35rem;
	}
	.total {
		display: flex;
		justify-content: space-between;
		font-weight: 600;
		font-size: 1rem;
		margin-bottom: 0.9rem;
	}
	.status {
		text-align: center;
		max-width: 28rem;
		color: var(--soft);
	}

	@media (min-width: 56rem) {
		.cols {
			grid-template-columns: minmax(0, 1fr) 22rem;
			gap: 2.5rem;
		}
		.checkout {
			position: sticky;
			top: 1rem;
		}
	}
</style>
