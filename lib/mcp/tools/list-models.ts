/**
 * list_models ツール
 * 利用可能な画像生成モデルの一覧を表示する
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const MODELS_INFO = `# 利用可能な画像生成モデル

## ★★★ デフォルト: gemini-3.1-flash-image-preview（Nano Banana 2）★★★
modelパラメータを省略すればこのモデルが自動使用される。
ユーザーが明示的にモデル名を指定しない限り、他のモデルを選ばないこと。
Imagen系（imagen-4.0-*）や旧世代（gemini-2.5-flash-image）も勝手に選ばないこと。

## Gemini Native（Nano Banana）— 生成+編集+合成 全対応

| モデル | コード名 | 価格 | 推奨度 |
|---|---|---|---|
| **★ Nano Banana 2** | gemini-3.1-flash-image-preview | $0.045/枚 | ★★★ 唯一のデフォルト |
| Nano Banana Pro | gemini-3-pro-image-preview | $0.134/枚 | ユーザーが「Pro」指定時のみ |
| Nano Banana（旧世代） | gemini-2.5-flash-image | $0.039/枚 | 基本使わない |

## Imagen 4 — テキスト→画像専用（編集・合成不可）
ユーザーが「Imagen」「最安で大量生成」等と明示した場合のみ使用。

| モデル | コード名 | 価格 | 用途 |
|---|---|---|---|
| Imagen 4 Fast | imagen-4.0-fast-generate-001 | $0.02/枚 | 大量バッチ専用 |
| Imagen 4 | imagen-4.0-generate-001 | $0.04/枚 | テキスト→画像 |
| Imagen 4 Ultra | imagen-4.0-ultra-generate-001 | $0.06/枚 | 印刷物・2K |
`;

export function registerListModels(server: McpServer) {
  server.tool(
    "list_models",
    "利用可能な画像生成モデルの一覧と特徴・価格・推奨用途を表示する。",
    {},
    async () => {
      return {
        content: [{ type: "text" as const, text: MODELS_INFO }],
      };
    }
  );
}
