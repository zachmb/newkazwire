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
    creatorUid?: string;  // public social identity (kazwire_uid) — links a game to a profile
    source?: 'ai' | 'upload'; // how the game entered the gallery (default 'ai')
    regenCount?: number;  // times "report broken" has regenerated this game (cap 2)
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

/* ------------------------------------------------------------------ *
 * Play streaks + leaderboard (DB-free, account-free)
 *
 * Storage shape in the frogbase bucket:
 *   user-stats/streaks/{uid}.json   — one file per visitor (private, holds name)
 *       { uid, name, streak, longest, gamesPlayed, lastPlayedDate, updatedAt }
 *   user-stats/leaderboard.json     — a single compact aggregate map, read-modify-write
 *       { [uid]: { name, streak, longest, gamesPlayed, updatedAt } }
 *
 * Listing a bucket isn't available via a PAR, so the leaderboard is maintained
 * as one aggregate file updated best-effort on every ping (mirrors the ip-log
 * read-modify-write pattern above).
 * ------------------------------------------------------------------ */

const OCI_LEADERBOARD_PATH = 'user-stats/leaderboard.json';

/** Per-visitor streak record, stored at user-stats/streaks/{uid}.json */
export interface StreakRecord {
    uid: string;
    name: string;
    streak: number;
    longest: number;
    gamesPlayed: number;
    lastPlayedDate: string; // YYYY-MM-DD (UTC)
    updatedAt: string;      // ISO timestamp
}

/** One row in the compact leaderboard aggregate map. */
export interface LeaderboardRow {
    name: string;
    streak: number;
    longest: number;
    gamesPlayed: number;
    updatedAt: string;
}

/** The public leaderboard entry sent to the browser — no uid, no private fields. */
export interface PublicLeaderboardEntry {
    name: string;
    streak: number;
    longest: number;
    gamesPlayed: number;
}

/** UTC calendar date (YYYY-MM-DD) for a given instant. Streaks roll over at UTC midnight. */
function utcDateString(d: Date = new Date()): string {
    return d.toISOString().split('T')[0];
}

/** Whether `prev` (YYYY-MM-DD) is exactly the calendar day before `today` (YYYY-MM-DD). */
function isYesterday(prev: string, today: string): boolean {
    const t = new Date(`${today}T00:00:00.000Z`);
    const y = new Date(t.getTime() - 24 * 60 * 60 * 1000);
    return utcDateString(y) === prev;
}

/** Clamp/sanitize a display name to something safe + bounded for public display. */
function sanitizeName(name: unknown): string {
    if (typeof name !== 'string') return 'Anonymous';
    const trimmed = name.replace(/[ -]/g, '').trim().slice(0, 24);
    return trimmed || 'Anonymous';
}

/** Reads a single visitor's streak record. Returns null if they've never played. */
export async function getStreak(uid: string): Promise<StreakRecord | null> {
    if (!uid) return null;
    return readJsonFromOCI<StreakRecord>(`user-stats/streaks/${encodeURIComponent(uid)}.json`);
}

/**
 * Records a daily play ping for a visitor and updates the streak.
 *  - lastPlayedDate === today  -> no streak change, gamesPlayed++ (still a play)
 *  - lastPlayedDate === yesterday -> streak++
 *  - otherwise (gap / first play) -> streak = 1
 * Persists the per-user file, then best-effort updates the leaderboard aggregate.
 * Returns the updated record.
 */
