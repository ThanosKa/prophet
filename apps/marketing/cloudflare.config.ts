import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "prophet-marketing",
    entrypoint: "./worker/index.ts",
    // Temporary, for signed-in tests: Clerk's live keys refuse workers.dev. Remove at cutover.
    domains: ["cf-test.prophetchrome.com"],
    // A domain turns workers.dev off unless this is set.
    workersDev: true,
    compatibilityDate: "2026-11-07",
    compatibilityFlags: ["nodejs_compat"],
    observability: { enabled: true },
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
      IMAGES: bindings.images(),
      // Caching is off on this config: Credits must never be read stale. The address and
      // password live in Cloudflare, not here. It uses Supabase's direct address with
      // verify-full against Supabase's root certificate: the pooler's own link to Postgres
      // has no TLS, and a Worker's own connection rejects Supabase's private certificate.
      HYPERDRIVE: bindings.hyperdrive({
        id: "9840e527d3db42df9022a7a8e1f580b6",
        // Local previews stay off the real database unless someone points them there.
        dev: { connectionString: "postgresql://ci:ci@localhost:5432/ci" },
      }),
      // Only declared names reach the Worker's process.env. Values come from
      // .env.<mode>.local locally and from Worker secrets once deployed.
      ANTHROPIC_API_KEY: bindings.secret(),
      CLERK_SECRET_KEY: bindings.secret(),
      CLERK_WEBHOOK_SECRET: bindings.secret(),
      DATABASE_URL: bindings.secret(),
      DIRECT_URL: bindings.secret(),
      RESEND_API_KEY: bindings.secret(),
      STRIPE_PRICE_EXTRA_CREDITS: bindings.secret(),
      STRIPE_PRICE_PREMIUM: bindings.secret(),
      STRIPE_PRICE_PRO: bindings.secret(),
      STRIPE_PRICE_ULTRA: bindings.secret(),
      STRIPE_SECRET_KEY: bindings.secret(),
      STRIPE_WEBHOOK_SECRET: bindings.secret(),
      UPSTASH_REDIS_REST_TOKEN: bindings.secret(),
      UPSTASH_REDIS_REST_URL: bindings.secret(),
    },
  }),
});
