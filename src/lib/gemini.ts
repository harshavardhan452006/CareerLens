/**
 * Shared Gemini AI utility with automatic model fallback chain.
 * If a model is overloaded (503) or rate-limited (429), retries with the next model.
 */
import { GoogleGenerativeAI, GenerateContentResult } from '@google/generative-ai';

const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || '';
export const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Ordered list of models to try. Primary first, then fallbacks.
 * gemini-2.5-flash-lite is often overloaded; gemini-1.5-flash is the stable fallback.
 */
export const MODEL_FALLBACK_CHAIN = [
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];

export interface GenerateOptions {
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
}

/**
 * Generate content with automatic fallback across models.
 * Tries each model in MODEL_FALLBACK_CHAIN until one succeeds.
 */
export async function generateWithFallback(
  prompt: string,
  options: GenerateOptions = {}
): Promise<string> {
  const {
    temperature = 0.7,
    maxOutputTokens = 8192,
    topP = 0.9,
    topK = 40,
  } = options;

  let lastError: Error | null = null;

  for (const modelName of MODEL_FALLBACK_CHAIN) {
    try {
      console.log(`🤖 Trying model: ${modelName}`);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { temperature, maxOutputTokens, topP, topK },
      });

      const result: GenerateContentResult = await model.generateContent(prompt);
      const text = result.response.text() || '';
      console.log(`✅ Success with model: ${modelName}`);
      return text;
    } catch (err: any) {
      const status: number = err?.status ?? 0;
      const isRetryable = status === 503 || status === 429 || status === 404 || status === 500;

      console.warn(`⚠️ Model ${modelName} failed (${status}): ${err?.message ?? err}`);
      lastError = err;

      if (!isRetryable) {
        // Non-retryable error (e.g. bad request) — don't try other models
        throw err;
      }
      // Continue to next model in chain
    }
  }

  throw lastError ?? new Error('All Gemini models failed');
}
