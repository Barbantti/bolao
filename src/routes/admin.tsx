import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  RefreshCw,
  Download,
  LogOut,
  KeyRound,
  Lock,
  Pencil,
  Trash2,
  RotateCcw,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/States";
import {
  adminPinExists,
  checkAdminPin,
  setAdminPin,
  syncWorldCup,
  listSyncLogs,
  adminUpsertMatch,
  adminDeleteMatch,
  exportRankingCsv,
  exportPredictionsCsv,
  adminListParticipants,
  adminUpdateParticipant,
  adminDeleteParticipant,
  adminResetParticipantPredictions,
  type AdminParticipantRow,
} from "@/lib/admin.functions";
import { listMatches, type MatchDTO } from "@/lib/bolao.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Bolão Copa 2026" },
      { name: "description", content: "Área administrativa do bolão." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
});

const PIN_KEY = "bolao_admin_pin";

function AdminPage() {
  const [pin, setPin] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPin(sessionStorage.getItem(PIN_KEY));
    setHydrated(true);
  }, []);

  if (!hydrated) return <LoadingState />;
  if (!pin) return <AdminGate onUnlock={(p) => {
    sessionStorage.setItem(PIN_KEY, p);
    setPin(p);
  }} />;

  return (
    <AdminDashboard
      pin={pin}
      onLogout={() => {
        sessionStorage.removeItem(PIN_KEY);
        setPin(null);
      }}
    />
  );
}

// ============ Gate ============

