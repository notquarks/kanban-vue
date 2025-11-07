import { error } from "console";
import { Next } from "hono";
import { Context } from "hono";

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}
const store:RateLimitStore = {};

export const rateLimit = (options: { maxRequests: number; windowMs: number, message?:string }) => {
    return async (c: Context, next: Next) => {
        const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
        const now = Date.now();
        const windowStart = now - options.windowMs;

        if (store[ip] && store[ip].resetTime<now){
            delete store[ip];
        }

        if (!store[ip]){
            store[ip] = {
                count: 1,
                resetTime: now + options.windowMs
            };
        }else{
            store[ip].count++;
        }

        if(store[ip].count > options.maxRequests) {
            return c.json({error: options.message || 'Too many requests'}, {status: 429});
        }
        await next();
    };
};