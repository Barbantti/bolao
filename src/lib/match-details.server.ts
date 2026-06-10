// Server-only helpers para detalhes de uma partida via football-data.org.
const FD_BASE = "https://api.football-data.org/v4";

function token(): string {
  const t = process.env.FOOTBALL_DATA_TOKEN;
  if (!t) throw new Error("FOOTBALL_DATA_TOKEN não configurado");
  return t;
}

export type FdPerson = {
  id: number;
  name: string;
  nationality?: string | null;
  type?: string | null;
};

export type FdGoal = {
  minute: number | null;
  injuryTime: number | null;
  type: string | null;
  team: { id: number; name: string } | null;
  scorer: { id: number; name: string } | null;
  assist: { id: number; name: string } | null;
  score: { home: number | null; away: number | null } | null;
};

export type FdMatchDetail = {
  id: number;
  utcDate: string;
  status: string;
  minute?: number | null;
  attendance?: number | null;
  venue?: string | null;
  stage: string;
  group?: string | null;
  matchday?: number | null;
  lastUpdated?: string | null;
  homeTeam: { id: number; name: string; shortName?: string; tla?: string | null; crest?: string | null };
  awayTeam: { id: number; name: string; shortName?: string; tla?: string | null; crest?: string | null };
  score: {
    winner?: string | null;
    duration?: string | null;
    fullTime?: { home: number | null; away: number | null } | null;
    halfTime?: { home: number | null; away: number | null } | null;
    extraTime?: { home: number | null; away: number | null } | null;
    penalties?: { home: number | null; away: number | null } | null;
  };
  goals?: FdGoal[];
  referees?: FdPerson[];
};

export async function fetchMatchDetail(matchId: number): Promise<FdMatchDetail | null> {
  const res = await fetch(`${FD_BASE}/matches/${matchId}`, {
    headers: { "X-Auth-Token": token() },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`football-data.org ${res.status}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as FdMatchDetail;
}

export type FdScorer = {
  player: { id: number; name: string; nationality?: string | null };
  team: { id: number; name: string; tla?: string | null; crest?: string | null };
  goals: number | null;
  assists: number | null;
  penalties: number | null;
  playedMatches: number | null;
};

export type FdCompetitionInfo = {
  id: number;
  name: string;
  code: string;
  emblem?: string | null;
  currentSeason?: {
    startDate?: string | null;
    endDate?: string | null;
    currentMatchday?: number | null;
  } | null;
};

export async function fetchCompetitionInfo(code = "WC"): Promise<FdCompetitionInfo | null> {
  const res = await fetch(`${FD_BASE}/competitions/${code}`, {
    headers: { "X-Auth-Token": token() },
  });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return (await res.json()) as FdCompetitionInfo;
}

export async function fetchCompetitionScorers(code = "WC", limit = 10): Promise<FdScorer[]> {
  const res = await fetch(`${FD_BASE}/competitions/${code}/scorers?limit=${limit}`, {
    headers: { "X-Auth-Token": token() },
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { scorers?: FdScorer[] };
  return json.scorers ?? [];
}
