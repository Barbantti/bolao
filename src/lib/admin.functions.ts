import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  fetchWorldCupMatches,
  fetchWorldCupTeams,
  mapStatus,
  requireAdmin,
  setAdminPinHash,
  supabaseAdmin,
  verifyAdminPin,
  getAdminPinRecord,
} from "./admin.server";
import { recalculateRanking } from "./bolao.functions";

const pinSchema = z.string().trim().min(4).max(32);

// ============ PIN management ============

/** Verifica se o PIN admin já foi definido (sem expor o hash). */
export const adminPinExists = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ exists: boolean }> => {
    const { hash, salt } = await getAdminPinRecord();
    return { exists: Boolean(hash && salt) };
  },
);

/**
 * Define o PIN admin se ainda não existir. Se já existe, exige o PIN atual
 * para trocar (passe `currentPin`).
 */
export const setAdminPin = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        newPin: pinSchema,
        currentPin: pinSchema.optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { hash } = await getAdminPinRecord();
    if (hash) {
      if (!data.currentPin) throw new Error("PIN atual obrigatório");
      const ok = await verifyAdminPin(data.currentPin);
      if (!ok) throw new Error("PIN atual inválido");
    }
    await setAdminPinHash(data.newPin);
    return { ok: true };
  });

export const checkAdminPin = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ pin: pinSchema }).parse(input))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const ok = await verifyAdminPin(data.pin);
    return { ok };
  });

// ============ Sync football-data.org ============

export const syncWorldCup = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ pin: pinSchema }).parse(input))
  .handler(
    async ({
      data,
    }): Promise<{
      teamsSynced: number;
      matchesSynced: number;
      predictionsUpdated: number;
      logId: string;
    }> => {
      await requireAdmin(data.pin);

      // log start
      const { data: log, error: logErr } = await supabaseAdmin
        .from("sync_logs")
        .insert({ status: "running" })
        .select("id")
        .single();
      if (logErr) throw new Error(logErr.message);
      const logId = log.id as string;

      try {
        const [teams, matches] = await Promise.all([
          fetchWorldCupTeams(),
          fetchWorldCupMatches(),
        ]);

        // upsert teams
        const teamRows = teams.map((t) => ({
          code: t.tla ?? String(t.id),
          name: t.name,
          flag_code: t.tla ?? null,
          group_name: null as string | null,
        }));
        if (teamRows.length > 0) {
          const { error } = await supabaseAdmin
            .from("teams")
            .upsert(teamRows, { onConflict: "code" });
          if (error) throw new Error(`teams: ${error.message}`);
        }

        // upsert matches
        const matchRows = matches.map((m) => ({
          id: m.id,
          home_team_code: m.homeTeam?.tla ?? null,
          away_team_code: m.awayTeam?.tla ?? null,
          home_team_name: m.homeTeam?.name ?? "A definir",
          away_team_name: m.awayTeam?.name ?? "A definir",
          kickoff: m.utcDate,
          stage: m.stage,
          group_name: m.group ?? null,
          status: mapStatus(m.status),
          home_score: m.score?.fullTime?.home ?? null,
          away_score: m.score?.fullTime?.away ?? null,
          venue: m.venue ?? null,
        }));

        // upsert in chunks
        for (let i = 0; i < matchRows.length; i += 100) {
          const chunk = matchRows.slice(i, i + 100);
          const { error } = await supabaseAdmin
            .from("matches")
            .upsert(chunk, { onConflict: "id" });
          if (error) throw new Error(`matches: ${error.message}`);
        }

        // recompute scoring
        const rec = await recalculateRanking();

        await supabaseAdmin
          .from("sync_logs")
          .update({
            status: "ok",
            finished_at: new Date().toISOString(),
            matches_synced: matchRows.length,
            predictions_scored: rec.predictionsUpdated,
            message: `teams=${teamRows.length}`,
          })
          .eq("id", logId);

        return {
          teamsSynced: teamRows.length,
          matchesSynced: matchRows.length,
          predictionsUpdated: rec.predictionsUpdated,
          logId,
        };
      } catch (err) {
        await supabaseAdmin
          .from("sync_logs")
          .update({
            status: "error",
            finished_at: new Date().toISOString(),
            message: (err as Error).message.slice(0, 500),
          })
          .eq("id", logId);
        throw err;
      }
    },
  );

