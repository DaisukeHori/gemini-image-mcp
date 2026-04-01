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
- 各画像の役割を明確に指示する（"1枚目の人物に2枚目のヘアスタイルを適用して"）
- 照明・構図・雰囲気の指定を加えると自然な合成になる
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

        // 画像の役割情報をプロンプトに組み込む
        const rolesDescription = images
          .map((img, idx) => {
            const role = img.role || `画像${idx + 1}`;
            return `画像${idx + 1}: ${role}`;
          })
          .join("\n");

        const fullPrompt = `以下の${images.length}枚の画像を使って合成してください。

【各画像の役割】
${rolesDescription}

【合成指示】
${instruction}

重要: 合成結果は自然で違和感のない1枚の画像にしてください。照明、色調、パースペクティブの一貫性を保ってください。`;

        // ContentParts を構築: テキスト + 全画像
        const parts = [
          { text: fullPrompt },
          ...images.map((img) => ({
            inlineData: {
              mimeType: img.mimeType || "image/png",
              data: img.base64,
            },
          })),
        ];

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
