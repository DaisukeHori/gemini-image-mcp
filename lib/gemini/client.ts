/**
 * Gemini Image Generation API クライアント
 *
 * Gemini の generateContent エンドポイントを使って画像生成・編集を行う。
 * - Nano Banana 2 (gemini-3.1-flash-image-preview): 高速・高効率
 * - Nano Banana Pro (gemini-3-pro-image-preview): 高品質・Thinking対応
 * - Nano Banana (gemini-2.5-flash-image): コスト最適
 * - Imagen 4 Fast (imagen-4.0-fast-generate-001): 最安・テキスト→画像専用
 */

import { getGeminiApiKey } from "./auth-context";
import { GeminiError } from "./errors";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1000;

// ── 型定義 ──

export type GeminiImageModel =
  | "gemini-3.1-flash-image-preview"
  | "gemini-3-pro-image-preview"
  | "gemini-2.5-flash-image"
  | "imagen-4.0-fast-generate-001"
  | "imagen-4.0-generate-001"
  | "imagen-4.0-ultra-generate-001";

export interface GenerateImageResult {
  images: Array<{
    base64: string;
    mimeType: string;
  }>;
  text?: string;
}

export interface ContentPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

// ── 内部ヘルパー ──

async function fetchWithRetry<T>(
  url: string,
  options: RequestInit
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429 && attempt < MAX_RETRIES) {
        const retryAfter = response.headers.get("Retry-After");
        const delayMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      if (!response.ok) {
        let message = response.statusText;
        try {
          const errorBody = await response.json();
          message =
            errorBody.error?.message || errorBody.message || JSON.stringify(errorBody);
        } catch {
          // ignore
        }
        throw new GeminiError(response.status, message);
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (error instanceof GeminiError && error.status !== 429 && error.status < 500) {
        throw error;
      }
      if (attempt >= MAX_RETRIES) throw lastError;
      const delayMs = BASE_DELAY_MS * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError || new Error("Unexpected retry loop exit");
}

// ── Gemini Native (Nano Banana) 画像生成 ──

interface GeminiGenerateContentResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text?: string;
        inlineData?: {
          mimeType: string;
          data: string;
        };
      }>;
    };
  }>;
}

/**
 * Gemini Native モデルで画像を生成する（Text-to-Image / Image Edit）
 *
 * @param model Gemini モデル名
 * @param parts コンテンツパーツ（テキスト + オプションで入力画像）
 */
export async function generateWithGeminiNative(
  model: string,
  parts: ContentPart[]
): Promise<GenerateImageResult> {
  const apiKey = getGeminiApiKey();

  const body = {
    contents: [
      {
        parts,
      },
    ],
    generationConfig: {
      responseModalities: ["IMAGE", "TEXT"],
    },
  };

  const data = await fetchWithRetry<GeminiGenerateContentResponse>(
    `${BASE_URL}/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  const images: Array<{ base64: string; mimeType: string }> = [];
  let text: string | undefined;

  if (data.candidates?.[0]?.content?.parts) {
    for (const part of data.candidates[0].content.parts) {
      if (part.inlineData) {
        images.push({
          base64: part.inlineData.data,
          mimeType: part.inlineData.mimeType,
        });
      }
      if (part.text) {
        text = (text ? text + "\n" : "") + part.text;
      }
    }
  }

  if (images.length === 0 && !text) {
    throw new GeminiError(
      500,
      "画像の生成に失敗しました。プロンプトを変更して再試行してください。安全性フィルタによりブロックされた可能性があります。"
    );
  }

  return { images, text };
}

// ── Imagen 4 画像生成 ──

interface ImagenGenerateResponse {
  predictions: Array<{
    bytesBase64Encoded: string;
    mimeType: string;
  }>;
}

/**
 * Imagen 4 モデルで画像を生成する（Text-to-Image のみ）
 *
 * @param model Imagen モデル名
 * @param prompt テキストプロンプト
 * @param numberOfImages 生成枚数 (1-4)
 * @param aspectRatio アスペクト比
 */
export async function generateWithImagen(
  model: string,
  prompt: string,
  numberOfImages: number = 1,
  aspectRatio: string = "1:1"
): Promise<GenerateImageResult> {
  const apiKey = getGeminiApiKey();

  const body = {
    instances: [{ prompt }],
    parameters: {
      sampleCount: numberOfImages,
      aspectRatio,
    },
  };

  const data = await fetchWithRetry<ImagenGenerateResponse>(
    `${BASE_URL}/models/${model}:predict?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  const images = (data.predictions || []).map((p) => ({
    base64: p.bytesBase64Encoded,
    mimeType: p.mimeType || "image/png",
  }));

  if (images.length === 0) {
    throw new GeminiError(
      500,
      "Imagen による画像生成に失敗しました。プロンプトを変更して再試行してください。"
    );
  }

  return { images };
}
