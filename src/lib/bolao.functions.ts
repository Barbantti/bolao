import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fetchAllMatches, normalizeEmail, supabaseAdmin } from "./bolao.server";
import { scorePrediction } from "./scoring";

// ============ Schemas ============

const emailSchema = z.string().trim().toLowerCase().email().max(255);
const nameSchema = z.string().trim().min(2).max(80);

const createParticipantSchema = z.object({
  name: nameSchema,
  email: emailSchema,
});

const updateNameSchema = z.object({
  participantId: z.string().uuid(),
  name: nameSchema,
});

const savePredictionsSchema = z.object({
  participantId: z.string().uuid(),
  predictions: z
    .array(
      z.object({
        matchId: z.number().int(),
        homeScore: z.number().int().min(0).max(99),
        awayScore: z.number().int().min(0).max(99),
      }),
    )
    .min(1)
    .max(200),
});

// ============ Types ============

export type ParticipantDTO = {
  id: string;
  name: string;
  email: string;
  totalPoints: number;
};

export type MatchDTO = {
  id: number;
  homeTeamCode: string | null;
  awayTeamCode: string | null;
  homeTeamName: string;
  awayTeamName: string;
  kickoff: string;
  stage: string;
  groupName: string | null;
  status: "SCHEDULED" | "LIVE" | "FINISHED" | "LOCKED";
  homeScore: number | null;
  awayScore: number | null;
  venue: string | null;
};

export type PredictionDTO = {
  matchId: number;
  homeScore: number;
  awayScore: number;
  points: number;
  scored: boolean;
};

// ============ Server functions ============

/**
 * Creates a participant by email, or returns the existing one if the email is
 * already registered. Idempotent — safe to call multiple times.
 */
export const createOrGetParticipant = createServerFn({ method: "POST" })
  .inputValidator((input) => createParticipantSchema.parse(input))
  .handler(async ({ data }): Promise<ParticipantDTO> => {
    const email = normalizeEmail(data.email);

    const { data: existing, error: selErr } = await supabaseAdmin
      .from("participants")
      .select("id, name, email, total_points")
      .eq("email", email)
      .maybeSingle();
    if (selErr) throw new Error(selErr.message);

    if (existing) {
      return {
        id: existing.id,
        name: existing.name,
        email: existing.email,
        totalPoints: existing.total_points,
      };
    }

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("participants")
      .insert({ name: data.name, email })
      .select("id, name, email, total_points")
      .single();
    if (insErr) throw new Error(insErr.message);

    return {
      id: inserted.id,
      name: inserted.name,
      email: inserted.email,
      totalPoints: inserted.total_points,
    };
  });

/** Returns a participant by id (used to rehydrate session from localStorage). */
export const getParticipant = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }): Promise<ParticipantDTO | null> => {
    const { data: row, error } = await supabaseAdmin
      .from("participants")
      .select("id, name, email, total_points")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      totalPoints: row.total_points,
    };
  });

export const updateParticipantName = createServerFn({ method: "POST" })
  .inputValidator((input) => updateNameSchema.parse(input))
  .handler(async ({ data }): Promise<ParticipantDTO> => {
    const { data: row, error } = await supabaseAdmin
      .from("participants")
      .update({ name: data.name })
      .eq("id", data.participantId)
      .select("id, name, email, total_points")
      .single();
    if (error) throw new Error(error.message);
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      totalPoints: row.total_points,
    };
  });

/** Public list of matches (used by /jogos and /palpites). */
export const listMatches = createServerFn({ method: "GET" }).handler(
  async (): Promise<MatchDTO[]> => {
    const rows = await fetchAllMatches();
    return rows.map((m) => ({
      id: m.id,
      homeTeamCode: m.home_team_code,
      awayTeamCode: m.away_team_code,
      homeTeamName: m.home_team_name,
      awayTeamName: m.away_team_name,
      kickoff: m.kickoff,
      stage: m.stage,
      groupName: m.group_name,
      status: (m.status as MatchDTO["status"]) ?? "SCHEDULED",
      homeScore: m.home_score,
      awayScore: m.away_score,
      venue: m.venue,
    }));
  },
);

