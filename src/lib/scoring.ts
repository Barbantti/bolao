// Pure scoring rules for the Bolão.
// 5 = placar exato | 3 = vencedor + saldo | 1 = só vencedor (ou empate) | 0 = errou

export type ScoreOutcome = {
  points: 0 | 1 | 3 | 5;
  kind: "exact" | "result" | "goal" | "miss";
};

export function scorePrediction(
  predHome: number,
  predAway: number,
  realHome: number,
  realAway: number,
): ScoreOutcome {
  if (predHome === realHome && predAway === realAway) {
    return { points: 5, kind: "exact" };
  }

  const predWinner = Math.sign(predHome - predAway); // -1, 0, 1
  const realWinner = Math.sign(realHome - realAway);

  if (predWinner !== realWinner) return { points: 0, kind: "miss" };

  // mesmo vencedor (ou ambos empates) — checa saldo
  const predDiff = predHome - predAway;
  const realDiff = realHome - realAway;
  if (predDiff === realDiff) return { points: 3, kind: "result" };

  return { points: 1, kind: "goal" };
}
