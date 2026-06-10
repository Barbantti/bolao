// Server-only helpers for the football-data.org sync + admin PIN.
import { createHash, randomBytes } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const FD_BASE = "https://api.football-data.org/v4";
const COMPETITION = "WC"; // World Cup

export type FdMatch = {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  group: string | null;
  homeTeam: { id: number; name: string; shortName?: string; tla?: string | null };
  awayTeam: { id: number; name: string; shortName?: string; tla?: string | null };
  score: { fullTime: { home: number | null; away: number | null } };
  venue?: string | null;
};

export type FdTeam = {
  id: number;
  name: string;
  shortName?: string;
  tla?: string | null;
  crest?: string | null;
};

function token(): string {
  const t = process.env.FOOTBALL_DATA_TOKEN;
  if (!t) throw new Error("FOOTBALL_DATA_TOKEN não configurado");
  return t;
}

async function fd<T>(path: string): Promise<T> {
  const res = await fetch(`${FD_BASE}${path}`, {
    headers: { "X-Auth-Token": token() },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`football-data.org ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchWorldCupMatches(): Promise<FdMatch[]> {
  const data = await fd<{ matches: FdMatch[] }>(`/competitions/${COMPETITION}/matches`);
  return data.matches ?? [];
}

export async function fetchWorldCupTeams(): Promise<FdTeam[]> {
  const data = await fd<{ teams: FdTeam[] }>(`/competitions/${COMPETITION}/teams`);
  return data.teams ?? [];
}

export function mapStatus(s: string): "SCHEDULED" | "LIVE" | "FINISHED" {
  if (s === "FINISHED") return "FINISHED";
  if (s === "IN_PLAY" || s === "PAUSED") return "LIVE";
  return "SCHEDULED";
}

// ============ Admin PIN ============

const PIN_KEY = "admin_pin_hash";
const SALT_KEY = "admin_pin_salt";

export function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

export async function getAdminPinRecord() {
  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("key, value")
    .in("key", [PIN_KEY, SALT_KEY]);
  if (error) throw new Error(error.message);
  const hash = data?.find((r) => r.key === PIN_KEY)?.value ?? null;
  const salt = data?.find((r) => r.key === SALT_KEY)?.value ?? null;
  return { hash, salt };
}

export async function setAdminPinHash(pin: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = sha256(salt + pin);
  // upsert two rows
  const rows = [
    { key: PIN_KEY, value: hash },
    { key: SALT_KEY, value: salt },
  ];
  const { error } = await supabaseAdmin
    .from("settings")
    .upsert(rows, { onConflict: "key" });
  if (error) throw new Error(error.message);
}

export async function verifyAdminPin(pin: string): Promise<boolean> {
  const { hash, salt } = await getAdminPinRecord();
  if (!hash || !salt) return false;
  return sha256(salt + pin) === hash;
}

export async function requireAdmin(pin: string) {
  const ok = await verifyAdminPin(pin);
  if (!ok) throw new Error("PIN inválido");
}

export { supabaseAdmin, PIN_KEY };
