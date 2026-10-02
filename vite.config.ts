import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	// playwright-core is loaded only server-side at runtime (headless game health checks)
	// and drags in native modules (fsevents) Rollup can't bundle. Keep it external in dev;
	// the build avoids bundling it via a runtime dynamic import (see gamehealth.ts).
	ssr: {
		external: ['playwright-core']
	}
});
