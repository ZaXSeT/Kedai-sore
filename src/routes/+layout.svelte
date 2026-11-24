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
	<meta name="theme-color" content="#fbf8f1" />
</svelte:head>

<a class="skip" href="#isi">Langsung ke isi</a>

<header class="site">
	<div class="wrap bar">
		<a class="mark" href="/">Kedai Sore</a>
		<p class="mode">Pickup · bayar di kasir</p>
	</div>
</header>

<main id="isi">
	{@render children()}
</main>

<footer class="site">
	<div class="wrap">
		<p>{SHOP.pickup}. {SHOP.hours}.</p>
		<p>Kedai Sore adalah proyek konsep untuk portofolio. Nama usaha, alamat, dan pesanan di situs ini fiktif.</p>
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
		z-index: 50;
	}
	.skip:focus {
		top: 0.5rem;
	}
	header.site {
		background: var(--milk);
		border-bottom: 1px solid var(--line);
	}
	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		min-height: 3.5rem;
	}
	.mark {
		font-family: var(--display);
		font-size: 1.45rem;
		font-weight: 800;
		color: var(--leaf-deep);
		text-decoration: none;
		letter-spacing: -0.01em;
	}
	.mode {
		font-size: 0.9rem;
		color: var(--soft);
	}
	footer.site {
		border-top: 1px solid var(--line);
		padding-block: 1.5rem 2rem;
		color: var(--soft);
		font-size: 0.9rem;
		display: grid;
	}
	footer.site p + p {
		margin-top: 0.4rem;
	}
	/* Ruang untuk bilah "Lihat pesanan" di HP agar teks footer tidak tertutup. */
	@media (max-width: 61.99rem) {
		footer.site {
			padding-bottom: 6.5rem;
		}
	}
</style>
