<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head><title>{page.status === 404 ? 'Halaman tidak ada' : 'Ada gangguan'} · Kedai Sore</title></svelte:head>

<section class="wrap err">
	<h1>{page.status === 404 ? 'Halaman tidak ada' : 'Ada gangguan'}</h1>
	<p>
		{page.status === 404
			? 'Alamat ini tidak ada di Kedai Sore.'
			: (page.error?.message ?? 'Coba muat ulang halaman.')}
	</p>
	<p><a class="btn" href="/">Buka menu</a></p>
</section>

<style>
	.err {
		padding-block: 3rem 4rem;
		display: grid;
		gap: 1rem;
		justify-items: start;
	}
	h1 {
		font-size: 2.5rem;
		color: var(--leaf-deep);
	}
</style>
