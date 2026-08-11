export const config = {
	branding: {
		name: 'Kazwire',
		description: 'Play unblocked games at school (or anywhere!) on Kazwire. The best collection of fun, free browser games — no downloads, no blocks, just play.',
		slogan: 'Play the internet, unblocked.',
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
			answer: 'Kazwire is a free collection of unblocked browser games. Everything runs right in your browser — no downloads, no installs, no accounts required.'
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
		daisyUITheme: {
			primary: '#FF6A1A', // Kazwire orange
			secondary: '#2563EB', // Kazwire blue
			accent: '#3B82F6', // Bright blue accent
			neutral: '#0B1B33', // Deep navy (text / dark surfaces)
			'base-100': '#F5F8FF', // Light blue-white background
			info: '#2563EB',
			success: '#2563EB',
			warning: '#FF6A1A',
			error: '#EF4444',
			'--rounded-box': '1rem', // More rounded
			'--rounded-btn': '0.75rem'
			// "--rounded-badge": "1.9rem", // border radius rounded-badge utility class, used in badges and similar
			// "--animation-btn": "0.25s", // duration of animation when you click on button
			// "--animation-input": "0.2s", // duration of animation for inputs like checkbox, toggle, radio, etc
			// "--btn-text-case": "uppercase", // set default text transform for buttons
			// "--btn-focus-scale": "0.95", // scale transform of button when you focus on it
			// "--border-btn": "1px", // border width of buttons
			// "--tab-border": "1px", // border width of tabs
			// "--tab-radius": "0.5rem", // border radius of tabs
		},
		daisyUIDarkTheme: {
			primary: '#FF7A2E', // Kazwire orange (brighter for dark)
			secondary: '#3B82F6', // Kazwire blue
			accent: '#60A5FA', // Light blue accent
			neutral: '#E5ECF7', // Light text on dark
			'base-100': '#0B1220', // Deep navy canvas
			info: '#3B82F6',
			success: '#3B82F6',
			warning: '#FF7A2E',
			error: '#F87171',
			'--rounded-box': '1rem',
			'--rounded-btn': '0.75rem'
			// "--rounded-badge": "1.9rem", // border radius rounded-badge utility class, used in badges and similar
			// "--animation-btn": "0.25s", // duration of animation when you click on button
			// "--animation-input": "0.2s", // duration of animation for inputs like checkbox, toggle, radio, etc
			// "--btn-text-case": "uppercase", // set default text transform for buttons
			// "--btn-focus-scale": "0.95", // scale transform of button when you focus on it
			// "--border-btn": "1px", // border width of buttons
			// "--tab-border": "1px", // border width of tabs
			// "--tab-radius": "0.5rem", // border radius of tabs
		}
	},
	fonts: {
		headingFont: ['Inter', 'sans'],
		bodyFont: ['Inter', 'sans'],
		googleFont: 'Inter' // imports a single google font
	}
} as const;
