/**
 * list_models ツール
 * 利用可能な画像生成モデルの一覧を表示する
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const MODELS_INFO = `# 利用可能な画像生成モデル

## Gemini Native（Nano Banana）— 会話型画像生成・編集

| モデル | コード名 | 価格 | 解像度 | 特徴 |
|---|---|---|---|---|
| **Nano Banana 2** | gemini-3.1-flash-image-preview | $0.045/枚 | 1K〜4K | 高速・高効率。デフォルト推奨。4K対応 |
| **Nano Banana Pro** | gemini-3-pro-image-preview | $0.134/枚 | 1K〜4K | 最高品質。Thinking対応。テキスト描画精度94% |
| **Nano Banana** | gemini-2.5-flash-image | $0.039/枚 | 1K | 最安のNative。安定した実績 |

✅ テキスト→画像生成
✅ 画像+テキスト→画像編集（edit_image）
✅ 会話型マルチターン編集
✅ 参照画像によるスタイル一貫性

## Imagen 4 — テキスト→画像専用

| モデル | 価格 | 解像度 | 特徴 |
|---|---|---|---|
| **Imagen 4 Fast** | imagen-4.0-fast-generate-001 | $0.02/枚 | 1K | 最速・最安。量産向け |
| **Imagen 4** | imagen-4.0-generate-001 | $0.04/枚 | 1K | 高品質。テキスト描画改善 |
| **Imagen 4 Ultra** | imagen-4.0-ultra-generate-001 | $0.06/枚 | 2K | 最高品質。印刷向け |

✅ テキスト→画像生成
✅ アスペクト比指定（1:1, 3:4, 4:3, 9:16, 16:9）
✅ 複数枚同時生成（1-4枚）
❌ 画像編集は不可

## 推奨

| 用途 | 推奨モデル |
|---|---|
| ブログ挿絵・SNS画像 | gemini-3.1-flash-image-preview |
| ロゴ・テキスト入り画像 | gemini-3-pro-image-preview |
| 大量バッチ生成 | imagen-4.0-fast-generate-001 |
| 印刷物・高解像度 | imagen-4.0-ultra-generate-001 |
| 画像編集・加工 | gemini-3.1-flash-image-preview |
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
