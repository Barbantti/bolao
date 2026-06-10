import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, Search, ChevronRight } from "lucide-react";

import { MatchCard, type MatchCardData } from "@/components/MatchCard";
import { LoadingState, EmptyState, ErrorState } from "@/components/States";
import { Input } from "@/components/ui/input";
import { listMatches, type MatchDTO } from "@/lib/bolao.functions";
import { stageLabel, teamName } from "@/lib/labels";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 12;

export const Route = createFileRoute("/jogos")({
  validateSearch: (s: Record<string, unknown>) => ({
    match: typeof s.match === "string" ? s.match : undefined,
  }),

  head: () => ({
    meta: [
      { title: "Jogos da Copa — Bolão Copa 2026" },
      {
        name: "description",
        content:
          "Tabela pública de jogos, resultados oficiais e status da Copa do Mundo FIFA 2026.",
      },
      { property: "og:url", content: "/jogos" },
      { property: "og:title", content: "Jogos da Copa — Bolão Copa 2026" },
      { property: "og:description", content: "Tabela pública de jogos da Copa do Mundo FIFA 2026." },
    ],
    links: [{ rel: "canonical", href: "/jogos" }],
  }),
  component: JogosPage,
});

function JogosPage() {
  const fetchMatches = useServerFn(listMatches);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["matches", "public"],
    queryFn: () => fetchMatches(),
  });

  const { match: focusId } = Route.useSearch();
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<string>("all");
  const [page, setPage] = useState(1);
  const focusRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setPage(1);
  }, [search, stage]);


  const stages = useMemo(() => {
    const s = new Set<string>();
    (data ?? []).forEach((m) => s.add(m.stage));
    return Array.from(s);
  }, [data]);

  const filteredFlat = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((m) => {
      if (stage !== "all" && m.stage !== stage) return false;
      if (!q) return true;
      return (
        teamName(m.homeTeamName, m.homeTeamCode).toLowerCase().includes(q) ||
        teamName(m.awayTeamName, m.awayTeamCode).toLowerCase().includes(q)
      );
    });
  }, [data, search, stage]);

  const totalPages = Math.max(1, Math.ceil(filteredFlat.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filteredFlat.slice(start, start + PAGE_SIZE);

  // Quando vier com ?match=ID, navega para a página correta e dá scroll/destaque.
  useEffect(() => {
    if (!focusId || !data) return;
    const idx = filteredFlat.findIndex((m) => String(m.id) === String(focusId));
    if (idx < 0) return;
    const targetPage = Math.floor(idx / PAGE_SIZE) + 1;
    if (targetPage !== page) setPage(targetPage);
  }, [focusId, data, filteredFlat, page]);

  useEffect(() => {
    if (!focusId) return;
    const t = setTimeout(() => {
      focusRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    return () => clearTimeout(t);
  }, [focusId, pageItems]);


  const grouped = useMemo(() => {
    const byDay = new Map<string, MatchDTO[]>();
    pageItems.forEach((m) => {
      const day = new Date(m.kickoff).toISOString().slice(0, 10);
      const arr = byDay.get(day) ?? [];
      arr.push(m);
      byDay.set(day, arr);
    });
    return Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [pageItems]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-black sm:text-4xl">
          Jogos da Copa
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tabela pública com todos os jogos, agrupados por data.
        </p>
      </header>

      <div className="mb-6 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar seleção…"
            className="pl-9"
            aria-label="Buscar seleção"
          />
        </div>
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm"
          aria-label="Filtrar por fase"
        >
          <option value="all">Todas as fases</option>
          {stages.map((s) => (
            <option key={s} value={s}>
              {stageLabel(s)}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <LoadingState label="Carregando jogos…" />
      ) : error ? (
        <ErrorState
          description={(error as Error).message}
          action={
            <button
              onClick={() => refetch()}
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              Tentar de novo
            </button>
          }
        />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          title="Dados oficiais ainda indisponíveis"
          description="A sincronização com a API oficial será ligada quando os dados da Copa estiverem liberados. Enquanto isso, o admin pode preencher manualmente."
        />
      ) : filteredFlat.length === 0 ? (
        <EmptyState
          title="Nenhum jogo encontrado"
          description="Ajuste os filtros para ver mais jogos."
        />
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Mostrando <strong className="text-foreground">{start + 1}</strong>–
              <strong className="text-foreground">{start + pageItems.length}</strong> de{" "}
              <strong className="text-foreground">{filteredFlat.length}</strong> jogos
            </span>
            <span>
              Página {currentPage} de {totalPages}
            </span>
          </div>
          <div className="space-y-8">
            {grouped.map(([day, ms]) => (
              <div key={day}>
                <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  <Calendar className="h-4 w-4" aria-hidden />
                  {new Intl.DateTimeFormat("pt-BR", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                  }).format(new Date(day))}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {ms.map((m) => {
                    const isFocus = focusId && String(m.id) === String(focusId);
                    return (
                      <div
                        key={m.id}
                        ref={isFocus ? focusRef : undefined}
                        className={
                          isFocus
                            ? "rounded-2xl ring-2 ring-brazil-yellow ring-offset-2 ring-offset-background transition-all"
                            : undefined
                        }
                      >
                        <Link
                          to="/jogos/$matchId"
                          params={{ matchId: String(m.id) }}
                          className="group block rounded-2xl transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          aria-label={`Ver detalhes: ${teamName(m.homeTeamName, m.homeTeamCode)} x ${teamName(m.awayTeamName, m.awayTeamCode)}`}
                        >
                          <MatchCard match={toCard(m)} />
                          <div className="mt-2 flex items-center justify-end gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground group-hover:text-foreground">
                            Ver detalhes
                            <ChevronRight className="h-3 w-3" aria-hidden />
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                </div>


              </div>
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
      )}
    </section>
  );
}

function toCard(m: MatchDTO): MatchCardData {
  return {
    id: String(m.id),
    stage: m.stage,
    groupCode: m.groupName,
    startsAt: m.kickoff,
    venue: m.venue,
    status: m.status,
    home: { nameBr: teamName(m.homeTeamName, m.homeTeamCode), countryCode: m.homeTeamCode },
    away: { nameBr: teamName(m.awayTeamName, m.awayTeamCode), countryCode: m.awayTeamCode },
    homeScore: m.homeScore,
    awayScore: m.awayScore,
  };
}