function AdminGate({ onUnlock }: { onUnlock: (pin: string) => void }) {
  const checkPinExists = useServerFn(adminPinExists);
  const checkPin = useServerFn(checkAdminPin);
  const definePin = useServerFn(setAdminPin);

  const { data: status, isLoading } = useQuery({
    queryKey: ["admin-pin-exists"],
    queryFn: () => checkPinExists(),
  });

  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [busy, setBusy] = useState(false);

  if (isLoading) return <LoadingState />;

  const exists = status?.exists ?? false;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (exists) {
        const { ok } = await checkPin({ data: { pin } });
        if (!ok) throw new Error("PIN inválido");
        onUnlock(pin);
        toast.success("Painel desbloqueado");
      } else {
        if (pin.length < 4) throw new Error("PIN precisa ter pelo menos 4 caracteres");
        if (pin !== pin2) throw new Error("PINs não conferem");
        await definePin({ data: { newPin: pin } });
        onUnlock(pin);
        toast.success("PIN admin definido");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-md px-4 py-12">
      <header className="mb-8 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-deep">
          <Lock className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="mt-4 font-display text-3xl font-black">
          {exists ? "Acesso admin" : "Configurar admin"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {exists
            ? "Digite o PIN admin para acessar o painel."
            : "Defina um PIN admin (mínimo 4 caracteres). Guarde com carinho — não dá pra recuperar."}
        </p>
      </header>
      <form onSubmit={submit} className="sticker-frame space-y-4 p-6">
        <div>
          <label className="mb-1 block text-sm font-medium">PIN</label>
          <Input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            required
            minLength={4}
            maxLength={32}
          />
        </div>
        {!exists && (
          <div>
            <label className="mb-1 block text-sm font-medium">Confirmar PIN</label>
            <Input
              type="password"
              autoComplete="off"
              value={pin2}
              onChange={(e) => setPin2(e.target.value)}
              required
              minLength={4}
              maxLength={32}
            />
          </div>
        )}
        <Button type="submit" disabled={busy} className="w-full">
          <KeyRound className="mr-2 h-4 w-4" />
          {exists ? "Entrar" : "Salvar PIN"}
        </Button>
      </form>
    </section>
  );
}

// ============ Dashboard ============

function AdminDashboard({ pin, onLogout }: { pin: string; onLogout: () => void }) {
  const qc = useQueryClient();
  const sync = useServerFn(syncWorldCup);
  const logsFn = useServerFn(listSyncLogs);
  const fetchMatches = useServerFn(listMatches);
  const exportRanking = useServerFn(exportRankingCsv);
  const exportPreds = useServerFn(exportPredictionsCsv);

  const logsQ = useQuery({
    queryKey: ["sync-logs"],
    queryFn: () => logsFn({ data: { pin } }),
  });

  const matchesQ = useQuery({
    queryKey: ["matches", "admin"],
    queryFn: () => fetchMatches(),
  });

  const syncM = useMutation({
    mutationFn: () => sync({ data: { pin } }),
    onSuccess: (r) => {
      toast.success(
        `Sincronizado: ${r.matchesSynced} jogos, ${r.teamsSynced} times, ${r.predictionsUpdated} palpites recalculados.`,
      );
      qc.invalidateQueries({ queryKey: ["sync-logs"] });
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["ranking"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  function downloadCsv(filename: string, csv: string) {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:py-12">
      <header className="flex items-start justify-between gap-4">
        <div>
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-deep">
            <ShieldCheck className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="mt-4 font-display text-3xl font-black">Painel admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sincronização com football-data.org, edição manual e exportações.
          </p>
        </div>
        <Button variant="outline" onClick={onLogout}>
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </Button>
      </header>

      {/* Sync */}
      <div className="sticker-frame space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold">Sincronizar Copa</h2>
            <p className="text-sm text-muted-foreground">
              Busca times e jogos via football-data.org e recalcula o ranking.
            </p>
          </div>
          <Button onClick={() => syncM.mutate()} disabled={syncM.isPending}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${syncM.isPending ? "animate-spin" : ""}`}
            />
            {syncM.isPending ? "Sincronizando…" : "Sincronizar agora"}
          </Button>
        </div>
        {logsQ.data && logsQ.data.length > 0 && (
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Início</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-right">Jogos</th>
                  <th className="px-3 py-2 text-right">Palpites</th>
                  <th className="px-3 py-2 text-left">Mensagem</th>
                </tr>
              </thead>
              <tbody>
                {logsQ.data.slice(0, 5).map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className="px-3 py-2 tabular-nums">
                      {new Date(l.started_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          l.status === "ok"
                            ? "text-brazil-green"
                            : l.status === "error"
                              ? "text-destructive"
                              : "text-muted-foreground"
                        }
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {l.matches_synced ?? 0}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {l.predictions_scored ?? 0}
                    </td>
                    <td className="truncate px-3 py-2 text-muted-foreground">
                      {l.message ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Exports */}
      <div className="sticker-frame space-y-3 p-6">
        <h2 className="font-display text-lg font-bold">Exportar CSV</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const { csv } = await exportRanking({ data: { pin } });
                downloadCsv("ranking.csv", csv);
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
          >
            <Download className="mr-2 h-4 w-4" /> Ranking
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const { csv } = await exportPreds({ data: { pin } });
                downloadCsv("palpites.csv", csv);
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
          >
            <Download className="mr-2 h-4 w-4" /> Palpites
          </Button>
        </div>
      </div>

      {/* Participants */}
      <ParticipantsAdmin pin={pin} />

      {/* Manual edit */}
      <ManualMatchEditor pin={pin} matches={matchesQ.data ?? []} />
    </section>
  );
}

function ParticipantsAdmin({ pin }: { pin: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListParticipants);
  const updateFn = useServerFn(adminUpdateParticipant);
  const deleteFn = useServerFn(adminDeleteParticipant);
  const resetFn = useServerFn(adminResetParticipantPredictions);

  const q = useQuery({
    queryKey: ["admin-participants"],
    queryFn: () => listFn({ data: { pin } }),
  });

  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [filter, setFilter] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-participants"] });
    qc.invalidateQueries({ queryKey: ["ranking"] });
  };

  function startEdit(p: AdminParticipantRow) {
    setEditing(p.id);
    setEditName(p.name);
    setEditEmail(p.email);
  }

  async function save(id: string) {
    try {
      await updateFn({
        data: { pin, participantId: id, name: editName.trim(), email: editEmail.trim() },
      });
      toast.success("Participante atualizado");
      setEditing(null);
      invalidate();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function remove(p: AdminParticipantRow) {
    if (!confirm(`Excluir ${p.name} (${p.email})? Todos os palpites serão removidos.`)) return;
    try {
      await deleteFn({ data: { pin, participantId: p.id } });
      toast.success("Participante excluído");
      invalidate();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function reset(p: AdminParticipantRow) {
    if (!confirm(`Apagar TODOS os palpites de ${p.name}?`)) return;
    try {
      await resetFn({ data: { pin, participantId: p.id } });
      toast.success("Palpites apagados");
      invalidate();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const rows = (q.data ?? []).filter((r) => {
    if (!filter.trim()) return true;
    const f = filter.toLowerCase();
    return r.name.toLowerCase().includes(f) || r.email.toLowerCase().includes(f);
  });

  return (
    <div className="sticker-frame space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">Participantes</h2>
          <p className="text-sm text-muted-foreground">
            Editar nome/e-mail, zerar palpites ou excluir conta (hard delete, cascata).
          </p>
        </div>
        <Input
          placeholder="Buscar por nome ou e-mail"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-xs"
        />
      </div>
      {q.isLoading ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum participante encontrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Nome</th>
                <th className="px-3 py-2 text-left">E-mail</th>
                <th className="px-3 py-2 text-right">Pts</th>
                <th className="px-3 py-2 text-right">Palpites</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-t align-middle">
                  <td className="px-3 py-2">
                    {editing === p.id ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8"
                      />
                    ) : (
                      p.name
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {editing === p.id ? (
                      <Input
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="h-8"
                      />
                    ) : (
                      p.email
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{p.totalPoints}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{p.predictionsCount}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      {editing === p.id ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => save(p.id)}>
                            <Save className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                            Cancelar
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="outline" onClick={() => startEdit(p)} title="Editar">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => reset(p)}
                            title="Zerar palpites"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => remove(p)}
                            title="Excluir"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ManualMatchEditor({
  pin,
  matches,
}: {
  pin: string;
  matches: MatchDTO[];
}) {
  const qc = useQueryClient();
  const upsert = useServerFn(adminUpsertMatch);
  const delMatch = useServerFn(adminDeleteMatch);
  const [selectedId, setSelectedId] = useState<string>("");
  const selected = matches.find((m) => String(m.id) === selectedId);

  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [status, setStatus] = useState<"SCHEDULED" | "LIVE" | "FINISHED">("FINISHED");

  useEffect(() => {
    if (selected) {
      setHome(selected.homeScore?.toString() ?? "");
      setAway(selected.awayScore?.toString() ?? "");
      setStatus((selected.status as any) === "LOCKED" ? "SCHEDULED" : (selected.status as any));
    }
  }, [selectedId]);

  const m = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Selecione um jogo");
      return upsert({
        data: {
          pin,
          match: {
            id: selected.id,
            homeTeamName: selected.homeTeamName,
            awayTeamName: selected.awayTeamName,
            homeTeamCode: selected.homeTeamCode,
            awayTeamCode: selected.awayTeamCode,
            kickoff: selected.kickoff,
            stage: selected.stage,
            groupName: selected.groupName,
            status,
            homeScore: home === "" ? null : Number(home),
            awayScore: away === "" ? null : Number(away),
            venue: selected.venue,
          },
        },
      });
    },
    onSuccess: (r) => {
      toast.success(`Jogo atualizado. ${r.predictionsUpdated} palpites recalculados.`);
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["ranking"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="sticker-frame space-y-4 p-6">
      <div>
        <h2 className="font-display text-lg font-bold">Edição manual de jogo</h2>
        <p className="text-sm text-muted-foreground">
          Contingência quando a API estiver indisponível. Recalcula pontos automaticamente.
        </p>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Jogo</label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">— escolha um jogo —</option>
          {matches.map((mt) => (
            <option key={mt.id} value={mt.id}>
              [{mt.stage}] {mt.homeTeamName} x {mt.awayTeamName} —{" "}
              {new Date(mt.kickoff).toLocaleString("pt-BR")}
            </option>
          ))}
        </select>
      </div>
      {selected && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Placar {selected.homeTeamName}
            </label>
            <Input
              type="number"
              min={0}
              max={99}
              value={home}
              onChange={(e) => setHome(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Placar {selected.awayTeamName}
            </label>
            <Input
              type="number"
              min={0}
              max={99}
              value={away}
              onChange={(e) => setAway(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="SCHEDULED">Agendado</option>
              <option value="LIVE">Ao vivo</option>
              <option value="FINISHED">Encerrado</option>
            </select>
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => m.mutate()} disabled={!selected || m.isPending}>
          <Pencil className="mr-2 h-4 w-4" />
          {m.isPending ? "Salvando…" : "Salvar jogo"}
        </Button>
        <Button
          variant="destructive"
          disabled={!selected}
          onClick={async () => {
            if (!selected) return;
            if (!confirm(`Excluir o jogo ${selected.homeTeamName} x ${selected.awayTeamName}? Os palpites serão removidos.`)) return;
            try {
              await delMatch({ data: { pin, matchId: selected.id } });
              toast.success("Jogo excluído");
              setSelectedId("");
              qc.invalidateQueries({ queryKey: ["matches"] });
              qc.invalidateQueries({ queryKey: ["ranking"] });
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Excluir jogo
        </Button>
      </div>
    </div>
  );
}