/** Loads existing predictions for a participant, keyed by match id. */
export const listMyPredictions = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ participantId: z.string().uuid() }).parse(input))
  .handler(async ({ data }): Promise<PredictionDTO[]> => {
    const { data: rows, error } = await supabaseAdmin
      .from("predictions")
      .select("match_id, home_score, away_score, points, scored")
      .eq("participant_id", data.participantId);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      matchId: r.match_id,
      homeScore: r.home_score,
      awayScore: r.away_score,
      points: r.points,
      scored: r.scored,
    }));
  });

/**
 * Bulk upserts predictions. Rejects predictions for matches that have already
 * started (server-side enforcement — never trust the client).
 */
export const savePredictions = createServerFn({ method: "POST" })
  .inputValidator((input) => savePredictionsSchema.parse(input))
  .handler(async ({ data }): Promise<{ saved: number; skipped: number; reasons: string[] }> => {
    const matchIds = Array.from(new Set(data.predictions.map((p) => p.matchId)));

    const { data: matches, error: mErr } = await supabaseAdmin
      .from("matches")
      .select("id, kickoff, status")
      .in("id", matchIds);
    if (mErr) throw new Error(mErr.message);

    const now = Date.now();
    const matchById = new Map(matches?.map((m) => [m.id, m]) ?? []);
    const reasons: string[] = [];
    const toUpsert: Array<{
      participant_id: string;
      match_id: number;
      home_score: number;
      away_score: number;
    }> = [];

    for (const p of data.predictions) {
      const m = matchById.get(p.matchId);
      if (!m) {
        reasons.push(`Jogo ${p.matchId} não encontrado`);
        continue;
      }
      const kickoff = new Date(m.kickoff).getTime();
      if (kickoff <= now || m.status !== "SCHEDULED") {
        reasons.push(`Jogo ${p.matchId} já começou`);
        continue;
      }
      toUpsert.push({
        participant_id: data.participantId,
        match_id: p.matchId,
        home_score: p.homeScore,
        away_score: p.awayScore,
      });
    }

    if (toUpsert.length === 0) {
      return { saved: 0, skipped: data.predictions.length, reasons };
    }

    const { error: upErr } = await supabaseAdmin
      .from("predictions")
      .upsert(toUpsert, { onConflict: "participant_id,match_id" });
    if (upErr) throw new Error(upErr.message);

    return {
      saved: toUpsert.length,
      skipped: data.predictions.length - toUpsert.length,
      reasons,
    };
  });

// ============ Ranking & Scoring ============

export type RankingRow = {
  id: string;
  name: string;
  emailMasked: string;
  totalPoints: number;
  exactCount: number;
  resultCount: number;
  goalCount: number;
  position: number;
};

/** Public ranking — reads ranking_view (email masked, ordered, with RANK()). */
export const listRanking = createServerFn({ method: "GET" }).handler(
  async (): Promise<RankingRow[]> => {
    const { data, error } = await supabaseAdmin
      .from("ranking_view")
      .select(
        "id, name, email_masked, total_points, exact_count, result_count, goal_count, position",
      )
      .order("position", { ascending: true })
      .limit(1000);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      id: r.id,
      name: r.name,
      emailMasked: r.email_masked,
      totalPoints: r.total_points,
      exactCount: r.exact_count,
      resultCount: r.result_count,
      goalCount: r.goal_count,
      position: r.position,
    }));
  },
);

// ============ Home stats ============

export type HomeStats = {
  participantsCount: number;
  totalMatches: number;
  nextMatch: {
    id: number;
    homeTeamName: string;
    awayTeamName: string;
    homeTeamCode: string | null;
    awayTeamCode: string | null;
    kickoff: string;
  } | null;
  leader: { name: string; totalPoints: number } | null;
  brazilNextMatches: Array<{
    id: number;
    homeTeamName: string;
    awayTeamName: string;
    homeTeamCode: string | null;
    awayTeamCode: string | null;
    kickoff: string;
    venue: string | null;
    stage: string;
  }>;
};

