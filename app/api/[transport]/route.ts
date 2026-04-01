/**
 * MCP エンドポイント
 *
 * /api/mcp  → Streamable HTTP (メイン)
 * /api/sse  → SSE (後方互換)
 *
 * AUTH_MODE による認証分岐:
 *  - "gemini_key" (デフォルト):
 *      トークン渡し方（優先順）:
 *        1. Authorization: Bearer <Gemini API Key>
 *        2. URL クエリ ?token=<Gemini API Key>
 *      MCPサーバー自体への認証はなし
 *
 *  - "api_key":
 *      APIキー渡し方（優先順）:
 *        1. Authorization: Bearer <MCP_API_KEY>
 *        2. URL クエリ ?key=<MCP_API_KEY>
 *      Gemini API Key は環境変数 GEMINI_API_KEY を使用（組織固定）
 */

import { createMcpHandler } from "mcp-handler";
import { registerAllTools } from "@/lib/mcp/server";
import { authStorage, getAuthMode } from "@/lib/gemini/auth-context";

const mcpHandler = createMcpHandler(
  (server) => {
    registerAllTools(server);
  },
  {},
  {
    basePath: "/api",
    maxDuration: 60,
    verboseLogs: process.env.NODE_ENV === "development",
  }
);

function extractBearerToken(request: Request): string | undefined {
  const authHeader = request.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || undefined;
}

function extractQueryToken(request: Request, param: string): string | undefined {
  try {
    const url = new URL(request.url);
    return url.searchParams.get(param) || undefined;
  } catch {
    return undefined;
  }
}

function verifyApiKey(apiKey: string | undefined): Response | null {
  const expectedKey = process.env.MCP_API_KEY;

  if (!expectedKey) {
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32001,
          message:
            "サーバー設定エラー: AUTH_MODE=api_key ですが MCP_API_KEY が設定されていません。",
        },
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!apiKey || apiKey !== expectedKey) {
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32001,
          message:
            "認証エラー: 有効な API キーを Authorization: Bearer <MCP_API_KEY> または ?key=<MCP_API_KEY> で指定してください。",
        },
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  return null;
}

async function handler(request: Request): Promise<Response> {
  const mode = getAuthMode();
  const bearerToken = extractBearerToken(request);

  if (mode === "api_key") {
    const apiKey = bearerToken || extractQueryToken(request, "key");
    const errorResponse = verifyApiKey(apiKey);
    if (errorResponse) return errorResponse;
    return mcpHandler(request);
  }

  // gemini_key モード（デフォルト）
  const geminiKey = bearerToken || extractQueryToken(request, "token");

  if (geminiKey) {
    return authStorage.run(
      { geminiApiKey: geminiKey },
      () => mcpHandler(request)
    );
  }

  return mcpHandler(request);
}

export { handler as GET, handler as POST };