export async function recordStreakPing(uid: string, name: string): Promise<StreakRecord> {
    const today = utcDateString();
    const now = new Date().toISOString();
    const displayName = sanitizeName(name);

    const existing = await getStreak(uid);

    let streak: number;
    if (!existing) {
        streak = 1;
    } else if (existing.lastPlayedDate === today) {
        streak = existing.streak; // already counted today
    } else if (isYesterday(existing.lastPlayedDate, today)) {
        streak = existing.streak + 1;
    } else {
        streak = 1; // missed a day (or more) — reset
    }

    const gamesPlayed = (existing?.gamesPlayed || 0) + 1;
    const longest = Math.max(existing?.longest || 0, streak);

    const record: StreakRecord = {
        uid,
        name: displayName,
        streak,
        longest,
        gamesPlayed,
        lastPlayedDate: today,
        updatedAt: now
    };

    await uploadToOCI(
        `user-stats/streaks/${encodeURIComponent(uid)}.json`,
        JSON.stringify(record),
        'application/json'
    );

    // Best-effort leaderboard aggregate update — never let this fail the ping.
    try {
        await updateLeaderboardEntry(record);
    } catch (err) {
        console.error('Leaderboard aggregate update failed (non-fatal):', err);
    }

    // Award Kazcoins for playing (best-effort): a flat per-play amount, plus a bonus
    // when the daily streak actually increased. Never let coin errors fail the ping.
    try {
        const streakIncreased = !!existing && streak > (existing.streak || 0);
        await adjustCoins(uid, COINS_PER_PLAY + (streakIncreased ? COINS_STREAK_BONUS : 0));
    } catch (err) {
        console.error('Coin award failed (non-fatal):', err);
    }

    return record;
}

/** Read-modify-write the compact leaderboard aggregate for a single visitor. */
async function updateLeaderboardEntry(record: StreakRecord): Promise<void> {
    const board =
        (await readJsonFromOCI<Record<string, LeaderboardRow>>(OCI_LEADERBOARD_PATH)) || {};
    board[record.uid] = {
        name: record.name,
        streak: record.streak,
        longest: record.longest,
        gamesPlayed: record.gamesPlayed,
        updatedAt: record.updatedAt
    };
    await uploadToOCI(OCI_LEADERBOARD_PATH, JSON.stringify(board), 'application/json');
}

/**
 * Returns the top N leaderboard entries by current streak (tiebreak: gamesPlayed),
 * with all uid / private fields stripped.
 */
export async function getLeaderboard(limit: number = 20): Promise<PublicLeaderboardEntry[]> {
    const board =
        (await readJsonFromOCI<Record<string, LeaderboardRow>>(OCI_LEADERBOARD_PATH)) || {};
    return Object.values(board)
        .sort((a, b) => b.streak - a.streak || b.gamesPlayed - a.gamesPlayed)
        .slice(0, Math.max(0, limit))
        .map((r) => ({
            name: r.name,
            streak: r.streak,
            longest: r.longest,
            gamesPlayed: r.gamesPlayed
        }));
}

/* ------------------------------------------------------------------ *
 * Registry helpers for updating a single game in place (report-broken regen).
 * ------------------------------------------------------------------ */

export async function getGameById(id: string): Promise<UserGame | null> {
    const registry = await getRegistry();
    return registry.find((g) => g.id === id) || null;
}

/** Patch a single registry entry (read-modify-write). Returns the updated game or null. */
export async function updateGameInRegistry(
    id: string,
    patch: Partial<UserGame>
): Promise<UserGame | null> {
    const registry = await getRegistry();
    const idx = registry.findIndex((g) => g.id === id);
    if (idx < 0) return null;
    registry[idx] = { ...registry[idx], ...patch };
    await uploadToOCI(OCI_REGISTRY_PATH, JSON.stringify(registry), 'application/json');
    return registry[idx];
}

/* ------------------------------------------------------------------ *
 * SOCIAL LAYER (DB-free, account-free) — posts feed, per-game comments +
 * replies, community notes, and public profiles. All keyed by the client's
 * kazwire_uid + a public display name. Storage in the frogbase bucket:
 *
 *   community/posts.json                         — global posts feed (capped array)
 *   user-content/comments/{gameId}.json          — threaded comments for a game
 *   user-content/notes/{gameId}.json             — community notes for a game
 *   user-stats/profiles.json                     — { [uid]: PublicProfile } aggregate
 *
 * All user text is expected to be moderated by the caller (src/lib/server/moderation).
 * ------------------------------------------------------------------ */

const OCI_POSTS_PATH = 'community/posts.json';
const OCI_PROFILES_PATH = 'user-stats/profiles.json';
const MAX_POSTS_KEPT = 500;

export interface RepostRef {
    id: string;
    uid: string;
    author: string;
    text: string;
    gameId?: string;
    gameTitle?: string;
    createdAt: string;
}

