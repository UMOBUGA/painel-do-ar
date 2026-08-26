import { date, integer, pgTable, real, serial, text, timestamp, unique } from 'drizzle-orm/pg-core'

/**
 * Um snapshot por cidade por dia. Alimentada 1x/dia pelo cron
 * (`api/cron/snapshot.ts`), lida por `/api/ranking` (mais recente de cada
 * cidade) e `/api/history/:cityId` (últimos N dias de uma cidade). A unique
 * em (cityId, date) é o que torna o upsert do cron idempotente — rodar o job
 * duas vezes no mesmo dia atualiza a linha em vez de duplicar.
 */
export const dailySnapshots = pgTable(
  'daily_snapshots',
  {
    id: serial('id').primaryKey(),
    cityId: text('city_id').notNull(),
    date: date('date').notNull(),
    aqi: integer('aqi').notNull(),
    band: text('band').notNull(),
    dominant: text('dominant').notNull(),
    pm25: real('pm25'),
    pm10: real('pm10'),
    capturedAt: timestamp('captured_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique('daily_snapshots_city_date').on(table.cityId, table.date)],
)

export type DailySnapshot = typeof dailySnapshots.$inferSelect
export type NewDailySnapshot = typeof dailySnapshots.$inferInsert
