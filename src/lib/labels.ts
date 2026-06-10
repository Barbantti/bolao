// Mapeia código FIFA (3 letras) -> ISO 3166-1 alpha-2 usado pelo flagcdn.
// Inclui também alguns alias ISO3 comuns para robustez.
const FIFA_TO_ISO2: Record<string, string> = {
  ALG: "dz", ARG: "ar", AUS: "au", AUT: "at", BEL: "be", BIH: "ba", BRA: "br",
  CAN: "ca", CIV: "ci", COD: "cd", COL: "co", CPV: "cv", CRO: "hr", CUW: "cw",
  CZE: "cz", ECU: "ec", EGY: "eg", ENG: "gb-eng", ESP: "es", FRA: "fr",
  GER: "de", GHA: "gh", HAI: "ht", IRN: "ir", IRQ: "iq", JOR: "jo", JPN: "jp",
  KOR: "kr", KSA: "sa", MAR: "ma", MEX: "mx", NED: "nl", NOR: "no", NZL: "nz",
  PAN: "pa", PAR: "py", POR: "pt", QAT: "qa", RSA: "za", SCO: "gb-sct",
  SEN: "sn", SUI: "ch", SWE: "se", TUN: "tn", TUR: "tr", URY: "uy", USA: "us",
  UZB: "uz", WAL: "gb-wls", NIR: "gb-nir",
};

/** Converte código FIFA/ISO em código aceito pelo flagcdn. */
export function toFlagCode(code?: string | null): string | null {
  if (!code) return null;
  const upper = code.toUpperCase();
  if (FIFA_TO_ISO2[upper]) return FIFA_TO_ISO2[upper];
  // já é ISO2
  if (code.length === 2) return code.toLowerCase();
  return null;
}

// Nome do país/seleção em pt-BR, indexado por código FIFA (3 letras).
const FIFA_TO_PTBR: Record<string, string> = {
  ALG: "Argélia", ARG: "Argentina", AUS: "Austrália", AUT: "Áustria",
  BEL: "Bélgica", BIH: "Bósnia e Herzegovina", BRA: "Brasil",
  CAN: "Canadá", CIV: "Costa do Marfim", COD: "República Democrática do Congo",
  COL: "Colômbia", CPV: "Cabo Verde", CRO: "Croácia", CUW: "Curaçao",
  CZE: "República Tcheca", ECU: "Equador", EGY: "Egito", ENG: "Inglaterra",
  ESP: "Espanha", FRA: "França", GER: "Alemanha", GHA: "Gana", HAI: "Haiti",
  IRN: "Irã", IRQ: "Iraque", JOR: "Jordânia", JPN: "Japão",
  KOR: "Coreia do Sul", KSA: "Arábia Saudita", MAR: "Marrocos", MEX: "México",
  NED: "Países Baixos", NOR: "Noruega", NZL: "Nova Zelândia", PAN: "Panamá",
  PAR: "Paraguai", POR: "Portugal", QAT: "Catar", RSA: "África do Sul",
  SCO: "Escócia", SEN: "Senegal", SUI: "Suíça", SWE: "Suécia",
  TUN: "Tunísia", TUR: "Turquia", URY: "Uruguai", USA: "Estados Unidos",
  UZB: "Uzbequistão", WAL: "País de Gales", NIR: "Irlanda do Norte",
};

// Tradução de nomes em inglês comuns (vindos da API football-data) -> pt-BR.
const EN_TO_PTBR: Record<string, string> = {
  "Algeria": "Argélia", "Argentina": "Argentina", "Australia": "Austrália",
  "Austria": "Áustria", "Belgium": "Bélgica",
  "Bosnia and Herzegovina": "Bósnia e Herzegovina", "Brazil": "Brasil",
  "Canada": "Canadá", "Ivory Coast": "Costa do Marfim",
  "Côte d'Ivoire": "Costa do Marfim",
  "DR Congo": "República Democrática do Congo",
  "Congo DR": "República Democrática do Congo",
  "Colombia": "Colômbia", "Cape Verde": "Cabo Verde", "Croatia": "Croácia",
  "Curaçao": "Curaçao", "Curacao": "Curaçao",
  "Czech Republic": "República Tcheca", "Czechia": "República Tcheca",
  "Ecuador": "Equador", "Egypt": "Egito", "England": "Inglaterra",
  "Spain": "Espanha", "France": "França", "Germany": "Alemanha",
  "Ghana": "Gana", "Haiti": "Haiti", "Iran": "Irã",
  "IR Iran": "Irã", "Iraq": "Iraque", "Jordan": "Jordânia", "Japan": "Japão",
  "South Korea": "Coreia do Sul", "Korea Republic": "Coreia do Sul",
  "Republic of Korea": "Coreia do Sul",
  "Saudi Arabia": "Arábia Saudita", "Morocco": "Marrocos", "Mexico": "México",
  "Netherlands": "Países Baixos", "Norway": "Noruega",
  "New Zealand": "Nova Zelândia", "Panama": "Panamá", "Paraguay": "Paraguai",
  "Portugal": "Portugal", "Qatar": "Catar", "South Africa": "África do Sul",
  "Scotland": "Escócia", "Senegal": "Senegal", "Switzerland": "Suíça",
  "Sweden": "Suécia", "Tunisia": "Tunísia", "Turkey": "Turquia",
  "Türkiye": "Turquia", "Uruguay": "Uruguai",
  "United States": "Estados Unidos", "USA": "Estados Unidos",
  "Uzbekistan": "Uzbequistão", "Wales": "País de Gales",
  "Northern Ireland": "Irlanda do Norte",
};

/** Retorna o nome da seleção em pt-BR, priorizando o código FIFA. */
export function teamName(name?: string | null, code?: string | null): string {
  if (code) {
    const upper = code.toUpperCase();
    if (FIFA_TO_PTBR[upper]) return FIFA_TO_PTBR[upper];
  }
  if (!name) return "A definir";
  return EN_TO_PTBR[name.trim()] ?? name;
}

const STAGE_LABELS: Record<string, string> = {
  GROUP_STAGE: "Fase de grupos",
  LAST_32: "16 avos de final",
  LAST_16: "Oitavas de final",
  QUARTER_FINALS: "Quartas de final",
  SEMI_FINALS: "Semifinais",
  THIRD_PLACE: "Disputa de 3º lugar",
  FINAL: "Final",
};

/** Rótulo amigável em pt-BR para a fase do torneio. */
export function stageLabel(stage: string): string {
  return STAGE_LABELS[stage] ?? stage;
}

/** Normaliza códigos de grupo ("GROUP_A", "Group A", "_A") em "Grupo A". */
export function groupLabel(code?: string | null): string {
  if (!code) return "";
  const cleaned = code
    .replace(/^group/i, "")
    .replace(/^[^a-z0-9]+/i, "")
    .trim()
    .toUpperCase();
  return cleaned ? `Grupo ${cleaned}` : "";
}
