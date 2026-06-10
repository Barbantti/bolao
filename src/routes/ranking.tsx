import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Search, Crown, Medal, Award, Radio } from "lucide-react";

import { listRanking, type RankingRow } from "@/lib/bolao.functions";
import { LoadingState, EmptyState, ErrorState } from "@/components/States";
import { Input } from "@/components/ui/input";
import { useParticipant } from "@/hooks/use-participant";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ranking")({
  head: () => ({
    meta: [
      { title: "Ranking dos craques — Bolão Copa 2026" },
      {
        name: "description",
        content:
          "Ranking em tempo real do Bolão Copa 2026 da Copa do Mundo FIFA 2026.",
      },
      { property: "og:url", content: "/ranking" },
      { property: "og:title", content: "Ranking dos craques — Bolão Copa 2026" },
      { property: "og:description", content: "Pódio top-3 e ranking em tempo real do Bolão Copa 2026." },
    ],
    links: [{ rel: "canonical", href: "/ranking" }],
  }),
  component: RankingPage,
});

function RankingPage() {
  const fetchRanking = useServerFn(listRanking);
  const { participant } = useParticipant();

  const {
    data: rows,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["ranking"],
    queryFn: () => fetchRanking(),
    refetchOnWindowFocus: true,
    refetchInterval: 15000,
  });

  const [search, setSearch] = useState("");
  const [liveTick, setLiveTick] = useState(false);

  // Pulse "live" indicator briefly whenever a background refetch completes.
  useEffect(() => {
    if (!isFetching) return;
    setLiveTick(true);
    const t = setTimeout(() => setLiveTick(false), 1200);
    return () => clearTimeout(t);
  }, [isFetching]);


  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows ?? [];
    return (rows ?? []).filter((r) => r.name.toLowerCase().includes(q));
  }, [rows, search]);

  const top3 = (rows ?? []).slice(0, 3);
  const rest = filtered.filter((r) => r.position > 3 || search.trim().length > 0);

  const PAGE_SIZE = 12;
  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
  }, [search]);
  const totalPages = Math.max(1, Math.ceil(rest.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageRest = rest.slice(pageStart, pageStart + PAGE_SIZE);

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <header className="mb-8 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-purple to-sticker-gold text-white shadow-rare">
          <Trophy className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="mt-4 font-display text-3xl font-black sm:text-4xl">
          Ranking dos craques
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Atualizado em tempo real conforme os jogos são encerrados.
        </p>
        <div
          className={cn(
            "mt-3 inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition-colors",
            (liveTick || isFetching) && "border-brazil-green/40 text-brazil-green",
          )}
          aria-live="polite"
        >
          <Radio
            className={cn(
              "h-3 w-3",
              (liveTick || isFetching) && "animate-pulse text-brazil-green",
            )}
            aria-hidden
          />
          {liveTick ? "Atualizando…" : "Ao vivo"}
        </div>
      </header>

      {isLoading ? (
        <LoadingState label="Carregando ranking…" />
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
      ) : (rows ?? []).length === 0 ? (
        <EmptyState
          title="Ranking ainda vazio"
          description="Conforme as pessoas se cadastrarem e os jogos forem encerrados, o ranking aparecerá aqui automaticamente."
        />
      ) : (
        <>
          {/* Pódio top-3 */}
          {top3.length > 0 && (
            <div className="mb-10 grid gap-4 sm:grid-cols-3">
              {top3.map((r, i) => (
                <PodiumCard
                  key={r.id}
                  row={r}
                  rank={i + 1}
                  highlight={participant?.id === r.id}
                />
              ))}
            </div>
          )}

          {/* Busca + tabela */}
          <div className="mb-4 flex items-center gap-2">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar participante…"
                className="pl-9"
                aria-label="Buscar participante"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {(rows ?? []).length} {(rows ?? []).length === 1 ? "craque" : "craques"}
            </span>
          </div>

          <div className="sticker-frame overflow-x-auto p-0">
            <table className="w-full min-w-[480px] text-xs sm:text-sm">
              <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground sm:text-xs">
                <tr>
                  <th className="px-2 py-2 text-left sm:px-4 sm:py-3">#</th>
                  <th className="px-2 py-2 text-left sm:px-4 sm:py-3">Participante</th>
                  <th className="px-2 py-2 text-right sm:px-4 sm:py-3" title="Placares exatos">
                    5pts
                  </th>
                  <th className="px-2 py-2 text-right sm:px-4 sm:py-3" title="Vencedor + saldo">
                    3pts
                  </th>
                  <th className="px-2 py-2 text-right sm:px-4 sm:py-3" title="Só vencedor">
                    1pt
                  </th>
                  <th className="px-2 py-2 text-right sm:px-4 sm:py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {rest.length === 0 && search.trim().length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-muted-foreground"
                    >
                      Apenas o pódio por enquanto. Mais craques em breve.
                    </td>
                  </tr>
                ) : rest.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-muted-foreground"
                    >
                      Nenhum participante encontrado para "{search}".
                    </td>
                  </tr>
                ) : (
                  pageRest.map((r) => (
                    <tr
                      key={r.id}
                      className={cn(
                        "border-t transition-colors",
                        participant?.id === r.id && "bg-accent-soft/40",
                      )}
                    >
                      <td className="px-2 py-2 font-mono font-bold text-muted-foreground sm:px-4 sm:py-3">
                        {r.position}
                      </td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3">
                        <div className="font-semibold">{r.name}</div>
                        <div className="text-[10px] text-muted-foreground sm:text-xs">
                          {r.emailMasked}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums sm:px-4 sm:py-3">
                        {r.exactCount}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums sm:px-4 sm:py-3">
                        {r.resultCount}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums sm:px-4 sm:py-3">
                        {r.goalCount}
                      </td>
                      <td className="px-2 py-2 text-right font-display text-base font-black sm:px-4 sm:py-3 sm:text-lg">
                        {r.totalPoints}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <nav
              aria-label="Paginação"
              className="mt-4 flex items-center justify-center gap-2"
            >
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-md border bg-card px-3 py-1.5 text-sm font-medium disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="px-2 text-sm tabular-nums">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-md border bg-card px-3 py-1.5 text-sm font-medium disabled:opacity-50"
              >
                Próxima
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}

const RANK_META: Record<
  number,
  { Icon: typeof Crown; label: string; cls: string; aura: string }
> = {
  1: {
    Icon: Crown,
    label: "Líder do bolão",
    cls: "from-sticker-gold via-yellow-400 to-amber-500 text-yellow-950",
    aura: "shadow-rare",
  },
  2: {
    Icon: Medal,
    label: "Vice-craque",
    cls: "from-slate-300 via-slate-200 to-slate-400 text-slate-900",
    aura: "shadow-card",
  },
  3: {
    Icon: Award,
    label: "Terceiro lugar",
    cls: "from-orange-400 via-amber-500 to-orange-600 text-orange-950",
    aura: "shadow-card",
  },
};

function PodiumCard({
  row,
  rank,
  highlight,
}: {
  row: RankingRow;
  rank: number;
  highlight?: boolean;
}) {
  const meta = RANK_META[rank];
  const Icon = meta.Icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.08, type: "spring", stiffness: 220, damping: 22 }}
      className={cn(
        "sticker-frame relative overflow-hidden p-5 text-center",
        meta.aura,
        rank === 1 && "sm:scale-[1.04]",
        highlight && "ring-2 ring-accent-purple ring-offset-2 ring-offset-background",
      )}
    >
      <div
        className={cn(
          "absolute inset-0 -z-10 bg-gradient-to-br opacity-90",
          meta.cls,
        )}
        aria-hidden
      />
      <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider">
        <Icon className="h-4 w-4" aria-hidden />
        {meta.label}
      </div>
      <div className="mt-3 font-display text-2xl font-black leading-tight">
        {row.name}
      </div>
      <div className="text-xs opacity-80">{row.emailMasked}</div>
      <div className="mt-4 font-display text-5xl font-black tabular-nums">
        {row.totalPoints}
      </div>
      <div className="text-xs font-medium opacity-80">pontos</div>
      <div className="mt-3 flex justify-center gap-3 text-[11px] font-semibold">
        <span title="Placar exato">★ {row.exactCount}</span>
        <span title="Vencedor + saldo">● {row.resultCount}</span>
        <span title="Só vencedor">◦ {row.goalCount}</span>
      </div>
    </motion.div>
  );
}