export interface Post {
    id: string;
    uid: string;        // author's kazwire_uid (public — used only to link to their profile)
    author: string;
    location?: string;
    text: string;
    gameId?: string;    // optional shared game (AI game id)
    gameTitle?: string;
    createdAt: string;
    likes: number;
    replies?: Reply[];      // inline replies to this post
    repostCount?: number;   // times this post was reposted
    repostOf?: RepostRef;   // set when THIS post is a repost of another
}

export interface Reply {
    id: string;
    uid: string;
    author: string;
    location?: string;
    text: string;
    createdAt: string;
    likes: number;
}

export interface Comment extends Reply {
    replies: Reply[];
}

export interface CommunityNote {
    id: string;
    uid: string;
    author: string;
    text: string;
    createdAt: string;
    helpful: number;
    notHelpful: number;
}

export interface PublicProfile {
    uid: string;
    name: string;
    location?: string;
    gamesCreated: number;
    postsCount: number;
    commentsCount: number;
    joinedAt: string;
    lastActiveAt: string;
}

function newId(): string {
    return (globalThis.crypto?.randomUUID?.() as string) || Math.random().toString(36).slice(2);
}

/* ---- Posts feed ---- */

export async function getPosts(limit = 100): Promise<Post[]> {
    const posts = (await readJsonFromOCI<Post[]>(OCI_POSTS_PATH)) || [];
    return posts
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, Math.max(0, limit));
}

export async function addPost(p: Omit<Post, 'id' | 'createdAt' | 'likes'>): Promise<Post> {
    const posts = (await readJsonFromOCI<Post[]>(OCI_POSTS_PATH)) || [];
    const post: Post = { ...p, id: newId(), createdAt: new Date().toISOString(), likes: 0 };
    posts.push(post);
    // Keep the feed bounded (newest kept) so the file never grows without limit.
    const trimmed = posts
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, MAX_POSTS_KEPT);
    await uploadToOCI(OCI_POSTS_PATH, JSON.stringify(trimmed), 'application/json');
    return post;
}

export async function likePost(id: string, delta = 1): Promise<number | null> {
    const posts = (await readJsonFromOCI<Post[]>(OCI_POSTS_PATH)) || [];
    const post = posts.find((p) => p.id === id);
    if (!post) return null;
    post.likes = Math.max(0, (post.likes || 0) + delta);
    await uploadToOCI(OCI_POSTS_PATH, JSON.stringify(posts), 'application/json');
    return post.likes;
}

/** Add a reply to a post. Returns the reply, or null if the post is gone. */
export async function addPostReply(
    postId: string,
    r: Omit<Reply, 'id' | 'createdAt' | 'likes'>
): Promise<Reply | null> {
    const posts = (await readJsonFromOCI<Post[]>(OCI_POSTS_PATH)) || [];
    const post = posts.find((p) => p.id === postId);
    if (!post) return null;
    const reply: Reply = { ...r, id: newId(), createdAt: new Date().toISOString(), likes: 0 };
    post.replies = post.replies || [];
    post.replies.push(reply);
    await uploadToOCI(OCI_POSTS_PATH, JSON.stringify(posts), 'application/json');
    return reply;
}

/** Repost an existing post: bumps the original's repostCount and creates a new feed
 *  entry that embeds a reference to the original. Returns the new repost. */
export async function repostPost(
    postId: string,
    by: { uid: string; author: string; location?: string }
): Promise<Post | null> {
    const posts = (await readJsonFromOCI<Post[]>(OCI_POSTS_PATH)) || [];
    const original = posts.find((p) => p.id === postId);
    if (!original) return null;
    // Repost the ROOT (avoid nesting reposts of reposts).
    const root = original.repostOf
        ? original.repostOf
        : {
              id: original.id,
              uid: original.uid,
              author: original.author,
              text: original.text,
              gameId: original.gameId,
              gameTitle: original.gameTitle,
              createdAt: original.createdAt
          };
    const target = posts.find((p) => p.id === root.id);
    if (target) target.repostCount = (target.repostCount || 0) + 1;

    const repost: Post = {
        id: newId(),
        uid: by.uid,
        author: by.author,
        location: by.location,
        text: '',
        createdAt: new Date().toISOString(),
        likes: 0,
        repostOf: root
    };
    posts.push(repost);
    const trimmed = posts
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, MAX_POSTS_KEPT);
    await uploadToOCI(OCI_POSTS_PATH, JSON.stringify(trimmed), 'application/json');
    return repost;
}

