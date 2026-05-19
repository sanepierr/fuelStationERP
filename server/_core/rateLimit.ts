import type { Request, Response, NextFunction } from "express";

interface RateLimitStore {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitStore>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);

export function rateLimit(opts: { windowMs: number; max: number; keyFn?: (req: Request) => string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = opts.keyFn ? opts.keyFn(req) : (req.ip ?? "unknown");
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt < now) {
      store.set(key, { count: 1, resetAt: now + opts.windowMs });
      return next();
    }

    entry.count += 1;
    if (entry.count > opts.max) {
      res.status(429).json({ error: "Too many requests — please try again later." });
      return;
    }

    next();
  };
}

// Auth-specific limiter: 20 requests per minute per IP
export const authRateLimit = rateLimit({ windowMs: 60_000, max: 20 });

// General API limiter: 300 requests per minute per IP
export const apiRateLimit = rateLimit({ windowMs: 60_000, max: 300 });
