import { env } from '$env/dynamic/public';
const PUBLIC_CDN_URL = env.PUBLIC_CDN_URL;

/**
 * Permanent Oracle CDN Base URL for frogbase bucket.
 * Used as a fallback when PUBLIC_CDN_URL is not set in deployment env.
 */
const ORACLE_CDN_BASE_URL =
	'https://objectstorage.us-chicago-1.oraclecloud.com/p/Ey_EKMZKsDtoWiGaaYcsx2xvBjka1GJQFaeAXzdyVG1P2_so6AOygNF5EUiCXs5j/n/ax6lk2xbmw8z/b/frogbase/o';

export const CDN_BASE_URL = (PUBLIC_CDN_URL || ORACLE_CDN_BASE_URL).replace(/\/$/, '');

/**
 * Maps a relative game/app image filename to its Oracle (frogbase) bucket URL.
 * Both game content and thumbnails are served from the bucket so nothing needs
 * to ship in the repo. Override the base with PUBLIC_CDN_URL in the environment.
 * @param path The filename (e.g., 'retro-bowl.png')
 * @param type 'game' or 'app'
 */
export function getCDNImageUrl(path: string | undefined | null, type: 'game' | 'app' = 'game'): string {
	if (!path) return '';
	return `${CDN_BASE_URL}/${type}/img/${path}`;
}
