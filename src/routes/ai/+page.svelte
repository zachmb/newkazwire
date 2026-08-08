<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import Icon from '@iconify/svelte';
	import { config } from '$lib/config';
	import GameRail from '$lib/components/GameRail.svelte';
	import { games } from '$lib/data/games';
	import { getCDNImageUrl } from '$lib/utils/cdn';
	import { localAiGames } from '$lib/stores/localAiGames';

	let prompt = '';
	let title = '';
	let description = '';
	let isGenerating = false;
	let isPublishing = false;
	let publishSuccess = false;
	let publishedId = '';
	let publishedPublicUrl = '';
	let error = '';
	let generatedGame: any = null;

	let communityGames: any[] = [];
	let communityGamesLoading = true;

	let remixId = $page.url.searchParams.get('remix');
	let sourceGame = remixId ? games.find((g) => g.href.endsWith(`/${remixId}`)) : null;

	$: mappedGames = games.map((g) => ({
		...g,
		image: getCDNImageUrl(g.image)
	}));

	let streamProgress = 0; // rough char count for a live progress feel

	async function handleGenerate() {
		if (!prompt || !title) {
			error = 'Please provide a title and a prompt.';
			return;
		}

		isGenerating = true;
		error = '';
		generatedGame = null;
		publishSuccess = false;
		publishedId = '';
		publishedPublicUrl = '';
		streamProgress = 0;

		try {
			const response = await fetch('/api/ai/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					prompt,
					title,
					description,
					remixContext: sourceGame
						? `Title: ${sourceGame.title}, Description: ${sourceGame.description}`
						: undefined
				})
			});

			if (!response.ok || !response.body) {
				const text = await response.text();
				throw new Error(text || 'Failed to generate');
			}

			// --- Consume SSE stream ---
			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = '';
			let codeAccumulator = '';

			outer: while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() ?? '';

				for (const line of lines) {
					if (!line.startsWith('data: ')) continue;
					const payload = line.slice(6);
					if (payload === '[PING]') continue; // heartbeat
					if (payload === '[DONE]') break outer;
					if (payload.startsWith('[ERROR]')) {
						throw new Error(decodeURIComponent(payload.slice(8)));
					}
					// New format: URL-encoded token payload. Fallback keeps compatibility with older streams.
					if (payload.startsWith('[TOK]')) {
						codeAccumulator += decodeURIComponent(payload.slice(5));
					} else {
						codeAccumulator += payload.replace(/\\n/g, '\n');
					}
					streamProgress = codeAccumulator.length;
				}
			}

			// Strip any accidental markdown fences
			let gameCode = codeAccumulator.trim();
			if (gameCode.startsWith('```html')) {
				gameCode = gameCode
					.replace(/^```html/, '')
					.replace(/```$/, '')
					.trim();
			} else if (gameCode.startsWith('```')) {
				gameCode = gameCode.replace(/^```/, '').replace(/```$/, '').trim();
			}

			const blob = new Blob([gameCode], { type: 'text/html' });
			const codeUrl = URL.createObjectURL(blob);

			// Save to localStorage for persistence across sessions
			const savedId = localAiGames.saveGame({
				id: crypto.randomUUID(),
				title,
				description: description || '',
				code: gameCode,
				createdAt: new Date().toISOString(),
				prompt
			});

			generatedGame = { title, code: gameCode, localId: savedId, codeUrl };

			// Save to sessionStorage for full-screen playback
			sessionStorage.setItem('ephemeral_ai_game', JSON.stringify({ title, code: gameCode }));
		} catch (err: any) {
			error = err.message;
		} finally {
			isGenerating = false;
		}
	}

	async function handlePublish() {
		if (!generatedGame || isPublishing) return;

		isPublishing = true;
		error = '';

		try {
			const response = await fetch('/api/ai/user-g', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title,
					description,
					code: generatedGame.code,
					sourceGameId: remixId
				})
			});

			const data = await response.json();
			if (!response.ok) throw new Error(data.error || 'Failed to publish');

			publishSuccess = true;
			publishedId = data.gameId;
			publishedPublicUrl = data.publicUrl || '';

			const destination = data.publicPath || `/ai/user-g/${data.gameId}`;
			// Use client routing first, then hard navigate fallback if needed.
			await goto(destination);
			if (window.location.pathname !== destination) {
				window.location.assign(destination);
			}
		} catch (err: any) {
			error = err.message;
		} finally {
			isPublishing = false;
		}
	}

	onMount(async () => {
		window.scrollTo(0, 0);
		try {
			const res = await fetch('/api/ai/gallery');
			const data = await res.json();
			if (res.ok) communityGames = (data.games || []).slice(0, 6);
		} catch {
			// silently fail
		} finally {
			communityGamesLoading = false;
		}
	});
