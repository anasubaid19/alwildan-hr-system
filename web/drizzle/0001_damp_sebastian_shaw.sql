CREATE TABLE "gaji_variable" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"tipe" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gaji_variable_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "gaji" ADD COLUMN "customs" jsonb DEFAULT '{}'::jsonb NOT NULL;