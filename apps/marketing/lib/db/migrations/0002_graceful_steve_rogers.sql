ALTER TABLE "chats" ADD COLUMN "context_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "context_input_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "context_output_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "context_reasoning_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "context_cached_input_tokens" integer DEFAULT 0 NOT NULL;