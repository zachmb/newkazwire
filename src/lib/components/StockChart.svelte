<script lang="ts">
	// S&P-500-style area chart: gradient fill under a trend-colored line, faint gridlines.
	// Pure SVG, no deps. `values` is a price series (oldest → newest).
	export let values: number[] = [];
	export let height = 220;
	export let showGrid = true;

	const gid = 'sc' + Math.random().toString(36).slice(2, 9);
	const W = 1000; // viewBox width; the SVG scales to its container width

	$: pts = (values || []).filter((v) => typeof v === 'number' && isFinite(v));
	$: up = pts.length < 2 ? true : pts[pts.length - 1] >= pts[0];
	$: color = up ? '#16a34a' : '#ef4444';
	$: lo = pts.length ? Math.min(...pts) : 0;
	$: hi = pts.length ? Math.max(...pts) : 1;
	$: span = hi - lo || 1;
	const padT = 0.14;
	const padB = 0.14;
	$: xAt = (i: number) => (pts.length < 2 ? 0 : (i / (pts.length - 1)) * W);
	$: yAt = (v: number) => height - padB * height - ((v - lo) / span) * (height * (1 - padT - padB));
	$: line = pts.map((v, i) => `${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(' ');
	$: area = pts.length < 2 ? '' : `0,${height} ${line} ${W},${height}`;
</script>

<svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" class="w-full" style="height:{height}px" role="img" aria-label="price chart">
	<defs>
		<linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
			<stop offset="0%" stop-color={color} stop-opacity="0.30" />
			<stop offset="100%" stop-color={color} stop-opacity="0" />
		</linearGradient>
	</defs>
	{#if showGrid}
		{#each [0.25, 0.5, 0.75] as g}
			<line x1="0" x2={W} y1={height * g} y2={height * g} stroke="currentColor" class="text-base-300" stroke-width="1" stroke-dasharray="3 7" vector-effect="non-scaling-stroke" />
		{/each}
	{/if}
	{#if pts.length >= 2}
		<polygon points={area} fill={`url(#${gid})`} />
		<polyline points={line} fill="none" stroke={color} stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
	{:else}
		<line x1="0" x2={W} y1={height / 2} y2={height / 2} stroke="currentColor" class="text-base-300" stroke-width="2" stroke-dasharray="4 6" vector-effect="non-scaling-stroke" />
	{/if}
</svg>
