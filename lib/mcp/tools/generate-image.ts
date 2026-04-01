/**
 * generate_image ツール
 * テキストプロンプトから画像を生成する
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  generateWithGeminiNative,
  generateWithImagen,
  type GeminiImageModel,
} from "@/lib/gemini/client";
import { GeminiError } from "@/lib/gemini/errors";

const GEMINI_NATIVE_MODELS = [
  "gemini-3.1-flash-image-preview",
  "gemini-3-pro-image-preview",
  "gemini-2.5-flash-image",
];

export function registerGenerateImage(server: McpServer) {
  server.tool(
    "generate_image",
    `テキストプロンプトから画像を生成する。

対応モデル:
- gemini-3.1-flash-image-preview（デフォルト）: Nano Banana 2。高速・高効率。4K対応。$0.045/枚
- gemini-3-pro-image-preview: Nano Banana Pro。最高品質。Thinking対応。テキスト描画精度94%。$0.134/枚
- gemini-2.5-flash-image: Nano Banana。最安のNative。1K。$0.039/枚
- imagen-4.0-fast-generate-001: Imagen 4 Fast。最安。テキスト→画像専用。$0.02/枚
- imagen-4.0-generate-001: Imagen 4。高品質テキスト→画像。$0.04/枚
- imagen-4.0-ultra-generate-001: Imagen 4 Ultra。最高品質。2K。$0.06/枚

返却: base64エンコードされた画像データ（PNG）。複数枚生成可能（Imagenモデルのみ）。
Gemini Nativeモデルは会話型画像生成で、テキスト応答も同時に返る場合がある。

プロンプトのコツ:
- 主題 + 環境/背景 + スタイル の順に記述
- 具体的な形容詞を使う（「美しい」より「夕陽に照らされた金色の」）
- スタイル指定: photograph, illustration, watercolor, anime, 3D render, isometric 等

【重要: コンテナ環境でファイル保存が必要な場合】
MCPのimage応答はチャットに表示されるが、コンテナのファイルシステムには直接保存できない。
PPTX・DOCX・PDF等に画像を埋め込む必要がある場合は、以下のPythonヘルパーを使用すること:

セットアップ（1回）:
curl -sL https://raw.githubusercontent.com/DaisukeHori/gemini-image-mcp/main/utils/gemini_helper.py -o /home/claude/gemini_helper.py

使用例:
from gemini_helper import generate_image, edit_image, compose_images, generate_batch
generate_image("A cute cat", save_to="cat.jpg")
edit_image("cat.jpg", "ジブリ風に変換", save_to="cat_ghibli.jpg")
compose_images(images=[{"path":"face.jpg","role":"顔"},{"path":"hair.jpg","role":"髪型"}], instruction="合成して", save_to="result.jpg")
generate_batch([{"prompt":"...","filename":"img1.jpg"},{"prompt":"...","filename":"img2.jpg"}], output_dir="images")`,
    {
      prompt: z.string().describe("画像生成プロンプト（英語推奨。日本語も可）"),
      model: z
        .enum([
          "gemini-3.1-flash-image-preview",
          "gemini-3-pro-image-preview",
          "gemini-2.5-flash-image",
          "imagen-4.0-fast-generate-001",
          "imagen-4.0-generate-001",
          "imagen-4.0-ultra-generate-001",
        ])
        .optional()
        .describe(
          "使用モデル。デフォルト: gemini-3.1-flash-image-preview（Nano Banana 2）"
        ),
      numberOfImages: z
        .number()
        .min(1)
        .max(4)
        .optional()
        .describe(
          "生成枚数（1-4）。Imagenモデルのみ。Gemini Nativeは常に1枚"
        ),
      aspectRatio: z
        .enum(["1:1", "3:4", "4:3", "9:16", "16:9"])
        .optional()
        .describe(
          "アスペクト比。Imagenモデルのみ。デフォルト: 1:1。16:9=横長、9:16=縦長、4:3=フルスクリーン"
        ),
    },
    async ({ prompt, model, numberOfImages, aspectRatio }) => {
      try {
        const selectedModel: GeminiImageModel =
          model || "gemini-3.1-flash-image-preview";

        let result;

        if (GEMINI_NATIVE_MODELS.includes(selectedModel)) {
          // Gemini Native (Nano Banana) モデル
          result = await generateWithGeminiNative(selectedModel, [
            { text: prompt },
          ]);
        } else {
          // Imagen モデル
          result = await generateWithImagen(
            selectedModel,
            prompt,
            numberOfImages || 1,
            aspectRatio || "1:1"
          );
        }

        const content: Array<
          | { type: "text"; text: string }
          | { type: "image"; data: string; mimeType: string }
        > = [];

        if (result.text) {
          content.push({ type: "text" as const, text: result.text });
        }

        for (let i = 0; i < result.images.length; i++) {
          const img = result.images[i];
          content.push({
            type: "image" as const,
            data: img.base64,
            mimeType: img.mimeType,
          });
        }

        if (content.length === 0) {
          content.push({
            type: "text" as const,
            text: "画像の生成に失敗しました。プロンプトを変更して再試行してください。",
          });
        }

        // MCPのcontentフォーマットに変換
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
