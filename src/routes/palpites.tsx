import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Save, LogOut, Filter } from "lucide-react";
import { MatchCard } from "@/components/MatchCard";
import { LoadingState, EmptyState, ErrorState } from "@/components/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useParticipant } from "@/hooks/use-participant";
import {
  listMatches,
  listMyPredictions,
  savePredictions,
  type MatchDTO,
} from "@/lib/bolao.functions";
import { stageLabel, teamName } from "@/lib/labels";

const PAGE_SIZE = 12;

export const Route = createFileRoute("/palpites")({
  head: () => ({
    meta: [
      { title: "Meus palpites — Bolão Copa 2026" },
      {
        name: "description",
        content: "Preencha seus palpites para os jogos da Copa do Mundo FIFA 2026.",
      },
    ],
  }),
  component: PalpitesPage,
});

type DraftMap = Record<number, { home: string; away: string }>;

function PalpitesPage() {
  const navigate = useNavigate();
  const { participant, hydrated, clear } = useParticipant();

  const fetchMatches = useServerFn(listMatches);
  const fetchPredictions = useServerFn(listMyPredictions);
  const save = useServerFn(savePredictions);

  useEffect(() => {
    if (hydrated && !participant) {
      navigate({ to: "/participar", replace: true });
    }
  }, [hydrated, participant, navigate]);

  const matchesQuery = useQuery({
    queryKey: ["matches"],
    queryFn: () => fetchMatches(),
  });

  const predictionsQuery = useQuery({
    queryKey: ["predictions", participant?.id],
    queryFn: () => fetchPredictions({ data: { participantId: participant!.id } }),
    enabled: !!participant?.id,
  });

  const [draft, setDraft] = useState<DraftMap>({});
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);

  // Reset paginação ao mudar filtros
  useEffect(() => {
    setPage(1);
  }, [stageFilter, search]);

  // Hidrata o draft com palpites já salvos
  useEffect(() => {
    if (!predictionsQuery.data) return;
    setDraft((prev) => {
      const next = { ...prev };
      for (const p of predictionsQuery.data) {
        if (!next[p.matchId]) {
          next[p.matchId] = { home: String(p.homeScore), away: String(p.awayScore) };
        }
      }
      return next;
    });
  }, [predictionsQuery.data]);

  const stages = useMemo(() => {
    const set = new Set<string>();
    matchesQuery.data?.forEach((m) => set.add(m.stage));
    return Array.from(set);
  }, [matchesQuery.data]);

  const filtered = useMemo(() => {
    const all = matchesQuery.data ?? [];
    const term = search.trim().toLowerCase();
    return all.filter((m) => {
      if (stageFilter !== "all" && m.stage !== stageFilter) return false;
      if (
        term &&
        !teamName(m.homeTeamName, m.homeTeamCode).toLowerCase().includes(term) &&
        !teamName(m.awayTeamName, m.awayTeamCode).toLowerCase().includes(term)
      ) {
        return false;
      }
      return true;
    });
  }, [matchesQuery.data, stageFilter, search]);

  function setScore(matchId: number, side: "home" | "away", value: string) {
    const clean = value.replace(/[^\d]/g, "").slice(0, 2);
    setDraft((prev) => ({
      ...prev,
      [matchId]: {
        home: side === "home" ? clean : (prev[matchId]?.home ?? ""),
        away: side === "away" ? clean : (prev[matchId]?.away ?? ""),
      },
    }));
  }

  async function handleSave() {
    if (!participant) return;
    const now = Date.now();
    const matchesById = new Map(matchesQuery.data?.map((m) => [m.id, m]) ?? []);
    const saved = new Map(
      (predictionsQuery.data ?? []).map((p) => [
        p.matchId,
        `${p.homeScore}-${p.awayScore}`,
      ]),
    );

    const toSave: Array<{ matchId: number; homeScore: number; awayScore: number }> = [];
    for (const [idStr, scores] of Object.entries(draft)) {
      const id = Number(idStr);
      const m = matchesById.get(id);
      if (!m) continue;
      if (new Date(m.kickoff).getTime() <= now) continue;
      if (m.status !== "SCHEDULED") continue;
      if (scores.home === "" || scores.away === "") continue;
      const home = Number(scores.home);
      const away = Number(scores.away);
      if (!Number.isFinite(home) || !Number.isFinite(away)) continue;
      const key = `${home}-${away}`;
      if (saved.get(id) === key) continue; // sem mudança
      toSave.push({ matchId: id, homeScore: home, awayScore: away });
    }

    if (toSave.length === 0) {
      toast.info("Nenhuma alteração para salvar.");
      return;
    }

    setSaving(true);
    try {
      const res = await save({
        data: { participantId: participant.id, predictions: toSave },
      });
      toast.success(`${res.saved} palpite(s) salvos!`, {
        description: res.skipped
          ? `${res.skipped} ignorados (jogo já começou).`
          : undefined,
      });
      await predictionsQuery.refetch();
    } catch (err) {
      toast.error("Erro ao salvar", {
        description: err instanceof Error ? err.message : "Tente novamente.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (!hydrated || !participant) {
    return <LoadingState label="Carregando seu acesso…" />;
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-deep">
            Olá, {participant.name.split(" ")[0]}
          </p>
          <h1 className="font-display text-3xl font-black sm:text-4xl">Meus palpites</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Preencha o placar de cada jogo. Você pode alterar até o apito inicial.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSave} disabled={saving} size="lg">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Salvando…" : "Salvar palpites"}
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onClick={() => {
              clear();
              toast.message("Você saiu do bolão neste dispositivo.");
              navigate({ to: "/participar" });
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      {/* Filtros */}
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:pl-2">
          <Filter className="h-3.5 w-3.5" /> Filtros
        </div>
        <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_220px]">
          <Input
            placeholder="Buscar por seleção (ex.: Brasil)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar por seleção"
          />
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger aria-label="Filtrar por fase">
              <SelectValue placeholder="Fase" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as fases</SelectItem>
              {stages.map((s) => (
                <SelectItem key={s} value={s}>
                  {stageLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {matchesQuery.isLoading ? (
        <LoadingState label="Carregando jogos…" />
      ) : matchesQuery.isError ? (
        <ErrorState
          description="Não foi possível carregar os jogos."
          action={
            <Button variant="outline" onClick={() => matchesQuery.refetch()}>
              Tentar novamente
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Nenhum jogo encontrado"
          description={
            (matchesQuery.data?.length ?? 0) === 0
              ? "Os jogos serão sincronizados em breve pela área administrativa."
              : "Ajuste os filtros para ver mais jogos."
          }
        />
      ) : (
        (() => {
          const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
          const currentPage = Math.min(page, totalPages);
          const start = (currentPage - 1) * PAGE_SIZE;
          const pageItems = filtered.slice(start, start + PAGE_SIZE);
          return (
            <>
              <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Mostrando <strong className="text-foreground">{start + 1}</strong>–
                  <strong className="text-foreground">{start + pageItems.length}</strong> de{" "}
                  <strong className="text-foreground">{filtered.length}</strong> jogos
                </span>
                <span>
                  Página {currentPage} de {totalPages}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pageItems.map((m) => (
                  <PalpiteCard
                    key={m.id}
                    match={m}
                    draft={draft[m.id]}
                    onChange={(side, v) => setScore(m.id, side, v)}
                  />
                ))}
              </div>
              {totalPages > 1 && (
                <nav
                  aria-label="Paginação"
                  className="mt-6 flex items-center justify-center gap-2"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <span className="px-2 text-sm font-medium tabular-nums">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                  </Button>
                </nav>
              )}
            </>
          );
        })()
      )}
    </section>
  );
}

function PalpiteCard({
  match,
  draft,
  onChange,
}: {
  match: MatchDTO;
  draft?: { home: string; away: string };
  onChange: (side: "home" | "away", value: string) => void;
}) {
  const locked = match.status !== "SCHEDULED" || new Date(match.kickoff).getTime() <= Date.now();
  const status = locked && match.status === "SCHEDULED" ? "LOCKED" : match.status;

  return (
    <MatchCard
      match={{
        id: String(match.id),
        stage: match.stage,
        groupCode: match.groupName,
        startsAt: match.kickoff,
        venue: match.venue,
        status: status as "SCHEDULED" | "LIVE" | "FINISHED" | "LOCKED",
        home: { nameBr: teamName(match.homeTeamName, match.homeTeamCode), countryCode: match.homeTeamCode?.toLowerCase() },
        away: { nameBr: teamName(match.awayTeamName, match.awayTeamCode), countryCode: match.awayTeamCode?.toLowerCase() },
        homeScore: match.homeScore,
        awayScore: match.awayScore,
      }}
    >
      <div className="flex items-center justify-center gap-3" aria-label="Seu palpite">
        <ScoreInput
          label={`Gols ${teamName(match.homeTeamName, match.homeTeamCode)}`}
          value={draft?.home ?? ""}
          onChange={(v) => onChange("home", v)}
          disabled={locked}
        />
        <span className="font-display text-lg font-black text-muted-foreground">×</span>
        <ScoreInput
          label={`Gols ${teamName(match.awayTeamName, match.awayTeamCode)}`}
          value={draft?.away ?? ""}
          onChange={(v) => onChange("away", v)}
          disabled={locked}
        />
      </div>
      {locked && (
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Palpites bloqueados — o jogo já começou.
        </p>
      )}
    </MatchCard>
  );
}

function ScoreInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <input
      aria-label={label}
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={2}
      value={value}
      placeholder="–"
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="h-12 w-14 rounded-xl border-2 border-border bg-background text-center font-display text-2xl font-black tabular-nums focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}
