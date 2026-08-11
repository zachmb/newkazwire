import { env } from '$env/dynamic/private';

/**
 * OCI PAR base URL used server-side for reads and writes.
 * Hardcoded to the frogbase bucket PAR — set OCI_PAR_URL in env to override.
 * This PAR must have READ + WRITE permissions on the frogbase bucket.
 */
const OCI_PAR_BASE_URL = (
    env.OCI_PAR_URL ||
    'https://objectstorage.us-chicago-1.oraclecloud.com/p/WfZnDpcAp7J5E9byE9rDkZISyiMWqh2qtvMQupM2EaVSuzSqZJLtiUBcLnb4IBFA/n/ax6lk2xbmw8z/b/frogbase/o/'
).replace(/\/$/, '');

const OCI_REGISTRY_PATH = 'user-games/registry.json';
const OCI_IP_LOG_PATH = 'user-games/ip-logs.json';

/** Maximum size of a single AI-generated game HTML file: 512 KB */
const MAX_GAME_SIZE_BYTES = 512 * 1024;

/** Maximum total storage used by all user games: 20 GB */
const MAX_TOTAL_STORAGE_BYTES = 20 * 1024 * 1024 * 1024;

export interface UserGame {
    id: string;
    title: string;
    description: string;
    codeUrl: string;      // URL to the hosted HTML
    creatorIp: string;    // real client IP (server-only — NEVER sent to the browser)
    creatorName?: string; // public display name of the creator ("Anonymous" if none)
    creatorLocation?: string; // coarse "City, CC" derived from the IP (public attribution)
    coverUrl?: string;    // PNG snapshot of the game (canvas frame) for the gallery cover
    createdAt: string;
    sourceGameId?: string; // For remixes
    avgRating: number;
    sizeBytes: number;    // Size of the game HTML file in bytes
}

/** A public view of a game with the private creatorIp stripped — what any client
 *  (gallery, play page) is allowed to see. The raw IP must never reach the browser. */
export type PublicUserGame = Omit<UserGame, 'creatorIp'>;

export function toPublicGame(g: UserGame): PublicUserGame {
    const { creatorIp: _omit, ...pub } = g;
    return pub;
}

