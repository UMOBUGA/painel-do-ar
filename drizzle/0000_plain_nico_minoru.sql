CREATE TABLE "daily_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"city_id" text NOT NULL,
	"date" date NOT NULL,
	"aqi" integer NOT NULL,
	"band" text NOT NULL,
	"dominant" text NOT NULL,
	"pm25" real,
	"pm10" real,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_snapshots_city_date" UNIQUE("city_id","date")
);
