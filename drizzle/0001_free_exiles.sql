CREATE TABLE "allergies" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"substance" text NOT NULL,
	"category" text NOT NULL,
	"severity" text NOT NULL,
	"reaction" text,
	"noted_at" text,
	"source" text DEFAULT 'informado' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conditions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"icd10" text,
	"status" text DEFAULT 'ativa' NOT NULL,
	"critical_for_triage" boolean DEFAULT false NOT NULL,
	"diagnosed_at" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"manufacturer" text,
	"model" text,
	"serial" text,
	"implanted_at" text,
	"facility" text,
	"mri_safe" boolean,
	"active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "encounters" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"occurred_at" text NOT NULL,
	"facility" text,
	"specialty" text,
	"professional" text,
	"network" text,
	"summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "procedures" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'procedimento' NOT NULL,
	"performed_at" text,
	"facility" text,
	"professional" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "blood_type" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "blood_type_source" text;--> statement-breakpoint
ALTER TABLE "allergies" ADD CONSTRAINT "allergies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conditions" ADD CONSTRAINT "conditions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedures" ADD CONSTRAINT "procedures_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "allergies_user_idx" ON "allergies" USING btree ("user_id","severity");--> statement-breakpoint
CREATE INDEX "conditions_user_idx" ON "conditions" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "devices_user_idx" ON "devices" USING btree ("user_id","active");--> statement-breakpoint
CREATE INDEX "encounters_user_idx" ON "encounters" USING btree ("user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "procedures_user_idx" ON "procedures" USING btree ("user_id","performed_at");