/** Agrega métricas e calendário do Brasil para a home. */
export const getHomeStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<HomeStats> => {
    const nowIso = new Date().toISOString();

    const [participantsRes, totalRes, nextRes, leaderRes, brazilRes] = await Promise.all([
      supabaseAdmin.from("participants").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("matches").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("matches")
        .select("id, home_team_name, away_team_name, home_team_code, away_team_code, kickoff")
        .eq("status", "SCHEDULED")
        .gte("kickoff", nowIso)
        .order("kickoff", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("participants")
        .select("name, total_points")
        .gt("total_points", 0)
        .order("total_points", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("matches")
        .select(
          "id, home_team_name, away_team_name, home_team_code, away_team_code, kickoff, venue, stage, status",
        )
        .or("home_team_code.eq.BRA,away_team_code.eq.BRA")
        .gte("kickoff", nowIso)
        .order("kickoff", { ascending: true })
        .limit(5),
    ]);

    if (participantsRes.error) throw new Error(participantsRes.error.message);
    if (totalRes.error) throw new Error(totalRes.error.message);
    if (nextRes.error) throw new Error(nextRes.error.message);
    if (leaderRes.error) throw new Error(leaderRes.error.message);
    if (brazilRes.error) throw new Error(brazilRes.error.message);

    return {
      participantsCount: participantsRes.count ?? 0,
      totalMatches: totalRes.count ?? 0,
      nextMatch: nextRes.data
        ? {
            id: nextRes.data.id,
            homeTeamName: nextRes.data.home_team_name,
            awayTeamName: nextRes.data.away_team_name,
            homeTeamCode: nextRes.data.home_team_code,
            awayTeamCode: nextRes.data.away_team_code,
            kickoff: nextRes.data.kickoff,
          }
        : null,
      leader: leaderRes.data
        ? { name: leaderRes.data.name, totalPoints: leaderRes.data.total_points }
        : null,
      brazilNextMatches: (brazilRes.data ?? []).map((m) => ({
        id: m.id,
        homeTeamName: m.home_team_name,
        awayTeamName: m.away_team_name,
        homeTeamCode: m.home_team_code,
        awayTeamCode: m.away_team_code,
        kickoff: m.kickoff,
        venue: m.venue,
        stage: m.stage,
      })),
    };
  },
);

/**
 * Recomputa pontos de TODAS as predictions a partir das partidas FINISHED.
 * Idempotente — pode rodar quantas vezes quiser. Chamado pelo /admin após
 * sincronizar resultados ou editar placar manualmente.
 */
export const recalculateRanking = createServerFn({ method: "POST" }).handler(
  async (): Promise<{
    matchesScored: number;
    predictionsUpdated: number;
    participantsUpdated: number;
  }> => {
    // 1) jogos encerrados com placar
    const { data: finished, error: mErr } = await supabaseAdmin
      .from("matches")
      .select("id, home_score, away_score, status")
      .eq("status", "FINISHED")
      .not("home_score", "is", null)
      .not("away_score", "is", null);
    if (mErr) throw new Error(mErr.message);

    const finishedMap = new Map(
      (finished ?? []).map((m) => [
        m.id,
        { home: m.home_score as number, away: m.away_score as number },
      ]),
    );

    // 2) todas as predictions (para zerar palpites de jogos não-encerrados)
    const { data: preds, error: pErr } = await supabaseAdmin
      .from("predictions")
      .select("id, participant_id, match_id, home_score, away_score, points, scored");
    if (pErr) throw new Error(pErr.message);

    let predictionsUpdated = 0;
    type Agg = { total: number; exact: number; result: number; goal: number };
    const agg = new Map<string, Agg>();

    const upserts: Array<{
      id: string;
      points: number;
      scored: boolean;
    }> = [];

    for (const p of preds ?? []) {
      const real = finishedMap.get(p.match_id);
      const a = agg.get(p.participant_id) ?? ({ total: 0, exact: 0, result: 0, goal: 0 } as Agg);

      if (!real) {
        // jogo ainda não encerrado — palpite vale 0, scored=false
        if (p.points !== 0 || p.scored) {
          upserts.push({ id: p.id, points: 0, scored: false });
          predictionsUpdated++;
        }
        agg.set(p.participant_id, a);
        continue;
      }

      const outcome = scorePrediction(p.home_score, p.away_score, real.home, real.away);
      if (p.points !== outcome.points || !p.scored) {
        upserts.push({ id: p.id, points: outcome.points, scored: true });
        predictionsUpdated++;
      }
      a.total += outcome.points;
      if (outcome.kind === "exact") a.exact++;
      else if (outcome.kind === "result") a.result++;
      else if (outcome.kind === "goal") a.goal++;
      agg.set(p.participant_id, a);
    }

    // 3) aplica updates em predictions em lotes
    for (let i = 0; i < upserts.length; i += 200) {
      const chunk = upserts.slice(i, i + 200);
      await Promise.all(
        chunk.map((u) =>
          supabaseAdmin
            .from("predictions")
            .update({ points: u.points, scored: u.scored })
            .eq("id", u.id),
        ),
      );
    }

    // 4) atualiza agregados em participants (inclui zerar quem não tem mais pontos)
    const { data: allParticipants, error: apErr } = await supabaseAdmin
      .from("participants")
      .select("id");
    if (apErr) throw new Error(apErr.message);

    let participantsUpdated = 0;
    for (const part of allParticipants ?? []) {
      const a = agg.get(part.id) ?? { total: 0, exact: 0, result: 0, goal: 0 };
      const { error: uErr } = await supabaseAdmin
        .from("participants")
        .update({
          total_points: a.total,
          exact_count: a.exact,
          result_count: a.result,
          goal_count: a.goal,
        })
        .eq("id", part.id);
      if (uErr) throw new Error(uErr.message);
      participantsUpdated++;
    }

    return {
      matchesScored: finishedMap.size,
      predictionsUpdated,
      participantsUpdated,
    };
  },
);

// ============ Match details ============

import { fetchMatchDetail, type FdMatchDetail } from "./match-details.server";

export type MatchDetailsDTO = {
  match: MatchDTO;
  extra: FdMatchDetail | null;
  predictionsStats: {
    total: number;
    homeWin: number;
    draw: number;
    awayWin: number;
    topScores: { score: string; count: number }[];
    averageHome: number | null;
    averageAway: number | null;
  };
};

export const getMatchDetails = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ matchId: z.coerce.number().int().positive() }).parse(input))
  .handler(async ({ data }): Promise<MatchDetailsDTO> => {
    const { data: row, error } = await supabaseAdmin
      .from("matches")
      .select(
        "id, home_team_code, away_team_code, home_team_name, away_team_name, kickoff, stage, group_name, status, home_score, away_score, venue",
      )
      .eq("id", data.matchId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Jogo não encontrado");

    // Tenta enriquecer com dados da football-data.org. Falha gentilmente.
    let extra: FdMatchDetail | null = null;
    try {
      extra = await fetchMatchDetail(row.id);
    } catch (err) {
      console.warn("[getMatchDetails] football-data falhou:", err);
    }

    // Estatísticas anônimas de palpites (sem expor identidade).
    const { data: preds } = await supabaseAdmin
      .from("predictions")
      .select("home_score, away_score")
      .eq("match_id", row.id);

    const total = preds?.length ?? 0;
    let homeWin = 0;
    let draw = 0;
    let awayWin = 0;
    let sumH = 0;
    let sumA = 0;
    const scoreMap = new Map<string, number>();
    for (const p of preds ?? []) {
      if (p.home_score > p.away_score) homeWin++;
      else if (p.home_score < p.away_score) awayWin++;
      else draw++;
      sumH += p.home_score;
      sumA += p.away_score;
      const key = `${p.home_score}-${p.away_score}`;
      scoreMap.set(key, (scoreMap.get(key) ?? 0) + 1);
    }
    const topScores = Array.from(scoreMap.entries())
      .map(([score, count]) => ({ score, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return {
      match: {
        id: row.id,
        homeTeamCode: row.home_team_code,
        awayTeamCode: row.away_team_code,
        homeTeamName: row.home_team_name,
        awayTeamName: row.away_team_name,
        kickoff: row.kickoff,
        stage: row.stage,
        groupName: row.group_name,
        status: row.status as MatchDTO["status"],
        homeScore: row.home_score,
        awayScore: row.away_score,
        venue: row.venue,
      },
      extra,
      predictionsStats: {
        total,
        homeWin,
        draw,
        awayWin,
        topScores,
        averageHome: total ? sumH / total : null,
        averageAway: total ? sumA / total : null,
      },
    };
  });

// ============ Leader details ============

export type LeaderDetails = {
  leader: {
    id: string;
    name: string;
    emailMasked: string;
    totalPoints: number;
    exactCount: number;
    resultCount: number;
    goalCount: number;
    position: number;
    predictionsCount: number;
    createdAt: string;
  } | null;
  recentPredictions: Array<{
    id: string;
    matchId: number;
    homeTeamName: string;
    awayTeamName: string;
    homeTeamCode: string | null;
    awayTeamCode: string | null;
    kickoff: string;
    status: string;
    homeScore: number | null;
    awayScore: number | null;
    predHome: number;
    predAway: number;
    points: number;
    scored: boolean;
  }>;
  competition: {
    id: number;
    name: string;
    code: string;
    emblem: string | null;
    currentMatchday: number | null;
    startDate: string | null;
    endDate: string | null;
  } | null;
  topScorers: Array<{
    playerName: string;
    nationality: string | null;
    teamName: string;
    teamCrest: string | null;
    goals: number;
    assists: number | null;
    penalties: number | null;
    playedMatches: number | null;
  }>;
};

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return "***";
  const visible = user.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(1, user.length - 2))}@${domain}`;
}

export const getLeaderDetails = createServerFn({ method: "GET" }).handler(
  async (): Promise<LeaderDetails> => {
    const { fetchCompetitionInfo, fetchCompetitionScorers } =
      await import("./match-details.server");

    const { data: leaderRow, error: lErr } = await supabaseAdmin
      .from("participants")
      .select("id, name, email, total_points, exact_count, result_count, goal_count, created_at")
      .order("total_points", { ascending: false })
      .order("exact_count", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (lErr) throw new Error(lErr.message);

    if (!leaderRow) {
      return { leader: null, recentPredictions: [], competition: null, topScorers: [] };
    }

    // Position
    const { count: aheadCount } = await supabaseAdmin
      .from("participants")
      .select("id", { count: "exact", head: true })
      .gt("total_points", leaderRow.total_points);
    const position = (aheadCount ?? 0) + 1;

    // Predictions
    const { data: predsRaw } = await supabaseAdmin
      .from("predictions")
      .select("id, match_id, home_score, away_score, points, scored")
      .eq("participant_id", leaderRow.id);
    const preds = predsRaw ?? [];

    let recentPredictions: LeaderDetails["recentPredictions"] = [];
    if (preds.length > 0) {
      const matchIds = preds.map((p) => p.match_id);
      const { data: matches } = await supabaseAdmin
        .from("matches")
        .select(
          "id, home_team_name, away_team_name, home_team_code, away_team_code, kickoff, status, home_score, away_score",
        )
        .in("id", matchIds)
        .order("kickoff", { ascending: false })
        .limit(20);
      const matchMap = new Map((matches ?? []).map((m) => [m.id, m]));
      recentPredictions = preds
        .map((p) => {
          const m = matchMap.get(p.match_id);
          if (!m) return null;
          return {
            id: p.id,
            matchId: m.id,
            homeTeamName: m.home_team_name,
            awayTeamName: m.away_team_name,
            homeTeamCode: m.home_team_code,
            awayTeamCode: m.away_team_code,
            kickoff: m.kickoff,
            status: m.status,
            homeScore: m.home_score,
            awayScore: m.away_score,
            predHome: p.home_score,
            predAway: p.away_score,
            points: p.points,
            scored: p.scored,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .sort((a, b) => new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime())
        .slice(0, 12);
    }

    // Football-data: competição + top scorers (com fallback silencioso)
    let competition: LeaderDetails["competition"] = null;
    let topScorers: LeaderDetails["topScorers"] = [];
    try {
      const [info, scorers] = await Promise.all([
        fetchCompetitionInfo("WC"),
        fetchCompetitionScorers("WC", 10),
      ]);
      if (info) {
        competition = {
          id: info.id,
          name: info.name,
          code: info.code,
          emblem: info.emblem ?? null,
          currentMatchday: info.currentSeason?.currentMatchday ?? null,
          startDate: info.currentSeason?.startDate ?? null,
          endDate: info.currentSeason?.endDate ?? null,
        };
      }
      topScorers = scorers.map((s) => ({
        playerName: s.player.name,
        nationality: s.player.nationality ?? null,
        teamName: s.team.name,
        teamCrest: s.team.crest ?? null,
        goals: s.goals ?? 0,
        assists: s.assists ?? null,
        penalties: s.penalties ?? null,
        playedMatches: s.playedMatches ?? null,
      }));
    } catch (e) {
      console.warn("[getLeaderDetails] football-data falhou:", (e as Error).message);
    }

    return {
      leader: {
        id: leaderRow.id,
        name: leaderRow.name,
        emailMasked: maskEmail(leaderRow.email),
        totalPoints: leaderRow.total_points,
        exactCount: leaderRow.exact_count,
        resultCount: leaderRow.result_count,
        goalCount: leaderRow.goal_count,
        position,
        predictionsCount: preds.length,
        createdAt: leaderRow.created_at,
      },
      recentPredictions,
      competition,
      topScorers,
    };
  },
);
