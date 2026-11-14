-- Free users the Clerk webhook created before it wrote included Credits have 0 here, so the
-- account page hides their usage bar. 7 is TIER_CONFIG.free.credits (lib/pricing.ts).
-- Only included Credits changes: no balance, tier, Stripe field or timestamp. Re-running matches no row.
UPDATE "users" SET "credits_included" = 7 WHERE "tier" = 'free' AND "credits_included" = 0;
