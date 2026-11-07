import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "prophet-marketing",
    entrypoint: "./worker/index.ts",
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
