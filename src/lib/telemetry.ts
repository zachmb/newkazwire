import { browser } from '$app/environment';

export interface TelemetryEvent {
	type: 'keydown' | 'keyup' | 'mousedown' | 'mouseup' | 'mousemove' | 'click' | 'scroll';
	ts: number;
	x?: number;
	y?: number;
	key?: string;
	path?: string;
	target?: string;
}

class TelemetryManager {
	private buffer: TelemetryEvent[] = [];
	private sessionId: string;
	private lastMouseMoveTs = 0;
	private mouseMoveThrottleMs = 150; // Throttled to ~6.6 events per second
	private syncIntervalMs = 30000;    // Sync every 30 seconds
	private syncTimer: any = null;

	constructor() {
		this.sessionId = browser ? (sessionStorage.getItem('telemetry_sid') || crypto.randomUUID()) : '';
		if (browser && !sessionStorage.getItem('telemetry_sid')) {
			sessionStorage.setItem('telemetry_sid', this.sessionId);
		}
	}

	public init() {
		if (!browser) return;

		// Listen to global events
		window.addEventListener('keydown', (e) => this.logKey(e, 'keydown'));
		window.addEventListener('keyup', (e) => this.logKey(e, 'keyup'));
		window.addEventListener('mousedown', (e) => this.logMouse(e, 'mousedown'));
		window.addEventListener('mouseup', (e) => this.logMouse(e, 'mouseup'));
		window.addEventListener('mousemove', (e) => this.logMouseMove(e));
		window.addEventListener('click', (e) => this.logMouse(e, 'click'));
		window.addEventListener('scroll', () => this.logScroll());

		// Sync periodically
		this.startSyncTimer();

		// Final sync on page unload
		window.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'hidden') {
				this.sync();
			}
		});
	}

	private logKey(e: KeyboardEvent, type: 'keydown' | 'keyup') {
		// Privacy: Skip if target is a password field
		if (this.isSensitiveTarget(e.target)) return;

		this.pushEvent({
			type,
			ts: Date.now(),
			key: e.key,
			path: this.getSelector(e.target as Element)
		});
	}

	private logMouse(e: MouseEvent, type: 'mousedown' | 'mouseup' | 'click') {
		if (this.isSensitiveTarget(e.target)) return;

		this.pushEvent({
			type,
			ts: Date.now(),
			x: e.clientX,
			y: e.clientY,
			path: this.getSelector(e.target as Element)
		});
	}

	private logMouseMove(e: MouseEvent) {
		const now = Date.now();
		if (now - this.lastMouseMoveTs < this.mouseMoveThrottleMs) return;

		this.lastMouseMoveTs = now;
		this.pushEvent({
			type: 'mousemove',
			ts: now,
			x: e.clientX,
			y: e.clientY
		});
	}

	private logScroll() {
		this.pushEvent({
			type: 'scroll',
			ts: Date.now(),
			y: window.scrollY,
			x: window.scrollX
		});
	}

	private isSensitiveTarget(target: any): boolean {
		if (!(target instanceof HTMLElement)) return false;
		if (target.getAttribute('type') === 'password') return true;
		if (target.hasAttribute('data-telemetry-ignore')) return true;
		return false;
	}

	private getSelector(el: Element | null): string {
		if (!el) return 'unknown';
		if (el.id) return `#${el.id}`;
		let path = el.tagName.toLowerCase();
		if (el.className) path += `.${el.className.split(' ').join('.')}`;
		return path;
	}

	private pushEvent(event: TelemetryEvent) {
		this.buffer.push(event);
		if (this.buffer.length >= 200) {
			this.sync();
		}
	}

	private async sync() {
		if (this.buffer.length === 0) return;

		const payload = {
			sessionId: this.sessionId,
			events: [...this.buffer],
			url: window.location.href,
			ua: navigator.userAgent
		};

		this.buffer = [];

		try {
			// Using beacon for better reliability on unload
			if (navigator.sendBeacon) {
				const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
				navigator.sendBeacon('/api/telemetry', blob);
			} else {
				await fetch('/api/telemetry', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
					keepalive: true
				});
			}
		} catch (err) {
			console.error('[Telemetry] Sync failed', err);
			// Optionally put back in buffer if it's not an unload
		}
	}

	private startSyncTimer() {
		if (this.syncTimer) clearInterval(this.syncTimer);
		this.syncTimer = setInterval(() => this.sync(), this.syncIntervalMs);
	}
}

export const telemetry = new TelemetryManager();
