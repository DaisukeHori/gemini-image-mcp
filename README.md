# Gemini Image MCP Server

**AIに画像生成の目を与える。**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDaisukeHori%2Fgemini-image-mcp&env=AUTH_MODE%2CGEMINI_API_KEY%2CMCP_API_KEY&envDescription=AUTH_MODE%3A+gemini_key%28%E3%83%87%E3%83%95%E3%82%A9%E3%83%AB%E3%83%88%29+or+api_key&project-name=gemini-image-mcp&repository-name=gemini-image-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **エンドポイント:** `https://gemini-image-mcp-two.vercel.app/api/mcp`

Claude、Cursor、Windsurf、VS Code、その他あらゆるMCPクライアントから「画像を生成して」と言うだけで、Gemini / Imagen の画像生成AIが動きます。

3つのMCPツール（generate_image / edit_image / list_models）で、テキストからの画像生成と既存画像の編集をカバー。6つのモデルに対応し、ブログ挿絵からプロダクトショット、SNS素材まで幅広く対応します。

## できること

```
「桜並木を歩く猫のイラストを描いて」
→ Nano Banana 2 で画像生成 → base64画像が返る

「この画像の背景を夕焼けの海に変えて」
→ 画像 + 指示テキストで編集 → 編集後の画像が返る

「ブログ用のヘッダー画像を横長で作って。テーマは"AI×美容"」
→ 16:9アスペクト比で画像生成

「商品写真の背景を白に変更して、ECサイト用にして」
→ 画像編集で背景除去・変更

「この人の写真にこのヘアスタイルを合成して」
→ 顔写真 + ヘアスタイル参照画像 → 複数画像合成

「人物写真をこの背景に自然に合成して、スタジオ撮影風にして」
→ 人物 + 背景 + テキスト指示 → 複数画像合成
```

## 対応モデル（6モデル）

### Gemini Native（Nano Banana）— 会話型画像生成・編集

| モデル | ID | 価格 | 特徴 |
|:--|:--|:--|:--|
| **Nano Banana 2** | `gemini-3.1-flash-image-preview` | $0.045/枚 | 高速・4K対応。**デフォルト推奨** |
| **Nano Banana Pro** | `gemini-3-pro-image-preview` | $0.134/枚 | 最高品質・Thinking対応・テキスト精度94% |
| **Nano Banana** | `gemini-2.5-flash-image` | $0.039/枚 | 最安Native・安定 |

### Imagen 4 — テキスト→画像専用

| モデル | ID | 価格 | 特徴 |
|:--|:--|:--|:--|
| **Imagen 4 Fast** | `imagen-4.0-fast-generate-001` | $0.02/枚 | **最安**・量産向け |
| **Imagen 4** | `imagen-4.0-generate-001` | $0.04/枚 | 高品質 |
| **Imagen 4 Ultra** | `imagen-4.0-ultra-generate-001` | $0.06/枚 | 2K最高品質 |

## ツール一覧（3ツール）

## ツール一覧（4ツール）

| ツール | 説明 |
|:--|:--|
| `generate_image` | テキストプロンプトから画像生成。全6モデル対応。Imagenはアスペクト比・複数枚指定可 |
| `edit_image` | 既存画像 + テキスト指示で画像編集。Gemini Nativeモデルのみ |
| `compose_images` | 複数画像（2〜14枚）を合成・ブレンド・スタイル転写。顔+ヘアスタイル合成、背景合成、スタイル転写等 |
| `list_models` | 利用可能なモデルの一覧・価格・推奨用途を表示 |

## 🔒 セキュリティ

- 通信は全て **HTTPS（TLS暗号化）** で保護
- サーバーは**ステートレス**。API Keyはリクエスト処理中にのみ使用、**保存もログ出力もしない**
- データベースなし。Gemini APIへのプロキシとして動作するだけ
- ソースコード**全公開**

**不安な場合:** 自分のVercelにデプロイして `api_key` モードで運用できます。

## クイックスタート（2ステップ）

### ステップ1: Gemini API Key を取得

