/**
 * list_models ツール
 * 利用可能な画像生成モデルの一覧を表示する
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const MODELS_INFO = `# 利用可能な画像生成モデル

## ★ デフォルト推奨: gemini-3.1-flash-image-preview（Nano Banana 2）
modelパラメータを省略すれば自動的にこのモデルが使われる。特別な理由がない限り、modelを指定せずデフォルトのまま使うこと。

## Gemini Native（Nano Banana）— 会話型画像生成・編集

| モデル | コード名 | 価格 | 解像度 | 推奨度 |
|---|---|---|---|---|
| **★ Nano Banana 2** | gemini-3.1-flash-image-preview | $0.045/枚 | 1K〜4K | ★★★ デフォルト・最推奨 |
| **Nano Banana Pro** | gemini-3-pro-image-preview | $0.134/枚 | 1K〜4K | ★★ 最高品質が必要な時のみ |
| **Nano Banana（旧世代）** | gemini-2.5-flash-image | $0.039/枚 | 1K | ★ 特別な理由がない限り使わない |

✅ テキスト→画像生成
✅ 画像+テキスト→画像編集（edit_image）
✅ 複数画像合成（compose_images, 最大14枚）
✅ 会話型マルチターン編集

## Imagen 4 — テキスト→画像専用（編集不可）

| モデル | コード名 | 価格 | 解像度 | 用途 |
|---|---|---|---|---|
| **Imagen 4 Fast** | imagen-4.0-fast-generate-001 | $0.02/枚 | 1K | 大量バッチ生成向け |
| **Imagen 4** | imagen-4.0-generate-001 | $0.04/枚 | 1K | 高品質テキスト→画像 |
| **Imagen 4 Ultra** | imagen-4.0-ultra-generate-001 | $0.06/枚 | 2K | 印刷物・高解像度 |

✅ アスペクト比指定（1:1, 3:4, 4:3, 9:16, 16:9）
✅ 複数枚同時生成（1-4枚）
❌ 画像編集・合成は不可
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
