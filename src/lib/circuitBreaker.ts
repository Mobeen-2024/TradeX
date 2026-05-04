/**
 * circuitBreaker.ts — Institutional reliability layer
 * 
 * Implements the Circuit Breaker pattern to protect capital during 
 * exchange API instability or rate-limiting events.
 */

export type CBState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CBOptions {
  failureThreshold: number;    // Trips OPEN after N consecutive failures
  successThreshold: number;    // Resets to CLOSED after N successes in HALF_OPEN
  openTimeoutMs:    number;    // How long to stay OPEN before probing (HALF_OPEN)
  monitoredCodes:   number[];  // HTTP codes that count as failures
}

export class CircuitBreaker {
  private state: CBState = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private openedAt: number | null = null;
  private readonly name: string;
  private readonly opts: CBOptions;
  private listeners: ((state: CBState) => void)[] = [];

  constructor(name: string, opts: Partial<CBOptions> = {}) {
    this.name = name;
    this.opts = {
      failureThreshold: opts.failureThreshold ?? 5,
      successThreshold: opts.successThreshold ?? 2,
      openTimeoutMs:    opts.openTimeoutMs    ?? 30_000,
      monitoredCodes:   opts.monitoredCodes   ?? [429, 500, 502, 503, 504],
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.maybeTransitionToHalfOpen();

    if (this.state === 'OPEN') {
      throw new Error(`[CircuitBreaker:${this.name}] OPEN — executions halted for safety.`);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err: any) {
      this.onFailure(err);
      throw err;
    }
  }

  getState() {
    return { 
      name: this.name, 
      state: this.state, 
      failures: this.failures,
      successes: this.successes,
      nextProbeAt: this.openedAt ? this.openedAt + this.opts.openTimeoutMs : null
    };
  }

  onStateChange(cb: (state: CBState) => void) {
    this.listeners.push(cb);
  }

  private onSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.opts.successThreshold) {
        this.transition('CLOSED');
      }
    } else if (this.state === 'CLOSED') {
      this.failures = 0; // Reset failure counter on success
    }
  }

  private onFailure(err: any) {
    this.failures++;
    this.successes = 0;

    const shouldTrip = this.state === 'HALF_OPEN' || this.failures >= this.opts.failureThreshold;

    if (shouldTrip && this.state !== 'OPEN') {
      this.transition('OPEN');
    }
  }

  private maybeTransitionToHalfOpen() {
    if (this.state === 'OPEN' && this.openedAt) {
      const now = Date.now();
      if (now - this.openedAt >= this.opts.openTimeoutMs) {
        this.transition('HALF_OPEN');
      }
    }
  }

  private transition(next: CBState) {
    if (this.state === next) return;
    
    this.state = next;
    if (next === 'OPEN') {
      this.openedAt = Date.now();
    } else {
      this.openedAt = null;
      if (next === 'CLOSED') {
        this.failures = 0;
        this.successes = 0;
      }
    }

    this.listeners.forEach(l => l(next));
    console.warn(`[CircuitBreaker:${this.name}] Transitioned to ${next}`);
  }
}

// Global Breaker Registry
export const circuitBreakers = {
  exchangeRest: new CircuitBreaker('exchange_rest', { failureThreshold: 5, openTimeoutMs: 30000 }),
  exchangeWs:   new CircuitBreaker('exchange_ws',   { failureThreshold: 3, openTimeoutMs: 15000 }),
  questdb:      new CircuitBreaker('questdb',       { failureThreshold: 10, openTimeoutMs: 60000 }),
};
