/**
 * compose_images ツール
 * 複数画像（最大14枚）をテキスト指示で合成・スタイル転写する
 * Gemini Nativeモデルの「Reference Images」機能を使用
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { generateWithGeminiNative } from "@/lib/gemini/client";
import { GeminiError } from "@/lib/gemini/errors";

const imageSchema = z.object({
  base64: z.string().describe("画像のbase64エンコードデータ"),
  mimeType: z
    .enum(["image/png", "image/jpeg", "image/webp", "image/gif"])
    .optional()
    .describe("画像のMIMEタイプ（デフォルト: image/png）"),
  role: z
    .string()
    .optional()
    .describe(
      "この画像の役割を説明するラベル（例: '人物写真', 'ヘアスタイル参照', '背景', 'スタイル参照', 'ロゴ'）。プロンプト内で参照するために使う"
    ),
});

export function registerComposeImages(server: McpServer) {
  server.tool(
    "compose_images",
    `複数の画像（2〜14枚）をテキスト指示で合成・ブレンド・スタイル転写する。
Gemini Nativeモデルの複数リファレンス画像機能を使用。

用途:
- 顔写真 + ヘアスタイル参照画像 → ヘアスタイル合成（RevolMirror的なバーチャル試着）
- 人物写真 + 背景画像 → 人物を別の背景に自然に配置
- 元画像 + スタイル参照画像 → スタイル転写（油絵風、アニメ風など）
- 商品写真 + ロゴ + 背景 → 広告素材の合成
- 複数のキャラクター画像 → 全員を1つのシーンに集合

入力: 2〜14枚のbase64画像 + 合成指示テキスト。
各画像に「役割（role）」を設定すると、プロンプト内で参照でき精度が上がる。
返却: 合成後のbase64画像。

対応モデル（Gemini Nativeのみ）:
- gemini-3.1-flash-image-preview（デフォルト）: Nano Banana 2。最大14枚。Thinking対応で合成品質が高い
- gemini-3-pro-image-preview: Nano Banana Pro。最高品質。複雑な合成に強い
- gemini-2.5-flash-image: Nano Banana。コスト最適。シンプルな合成向き

合成指示のコツ:
- 各画像のroleを明確に設定する（"お客様の顔写真", "希望のヘアスタイル"等）。roleは画像の直前にラベルとして配置され、モデルがどの画像が何かを正確に理解できる
- 照明・構図・雰囲気の指定を加えると自然な合成になる
- 指示文では role名で画像を参照できる（"「お客様の顔写真」に「希望のヘアスタイル」を適用して"）
- 複雑な合成はNano Banana 2またはProを推奨`,
    {
      images: z
        .array(imageSchema)
        .min(2)
        .max(14)
        .describe("合成する画像の配列（2〜14枚）"),
      instruction: z
        .string()
        .min(1)
        .max(3000)
        .describe(
          "合成指示テキスト。各画像をどう組み合わせるか詳細に記述。例: '1枚目の人物の顔に2枚目のヘアスタイルを自然に適用して。照明は1枚目に合わせて'"
        ),
      model: z
        .enum([
          "gemini-3.1-flash-image-preview",
          "gemini-3-pro-image-preview",
          "gemini-2.5-flash-image",
        ])
        .optional()
        .describe("使用モデル。デフォルト: gemini-3.1-flash-image-preview"),
    },
    async ({ images, instruction, model }) => {
      try {
        const selectedModel = model || "gemini-3.1-flash-image-preview";

        // ContentParts を構築: テキスト-画像交互配置でラベリング精度を上げる
        // [全体指示] → [ラベル1] → [画像1] → [ラベル2] → [画像2] → ... → [合成指示]
        const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

        // 1. 全体の導入
        parts.push({
          text: `以下の${images.length}枚の画像を使って合成画像を生成してください。各画像の直前にその画像の役割を記載しています。`,
        });

        // 2. ラベル → 画像 を交互に配置
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          const role = img.role || `画像${i + 1}`;
          parts.push({
            text: `【${role}】（${i + 1}枚目/${images.length}枚中）以下がその画像です:`,
          });
          parts.push({
            inlineData: {
              mimeType: img.mimeType || "image/png",
              data: img.base64,
            },
          });
        }

        // 3. 最後に合成指示
        parts.push({
          text: `【合成指示】
${instruction}

重要: 合成結果は自然で違和感のない1枚の画像にしてください。照明、色調、パースペクティブの一貫性を保ってください。`,
        });

        const result = await generateWithGeminiNative(selectedModel, parts);

        const content: Array<
          | { type: "text"; text: string }
          | { type: "image"; data: string; mimeType: string }
        > = [];

        if (result.text) {
          content.push({ type: "text" as const, text: result.text });
        }

        for (const img of result.images) {
          content.push({
            type: "image" as const,
            data: img.base64,
            mimeType: img.mimeType,
          });
        }

        if (content.length === 0) {
          content.push({
            type: "text" as const,
            text: "画像の合成に失敗しました。指示を変更して再試行してください。複雑な合成の場合は Nano Banana Pro モデルを試してみてください。",
          });
        }

        const mcpContent = content.map((c) => {
          if (c.type === "image") {
            return {
              type: "image" as const,
              data: c.data,
              mimeType: c.mimeType,
            };
          }
          return { type: "text" as const, text: c.text };
        });

        return { content: mcpContent };
      } catch (error) {
        const message =
          error instanceof GeminiError
            ? error.toUserMessage()
            : `予期しないエラー: ${error instanceof Error ? error.message : String(error)}`;
        return {
          content: [{ type: "text" as const, text: `エラー: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
