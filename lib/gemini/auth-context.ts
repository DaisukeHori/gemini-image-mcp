/**
 * リクエストスコープの認証コンテキスト
 *
 * AsyncLocalStorage を使って、リクエストごとの認証情報を
 * ツールハンドラーまで伝播する。
 *
 * AUTH_MODE による分岐:
 *  - "gemini_key" (デフォルト): Bearer Token に Gemini API Key を直接渡す
 *  - "api_key": MCP_API_KEY で MCPサーバーへの認証 + 環境変数の Gemini API Key を使用
 */

import { AsyncLocalStorage } from "node:async_hooks";

// ── 認証モード定義 ──

export type AuthMode = "gemini_key" | "api_key";

export function getAuthMode(): AuthMode {
  const mode = process.env.AUTH_MODE?.toLowerCase() || "gemini_key";
  if (mode === "api_key") return "api_key";
  return "gemini_key";
}

// ── AsyncLocalStorage ──

interface AuthContext {
  geminiApiKey?: string;
}

export const authStorage = new AsyncLocalStorage<AuthContext>();

/**
 * 現在のリクエストスコープから Gemini API Key を取得する。
 *
 * AUTH_MODE に応じて取得元が変わる:
 *  - gemini_key: Bearer Token のみ（必須）
 *  - api_key: 環境変数 GEMINI_API_KEY（必須）
 */
export function getGeminiApiKey(): string {
  const mode = getAuthMode();

  if (mode === "api_key") {
    const envKey = process.env.GEMINI_API_KEY;
    if (!envKey) {
      throw new Error(
        "GEMINI_API_KEY 環境変数が設定されていません。" +
          "AUTH_MODE=api_key では GEMINI_API_KEY の設定が必須です。"
      );
    }
    return envKey;
  }

  // gemini_key モード: Bearer Token から取得
  const ctx = authStorage.getStore();
  if (ctx?.geminiApiKey) {
    return ctx.geminiApiKey;
  }

  throw new Error(
    "Gemini API Key が見つかりません。" +
      "MCP クライアントの設定で Authorization: Bearer <your-gemini-api-key> " +
      "ヘッダーを指定してください。" +
      "API Key は https://aistudio.google.com/apikey で取得できます。"
  );
}
