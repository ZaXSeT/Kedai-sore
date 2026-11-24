<script lang="ts">
	import Seo from '#lib/components/Seo.svelte';
	import { cart } from '#lib/cart.svelte.ts';
	import { CATEGORIES, MAX_QTY, SHOP, rupiah } from '#lib/menu.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const byId = $derived(new Map(data.products.map((p) => [p.id, p])));
	const lines = $derived(
		cart.entries
			.filter(([id]) => byId.has(id))
			.map(([id, qty]) => ({ product: byId.get(id)!, qty }))
	);
	const count = $derived(lines.reduce((s, l) => s + l.qty, 0));
	const total = $derived(lines.reduce((s, l) => s + l.qty * l.product.price_idr, 0));
	const hasSoldOut = $derived(lines.some((l) => !l.product.available));
</script>

<Seo
	title="Kedai Sore · Pesan kopi dari HP, ambil di kasir"
	description="Pilih kopi, nonkopi, dan camilan Kedai Sore, kirim pesanan, lalu tunjukkan kode ambil di kasir. Proyek konsep dengan data contoh."
/>

<div class="wrap intro">
	<h1>Menu sore ini</h1>
	<p>Pesan dari HP, lalu ambil dan bayar di kasir. {SHOP.hours}.</p>
</div>

