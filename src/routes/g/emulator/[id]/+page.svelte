<script lang="ts">
	import { page } from '$app/stores';
	import type { PageData } from './$types';
	export let data: PageData;

	import { onMount } from 'svelte';
	import { config } from '$lib/config';
	import { CDN_BASE_URL } from '$lib/utils/cdn';

	onMount(async () => {
		// Get the game
		const game: any = data.game;

		// Create another script tag for the variables
		const script2: HTMLScriptElement = document.createElement('script');
		// Set the type
		script2.type = 'text/javascript';
		// Set the varaibles
		script2.innerHTML = `
            EJS_player = '#game';
            EJS_gameUrl = '${CDN_BASE_URL}/game/emulated/${game.emulatorFile}'; // Url to Game rom
            EJS_pathtodata = '${CDN_BASE_URL}/game/emulated/emulatorJS/';
            EJS_core = '${game.emulatorCore}';
        `;
		// Append the script tag to the body
		document.body.appendChild(script2);

		// Make a script tag
		const script: HTMLScriptElement = document.createElement('script');
		// Set the src to the game's loader
		script.src = CDN_BASE_URL + '/game/emulated/emulatorJS/loader.js';
		// Append the script tag
		document.body.appendChild(script);
	});
</script>

{#if data.game.emulatorType == 'emulatorjs'}
	<head>
		<meta
			name="description"
			content="Play {data.game.title} for free now on {$page.url.hostname}!"
		/>
		<meta
			property="og:description"
			content="Play {data.game.title} for free now on {$page.url.hostname}!"
		/>
	</head>

	<div class="min-w-screen flex min-h-screen items-center justify-center text-center">
		<div class="min-w-screen min-h-screen" id="game" />
	</div>
{/if}
