# Claude向けスキル: Gemini画像生成ヘルパー

このファイルは、Claudeがコンテナ環境（claude.ai / Claude Code等）で画像生成を行う際の手順書です。

## 問題

- MCP経由で生成した画像はチャット上に表示されるが、コンテナのファイルシステムには保存できない
- コンテナから `generativelanguage.googleapis.com` に直接アクセスできない（プロキシでブロック）

## 解決策

`utils/gemini_helper.py` を使って、MCPサーバー（Vercel）をHTTPプロキシとして経由し、画像を生成→ファイル保存する。

```
コンテナ → HTTPS → gemini-image-mcp-two.vercel.app → Gemini API
                    （Vercel上で中継）
        ↓
   base64で返却 → ファイル保存可能
```

## 使い方

### セットアップ（会話の最初に1回だけ）

```bash
curl -sL https://raw.githubusercontent.com/DaisukeHori/gemini-image-mcp/main/utils/gemini_helper.py -o /home/claude/gemini_helper.py
```

### 画像生成

```python
import sys; sys.path.insert(0, "/home/claude")
from gemini_helper import generate_image, edit_image, compose_images, generate_batch

# テキスト→画像
generate_image("A cute cat", save_to="cat.jpg")

# 画像編集
edit_image("cat.jpg", "ジブリ風に変換", save_to="cat_ghibli.jpg")

# 複数画像合成
compose_images(
    images=[
        {"path": "face.jpg", "role": "顔写真"},
        {"path": "hair.jpg", "role": "ヘアスタイル"},
    ],
    instruction="顔写真にヘアスタイルを適用",
    save_to="result.jpg"
)

# バッチ生成（PPTX挿絵等）
generate_batch([
    {"prompt": "...", "filename": "slide01.jpg"},
    {"prompt": "...", "filename": "slide02.jpg"},
], output_dir="images")
```

## 注意事項

- Gemini API Key: `AIzaSyDgv-dHmyLyOqL6NVQV9nuMfJXIbQ9HIFs`（環境変数 GEMINI_API_KEY でも設定可能）
- MCPエンドポイント: `https://gemini-image-mcp-two.vercel.app/api/mcp`
- 1リクエストあたりの処理時間: 5-15秒
- base64画像サイズ: 500KB-1.5MB程度
