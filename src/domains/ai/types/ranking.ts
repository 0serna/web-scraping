export interface ArtificialAnalysisModel {
  slug: string;
  model: string;
  frontierModel: boolean;
  coding: number | null;
  blendedPrice: number | null;
  inputPrice: number | null;
  outputPrice: number | null;
  intelligenceIndexOutputTokens: number | null;
  deprecated?: boolean;
}

export interface RankedModel {
  rank: number;
  model: string;
  coding: number;
  tokens: number | null;
}

export interface RawArtificialAnalysisModel {
  slug?: string;
  frontier_model?: boolean;
  short_name?: string;
  model_name?: string;
  name?: string;
  coding_index?: number;
  price_1m_blended_3_to_1?: number;
  price_1m_input_tokens?: number;
  price_1m_output_tokens?: number;
  deprecated?: boolean;
  intelligence_index_token_counts?: {
    output_tokens?: number;
  };
  canonicalIntelligenceIndexTokenCount?: {
    input?: number;
    output?: number;
    answer?: number;
    reasoning?: number;
  };
}

export interface PerformanceData {
  slug: string;
  frontierModel: boolean;
  coding: number | null;
  blendedPrice: number | null;
  inputPrice: number | null;
  outputPrice: number | null;
  intelligenceIndexOutputTokens: number | null;
  deprecated?: boolean;
}