[Google AI Studio](https://aistudio.google.com/apikey) → API Keyを作成してコピー

> 無料枠あり（約500リクエスト/日）。有料はPay-as-you-goで$0.02〜/枚。

### ステップ2: MCPサーバーを接続

**Claude.ai（Web）:**
Settings → MCP → Add:
- URL: `https://gemini-image-mcp-two.vercel.app/api/mcp`
- Header名: `Authorization`　値: `Bearer あなたのGemini API Key`

**Claude Desktop / Cursor / VS Code / Windsurf:**
```json
{
  "mcpServers": {
    "gemini-image": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://gemini-image-mcp-two.vercel.app/api/mcp"],
      "env": {
        "HEADER_Authorization": "Bearer あなたのGemini API Key"
      }
    }
  }
}
```

**Claude Code:**
```bash
claude mcp add --transport http gemini-image https://gemini-image-mcp-two.vercel.app/api/mcp \
  --header "Authorization: Bearer あなたのGemini API Key"
```

## 認証モード

| モード | 用途 | 設定 |
|:--|:--|:--|
| `gemini_key`（デフォルト） | 個人利用・検証 | 設定不要。AuthorizationヘッダーでAPI Key送信 |
| `api_key` | チーム運用・本番 | `AUTH_MODE=api_key`, `MCP_API_KEY=xxx`, `GEMINI_API_KEY=xxx` |

## 自分でデプロイする

```bash
git clone https://github.com/DaisukeHori/gemini-image-mcp.git
cd gemini-image-mcp
cp .env.example .env.local
# .env.local を編集
npm install
npm run dev
```

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDaisukeHori%2Fgemini-image-mcp&env=AUTH_MODE%2CGEMINI_API_KEY%2CMCP_API_KEY&envDescription=AUTH_MODE%3A+gemini_key%28%E3%83%87%E3%83%95%E3%82%A9%E3%83%AB%E3%83%88%29+or+api_key&project-name=gemini-image-mcp&repository-name=gemini-image-mcp)

## FAQ

**Q: 無料で使える？**
→ Google AI Studioの無料枠（約500リクエスト/日）の範囲内であれば無料。超過分はPay-as-you-go課金。

**Q: 日本語プロンプトは使える？**
→ はい。ただし英語の方が精度が高い傾向があります。日本語で指示を出すと、AIが英語に翻訳してから生成することを推奨します。

**Q: 生成画像のサイズは？**
→ Nano Banana 2は最大4K、Imagen 4 Ultraは2K。デフォルトは1K（1024×1024）。

**Q: 画像編集はどのモデルが対応？**
→ Gemini Nativeモデル（Nano Banana系）のみ。Imagen 4は生成専用で編集不可。

**Q: Claudeの会話内で画像が表示される？**
→ MCPプロトコルのimage content typeで返却するため、対応クライアントでは画像が直接表示されます。

## Pythonヘルパー（コンテナ環境向け）

Claude.aiのコンテナ環境等で画像をファイルシステムに保存したい場合、`utils/gemini_helper.py` を使えます。

```bash
# ダウンロード
curl -sL https://raw.githubusercontent.com/DaisukeHori/gemini-image-mcp/main/utils/gemini_helper.py -o gemini_helper.py
```

```python
from gemini_helper import generate_image, edit_image, compose_images, generate_batch

# 画像生成→ファイル保存
generate_image("A sunset over Mount Fuji", save_to="fuji.jpg")

# 画像編集
edit_image("fuji.jpg", "水墨画スタイルに変換", save_to="fuji_ink.jpg")

# 複数画像合成（顔+ヘアスタイル等）
compose_images(
    images=[
        {"path": "face.jpg", "role": "顔写真"},
        {"path": "hair.jpg", "role": "ヘアスタイル"},
    ],
    instruction="顔写真にヘアスタイルを適用して",
    save_to="result.jpg"
)

# バッチ生成（PPTX挿絵50枚等）
generate_batch([
    {"prompt": "スライド1の挿絵", "filename": "slide01.jpg"},
    {"prompt": "スライド2の挿絵", "filename": "slide02.jpg"},
], output_dir="images")
```

MCPサーバー（Vercel）をHTTPプロキシとして使い、`generativelanguage.googleapis.com` がブロックされたコンテナ環境でもGemini APIを利用できます。

## 技術スタック

Next.js 15 / TypeScript / Vercel / MCP SDK / Gemini API / Zod

## ライセンス

MIT License
