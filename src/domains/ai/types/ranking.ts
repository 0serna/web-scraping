export interface ArtificialAnalysisModel {
  slug: string;
  model: string;
  reasoningModel: boolean;
  frontierModel: boolean;
  agentic: number | null;
  coding: number | null;
  blendedPrice: number | null;
  inputPrice: number | null;
  outputPrice: number | null;
  intelligenceIndexOutputTokens: number | null;
  deprecated?: boolean;
}

export interface RankedModel {
  model: string;
  score: number;
  output: number | null;
}

export interface RawArtificialAnalysisModel {
  slug?: string;
  reasoning_model?: boolean;
  frontier_model?: boolean;
  isReasoning?: boolean;
  short_name?: string;
  model_name?: string;
  name?: string;
  agentic_index?: number;
  coding_index?: number;
  price_1m_blended_3_to_1?: number;
  price_1m_input_tokens?: number;
  price_1m_output_tokens?: number;
  deprecated?: boolean;
  intelligence_index_token_counts?: {
    output_tokens?: number;
  };
}

export interface PerformanceData {
  slug: string;
  frontierModel: boolean;
  coding: number | null;
  agentic: number | null;
  blendedPrice: number | null;
  inputPrice: number | null;
  outputPrice: number | null;
  intelligenceIndexOutputTokens: number | null;
  deprecated?: boolean;
}
