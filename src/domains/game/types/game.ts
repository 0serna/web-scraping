export type ProtonDbTier = "borked" | "bronze" | "silver" | "gold" | "platinum";

export interface ProtonDbSummary {
  tier: ProtonDbTier;
  score: number;
  confidence: string;
  reports: number;
}

export interface GameInfo {
  score: number;
  name: string;
  source: "steam";
  releaseYear?: number;
  protonDb?: ProtonDbSummary;
}
