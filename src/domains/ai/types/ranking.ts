export interface ArtificialAnalysisModel {
  slug: string;
  model: string;
  coding: number | null;
  intelligenceIndexOutputTokens: number | null;
  deprecated?: boolean;
}

export interface RankedModel {
  rank: number;
  model: string;
  coding: number;
  tokens: number | null;
  deepSwe: number | null;
}

export interface DeepSweRow {
  model: string;
  reasoning_effort: string | null;
  pass_rate: number;
}

export interface DeepSweLeaderboard {
  rows: DeepSweRow[];
}

export interface DeepSweScore {
  model: string;
  effort: string | null;
  score: number;
}

export interface RawArtificialAnalysisModel {
  slug?: string;
  shortName?: string;
  name?: string;
  codingIndex?: number;
  deprecated?: boolean;
  canonicalIntelligenceIndexTokenCount?: {
    input?: number;
    output?: number;
    answer?: number;
    reasoning?: number;
  };
}

export interface PerformanceData {
  slug: string;
  coding: number | null;
  intelligenceIndexOutputTokens: number | null;
  deprecated?: boolean;
}
