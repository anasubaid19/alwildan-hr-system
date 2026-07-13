CREATE TABLE "cabang" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"kode" text NOT NULL,
	"alamat" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cabang_kode_unique" UNIQUE("kode")
);
--> statement-breakpoint
CREATE TABLE "gaji" (
	"id" serial PRIMARY KEY NOT NULL,
	"karyawan_id" integer NOT NULL,
	"periode" text NOT NULL,
	"jumlah_gaji" numeric DEFAULT '0' NOT NULL,
	"gapok" numeric DEFAULT '0' NOT NULL,
	"tunjangan_penddk" numeric DEFAULT '0' NOT NULL,
	"tunjangan_jabatan" numeric DEFAULT '0' NOT NULL,
	"transport" numeric DEFAULT '0' NOT NULL,
	"bpjs_ks" numeric DEFAULT '0' NOT NULL,
	"lains" numeric DEFAULT '0' NOT NULL,
	"pot_thr" numeric DEFAULT '0' NOT NULL,
	"pot_bpjs_tk" numeric DEFAULT '0' NOT NULL,
	"deposit_itba" numeric DEFAULT '0' NOT NULL,
	"jml_diterima" numeric DEFAULT '0' NOT NULL,
	"punishment" numeric DEFAULT '0' NOT NULL,
	"pinjaman" numeric DEFAULT '0' NOT NULL,
	"lembur" numeric DEFAULT '0' NOT NULL,
	"paying_cabang_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gaji_karyawan_periode_cabang_uniq" UNIQUE("karyawan_id","periode","paying_cabang_id")
);
--> statement-breakpoint
CREATE TABLE "invite" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	"pin" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "karyawan" (
	"id" serial PRIMARY KEY NOT NULL,
	"no" integer,
	"nu" text,
	"nama" text NOT NULL,
	"jabatan" text,
	"gender" text,
	"gelar" text,
	"thn_aktif" integer,
	"no_acc" text,
	"cabang_id" integer,
	"status" text DEFAULT 'aktif' NOT NULL,
	"thn_keluar" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "master_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"columns" jsonb,
	"sample_data" jsonb,
	"employee_list" jsonb,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text,
	"title" text NOT NULL,
	"message" text,
	"link_page" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "upload_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"cabang_id" integer,
	"periode" text,
	"status" text,
	"detail" text,
	"user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp with time zone,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gaji" ADD CONSTRAINT "gaji_karyawan_id_karyawan_id_fk" FOREIGN KEY ("karyawan_id") REFERENCES "public"."karyawan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gaji" ADD CONSTRAINT "gaji_paying_cabang_id_cabang_id_fk" FOREIGN KEY ("paying_cabang_id") REFERENCES "public"."cabang"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "karyawan" ADD CONSTRAINT "karyawan_cabang_id_cabang_id_fk" FOREIGN KEY ("cabang_id") REFERENCES "public"."cabang"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_log" ADD CONSTRAINT "upload_log_cabang_id_cabang_id_fk" FOREIGN KEY ("cabang_id") REFERENCES "public"."cabang"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_log" ADD CONSTRAINT "upload_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");