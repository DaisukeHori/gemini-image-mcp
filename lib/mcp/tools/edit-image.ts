/**
 * edit_image ツール
 * 既存画像をテキスト指示で編集する（Gemini Native モデルのみ）
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { generateWithGeminiNative } from "@/lib/gemini/client";
import { GeminiError } from "@/lib/gemini/errors";

export function registerEditImage(server: McpServer) {
  server.tool(
    "edit_image",
    `既存の画像をテキスト指示で編集する。Gemini Native（Nano Banana）モデルの会話型画像編集機能を使用。

用途: 背景変更、オブジェクト追加/削除、スタイル変換、色調変更、テキスト追加、リサイズ等。
入力: base64エンコードされた画像 + 編集指示テキスト。
返却: 編集後のbase64画像。

対応モデル（Gemini Nativeのみ。Imagenは編集不可）:
- gemini-3.1-flash-image-preview（デフォルト）: Nano Banana 2
- gemini-3-pro-image-preview: Nano Banana Pro（高品質）
- gemini-2.5-flash-image: Nano Banana

編集指示の例:
- "背景を夕焼けの海に変更して"
- "画像内のテキストを日本語に翻訳して"
- "アニメスタイルに変換して"
- "商品の背景を白に変更して"
- "この画像にロゴを自然に配置して"`,
    {
      imageBase64: z.string().describe("編集する画像のbase64エンコードデータ（PNG/JPEG）"),
      imageMimeType: z
        .enum(["image/png", "image/jpeg", "image/webp", "image/gif"])
        .optional()
        .describe("画像のMIMEタイプ（デフォルト: image/png）"),
      instruction: z.string().describe("編集指示（例: '背景を宇宙に変更して'）"),
      model: z
        .enum([
          "gemini-3.1-flash-image-preview",
          "gemini-3-pro-image-preview",
          "gemini-2.5-flash-image",
        ])
        .optional()
        .describe("使用モデル。デフォルト: gemini-3.1-flash-image-preview"),
    },
    async ({ imageBase64, imageMimeType, instruction, model }) => {
      try {
        const selectedModel = model || "gemini-3.1-flash-image-preview";
        const mimeType = imageMimeType || "image/png";

        const result = await generateWithGeminiNative(selectedModel, [
          { text: instruction },
          {
            inlineData: {
              mimeType,
              data: imageBase64,
            },
          },
        ]);

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
            text: "画像の編集に失敗しました。指示を変更して再試行してください。",
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