/* ---- Per-game comments + replies ---- */

function commentsPath(gameId: string): string {
    return `user-content/comments/${encodeURIComponent(gameId)}.json`;
}

export async function getComments(gameId: string): Promise<Comment[]> {
    const comments = (await readJsonFromOCI<Comment[]>(commentsPath(gameId))) || [];
    return comments.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export async function addComment(
    gameId: string,
    c: Omit<Comment, 'id' | 'createdAt' | 'likes' | 'replies'>
): Promise<Comment> {
    const comments = (await readJsonFromOCI<Comment[]>(commentsPath(gameId))) || [];
    const comment: Comment = {
        ...c,
        id: newId(),
        createdAt: new Date().toISOString(),
        likes: 0,
        replies: []
    };
    comments.push(comment);
    await uploadToOCI(commentsPath(gameId), JSON.stringify(comments), 'application/json');
    return comment;
}

export async function addReply(
    gameId: string,
    commentId: string,
    r: Omit<Reply, 'id' | 'createdAt' | 'likes'>
): Promise<Reply | null> {
    const comments = (await readJsonFromOCI<Comment[]>(commentsPath(gameId))) || [];
    const parent = comments.find((c) => c.id === commentId);
    if (!parent) return null;
    const reply: Reply = { ...r, id: newId(), createdAt: new Date().toISOString(), likes: 0 };
    parent.replies = parent.replies || [];
    parent.replies.push(reply);
    await uploadToOCI(commentsPath(gameId), JSON.stringify(comments), 'application/json');
    return reply;
}

export async function likeComment(
    gameId: string,
    commentId: string,
    replyId?: string,
    delta = 1
): Promise<number | null> {
    const comments = (await readJsonFromOCI<Comment[]>(commentsPath(gameId))) || [];
    const parent = comments.find((c) => c.id === commentId);
    if (!parent) return null;
    let target: Reply | Comment | undefined = parent;
    if (replyId) target = (parent.replies || []).find((r) => r.id === replyId);
    if (!target) return null;
    target.likes = Math.max(0, (target.likes || 0) + delta);
    await uploadToOCI(commentsPath(gameId), JSON.stringify(comments), 'application/json');
    return target.likes;
}

/* ---- Community notes ---- */

function notesPath(gameId: string): string {
    return `user-content/notes/${encodeURIComponent(gameId)}.json`;
}

export async function getNotes(gameId: string): Promise<CommunityNote[]> {
    const notes = (await readJsonFromOCI<CommunityNote[]>(notesPath(gameId))) || [];
    // Most-helpful first (helpful minus notHelpful), then newest.
    return notes.sort(
        (a, b) =>
            b.helpful - b.notHelpful - (a.helpful - a.notHelpful) ||
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export async function addNote(
    gameId: string,
    n: Omit<CommunityNote, 'id' | 'createdAt' | 'helpful' | 'notHelpful'>
): Promise<CommunityNote> {
    const notes = (await readJsonFromOCI<CommunityNote[]>(notesPath(gameId))) || [];
    const note: CommunityNote = {
        ...n,
        id: newId(),
        createdAt: new Date().toISOString(),
        helpful: 0,
        notHelpful: 0
    };
    notes.push(note);
    await uploadToOCI(notesPath(gameId), JSON.stringify(notes), 'application/json');
    return note;
}

export async function voteNote(
    gameId: string,
    noteId: string,
    vote: 'helpful' | 'notHelpful'
): Promise<CommunityNote | null> {
    const notes = (await readJsonFromOCI<CommunityNote[]>(notesPath(gameId))) || [];
    const note = notes.find((n) => n.id === noteId);
    if (!note) return null;
    if (vote === 'helpful') note.helpful = (note.helpful || 0) + 1;
    else note.notHelpful = (note.notHelpful || 0) + 1;
    await uploadToOCI(notesPath(gameId), JSON.stringify(notes), 'application/json');
    return note;
}

/* ---- Public profiles + search ---- */

export async function getProfile(uid: string): Promise<PublicProfile | null> {
    if (!uid) return null;
    const profiles =
        (await readJsonFromOCI<Record<string, PublicProfile>>(OCI_PROFILES_PATH)) || {};
    return profiles[uid] || null;
}

/**
 * Upsert a profile and optionally bump activity counters. Best-effort read-modify-write.
 * `bump` keys: gamesCreated | postsCount | commentsCount.
 */
export async function upsertProfile(
    uid: string,
    name: string,
    location: string | undefined,
    bump: Partial<Pick<PublicProfile, 'gamesCreated' | 'postsCount' | 'commentsCount'>> = {}
): Promise<PublicProfile | null> {
    if (!uid) return null;
    const profiles =
        (await readJsonFromOCI<Record<string, PublicProfile>>(OCI_PROFILES_PATH)) || {};
    const now = new Date().toISOString();
    const existing = profiles[uid];
    const profile: PublicProfile = {
        uid,
        name: name || existing?.name || 'Anonymous',
        location: location || existing?.location,
        gamesCreated: (existing?.gamesCreated || 0) + (bump.gamesCreated || 0),
        postsCount: (existing?.postsCount || 0) + (bump.postsCount || 0),
        commentsCount: (existing?.commentsCount || 0) + (bump.commentsCount || 0),
        joinedAt: existing?.joinedAt || now,
        lastActiveAt: now
    };
    profiles[uid] = profile;
    await uploadToOCI(OCI_PROFILES_PATH, JSON.stringify(profiles), 'application/json');
    return profile;
}

/** Search public profiles by name substring (case-insensitive). */
export async function searchProfiles(query: string, limit = 20): Promise<PublicProfile[]> {
    const q = (query || '').trim().toLowerCase();
    if (!q) return [];
    const profiles =
        (await readJsonFromOCI<Record<string, PublicProfile>>(OCI_PROFILES_PATH)) || {};
    return Object.values(profiles)
        .filter((p) => p.name.toLowerCase().includes(q))
        .sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime())
        .slice(0, Math.max(0, limit));
}

/* ------------------------------------------------------------------ *
 * COINS + ITEM SHOP (virtual currency — NOT real money).
 *
 * Players earn Kazcoins by playing (hooked into the streak ping). They can list
 * items in the shop and buy each other's items; the seller earns the coins. Storage:
 *   user-stats/wallets.json          — { [uid]: { coins, updatedAt } }
 *   community/shop.json              — Item[] (active listings)
 *   user-stats/inventory/{uid}.json  — string[] of owned itemIds (idempotency key)
 *
 * Money-safety (even for virtual coins): buying checks balance + ownership, records
 * ownership FIRST (idempotency — a retry can't double-buy), then debits the buyer and
 * credits the seller. If a later step fails the buyer keeps the item uncharged
 * (fail-toward-the-user). Coins never go negative.
 * ------------------------------------------------------------------ */

const OCI_WALLETS_PATH = 'user-stats/wallets.json';
const OCI_SHOP_PATH = 'community/shop.json';

const COINS_PER_PLAY = 5;      // awarded once per streak ping (a real game open)
const COINS_STREAK_BONUS = 10; // extra when the daily streak increases
const MAX_ITEM_PRICE = 100_000;

export interface Wallet {
    coins: number;
    updatedAt: string;
}

export interface ShopItem {
    id: string;
    sellerUid: string;
    sellerName: string;
    title: string;
    description: string;
    icon: string;       // an iconify id or short emoji
    price: number;      // in Kazcoins
    createdAt: string;
    active: boolean;
    soldCount: number;
}

export async function getWallet(uid: string): Promise<Wallet> {
    if (!uid) return { coins: 0, updatedAt: new Date().toISOString() };
    const wallets = (await readJsonFromOCI<Record<string, Wallet>>(OCI_WALLETS_PATH)) || {};
    return wallets[uid] || { coins: 0, updatedAt: new Date().toISOString() };
}

/** Adjust a uid's coin balance by delta (clamped at 0). Returns the new balance. */
export async function adjustCoins(uid: string, delta: number): Promise<number> {
    if (!uid) return 0;
    const wallets = (await readJsonFromOCI<Record<string, Wallet>>(OCI_WALLETS_PATH)) || {};
    const current = wallets[uid]?.coins || 0;
    const next = Math.max(0, current + delta);
    wallets[uid] = { coins: next, updatedAt: new Date().toISOString() };
    await uploadToOCI(OCI_WALLETS_PATH, JSON.stringify(wallets), 'application/json');
    return next;
}

async function getInventory(uid: string): Promise<string[]> {
    if (!uid) return [];
    return (await readJsonFromOCI<string[]>(`user-stats/inventory/${encodeURIComponent(uid)}.json`)) || [];
}

async function saveInventory(uid: string, items: string[]): Promise<void> {
    await uploadToOCI(
        `user-stats/inventory/${encodeURIComponent(uid)}.json`,
        JSON.stringify(items),
        'application/json'
    );
}

export async function getShopItems(): Promise<ShopItem[]> {
    const items = (await readJsonFromOCI<ShopItem[]>(OCI_SHOP_PATH)) || [];
    return items
        .filter((i) => i.active)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function addShopItem(
    item: Omit<ShopItem, 'id' | 'createdAt' | 'active' | 'soldCount'>
): Promise<ShopItem> {
    const items = (await readJsonFromOCI<ShopItem[]>(OCI_SHOP_PATH)) || [];
    const price = Math.max(1, Math.min(MAX_ITEM_PRICE, Math.floor(item.price || 0)));
    const newItem: ShopItem = {
        ...item,
        price,
        id: newId(),
        createdAt: new Date().toISOString(),
        active: true,
        soldCount: 0
    };
    items.push(newItem);
    await uploadToOCI(OCI_SHOP_PATH, JSON.stringify(items), 'application/json');
    return newItem;
}

export interface BuyResult {
    ok: boolean;
    error?: string;
    balance?: number;
    item?: ShopItem;
}

/**
 * Buy an item: the buyer pays coins, the seller earns them. Idempotent + fail-safe:
 *   1. validate (exists/active, not self-buy, not already owned, enough coins)
 *   2. record ownership FIRST (a retry then short-circuits at "already owned")
 *   3. debit buyer, credit seller (buyer keeps the item even if a credit hiccups)
 */
export async function buyShopItem(uid: string, itemId: string): Promise<BuyResult> {
    if (!uid) return { ok: false, error: 'Missing player id.' };

    const items = (await readJsonFromOCI<ShopItem[]>(OCI_SHOP_PATH)) || [];
    const item = items.find((i) => i.id === itemId);
    if (!item || !item.active) return { ok: false, error: 'That item is no longer available.' };
    if (item.sellerUid === uid) return { ok: false, error: 'You cannot buy your own item.' };

    const inventory = await getInventory(uid);
    if (inventory.includes(itemId)) {
        const bal = (await getWallet(uid)).coins;
        return { ok: false, error: 'You already own this item.', balance: bal };
    }

    const wallet = await getWallet(uid);
    if (wallet.coins < item.price) {
        return { ok: false, error: `Not enough Kazcoins (need ${item.price}, you have ${wallet.coins}).`, balance: wallet.coins };
    }

    // 1) Ownership first = idempotency guard against double-buy on retry.
    inventory.push(itemId);
    await saveInventory(uid, inventory);

    // 2) Debit buyer, 3) credit seller, 4) bump sold count (best-effort after ownership).
    const balance = await adjustCoins(uid, -item.price);
    try {
        await adjustCoins(item.sellerUid, item.price);
        item.soldCount = (item.soldCount || 0) + 1;
        await uploadToOCI(OCI_SHOP_PATH, JSON.stringify(items), 'application/json');
    } catch (err) {
        console.error('buyShopItem: seller credit / soldCount update failed (non-fatal):', err);
    }

    return { ok: true, balance, item };
}

