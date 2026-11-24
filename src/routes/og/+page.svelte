<script lang="ts">
	import { rupiah } from '#lib/menu.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const pick = $derived(
		['es-kopi-sore', 'americano', 'roti-gula-aren'].map((id) => data.products.find((p) => p.id === id)!)
	);
</script>

<svelte:head><meta name="robots" content="noindex" /></svelte:head>

<div class="og">
	<div class="left">
		<p class="name">Kedai Sore</p>
		<p class="line">Pesan dari HP, ambil dan bayar di kasir.</p>
		<ul>
			{#each pick as p (p.id)}
				<li>
					<img src={`/menu/${p.image}.webp`} alt="" width="480" height="480" />
					<span>{p.name}</span>
					<b>{rupiah(p.price_idr)}</b>
				</li>
			{/each}
		</ul>
	</div>
	<div class="right">
		<div class="receipt">
			<p class="c">KEDAI SORE</p>
			<hr />
			<p class="c small">Kode ambil</p>
			<p class="code">T93N</p>
			<hr />
			<p class="row"><span>2 × Es Kopi Sore</span><span>Rp48.000</span></p>
			<p class="row"><span>1 × Roti Gula Aren</span><span>Rp20.000</span></p>
			<hr />
			<p class="row b"><span>TOTAL · 3 item</span><span>Rp68.000</span></p>
		</div>
	</div>
</div>

<style>
	:global(header.site),
	:global(footer.site),
	:global(.skip) {
		display: none !important;
	}
	.og {
		width: 1200px;
		height: 630px;
		display: grid;
		grid-template-columns: 1fr 460px;
		background: var(--milk);
		overflow: hidden;
	}
	.left {
		padding: 60px 40px 0 70px;
	}
	.name {
		font: 800 96px/1 var(--display);
		color: var(--leaf-deep);
		letter-spacing: -0.02em;
	}
	.line {
		margin-top: 14px;
		font-size: 28px;
		color: var(--soft);
	}
	ul {
		list-style: none;
		margin: 36px 0 0;
		padding: 0;
		display: grid;
		gap: 14px;
	}
	li {
		display: grid;
		grid-template-columns: 84px 1fr auto;
		align-items: center;
		gap: 22px;
		font: 700 30px var(--display);
	}
	li img {
		width: 84px;
		height: 84px;
		border-radius: 18px;
		object-fit: cover;
	}
	.right {
		background: var(--leaf);
		display: grid;
		place-items: center;
	}
	.receipt {
		width: 340px;
		background: #fff;
		padding: 26px 26px 30px;
		font-family: var(--mono);
		font-size: 17px;
		transform: rotate(2deg);
		box-shadow: 0 14px 30px rgb(0 0 0 / 0.25);
	}
	.c {
		text-align: center;
		font-weight: 600;
		letter-spacing: 0.08em;
	}
	.small {
		font-weight: 500;
		letter-spacing: 0;
		font-size: 15px;
	}
	.code {
		text-align: center;
		font-size: 64px;
		font-weight: 600;
		letter-spacing: 0.16em;
		line-height: 1.1;
	}
	hr {
		border: 0;
		border-top: 2px dashed #999;
		margin: 14px 0;
	}
	.row {
		display: flex;
		justify-content: space-between;
	}
	.b {
		font-weight: 600;
	}
</style>