export interface IPLog {
    lastGeneratedAt: string;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getByteLength(content: string | Blob): number {
    if (typeof content === 'string') {
        return new TextEncoder().encode(content).length;
    }
    return content.size;
}

async function verifyObjectReadable(
    url: string,
    expectedMinBytes: number,
    pathLabel: string,
    attempts: number = 5
): Promise<void> {
    for (let i = 0; i < attempts; i++) {
        try {
            const response = await fetch(url, {
                method: 'GET',
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });

            if (response.ok) {
                const contentLength = response.headers.get('content-length');
                if (!contentLength || Number(contentLength) >= expectedMinBytes) {
                    return;
                }
            }
        } catch {
            // Retry on transient OCI/network issues.
        }

        await sleep(150 * (i + 1));
    }

    throw new Error(`Upload to OCI was not readable after retries (${pathLabel}).`);
}

/**
 * Uploads a file to the Oracle Object Storage bucket using the PAR.
 */
export async function uploadToOCI(path: string, content: string | Blob, contentType: string = 'text/plain') {
    const url = `${OCI_PAR_BASE_URL}/${path}`;

    const response = await fetch(url, {
        method: 'PUT',
        body: content,
        headers: {
            'Content-Type': contentType
        }
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to upload to OCI (${path}): ${response.status} ${text}`);
    }

    await verifyObjectReadable(url, getByteLength(content), path);

    return url;
}

/**
 * Reads a JSON file from the Oracle Object Storage bucket.
 */
export async function readJsonFromOCI<T>(path: string): Promise<T | null> {
    const url = `${OCI_PAR_BASE_URL}/${path}`;

    try {
        const response = await fetch(url, {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        if (response.status === 404) return null;
        if (!response.ok) throw new Error(`Status ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`Error reading from OCI (${path}):`, error);
        return null;
    }
}

/**
 * Manages the game registry (list of all user games).
 */
export async function getRegistry(): Promise<UserGame[]> {
    const registry = await readJsonFromOCI<UserGame[]>(OCI_REGISTRY_PATH);
    return registry || [];
}

/**
 * Checks storage limits before a new upload.
 * Throws a descriptive error if either limit would be exceeded.
 *
 * @param newGameSizeBytes  The byte length of the game code string (UTF-8).
 * @param registry          Current registry (fetched once by the caller).
 */
export function checkStorageLimits(newGameSizeBytes: number, registry: UserGame[]): void {
    // 1. Per-game size cap
    if (newGameSizeBytes > MAX_GAME_SIZE_BYTES) {
        const kb = (newGameSizeBytes / 1024).toFixed(1);
        throw new Error(
            `Game file too large (${kb} KB). Maximum allowed size per game is ${MAX_GAME_SIZE_BYTES / 1024} KB.`
        );
    }

    // 2. Total bucket ceiling
    const totalUsed = registry.reduce((sum, g) => sum + (g.sizeBytes || 0), 0);
    if (totalUsed + newGameSizeBytes > MAX_TOTAL_STORAGE_BYTES) {
        const usedGB = (totalUsed / (1024 ** 3)).toFixed(2);
        throw new Error(
            `Community gallery is full (${usedGB} GB used of 20 GB limit). No new games can be published at this time.`
        );
    }
}

export async function addToRegistry(game: UserGame) {
    const registry = await getRegistry();
    registry.push(game);
    await uploadToOCI(OCI_REGISTRY_PATH, JSON.stringify(registry), 'application/json');

    // Confirm that the newly written registry is actually readable and includes the game.
    for (let i = 0; i < 5; i++) {
        const latest = await getRegistry();
        if (latest.some((g) => g.id === game.id)) {
            return;
        }
        await sleep(150 * (i + 1));
    }

    throw new Error(`Registry write did not publish game ${game.id} after retries.`);
}

/**
 * IP Rate Limiting Logic (Simplified using a JSON log in OCI).
 */
export async function isIPRateLimited(ip: string): Promise<boolean> {
    const logs = await readJsonFromOCI<Record<string, IPLog>>(OCI_IP_LOG_PATH) || {};
    const userLog = logs[ip];

    if (!userLog) return false;

    const lastDate = new Date(userLog.lastGeneratedAt);
    const now = new Date();

    // One game per day (24h)
    const diffHours = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
    return diffHours < 24;
}

export async function logIPGeneration(ip: string) {
    const logs = await readJsonFromOCI<Record<string, IPLog>>(OCI_IP_LOG_PATH) || {};
    logs[ip] = { lastGeneratedAt: new Date().toISOString() };
    await uploadToOCI(OCI_IP_LOG_PATH, JSON.stringify(logs), 'application/json');
}

/**
 * Saves batched telemetry events to OCI.
 * Each session is stored in its own file per day, aggregating events as they arrive.
 */
export async function saveTelemetry(sessionId: string, payload: any) {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const path = `telemetry/${date}/sessions/${sessionId}.json`;

    // 1. Attempt to read existing session log
    let sessionData = await readJsonFromOCI<any>(path);

    if (!sessionData) {
        // Initial session data structure
        sessionData = {
            sessionId,
            firstSeenAt: payload.receivedAt || new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
            ua: payload.ua,
            initialUrl: payload.url,
            ip: payload.ip,
            events: []
        };
    }

    // 2. Append new events
    if (payload.events && Array.isArray(payload.events)) {
        sessionData.events.push(...payload.events);
    }

    // 3. Update metadata
    sessionData.lastActiveAt = new Date().toISOString();
    sessionData.eventCount = sessionData.events.length;
    // Keep reference to the latest URL visited in this session
    sessionData.currentUrl = payload.url;

    // 4. Save consolidated session back to OCI
    await uploadToOCI(path, JSON.stringify(sessionData), 'application/json');
}