<nav class="cats" aria-label="Kategori menu">
	<div class="wrap cats-row">
		{#each CATEGORIES as c (c.id)}
			<a href={`#${c.id}`}>{c.label}</a>
		{/each}
	</div>
</nav>

<div class="wrap layout" class:has-bar={count > 0}>
	<div class="menu">
		{#each CATEGORIES as c (c.id)}
			<section id={c.id} aria-labelledby={`judul-${c.id}`}>
				<h2 id={`judul-${c.id}`}>{c.label}</h2>
				<ul>
					{#each data.products.filter((p) => p.category === c.id) as p, i (p.id)}
						<li class="item" class:soldout={!p.available}>
							<img
								src={`/menu/${p.image}.webp`}
								width="480"
								height="480"
								alt=""
								loading={c.id === 'kopi' && i < 2 ? 'eager' : 'lazy'}
								decoding="async"
							/>
							<div class="text">
								<h3>{p.name}</h3>
								<p class="desc">{p.description}</p>
								<p class="price">
									{rupiah(p.price_idr)}
									{#if !p.available}<span class="tag">Habis hari ini</span>{/if}
								</p>
							</div>
							<div class="act">
								{#if !p.available}
									<span class="visually-hidden">{p.name} sedang habis</span>
								{:else if cart.qty(p.id) === 0}
									<button
										class="add"
										type="button"
										onclick={() => cart.add(p.id)}
										aria-label={`Tambah ${p.name}`}>Tambah</button
									>
								{:else}
									<div class="stepper" role="group" aria-label={`Jumlah ${p.name}`}>
										<button type="button" onclick={() => cart.set(p.id, cart.qty(p.id) - 1)} aria-label={`Kurangi ${p.name}`}>−</button>
										<output aria-live="polite">{cart.qty(p.id)}</output>
										<button
											type="button"
											onclick={() => cart.add(p.id)}
											disabled={cart.qty(p.id) >= MAX_QTY}
											aria-label={`Tambah ${p.name}`}>+</button
										>
									</div>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			</section>
		{/each}
	</div>

	<aside class="summary" aria-labelledby="judul-ringkas">
		<h2 id="judul-ringkas">Pesanan kamu</h2>
		{#if lines.length === 0}
			<p class="empty">Belum ada item. Ketuk <strong>Tambah</strong> pada menu untuk mulai.</p>
		{:else}
			<ul>
				{#each lines as l (l.product.id)}
					<li class:soldout={!l.product.available}>
						<span class="q">{l.qty}×</span>
						<span class="n"
							>{l.product.name}{#if !l.product.available}<em> · habis</em>{/if}</span
						>
						<span class="t">{rupiah(l.qty * l.product.price_idr)}</span>
					</li>
				{/each}
			</ul>
			<p class="sum"><span>Total · {count} item</span><strong>{rupiah(total)}</strong></p>
			{#if hasSoldOut}<p class="warn">Ada item yang habis. Hapus di halaman pesanan.</p>{/if}
			<a class="btn" href="/pesanan">Lanjut ke pesanan</a>
		{/if}
	</aside>
</div>

{#if count > 0}
	<a class="mobile-bar" href="/pesanan">
		<span>Lihat pesanan · {count} item</span>
		<strong>{rupiah(total)}</strong>
	</a>
{/if}

<style>
	.intro {
		padding-block: 1.75rem 1rem;
	}
	h1 {
		font-size: clamp(2.4rem, 9vw, 3.6rem);
		font-weight: 800;
		letter-spacing: -0.02em;
		color: var(--leaf-deep);
	}
	.intro p {
		margin-top: 0.4rem;
		color: var(--soft);
		max-width: 46ch;
	}
	.cats {
		position: sticky;
		top: 0;
		z-index: 10;
		background: color-mix(in srgb, var(--milk) 92%, transparent);
		backdrop-filter: blur(6px);
		border-block: 1px solid var(--line);
	}
	.cats-row {
		display: flex;
		gap: 0.5rem;
		padding-block: 0.6rem;
		overflow-x: auto;
	}
	.cats a {
		flex: none;
		padding: 0.4rem 1rem;
		border-radius: 999px;
		background: var(--butter);
		text-decoration: none;
		font-weight: 650;
	}
	.cats a:hover {
		background: var(--leaf-tint);
	}

	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 2rem;
		padding-block: 1rem 3rem;
	}
	.layout.has-bar {
		padding-bottom: 6.5rem;
	}
	section {
		scroll-margin-top: 4rem;
		padding-top: 1rem;
	}
	section h2 {
		font-size: 1.6rem;
		font-weight: 750;
		padding-bottom: 0.5rem;
		border-bottom: 2px solid var(--ink);
	}
	section ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.item {
		display: grid;
		grid-template-columns: 5.25rem minmax(0, 1fr);
		grid-template-areas: 'img text' 'img act';
		gap: 0.35rem 1rem;
		padding-block: 1rem;
		border-bottom: 1px dashed var(--line);
	}
	.item img {
		grid-area: img;
		width: 5.25rem;
		height: 5.25rem;
		object-fit: cover;
		border-radius: 1rem;
		background: var(--butter);
	}
	.text {
		grid-area: text;
		min-width: 0;
	}
	.item h3 {
		font-size: 1.2rem;
		font-weight: 700;
	}
	.desc {
		margin-top: 0.15rem;
		color: var(--soft);
		font-size: 0.95rem;
	}
	.price {
		margin-top: 0.3rem;
		font-family: var(--display);
		font-weight: 700;
		font-size: 1.1rem;
		font-variant-numeric: tabular-nums;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}
	.tag {
		font-family: var(--body);
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--alert);
		background: #f6e3df;
		padding: 0.1rem 0.55rem;
		border-radius: 999px;
	}
	.act {
		grid-area: act;
		display: flex;
		justify-content: flex-end;
	}
	.add {
		min-height: 2.6rem;
		padding: 0.35rem 1.2rem;
		border-radius: 999px;
		border: 1.5px solid var(--leaf);
		background: var(--paper);
		color: var(--leaf-deep);
		font-weight: 700;
		cursor: pointer;
	}
	.add:hover {
		background: var(--leaf);
		color: #fff;
	}
	.item.soldout img {
		filter: grayscale(1);
		opacity: 0.6;
	}
	.item.soldout h3,
	.item.soldout .desc {
		color: var(--soft);
	}

	.summary {
		display: none;
	}
	.summary h2 {
		font-size: 1.4rem;
		margin-bottom: 0.75rem;
	}
	.summary ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.5rem;
	}
	.summary li {
		display: grid;
		grid-template-columns: 2rem 1fr auto;
		gap: 0.5rem;
	}
	.summary li.soldout {
		color: var(--alert);
	}
	.q {
		font-weight: 700;
	}
	.t {
		font-variant-numeric: tabular-nums;
	}
	.sum {
		display: flex;
		justify-content: space-between;
		margin-block: 1rem;
		padding-top: 0.75rem;
		border-top: 2px solid var(--ink);
		font-size: 1.1rem;
	}
	.sum strong {
		font-family: var(--display);
		font-size: 1.3rem;
	}
	.empty {
		color: var(--soft);
	}
	.warn {
		color: var(--alert);
		font-weight: 600;
		margin-bottom: 0.75rem;
	}
	.summary .btn {
		width: 100%;
	}

	.mobile-bar {
		position: fixed;
		left: 0.75rem;
		right: 0.75rem;
		bottom: calc(0.75rem + env(safe-area-inset-bottom));
		z-index: 20;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		min-height: 3.5rem;
		padding: 0.5rem 1.25rem;
		border-radius: 999px;
		background: var(--leaf);
		color: #fff;
		font-weight: 700;
		text-decoration: none;
		box-shadow: 0 6px 18px rgb(31 77 42 / 0.28);
	}
	.mobile-bar strong {
		font-family: var(--display);
		font-size: 1.15rem;
	}

	@media (min-width: 40rem) {
		.item {
			grid-template-columns: 6.5rem minmax(0, 1fr) auto;
			grid-template-areas: 'img text act';
			align-items: center;
		}
		.item img {
			width: 6.5rem;
			height: 6.5rem;
		}
	}
	@media (min-width: 62rem) {
		.layout {
			grid-template-columns: minmax(0, 1fr) 21rem;
			gap: 3rem;
			align-items: start;
		}
		.layout.has-bar {
			padding-bottom: 3rem;
		}
		.summary {
			display: block;
			position: sticky;
			top: 4.5rem;
			margin-top: 1rem;
			background: var(--paper);
			border: 1px solid var(--line);
			border-radius: 1.25rem;
			padding: 1.25rem;
		}
		.mobile-bar {
			display: none;
		}
	}
</style>
