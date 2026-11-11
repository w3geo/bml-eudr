/**
 * Fixed-window rate limiter in memory. Each instance counts separately and a restart resets the
 * counts, which is good enough for slowing down automated requests.
 * @param {number} limit requests per window
 * @param {number} windowMs
 * @returns {(key: string) => boolean} whether a request for `key` is allowed, counting it if so
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
      return true;
    }
    if (window.count >= limit) {
      return false;
    }
    window.count++;
    return true;
  };
}
