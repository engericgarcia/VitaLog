CREATE TABLE "analyte_aliases" (
	"id" serial PRIMARY KEY NOT NULL,
	"analyte_id" text NOT NULL,
	"alias" text NOT NULL,
	"origin" text DEFAULT 'seed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytes" (
	"id" text PRIMARY KEY NOT NULL,
	"loinc_code" text,
	"name_pt" text NOT NULL,
	"name_en" text,
	"category" text NOT NULL,
	"canonical_unit" text NOT NULL,
	"ref_low" double precision,
	"ref_high" double precision,
	"higher_is_better" boolean,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "lab_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"lab_name" text,
	"collected_at" text,
	"issued_at" text,
	"file_name" text,
	"file_mime" text,
	"storage_key" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"extraction_model" text,
	"extraction_raw" jsonb,
	"extraction_error" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_results" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"user_id" text NOT NULL,
	"analyte_id" text,
	"raw_name" text NOT NULL,
	"raw_unit" text,
	"value_num" double precision,
	"value_text" text,
	"canonical_value" double precision,
	"canonical_unit" text,
	"ref_low" double precision,
	"ref_high" double precision,
	"ref_text" text,
	"flag" text,
	"collected_at" text,
	"confidence" double precision,
	"reviewed" boolean DEFAULT false NOT NULL,
	"review_reasons" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"birth_date" text,
	"sex" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vaccinations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"vaccine_id" text NOT NULL,
	"dose_label" text,
	"applied_at" text NOT NULL,
	"lot" text,
	"manufacturer" text,
	"site" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vaccines" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"disease" text NOT NULL,
	"doses_recommended" integer,
	"booster_interval_years" double precision,
	"part_of_national_schedule" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analyte_aliases" ADD CONSTRAINT "analyte_aliases_analyte_id_analytes_id_fk" FOREIGN KEY ("analyte_id") REFERENCES "public"."analytes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_reports" ADD CONSTRAINT "lab_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_report_id_lab_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."lab_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_analyte_id_analytes_id_fk" FOREIGN KEY ("analyte_id") REFERENCES "public"."analytes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaccinations" ADD CONSTRAINT "vaccinations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaccinations" ADD CONSTRAINT "vaccinations_vaccine_id_vaccines_id_fk" FOREIGN KEY ("vaccine_id") REFERENCES "public"."vaccines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "analyte_aliases_alias_unq" ON "analyte_aliases" USING btree ("alias");--> statement-breakpoint
CREATE INDEX "analytes_category_idx" ON "analytes" USING btree ("category");--> statement-breakpoint
CREATE INDEX "lab_reports_user_collected_idx" ON "lab_reports" USING btree ("user_id","collected_at");--> statement-breakpoint
CREATE INDEX "lab_results_series_idx" ON "lab_results" USING btree ("user_id","analyte_id","collected_at");--> statement-breakpoint
CREATE INDEX "lab_results_report_idx" ON "lab_results" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "lab_results_review_idx" ON "lab_results" USING btree ("user_id","reviewed");--> statement-breakpoint
CREATE INDEX "vaccinations_user_idx" ON "vaccinations" USING btree ("user_id","applied_at");