export const listSyncLogs = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ pin: pinSchema }).parse(input))
  .handler(async ({ data }) => {
    await requireAdmin(data.pin);
    const { data: rows, error } = await supabaseAdmin
      .from("sync_logs")
      .select("id, started_at, finished_at, status, matches_synced, predictions_scored, message")
      .order("started_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ============ Manual edits ============

export const adminUpsertMatch = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        pin: pinSchema,
        match: z.object({
          id: z.number().int(),
          homeTeamName: z.string().min(1).max(80),
          awayTeamName: z.string().min(1).max(80),
          homeTeamCode: z.string().min(2).max(5).nullable().optional(),
          awayTeamCode: z.string().min(2).max(5).nullable().optional(),
          kickoff: z.string().min(1),
          stage: z.string().min(1).max(40),
          groupName: z.string().max(40).nullable().optional(),
          status: z.enum(["SCHEDULED", "LIVE", "FINISHED"]),
          homeScore: z.number().int().min(0).max(99).nullable(),
          awayScore: z.number().int().min(0).max(99).nullable(),
          venue: z.string().max(120).nullable().optional(),
        }),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    await requireAdmin(data.pin);
    const m = data.match;
    const { error } = await supabaseAdmin.from("matches").upsert(
      {
        id: m.id,
        home_team_name: m.homeTeamName,
        away_team_name: m.awayTeamName,
        home_team_code: m.homeTeamCode ?? null,
        away_team_code: m.awayTeamCode ?? null,
        kickoff: m.kickoff,
        stage: m.stage,
        group_name: m.groupName ?? null,
        status: m.status,
        home_score: m.homeScore,
        away_score: m.awayScore,
        venue: m.venue ?? null,
      },
      { onConflict: "id" },
    );
    if (error) throw new Error(error.message);
    const rec = await recalculateRanking();
    return { ok: true, predictionsUpdated: rec.predictionsUpdated };
  });

export const adminDeleteMatch = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ pin: pinSchema, matchId: z.number().int() }).parse(input),
  )
  .handler(async ({ data }) => {
    await requireAdmin(data.pin);
    const { error } = await supabaseAdmin.from("matches").delete().eq("id", data.matchId);
    if (error) throw new Error(error.message);
    const rec = await recalculateRanking();
    return { ok: true, predictionsUpdated: rec.predictionsUpdated };
  });

// ============ Participants admin ============

export type AdminParticipantRow = {
  id: string;
  name: string;
  email: string;
  totalPoints: number;
  exactCount: number;
  resultCount: number;
  goalCount: number;
  predictionsCount: number;
  createdAt: string;
};

export const adminListParticipants = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ pin: pinSchema }).parse(input))
  .handler(async ({ data }): Promise<AdminParticipantRow[]> => {
    await requireAdmin(data.pin);
    const [{ data: rows, error }, { data: preds, error: pErr }] = await Promise.all([
      supabaseAdmin
        .from("participants")
        .select("id, name, email, total_points, exact_count, result_count, goal_count, created_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("predictions").select("participant_id"),
    ]);
    if (error) throw new Error(error.message);
    if (pErr) throw new Error(pErr.message);
    const counts = new Map<string, number>();
    for (const r of preds ?? []) {
      counts.set(r.participant_id, (counts.get(r.participant_id) ?? 0) + 1);
    }
    return (rows ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      totalPoints: r.total_points,
      exactCount: r.exact_count,
      resultCount: r.result_count,
      goalCount: r.goal_count,
      predictionsCount: counts.get(r.id) ?? 0,
      createdAt: r.created_at,
    }));
  });

