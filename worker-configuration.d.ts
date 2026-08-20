/** Minimal local declarations for the Cloudflare bindings used by the Sites runtime. */
interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

// The application is localStorage-only; this placeholder keeps the unused
// starter database helper type-safe enough for local TypeScript checks.
type D1Database = unknown;

declare module "cloudflare:workers" {
  export const env: {
    DB?: never;
  };
}
