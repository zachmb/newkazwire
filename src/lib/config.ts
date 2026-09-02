export const config = {
	branding: {
		name: 'Kazwire',
		description: 'Play free browser games anywhere. A big collection of fun games — no downloads, just click and play.',
		slogan: 'Play the internet.',
		mainDomain: 'https://kazwire.com',
		supportEmail: 'support@kazwire.com'
	},
	social: {
		tiktok: null,
		discord: 'https://joinkaz.com'
	},
	analytics: {
		gtmID: 'GTM-KVGNDGZ7'
	},
	// Options: "hero", "main", "faq"
	// Order: top to bottom
	homeLayoutOrder: ['hero', 'main'],
	pinnedGames: ['tiny-fishing', 'fruit-ninja', 'subway-surfers', 'retro-bowl', 'geometry-dash'],
	features: {
		searchBar: true,
		accountCreation: true
	},
	faq: [
		{
			question: 'What is Kazwire?',
			answer: 'Kazwire is a free collection of browser games. Everything runs right in your browser — no downloads, no installs, no accounts required.'
		},
		{
			question: 'Is Kazwire free?',
			answer: 'Yes. Every game on Kazwire is completely free to play.'
		},
		{
			question: 'Do the games work at school?',
			answer: 'Kazwire is built to load fast and play anywhere, including on school and work networks.'
		},
		{
			question: 'How do I request a game?',
			answer: 'Use the Request a Game tile on the home page and let us know what you want to see next.'
		}
	],
	styling: {
		// Options: "boxy", "rounded"
		contentBoxStyleType: 'rounded',
		// Restored to the ORIGINAL kazwire.com DaisyUI theme (recovered exactly from the
		// April-2026 archive of the live site): amber-orange primary/secondary, steel-blue
		// accent/neutral "View more" pills, UPPERCASE buttons, 0.75rem rounding. These HSL
		// values are byte-for-byte the tokens DaisyUI compiled on the old site.
		daisyUITheme: {
			primary: 'hsl(33, 90%, 55%)', // Kazwire amber-orange
			secondary: 'hsl(33, 90%, 55%)', // amber-orange (matches primary, as on the old site)
			accent: 'hsl(202, 70%, 40%)', // steel blue (the "View more" pills)
			neutral: 'hsl(202, 70%, 40%)', // steel blue
			'base-100': 'hsl(220, 13%, 91%)', // light cool-grey canvas
			'base-content': 'hsl(220, 1%, 18%)', // near-black ink
			info: 'hsl(197, 73%, 59%)',
			success: 'hsl(176, 39%, 50%)',
			warning: 'hsl(33, 59%, 55%)',
			error: 'hsl(351, 66%, 74%)',
			'--rounded-box': '0.75rem',
			'--rounded-btn': '0.75rem',
			'--rounded-badge': '1.9rem',
			'--animation-btn': '0.25s',
			'--animation-input': '0.2s',
			'--btn-text-case': 'uppercase',
			'--btn-focus-scale': '0.95',
			'--border-btn': '1px',
			'--tab-border': '1px',
			'--tab-radius': '0.5rem'
		},
		daisyUIDarkTheme: {
			primary: 'hsl(33, 90%, 55%)', // same amber-orange in dark
			secondary: 'hsl(33, 90%, 55%)',
			accent: 'hsl(202, 70%, 40%)', // steel blue
			neutral: 'hsl(202, 70%, 40%)',
			'base-100': 'hsl(225, 6%, 13%)', // near-black canvas
			'base-content': 'hsl(226, 1%, 81%)', // light ink
			info: 'hsl(197, 73%, 59%)',
			success: 'hsl(176, 39%, 50%)',
			warning: 'hsl(33, 59%, 55%)',
			error: 'hsl(351, 66%, 74%)',
			'--rounded-box': '0.75rem',
			'--rounded-btn': '0.75rem',
			'--rounded-badge': '1.9rem',
			'--animation-btn': '0.25s',
			'--animation-input': '0.2s',
			'--btn-text-case': 'uppercase',
			'--btn-focus-scale': '0.95',
			'--border-btn': '1px',
			'--tab-border': '1px',
			'--tab-radius': '0.5rem'
		}
	},
	fonts: {
		headingFont: ['Inter', 'sans'],
		bodyFont: ['Inter', 'sans'],
		googleFont: 'Inter' // imports a single google font
	}
} as const;
