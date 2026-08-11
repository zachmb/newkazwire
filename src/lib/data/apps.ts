export interface AppEntry {
    id: string;
    title: string;
    description: string;
    image: string; // bucket filename (app/img/…) OR a full http(s)/absolute URL
    href: string;
    url?: string; // the real site to proxy through Ultraviolet (embedURL)
    internal?: boolean; // links straight to an internal route (href) instead of the proxy player
}

export const apps: AppEntry[] = [
    {
        id: "tiktok",
        title: "TikTok",
        description: "Watch videos on TikTok.",
        image: "tiktok.png",
        href: "/apps/tiktok",
        url: "https://www.tiktok.com/"
    },
    {
        id: "instagram",
        title: "Instagram Reels",
        description: "Scroll Instagram Reels.",
        image: "https://www.google.com/s2/favicons?domain=instagram.com&sz=128",
        href: "/apps/instagram",
        url: "https://www.instagram.com/reels/"
    },
    {
        id: "duckduckgo",
        title: "DuckDuckGo",
        description: "Private search with DuckDuckGo.",
        image: "https://www.google.com/s2/favicons?domain=duckduckgo.com&sz=128",
        href: "/apps/duckduckgo",
        url: "https://duckduckgo.com/"
    },
    {
        id: "discord",
        title: "Discord",
        description: "Chat on Discord.",
        image: "discord.png",
        href: "/apps/discord",
        url: "https://discord.com/app"
    },
    {
        id: "kazwire-browser",
        title: "Private Browser",
        description: "Browse any site privately.",
        image: "/logo.png",
        href: "/proxy",
        internal: true
    }
];