export const adminUpdateParticipant = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        pin: pinSchema,
        participantId: z.string().uuid(),
        name: z.string().trim().min(2).max(80),
        email: z.string().trim().toLowerCase().email().max(255),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    await requireAdmin(data.pin);
    const { error } = await supabaseAdmin
      .from("participants")
      .update({ name: data.name, email: data.email })
      .eq("id", data.participantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteParticipant = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ pin: pinSchema, participantId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    await requireAdmin(data.pin);
    // predictions cascade via FK ON DELETE CASCADE
    const { error } = await supabaseAdmin
      .from("participants")
      .delete()
      .eq("id", data.participantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminResetParticipantPredictions = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ pin: pinSchema, participantId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    await requireAdmin(data.pin);
    const { error } = await supabaseAdmin
      .from("predictions")
      .delete()
      .eq("participant_id", data.participantId);
    if (error) throw new Error(error.message);
    const rec = await recalculateRanking();
    return { ok: true, predictionsUpdated: rec.predictionsUpdated };
  });

// ============ CSV exports ============

export const exportRankingCsv = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ pin: pinSchema }).parse(input))
  .handler(async ({ data }): Promise<{ csv: string }> => {
    await requireAdmin(data.pin);
    const { data: rows, error } = await supabaseAdmin
      .from("ranking_view")
      .select("position, name, email_masked, total_points, exact_count, result_count, goal_count")
      .order("position", { ascending: true });
    if (error) throw new Error(error.message);
    const header = "posição,nome,email,total,exatos,resultados,gols\n";
    const body = (rows ?? [])
      .map((r: any) =>
        [r.position, csv(r.name), csv(r.email_masked), r.total_points, r.exact_count, r.result_count, r.goal_count].join(","),
      )
      .join("\n");
    return { csv: header + body };
  });

export const exportPredictionsCsv = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ pin: pinSchema }).parse(input))
  .handler(async ({ data }): Promise<{ csv: string }> => {
    await requireAdmin(data.pin);
    const [{ data: preds, error: pErr }, { data: parts, error: aErr }, { data: matches, error: mErr }] =
      await Promise.all([
        supabaseAdmin
          .from("predictions")
          .select("participant_id, match_id, home_score, away_score, points, scored")
          .limit(50000),
        supabaseAdmin.from("participants").select("id, name, email"),
        supabaseAdmin
          .from("matches")
          .select("id, stage, home_team_name, away_team_name, kickoff"),
      ]);
    if (pErr) throw new Error(pErr.message);
    if (aErr) throw new Error(aErr.message);
    if (mErr) throw new Error(mErr.message);
    const partMap = new Map((parts ?? []).map((p) => [p.id, p]));
    const matchMap = new Map((matches ?? []).map((m) => [m.id, m]));
    const header =
      "participante,email,jogo,fase,kickoff,palpite_casa,palpite_fora,pontos,pontuado\n";
    const body = (preds ?? [])
      .map((r) => {
        const p = partMap.get(r.participant_id) as any;
        const m = matchMap.get(r.match_id) as any;
        return [
          csv(p?.name ?? ""),
          csv(p?.email ?? ""),
          csv(`${m?.home_team_name ?? "?"} x ${m?.away_team_name ?? "?"}`),
          csv(m?.stage ?? ""),
          csv(m?.kickoff ?? ""),
          r.home_score,
          r.away_score,
          r.points,
          r.scored,
        ].join(",");
      })
      .join("\n");
    return { csv: header + body };
  });

function csv(s: string) {
  if (s == null) return "";
  const needs = /[",\n]/.test(s);
  const escaped = String(s).replace(/"/g, '""');
  return needs ? `"${escaped}"` : escaped;
}
