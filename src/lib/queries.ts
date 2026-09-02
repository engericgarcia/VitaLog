import { and, asc, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { analyteAliases, analytes, labReports, labResults, users, vaccinations, vaccines } from "@/db/schema";
import { BY_ID, type AnalyteCategory } from "@/lib/clinical/catalog";

export const DEMO_USER_ID = "demo-user";

export async function getUser(userId: string) {
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return row ?? null;
}

export interface SeriesPoint {
  date: string;
  value: number;
  unit: string;
  refLow: number | null;
  refHigh: number | null;
  flag: string | null;
  labName: string | null;
  /** Grafia original no laudo — mostra que várias viraram uma série só. */
  rawName: string;
}

export interface AnalyteSeries {
  analyteId: string;
  namePt: string;
  category: AnalyteCategory;
  unit: string;
  description: string | null;
  higherIsBetter: boolean | null;
  points: SeriesPoint[];
  latest: SeriesPoint;
  /** Variação absoluta entre a primeira e a última medição. */
  delta: number | null;
}

/**
 * Todas as séries temporais do usuário, ordenadas por data de coleta.
 * Uma query só — o agrupamento em memória é barato para o volume de um
 * histórico pessoal (dezenas a poucos milhares de pontos).
 */
export async function getAllSeries(userId: string): Promise<AnalyteSeries[]> {
  const rows = await db
    .select({
      analyteId: labResults.analyteId,
      value: labResults.canonicalValue,
      unit: labResults.canonicalUnit,
      refLow: labResults.refLow,
      refHigh: labResults.refHigh,
      flag: labResults.flag,
      date: labResults.collectedAt,
      rawName: labResults.rawName,
      labName: labReports.labName,
    })
    .from(labResults)
    .innerJoin(labReports, eq(labResults.reportId, labReports.id))
    .where(
      and(
        eq(labResults.userId, userId),
        eq(labResults.reviewed, true),
        isNotNull(labResults.analyteId),
        isNotNull(labResults.canonicalValue),
        isNotNull(labResults.collectedAt),
      ),
    )
    .orderBy(asc(labResults.collectedAt));

  const grouped = new Map<string, SeriesPoint[]>();
  for (const r of rows) {
    const list = grouped.get(r.analyteId!) ?? [];
    list.push({
      date: r.date!,
      value: r.value!,
      unit: r.unit ?? "",
      refLow: r.refLow,
      refHigh: r.refHigh,
      flag: r.flag,
      labName: r.labName,
      rawName: r.rawName,
    });
    grouped.set(r.analyteId!, list);
  }

  const series: AnalyteSeries[] = [];
  for (const [analyteId, points] of grouped) {
    const meta = BY_ID.get(analyteId);
    if (!meta || points.length === 0) continue;
    const latest = points[points.length - 1];
    series.push({
      analyteId,
      namePt: meta.namePt,
      category: meta.category,
      unit: meta.unit,
      description: meta.description ?? null,
      higherIsBetter: meta.higherIsBetter ?? null,
      points,
      latest,
      delta: points.length > 1 ? latest.value - points[0].value : null,
    });
  }

  return series.sort((a, b) => a.namePt.localeCompare(b.namePt, "pt-BR"));
}

export async function getSeries(userId: string, analyteId: string) {
  const all = await getAllSeries(userId);
  return all.find((s) => s.analyteId === analyteId) ?? null;
}

export async function getReports(userId: string) {
  return db
    .select()
    .from(labReports)
    .where(eq(labReports.userId, userId))
    .orderBy(desc(labReports.collectedAt));
}

export async function getVaccinations(userId: string) {
  return db
    .select({
      id: vaccinations.id,
      doseLabel: vaccinations.doseLabel,
      appliedAt: vaccinations.appliedAt,
      lot: vaccinations.lot,
      site: vaccinations.site,
      vaccineName: vaccines.name,
      disease: vaccines.disease,
      vaccineId: vaccines.id,
      boosterIntervalYears: vaccines.boosterIntervalYears,
    })
    .from(vaccinations)
    .innerJoin(vaccines, eq(vaccinations.vaccineId, vaccines.id))
    .where(eq(vaccinations.userId, userId))
    .orderBy(desc(vaccinations.appliedAt));
}

export async function getVaccineCatalog() {
  return db.select().from(vaccines).orderBy(asc(vaccines.name));
}

/** Resultados que o extrator marcou para revisão humana. */
export async function getReviewQueue(userId: string) {
  return db
    .select({
      id: labResults.id,
      reportId: labResults.reportId,
      rawName: labResults.rawName,
      rawUnit: labResults.rawUnit,
      valueNum: labResults.valueNum,
      valueText: labResults.valueText,
      analyteId: labResults.analyteId,
      refLow: labResults.refLow,
      refHigh: labResults.refHigh,
      refText: labResults.refText,
      confidence: labResults.confidence,
      reviewReasons: labResults.reviewReasons,
      collectedAt: labResults.collectedAt,
      labName: labReports.labName,
    })
    .from(labResults)
    .innerJoin(labReports, eq(labResults.reportId, labReports.id))
    .where(and(eq(labResults.userId, userId), eq(labResults.reviewed, false)))
    .orderBy(desc(labResults.collectedAt));
}

export type ReviewItem = Awaited<ReturnType<typeof getReviewQueue>>[number];

/**
 * Aliases confirmados por humanos, para o extrator reconhecer na próxima vez o
 * que precisou de conferência agora. É isto que faz o catálogo melhorar com o
 * uso em vez de ficar congelado no que eu escrevi à mão.
 */
export async function getLearnedAliases(): Promise<Map<string, string>> {
  const rows = await db
    .select({ alias: analyteAliases.alias, analyteId: analyteAliases.analyteId })
    .from(analyteAliases);
  return new Map(rows.map((r) => [r.alias, r.analyteId]));
}

export async function getAnalyteCatalog() {
  return db.select().from(analytes).orderBy(asc(analytes.namePt));
}
