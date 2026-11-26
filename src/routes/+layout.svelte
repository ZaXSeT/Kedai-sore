<script lang="ts">
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import { cart } from '#lib/cart.svelte.ts';
	import { SHOP } from '#lib/menu.ts';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	$effect(() => {
		cart.init();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} type="image/svg+xml" />
	<meta name="theme-color" content="#2e6b3c" />
</svelte:head>

<a class="skip" href="#isi">Langsung ke isi</a>

<!-- Navbar penuh dari tepi ke tepi, menempel di atas. -->
<header class="site">
	<a class="mark" href="/">
		<svg viewBox="0 0 64 64" aria-hidden="true"
			><path d="M19 22h26l-3 30a4 4 0 0 1-4 3.6H26a4 4 0 0 1-4-3.6z" fill="currentColor" /><rect x="16" y="16" width="32" height="6" rx="3" fill="currentColor" /><path d="M36 16 40 6" stroke="currentColor" stroke-width="4" stroke-linecap="round" /></svg
		>
		Kedai Sore
	</a>
	<nav aria-label="Utama">
		<a class="link" href="/#kopi">Menu</a>
		<a class="order" href="/pesanan">
			Pesanan
			{#if cart.ready && cart.count > 0}<span class="count">{cart.count}<span class="visually-hidden"> item</span></span>{/if}
		</a>
	</nav>
</header>

<main id="isi">
	{@render children()}
</main>

<footer class="site">
	<p class="foot-mark">Kedai Sore</p>
	<div class="foot-info">
		<p>{SHOP.pickup}</p>
		<p>{SHOP.hours}</p>
		<p>Proyek konsep untuk portofolio. Nama usaha, alamat, dan pesanan di situs ini fiktif.</p>
	</div>
</footer>

<style>
	.skip {
		position: absolute;
		left: 0.5rem;
		top: -3rem;
		background: var(--ink);
		color: #fff;
		padding: 0.5rem 0.75rem;
		z-index: 60;
	}
	.skip:focus {
		top: 0.5rem;
	}
	header.site {
		position: sticky;
		top: 0;
		z-index: 30;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		width: 100%;
		height: var(--header-h);
		padding-inline: var(--gutter);
		background: var(--leaf);
		color: #fff;
		border-bottom: 1px solid var(--gold);
	}
	.mark {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-family: var(--display);
		font-size: 1.45rem;
		font-weight: 800;
		text-decoration: none;
		letter-spacing: -0.01em;
	}
	.mark svg {
		width: 1.6rem;
		height: 1.6rem;
		color: var(--gold);
	}
	nav {
		display: flex;
		align-items: center;
		gap: clamp(0.75rem, 2.5vw, 1.75rem);
	}
	.link {
		font-weight: 650;
		text-decoration: none;
	}
	.link:hover {
		text-decoration: underline;
	}
	.order {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		min-height: 2.5rem;
		padding: 0.35rem 0.5rem 0.35rem 1rem;
		border-radius: 999px;
		background: var(--milk);
		color: var(--leaf-deep);
		font-weight: 700;
		text-decoration: none;
	}
	.order:not(:has(.count)) {
		padding-right: 1rem;
	}
	.count {
		display: inline-grid;
		place-items: center;
		min-width: 1.75rem;
		height: 1.75rem;
		padding-inline: 0.4rem;
		border-radius: 999px;
		background: var(--gold);
		color: var(--leaf-deep);
		font-size: 0.9rem;
	}
	footer.site {
		margin-top: 3rem;
		background: var(--leaf-deep);
		color: #e7efe4;
		padding: 2.5rem var(--gutter) 3rem;
		display: grid;
		gap: 1.25rem;
		font-size: 0.92rem;
	}
	.foot-mark {
		font-family: var(--display);
		font-weight: 800;
		font-size: clamp(3rem, 13vw, 10rem);
		line-height: 0.85;
		letter-spacing: -0.03em;
		color: var(--gold-soft);
	}
	.foot-info {
		display: grid;
		gap: 0.3rem;
	}
	/* Ruang untuk bilah "Lihat pesanan" di HP agar teks footer tidak tertutup. */
	@media (max-width: 61.99rem) {
		footer.site {
			padding-bottom: 6.5rem;
		}
	}
	@media (min-width: 48rem) {
		.foot-info {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 2rem;
		}
	}
</style>
