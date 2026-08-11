<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import Icon from '@iconify/svelte';
	import { config } from '$lib/config';
	import GameRail from '$lib/components/GameRail.svelte';
	import { games } from '$lib/data/games';
	import { getCDNImageUrl, CDN_BASE_URL } from '$lib/utils/cdn';
	import { localAiGames, type LocalAiGame } from '$lib/stores/localAiGames';
	import { getUid, getPlayerName, setPlayerName } from '$lib/utils/streak';
	import NameGate from '$lib/components/ai/NameGate.svelte';
	import AiGameCard from '$lib/components/ai/AiGameCard.svelte';

	// --- Identity (account-free) ---
	// playerName is the public creator attribution; empty ('' / 'Anonymous') means
	// the player hasn't named themselves yet and the name-gate must run first.
	let playerName = '';
	$: hasName = !!playerName && playerName !== 'Anonymous';

	// --- Mode: build with AI vs. upload your own HTML ---
	let mode: 'create' | 'upload' = 'create';

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

	// Whether to reveal the name-gate inline (triggered when a gated action is attempted).
	let showNameGate = false;

	// --- Upload state ---
	let uploadTitle = '';
	let uploadDescription = '';
	let uploadCode = '';
	let uploadFileName = '';
	let isUploading = false;
	let uploadError = '';
	let uploadSuccess = false;
	let uploadedId = '';
	let uploadedPublicPath = '';

	/**
	 * Capture the game's first canvas frame as a PNG data URL for the gallery cover.
	 * Renders the code in a hidden SAME-ORIGIN srcdoc iframe (so we can read its
	 * canvas — the public codeUrl is cross-origin and can't be captured), waits for it
	 * to draw, then reads the largest canvas. Best-effort: resolves '' on any failure
	 * so it never blocks publishing.
	 */
	function captureCover(code: string): Promise<string> {
		return new Promise((resolve) => {
			let done = false;
			const finish = (v: string) => { if (!done) { done = true; try { iframe.remove(); } catch {} resolve(v); } };
			const iframe = document.createElement('iframe');
			iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
			iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:900px;height:600px;border:0;';
			iframe.srcdoc = code;
			document.body.appendChild(iframe);
			const grab = () => {
				try {
					const doc = iframe.contentWindow?.document;
					const canvases = doc ? Array.from(doc.querySelectorAll('canvas')) : [];
					const c = canvases.sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];
					if (c && c.width > 0 && c.height > 0) {
						finish(c.toDataURL('image/png'));
						return;
					}
				} catch {}
				finish('');
			};
			// Give the game ~1.8s to render a frame, then snapshot.
			setTimeout(grab, 1800);
			setTimeout(() => finish(''), 4000); // hard cap
		});
	}

	let communityGames: any[] = [];
	let communityGamesLoading = true;

	// The player's own saved AI games (localStorage-backed).
	$: myGames = $localAiGames;

	let remixId = $page.url.searchParams.get('remix');
	let sourceGame = remixId ? games.find((g) => g.href.endsWith(`/${remixId}`)) : null;

	$: mappedGames = games.map((g) => ({
		...g,
		image: getCDNImageUrl(g.image)
	}));

	let streamProgress = 0; // rough char count for a live progress feel

	/** Gate helper: returns true if the player is named; otherwise reveals the gate. */
	function ensureNamed(): boolean {
		const name = getPlayerName();
		playerName = name; // keep reactive UI (hero chip, hints) in sync
		if (name && name !== 'Anonymous') return true;
		showNameGate = true;
		error = '';
		return false;
	}

	function onNameSaved() {
		playerName = getPlayerName();
		showNameGate = false;
	}

	async function handleGenerate() {
		if (!prompt || !title) {
			error = 'Please provide a title and a prompt.';
			return;
		}
		// NAME-GATE: a player must name themselves before generating.
		if (!ensureNamed()) return;

		isGenerating = true;
		error = '';
		generatedGame = null;
		publishSuccess = false;
		publishedId = '';
		publishedPublicUrl = '';
		streamProgress = 0;

		try {
			// Remix: hand the AI the ACTUAL source game code (best-effort fetch of the
			// static build) so it edits the real game, not a guess from the description.
			let remixCode: string | undefined;
			if (sourceGame && remixId) {
				try {
					const srcRes = await fetch(`${CDN_BASE_URL}/game/static/${remixId}/index.html`);
					if (srcRes.ok) {
						const html = await srcRes.text();
						if (html && html.toLowerCase().includes('<html')) remixCode = html;
					}
				} catch { /* fall back to the description-only remix */ }
			}

			const response = await fetch('/api/ai/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					prompt,
					title,
					description,
					remixContext: sourceGame
						? `Title: ${sourceGame.title}, Description: ${sourceGame.description}`
						: undefined,
					remixCode
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

			// Every generated game is auto-published to the community gallery (with a
			// captured cover + creator attribution). Best-effort — a publish hiccup
			// still leaves the game playable locally.
			await publishGame();
		} catch (err: any) {
			error = err.message;
		} finally {
			isGenerating = false;
		}
	}

	async function publishGame() {
		if (!generatedGame || isPublishing || publishSuccess) return;

		isPublishing = true;
		try {
			// Snapshot a cover frame client-side (same-origin srcdoc) before publishing.
			const cover = await captureCover(generatedGame.code);
			const response = await fetch('/api/ai/user-g', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title,
					description,
					code: generatedGame.code,
					sourceGameId: remixId,
					creatorName: getPlayerName(),
					creatorUid: getUid(),
					source: 'ai',
					cover
				})
			});

			const data = await response.json();
			if (!response.ok) throw new Error(data.error || 'Failed to publish');

			publishSuccess = true;
			publishedId = data.gameId;
			publishedPublicUrl = data.publicUrl || '';
		} catch (err: any) {
			// Surface but don't block — the game is still playable from this page.
			error = err.message;
		} finally {
			isPublishing = false;
		}
	}

	// --- Upload flow ---
	function onFilePicked(e: Event) {
		uploadError = '';
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		uploadFileName = file.name;
		if (!uploadTitle) uploadTitle = file.name.replace(/\.html?$/i, '');
		const reader = new FileReader();
		reader.onload = () => {
			uploadCode = typeof reader.result === 'string' ? reader.result : '';
		};
		reader.onerror = () => { uploadError = 'Could not read that file. Try again or paste the HTML.'; };
		reader.readAsText(file);
	}

	async function handleUpload() {
		uploadError = '';
		if (!uploadTitle.trim()) { uploadError = 'Please give your game a title.'; return; }
		if (!uploadCode.trim()) { uploadError = 'Select a .html file or paste your game code.'; return; }
		if (!uploadCode.toLowerCase().includes('<html') && !uploadCode.toLowerCase().includes('<!doctype')) {
			uploadError = "That doesn't look like an HTML game. It should contain an <html> document.";
			return;
		}
		// NAME-GATE also applies to uploads.
		if (!ensureNamed()) return;

		isUploading = true;
		try {
			const response = await fetch('/api/ai/user-g', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: uploadTitle.trim(),
					description: uploadDescription.trim(),
					code: uploadCode,
					creatorName: getPlayerName(),
					creatorUid: getUid(),
					source: 'upload'
				})
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.error || 'Upload failed');

			uploadSuccess = true;
			uploadedId = data.gameId;
			uploadedPublicPath = data.publicPath || (data.gameId ? `/ai/user-g/${data.gameId}` : '');
		} catch (err: any) {
			uploadError = err.message || 'Upload failed';
		} finally {
			isUploading = false;
		}
	}

	function resetUpload() {
		uploadTitle = '';
		uploadDescription = '';
		uploadCode = '';
		uploadFileName = '';
		uploadError = '';
		uploadSuccess = false;
		uploadedId = '';
		uploadedPublicPath = '';
	}

	// --- My Games card actions ---
	function openMyGame(g: LocalAiGame) {
		try {
			sessionStorage.setItem('ephemeral_ai_game', JSON.stringify({ title: g.title, code: g.code }));
		} catch { /* ignore */ }
		goto('/ai/play');
	}

	function remixMyGame(g: LocalAiGame) {
		mode = 'create';
		title = `${g.title} (Remix)`;
		prompt = g.prompt ? `Remix this game: ${g.prompt}` : `Remix and improve "${g.title}".`;
		description = g.description || '';
		generatedGame = null;
		publishSuccess = false;
		error = '';
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	onMount(async () => {
		window.scrollTo(0, 0);
		playerName = getPlayerName();
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
</svelte:head>

<div class="min-h-screen bg-base-200 p-4 font-sans text-base-content">
	<div class="mx-auto grid max-w-[1800px] grid-cols-1 gap-6 lg:grid-cols-[1fr_5fr_2fr]">
		<!-- Left Rail -->
		<aside class="hidden h-full lg:block">
			<GameRail games={mappedGames} />
		</aside>

		<!-- Main Content -->
		<main class="flex flex-col gap-6">
			<!-- Hero header -->
			<div class="relative overflow-hidden rounded-3xl bg-base-100 p-6 shadow-xl sm:p-8">
				<div class="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl"></div>
				<div class="relative z-10 flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
					<div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-content shadow-lg">
						<Icon icon="mdi:robot-happy" class="text-4xl" />
					</div>
					<div class="flex-1">
						<h1 class="text-3xl font-black tracking-tight sm:text-4xl">Kazwire AI Lab</h1>
						<p class="mt-1 text-base text-base-content/60">
							Describe a game and play it in seconds — or upload your own. Everything you make is shared to the community gallery.
						</p>
					</div>
					{#if hasName}
						<div class="hidden items-center gap-2 rounded-full bg-base-200 px-4 py-2 sm:flex">
							<Icon icon="mdi:account-circle" class="text-xl text-primary" />
							<span class="text-sm font-bold">{playerName}</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- Mode tabs -->
			<div role="tablist" class="tabs tabs-boxed w-full rounded-2xl bg-base-100 p-1.5 shadow-sm">
				<button
					role="tab"
					class="tab flex-1 gap-2 rounded-xl font-bold {mode === 'create' ? 'tab-active bg-primary text-primary-content' : ''}"
					on:click={() => (mode = 'create')}
				>
					<Icon icon="mdi:auto-fix" /> Build with AI
				</button>
				<button
					role="tab"
					class="tab flex-1 gap-2 rounded-xl font-bold {mode === 'upload' ? 'tab-active bg-primary text-primary-content' : ''}"
					on:click={() => (mode = 'upload')}
				>
					<Icon icon="mdi:upload" /> Upload a game
				</button>
			</div>

			<!-- Name gate (shown when a gated action is attempted without a name) -->
			{#if showNameGate && !hasName}
				<NameGate on:saved={onNameSaved} />
			{/if}

			{#if mode === 'create'}
				<div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
					<!-- Generation Form -->
					<section class="flex flex-col gap-5 rounded-3xl bg-base-100 p-6 shadow-xl sm:p-8">
						<h2 class="flex items-center gap-2 text-2xl font-black">
							<Icon icon="mdi:creation" class="text-primary" />
							Create a new game
						</h2>

						{#if sourceGame}
							<div class="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
								<div class="badge badge-primary font-bold">Remixing</div>
								<div class="font-bold text-base-content/70">{sourceGame.title}</div>
								<button
									type="button"
									class="btn btn-ghost btn-xs ml-auto"
									on:click|preventDefault={() => { remixId = null; sourceGame = null; }}
								>Cancel remix</button>
							</div>
						{/if}

						<div class="flex w-full flex-col gap-4">
							<label class="form-control w-full">
								<span class="label-text mb-1 font-bold">Game title</span>
								<input
									type="text"
									placeholder="e.g. Neon Breakout, Zombie Survival..."
									class="input input-bordered input-lg w-full rounded-2xl"
									bind:value={title}
									disabled={isGenerating}
								/>
							</label>

							<label class="form-control w-full">
								<span class="label-text mb-1 font-bold">Describe your game</span>
								<textarea
									class="textarea textarea-bordered h-32 w-full rounded-2xl p-4 text-base font-medium focus:textarea-primary"
									placeholder="e.g. A neon-style space shooter where you dodge asteroids and collect power-ups..."
									bind:value={prompt}
									disabled={isGenerating}
								/>
							</label>

							{#if !hasName && !showNameGate}
								<p class="flex items-center gap-1.5 text-sm text-base-content/60">
									<Icon icon="mdi:information-outline" class="text-base text-primary" />
									You'll be asked to add your name before generating — it's shown as the creator.
								</p>
							{/if}

							{#if error}
								<div class="alert alert-error rounded-2xl font-bold">
									<Icon icon="mdi:alert-circle" />
									<span>{error}</span>
								</div>
							{/if}

							<button
								type="button"
								class="btn btn-primary btn-lg mt-1 h-16 rounded-2xl text-xl font-black shadow-lg shadow-primary/20 transition-all active:scale-95"
								on:click|preventDefault={handleGenerate}
								disabled={isGenerating}
							>
								{#if isGenerating}
									<Icon icon="line-md:loading-alt-loop" class="text-2xl" />
									Generating magic...
								{:else}
									<Icon icon="mdi:auto-fix" class="text-2xl" />
									Generate game
								{/if}
							</button>
							<p class="text-center text-xs text-base-content/50">Limit: 1 game per IP per 24 hours.</p>
						</div>
					</section>

					<!-- Preview / Result -->
					<section class="flex flex-col gap-6 rounded-3xl bg-base-100 p-6 shadow-xl sm:p-8">
						{#if isGenerating}
							<div class="flex flex-col gap-6">
								<div class="flex items-center gap-4 rounded-2xl bg-primary/5 p-4">
									<div class="relative flex h-12 w-12 shrink-0 items-center justify-center">
										<span class="loading loading-spinner loading-lg text-primary"></span>
									</div>
									<div>
										<h3 class="font-black">AI is coding your game...</h3>
										<p class="text-sm text-base-content/60">
											{#if streamProgress > 0}{streamProgress.toLocaleString()} characters written...{:else}Connecting to AI... this takes ~2 minutes{/if}
										</p>
									</div>
								</div>

								{#if communityGames.length > 0}
									<div>
										<p class="mb-3 text-sm font-bold text-base-content/50">Play community games while you wait:</p>
										<div class="grid grid-cols-3 gap-2">
											{#each communityGames as g}
												<a
													href="/ai/user-g/{g.id}"
													target="_blank"
													class="group relative aspect-square overflow-hidden rounded-xl bg-base-200 transition-all hover:scale-105 hover:shadow-lg"
												>
													<div class="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2 text-center">
														<Icon icon="mdi:robot" class="text-2xl text-primary/50 transition-transform group-hover:scale-110" />
														<span class="line-clamp-2 text-xs font-bold">{g.title}</span>
													</div>
													<div class="absolute right-1 top-1 flex items-center gap-0.5 rounded-full bg-base-content/20 px-1.5 py-0.5 text-[10px] font-bold text-warning">
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
									<div class="flex flex-col items-center gap-3 py-8 text-center text-base-content/30">
										<Icon icon="mdi:controller" class="text-6xl" />
										<p class="text-sm font-bold">No community games yet.<br />Yours will be the first!</p>
									</div>
								{:else}
									<div class="flex justify-center py-8 text-base-content/30">
										<span class="loading loading-spinner loading-md text-primary"></span>
									</div>
								{/if}
							</div>
						{:else if generatedGame}
							<div class="flex flex-col gap-6">
								<div class="flex flex-wrap items-center justify-between gap-3">
									<h3 class="text-2xl font-black text-success">Game ready!</h3>
									<div class="flex gap-2">
										{#if isPublishing}
											<span class="btn btn-ghost font-black no-animation">
												<Icon icon="line-md:loading-alt-loop" />
												Publishing…
											</span>
										{:else if !publishSuccess}
											<button type="button" class="btn btn-accent font-black" on:click|preventDefault={publishGame}>
												<Icon icon="mdi:cloud-upload" />
												Retry publish
											</button>
										{/if}
										<a class="btn btn-primary" href="/ai/play">
											Open game
											<Icon icon="mdi:play" />
										</a>
									</div>
								</div>

								{#if publishSuccess}
									<div class="alert alert-success rounded-2xl">
										<Icon icon="mdi:check-circle" />
										<div class="flex flex-col">
											<span class="font-bold">Published to the community gallery!</span>
											<a href={publishedPublicUrl || `/ai/user-g/${publishedId}`} class="link break-all font-bold">
												{publishedPublicUrl || `View public page & share`}
											</a>
										</div>
									</div>
								{/if}
								<div class="aspect-video w-full overflow-hidden rounded-2xl border-4 border-base-300 bg-black shadow-inner">
									<iframe
										id="game-preview"
										title="AI Generated Game"
										class="h-full w-full border-0"
										srcdoc={generatedGame.code}
										sandbox="allow-scripts allow-modals allow-pointer-lock"
									/>
								</div>
							</div>
						{:else}
							<div class="flex h-full flex-col items-center justify-center gap-6 py-20 text-center text-base-content/30">
								<Icon icon="mdi:controller" class="text-8xl" />
								<p class="max-w-[18ch] text-xl font-black">Generate a game to see the preview here.</p>
							</div>
						{/if}
					</section>
				</div>
			{:else}
				<!-- UPLOAD MODE -->
				<section class="flex flex-col gap-5 rounded-3xl bg-base-100 p-6 shadow-xl sm:p-8">
					<h2 class="flex items-center gap-2 text-2xl font-black">
						<Icon icon="mdi:upload" class="text-primary" />
						Upload your own game
					</h2>

					{#if uploadSuccess}
						<div class="flex flex-col items-center gap-5 py-8 text-center">
							<div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-success/15 text-success">
								<Icon icon="mdi:check-circle" class="text-4xl" />
							</div>
							<div>
								<h3 class="text-2xl font-black text-success">Game uploaded!</h3>
								<p class="mt-1 text-base-content/60">Your game is live in the community gallery.</p>
							</div>
							<div class="flex flex-wrap justify-center gap-3">
								<a class="btn btn-primary" href={uploadedPublicPath}>
									<Icon icon="mdi:play" /> Open your game
								</a>
								<button type="button" class="btn btn-ghost" on:click={resetUpload}>
									<Icon icon="mdi:plus" /> Upload another
								</button>
							</div>
						</div>
					{:else}
						<p class="text-base-content/60">
							Have a self-contained HTML game? Upload the <code class="rounded bg-base-200 px-1.5 py-0.5 text-sm">.html</code> file or paste its code below. It should be a single file that runs on its own.
						</p>

						<div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
							<div class="flex flex-col gap-4">
								<label class="form-control w-full">
									<span class="label-text mb-1 font-bold">Game title</span>
									<input
										type="text"
										placeholder="My awesome game"
										class="input input-bordered input-lg w-full rounded-2xl"
										bind:value={uploadTitle}
										disabled={isUploading}
									/>
								</label>

								<label class="form-control w-full">
									<span class="label-text mb-1 font-bold">Description <span class="text-base-content/40">(optional)</span></span>
									<textarea
										class="textarea textarea-bordered h-24 w-full rounded-2xl p-4 focus:textarea-primary"
										placeholder="A short line about how it plays..."
										bind:value={uploadDescription}
										disabled={isUploading}
									/>
								</label>

								<div class="form-control w-full">
									<span class="label-text mb-1 font-bold">Choose a .html file</span>
									<label class="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-base-300 p-4 transition-colors hover:border-primary/50 hover:bg-primary/5">
										<Icon icon="mdi:file-code-outline" class="text-3xl text-primary" />
										<span class="min-w-0 flex-1">
											<span class="block truncate font-bold">{uploadFileName || 'Click to select a .html file'}</span>
											<span class="block text-xs text-base-content/50">or paste your code on the right</span>
										</span>
										<input type="file" accept=".html,text/html" class="hidden" on:change={onFilePicked} disabled={isUploading} />
									</label>
								</div>
							</div>

							<label class="form-control w-full">
								<span class="label-text mb-1 font-bold">Or paste HTML</span>
								<textarea
									class="textarea textarea-bordered h-full min-h-[16rem] w-full rounded-2xl p-4 font-mono text-sm focus:textarea-primary"
									placeholder={'<!DOCTYPE html>\n<html>...</html>'}
									bind:value={uploadCode}
									disabled={isUploading}
								/>
							</label>
						</div>

						{#if !hasName && !showNameGate}
							<p class="flex items-center gap-1.5 text-sm text-base-content/60">
								<Icon icon="mdi:information-outline" class="text-base text-primary" />
								You'll be asked to add your name before uploading — it's shown as the creator.
							</p>
						{/if}

						{#if uploadError}
							<div class="alert alert-error rounded-2xl font-bold">
								<Icon icon="mdi:alert-circle" />
								<span>{uploadError}</span>
							</div>
						{/if}

						<button
							type="button"
							class="btn btn-primary btn-lg h-16 rounded-2xl text-xl font-black shadow-lg shadow-primary/20 transition-all active:scale-95"
							on:click|preventDefault={handleUpload}
							disabled={isUploading}
						>
							{#if isUploading}
								<Icon icon="line-md:loading-alt-loop" class="text-2xl" />
								Uploading...
							{:else}
								<Icon icon="mdi:cloud-upload" class="text-2xl" />
								Upload game
							{/if}
						</button>
					{/if}
				</section>
			{/if}

			<!-- My AI Games -->
			<section class="rounded-3xl bg-base-100 p-6 shadow-xl sm:p-8">
				<div class="mb-5 flex items-center justify-between gap-2">
					<h2 class="flex items-center gap-2 text-2xl font-black">
						<Icon icon="mdi:folder-star" class="text-primary" />
						My AI games
					</h2>
					{#if myGames.length > 0}
						<span class="badge badge-lg font-bold">{myGames.length}</span>
					{/if}
				</div>

				{#if myGames.length > 0}
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
						{#each myGames as g (g.id)}
							<AiGameCard game={g} on:open={(e) => openMyGame(e.detail)} on:remix={(e) => remixMyGame(e.detail)} />
						{/each}
					</div>
				{:else}
					<div class="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-base-300 py-14 text-center text-base-content/40">
						<Icon icon="mdi:gamepad-variant-outline" class="text-6xl" />
						<p class="max-w-[24ch] font-bold">No games yet. Build one with AI or upload your own to see it here.</p>
					</div>
				{/if}
			</section>
		</main>

		<!-- Right Column -->
		<aside class="flex flex-col gap-6">
			<div class="rounded-3xl bg-base-100 p-6 shadow-xl">
				<div class="mb-4 flex items-center justify-between gap-2">
					<h3 class="text-xl font-black">Community library</h3>
					<a href="/ai/gallery" class="text-sm font-bold text-primary hover:underline">See all</a>
				</div>
				{#if communityGamesLoading}
					<div class="flex justify-center py-6 text-base-content/50">
						<span class="loading loading-spinner loading-md text-primary"></span>
					</div>
				{:else if communityGames.length > 0}
					<div class="grid grid-cols-2 gap-2">
						{#each communityGames.slice(0, 4) as g}
							<a href="/ai/user-g/{g.id}" class="group rounded-xl bg-base-200 p-3 transition-all hover:bg-primary/10">
								<div class="line-clamp-1 text-sm font-bold">{g.title}</div>
								<div class="mt-1 flex items-center gap-1 text-xs text-primary">
									<Icon icon="mdi:star" class="text-sm" />
									<span>{g.avgRating || 'New'}</span>
								</div>
							</a>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-base-content/60">No published AI games yet.</p>
				{/if}
			</div>

			<div class="rounded-3xl bg-base-100 p-6 shadow-xl">
				<div class="flex items-start gap-3">
					<Icon icon="mdi:earth" class="text-2xl text-info" />
					<div>
						<h3 class="font-black">Shared with the community</h3>
						<p class="text-sm text-base-content/70">
							Every game you make or upload is published to the community gallery under your name, so others can play and remix it.
						</p>
					</div>
				</div>
			</div>

			<div class="rounded-3xl bg-base-100 p-6 shadow-xl">
				<h3 class="mb-4 text-xl font-black">How it works</h3>
				<ul class="space-y-4">
					<li class="flex items-start gap-3">
						<div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">1</div>
						<p class="text-sm">Describe the game you want, or upload your own self-contained HTML file.</p>
					</li>
					<li class="flex items-start gap-3">
						<div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">2</div>
						<p class="text-sm">The AI writes a complete, playable game in one file — no setup, nothing to install.</p>
					</li>
					<li class="flex items-start gap-3">
						<div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">3</div>
						<p class="text-sm">Play it instantly, and it's auto-shared to the gallery for others to enjoy and remix.</p>
					</li>
				</ul>
			</div>
		</aside>
	</div>
</div>