</script>

<svelte:head>
	<title>{config.branding.name} - Kazwire AI Lab</title>
</svelte:head>

<div class="font-sans min-h-screen bg-gradient-to-br from-[#5B9BFF] to-[#2563EB] p-4 text-neutral">
	<div class="mx-auto grid max-w-[1800px] grid-cols-1 gap-6 lg:grid-cols-[1fr_5fr_2fr]">
		<!-- Left Rail -->
		<aside class="hidden h-full lg:block">
			<GameRail games={mappedGames} />
		</aside>

		<!-- Main Content -->
		<main class="flex flex-col gap-6">
			<!-- Header Card -->
			<div class="relative overflow-hidden rounded-3xl bg-white p-8 shadow-2xl">
				<div class="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl"></div>
				<div class="relative z-10 flex flex-col items-center gap-4 text-center">
					<div
						class="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-white shadow-xl"
					>
						<Icon icon="mdi:robot" class="text-5xl" />
					</div>
					<div>
						<h1 class="text-4xl font-black tracking-tight">Kazwire AI Lab</h1>
						<p class="text-lg opacity-70">Turn your ideas into playable games instantly.</p>
					</div>
				</div>
			</div>

			<div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
				<!-- Generation Form -->
				<section class="flex flex-col gap-6 rounded-3xl bg-white p-8 shadow-xl">
					<h2 class="flex items-center gap-2 text-2xl font-black">
						<Icon icon="mdi:creation" class="text-primary" />
						Create a New Game
					</h2>

					{#if sourceGame}
						<div
							class="flex items-center gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-4"
						>
							<div class="badge badge-primary font-bold">Remixing</div>
							<div class="font-bold text-neutral/70">{sourceGame.title}</div>
							<button
								type="button"
								class="btn btn-ghost btn-xs"
								on:click|preventDefault={() => {
									remixId = null;
									sourceGame = null;
								}}>Cancel Remix</button
							>
						</div>
					{/if}

					<div class="form-control w-full gap-4">
						<label class="label p-0" for="game-title">
							<span class="label-text font-bold">Game Title</span>
						</label>
						<input
							id="game-title"
							type="text"
							placeholder="e.g. Neon Breakout, Zombie Survival..."
							class="input input-bordered input-lg w-full rounded-2xl border-none bg-neutral/5 focus:bg-white"
							bind:value={title}
						/>

						<label class="label p-0" for="game-prompt">
							<span class="label-text font-bold">Describe your game (The Prompt)</span>
						</label>
						<textarea
							class="textarea textarea-bordered h-32 w-full rounded-2xl p-4 text-lg font-medium transition-all focus:textarea-primary focus:ring-2 focus:ring-primary/20"
							placeholder="e.g. A neon-style space shooter where you dodge asteroids and collect power-ups..."
							bind:value={prompt}
							disabled={isGenerating}
						/>

						{#if error}
							<div class="alert alert-error rounded-2xl font-bold shadow-sm">
								<Icon icon="mdi:alert-circle" />
								<span>{error}</span>
							</div>
						{/if}

							<button
								type="button"
								class="btn btn-primary btn-lg mt-4 h-16 rounded-2xl text-xl font-black text-white shadow-lg shadow-primary/30 transition-all active:scale-95"
								on:click|preventDefault={handleGenerate}
								disabled={isGenerating}
							>
							{#if isGenerating}
								<Icon icon="line-md:loading-alt-loop" class="text-2xl" />
								Generating Magic...
							{:else}
								<Icon icon="mdi:auto-fix" class="text-2xl" />
								Generate Game
							{/if}
						</button>
						<p class="mt-2 text-center text-xs opacity-50">Limit: 1 game per IP per 24 hours.</p>
					</div>
				</section>

				<!-- Preview/Result Container -->
				<section class="flex flex-col gap-6 rounded-3xl bg-white p-8 shadow-xl">
					{#if isGenerating}
						<!-- Generating: show spinner at top + playable community games below -->
						<div class="flex flex-col gap-6">
							<div class="flex items-center gap-4 rounded-2xl bg-primary/5 p-4">
								<div class="relative flex-shrink-0">
									<div class="skeleton h-12 w-32 rounded-xl"></div>
									<div class="skeleton h-12 w-32 rounded-xl"></div>
									<Icon
										icon="mdi:brain"
										class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl text-primary"
									/>
								</div>
								<div>
									<h3 class="font-black">AI is coding your game...</h3>
									<p class="text-sm opacity-60">
										{#if streamProgress > 0}{streamProgress.toLocaleString()} characters written...{:else}Connecting
											to AI... this takes ~2 minutes{/if}
									</p>
								</div>
							</div>

							<!-- Play community games while waiting -->
							{#if communityGames.length > 0}
								<div>
									<p class="mb-3 text-sm font-bold opacity-50">
										Play community games while you wait:
									</p>
									<div class="grid grid-cols-3 gap-2">
										{#each communityGames as g}
											<a
												href="/ai/user-g/{g.id}"
												target="_blank"
												class="group relative aspect-square overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 transition-all hover:scale-105 hover:shadow-lg"
											>
												<div
													class="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2 text-center"
												>
													<Icon
														icon="mdi:robot"
														class="text-2xl text-primary/50 transition-transform group-hover:scale-110"
													/>
													<span class="line-clamp-2 text-xs font-bold">{g.title}</span>
												</div>
												<div
													class="absolute right-1 top-1 flex items-center gap-0.5 rounded-full bg-black/30 px-1.5 py-0.5 text-[10px] font-bold text-yellow-300"
												>
													<Icon icon="mdi:star" class="text-[10px]" />{g.avgRating || 'New'}
												</div>
											</a>
										{/each}
									</div>
									<a
										href="/ai/gallery"
										target="_blank"
										class="mt-3 flex items-center justify-center gap-1 text-xs font-bold text-primary hover:underline"
									>
										See all community games <Icon icon="mdi:arrow-right" class="text-xs" />
									</a>
								</div>
							{:else if !communityGamesLoading}
								<div class="flex flex-col items-center gap-3 py-8 text-center opacity-30">
									<Icon icon="mdi:controller" class="text-6xl" />
									<p class="text-sm font-bold">
										No community games yet.<br />Yours will be the first!
									</p>
								</div>
							{:else}
								<div class="flex justify-center py-8 opacity-30">
									<span class="loading loading-spinner loading-spinner loading-md text-primary"></span>
								</div>
							{/if}
						</div>
					{:else if generatedGame}
						<div class="flex flex-col gap-6">
							<div class="flex items-center justify-between">
								<h3 class="text-2xl font-black text-success">Game Ready!</h3>
								<div class="flex gap-2">
									{#if !publishSuccess}
										<button
											type="button"
											class="btn btn-accent font-black"
											on:click|preventDefault={handlePublish}
											disabled={isPublishing}
										>
											{#if isPublishing}
												<Icon icon="line-md:loading-alt-loop" />
												Publishing...
											{:else}
												<Icon icon="mdi:cloud-upload" />
												Publish to Community
											{/if}
										</button>
									{/if}
									<a class="btn btn-primary text-white" href="/ai/play">
										Open Game
										<Icon icon="mdi:play" />
									</a>
								</div>
							</div>

							{#if publishSuccess}
								<div class="alert alert-success rounded-2xl shadow-sm">
									<Icon icon="mdi:check-circle" />
									<div class="flex flex-col">
										<span class="font-bold">Published to the Community Gallery!</span>
										<a
											href={publishedPublicUrl || `/ai/user-g/${publishedId}`}
											class="link break-all font-bold"
											>{publishedPublicUrl || `View Public Page & Share`}</a
										>
									</div>
								</div>
							{/if}
							<div
								class="aspect-video w-full overflow-hidden rounded-2xl border-4 border-neutral/5 bg-black shadow-inner"
							>
								<iframe
									id="game-preview"
									title="AI Generated Game"
									class="h-full w-full border-0"
									srcdoc={generatedGame.code}
									sandbox="allow-scripts allow-modals allow-pointer-lock"
								/>
							</div>
							<div class="skeleton h-full w-full rounded-2xl bg-neutral/5"></div>
							<div class="rounded-2xl bg-neutral/5 p-4 text-center">
								<p class="text-sm font-bold opacity-50">
									This game is ephemeral and only exists in your browser right now.
								</p>
							</div>
						</div>
					{:else}
						<div
							class="flex h-full flex-col items-center justify-center gap-6 py-20 text-center opacity-30"
						>
							<Icon icon="mdi:controller" class="text-9xl" />
							<p class="max-w-[15ch] text-xl font-black">
								Generate a game to see the preview here.
							</p>
						</div>
					{/if}
				</section>
			</div>
		</main>

		<!-- Right Column -->
		<aside class="flex flex-col gap-6">
			<div class="rounded-3xl bg-white p-6 shadow-xl">
				<div class="mb-4 flex items-center justify-between gap-2">
					<h3 class="text-xl font-black">Community Library</h3>
					<a href="/ai/gallery" class="text-sm font-bold text-primary hover:underline">See all</a>
				</div>
				{#if communityGamesLoading}
					<div class="flex justify-center py-6 opacity-50">
						<span class="loading loading-spinner loading-md text-primary"></span>
					</div>
				{:else if communityGames.length > 0}
					<div class="grid grid-cols-2 gap-2">
						{#each communityGames.slice(0, 4) as g}
							<a
								href="/ai/user-g/{g.id}"
								class="group rounded-xl bg-neutral/5 p-3 transition-all hover:bg-primary/10"
							>
								<div class="line-clamp-1 text-sm font-bold">{g.title}</div>
								<div class="mt-1 flex items-center gap-1 text-xs text-primary">
									<Icon icon="mdi:star" class="text-sm" />
									<span>{g.avgRating || 'New'}</span>
								</div>
							</a>
						{/each}
					</div>
				{:else}
					<p class="text-sm opacity-60">No published AI games yet.</p>
				{/if}
			</div>

			<div class="alert alert-info rounded-3xl bg-white p-6 shadow-xl">
				<Icon icon="mdi:information" class="text-2xl text-info" />
				<div>
					<h3 class="font-black">Private Generation</h3>
					<p class="text-sm opacity-70">
						Games are generated and sent directly to you. We don't store them on our servers.
					</p>
				</div>
			</div>

			<div class="rounded-3xl bg-white p-6 shadow-xl">
				<h3 class="mb-4 text-xl font-black">How it works</h3>
				<ul class="space-y-4">
					<li class="flex items-start gap-3">
						<div
							class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary"
						>
							1
						</div>
						<p class="text-sm">
							Your prompt undergoes <strong>multi-stage semantic parsing</strong> — extracting gameplay
							mechanics, genre context, and interaction constraints to construct a structured intent
							graph.
						</p>
					</li>
					<li class="flex items-start gap-3">
						<div
							class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary"
						>
							2
						</div>
						<p class="text-sm">
							A <strong>large-scale reasoning model</strong> performs multi-pass code synthesis — iteratively
							resolving game logic, collision systems, and render loops into a self-contained executable
							artifact.
						</p>
					</li>
					<li class="flex items-start gap-3">
						<div
							class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary"
						>
							3
						</div>
						<p class="text-sm">
							The output is <strong>sandboxed in an isolated browser context</strong> with a scoped execution
							environment — zero server-side state, complete client-side sovereignty.
						</p>
					</li>
				</ul>
			</div>
		</aside>
	</div>
</div>
