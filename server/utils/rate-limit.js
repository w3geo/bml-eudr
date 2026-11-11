/**
 * Fixed-window rate limiter in memory. Each instance counts separately and a restart resets the
 * counts, which is good enough for slowing down automated requests.
 * @param {number} limit requests per window
 * @param {number} windowMs
 * @returns {(key: string) => number} 0 if a request for `key` is allowed, counting it if so,
 * otherwise milliseconds until it will be allowed
 */
export function createRateLimiter(limit, windowMs) {
  /** @type {Map<string, { start: number, count: number }>} */
  const windows = new Map();
  let lastPrune = Date.now();

  return (key) => {
    const now = Date.now();
    if (now - lastPrune >= windowMs) {
      for (const [k, w] of windows) {
        if (now - w.start >= windowMs) {
          windows.delete(k);
        }
      }
      lastPrune = now;
    }
    const window = windows.get(key);
    if (!window || now - window.start >= windowMs) {
      windows.set(key, { start: now, count: 1 });
      return 0;
    }
    if (window.count >= limit) {
      return window.start + windowMs - now;
    }
    window.count++;
    return 0;
  };
}
