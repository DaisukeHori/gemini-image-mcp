"""
Gemini Image MCP ヘルパー
=========================
コンテナ内からMCPサーバー経由でGemini画像生成APIを呼び出すユーティリティ。

使い方:
    from gemini_helper import generate_image, edit_image, compose_images, list_models

    # テキスト → 画像生成
    path = generate_image("A cute cat on a windowsill", save_to="cat.jpg")

    # 画像編集
    path = edit_image("cat.jpg", "ジブリ風アニメに変換して", save_to="cat_ghibli.jpg")

    # 複数画像合成
    path = compose_images(
        images=[
            {"path": "face.jpg", "role": "お客様の顔写真"},
            {"path": "hairstyle.jpg", "role": "希望のヘアスタイル"},
        ],
        instruction="「お客様の顔写真」に「希望のヘアスタイル」を自然に適用して",
        save_to="result.jpg"
    )
"""

import json
import base64
import urllib.request
import os
from typing import Optional

MCP_URL = "https://gemini-image-mcp-two.vercel.app/api/mcp"
MCP_API_KEY = os.environ.get("MCP_API_KEY", "")


def _call_mcp(tool_name: str, arguments: dict, timeout: int = 120) -> dict:
    """MCPサーバーにtools/callリクエストを送信し、結果を返す"""
    body = json.dumps({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {"name": tool_name, "arguments": arguments}
    }).encode()

    req = urllib.request.Request(MCP_URL, data=body, headers={
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "Authorization": f"Bearer {MCP_API_KEY}"
    })

    resp = urllib.request.urlopen(req, timeout=timeout)
    raw = resp.read().decode()

    # SSE形式をパース
    for line in raw.split("\n"):
        if line.startswith("data: "):
            data = json.loads(line[6:])
            result = data.get("result", {})
            if "error" in data:
                raise RuntimeError(f"MCP Error: {data['error']}")
            return result

    raise RuntimeError("MCPサーバーからの応答が空です")


def _save_image_from_result(result: dict, save_to: str) -> str:
    """MCP結果からbase64画像を抽出してファイルに保存"""
    content = result.get("content", [])
    text_parts = []

    for c in content:
        if c.get("type") == "image":
            img_bytes = base64.b64decode(c["data"])
            # 保存先ディレクトリがなければ作成
            save_dir = os.path.dirname(save_to)
            if save_dir:
                os.makedirs(save_dir, exist_ok=True)
            with open(save_to, "wb") as f:
                f.write(img_bytes)
            return save_to
        elif c.get("type") == "text":
            text_parts.append(c["text"])

    if text_parts:
        raise RuntimeError(f"画像が生成されませんでした: {' '.join(text_parts)}")
    raise RuntimeError("MCPからの応答に画像が含まれていません")


def _read_image_base64(path: str) -> tuple[str, str]:
    """画像ファイルをbase64で読み込み、(base64_str, mime_type)を返す"""
    with open(path, "rb") as f:
        data = base64.b64encode(f.read()).decode()

    ext = os.path.splitext(path)[1].lower()
    mime_map = {
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".png": "image/png", ".webp": "image/webp",
        ".gif": "image/gif"
    }
    mime_type = mime_map.get(ext, "image/png")
    return data, mime_type


def generate_image(
    prompt: str,
    save_to: str = "generated.jpg",
    model: Optional[str] = None,
    timeout: int = 60
) -> str:
    """
    テキストプロンプトから画像を生成してファイルに保存する。

    Args:
        prompt: 画像生成プロンプト（英語推奨）
        save_to: 保存先パス
        model: モデル名（デフォルト: gemini-3.1-flash-image-preview）
        timeout: タイムアウト秒数

    Returns:
        保存先のファイルパス
    """
    args = {"prompt": prompt}
    if model:
        args["model"] = model

    result = _call_mcp("generate_image", args, timeout=timeout)
    return _save_image_from_result(result, save_to)


def edit_image(
    image_path: str,
    instruction: str,
    save_to: str = "edited.jpg",
    model: Optional[str] = None,
    timeout: int = 60
) -> str:
    """
    既存画像をテキスト指示で編集してファイルに保存する。

    Args:
        image_path: 元画像のパス
        instruction: 編集指示テキスト
        save_to: 保存先パス
        model: モデル名（デフォルト: gemini-3.1-flash-image-preview）
        timeout: タイムアウト秒数

    Returns:
        保存先のファイルパス
    """
    img_b64, mime_type = _read_image_base64(image_path)

    args = {
        "imageBase64": img_b64,
        "imageMimeType": mime_type,
        "instruction": instruction
    }
    if model:
        args["model"] = model

    result = _call_mcp("edit_image", args, timeout=timeout)
    return _save_image_from_result(result, save_to)


def compose_images(
    images: list[dict],
    instruction: str,
    save_to: str = "composed.jpg",
    model: Optional[str] = None,
    timeout: int = 120
) -> str:
    """
    複数画像を合成してファイルに保存する。

    Args:
        images: 画像リスト。各要素は以下のいずれか:
            - {"path": "face.jpg", "role": "人物写真"}  ← ファイルパス指定
            - {"base64": "...", "role": "人物写真", "mimeType": "image/jpeg"}  ← base64直接指定
        instruction: 合成指示テキスト
        save_to: 保存先パス
        model: モデル名（デフォルト: gemini-3.1-flash-image-preview）
        timeout: タイムアウト秒数

    Returns:
        保存先のファイルパス
    """
    img_args = []
    for img in images:
        if "path" in img:
            b64, mime = _read_image_base64(img["path"])
            entry = {"base64": b64, "mimeType": mime}
        elif "base64" in img:
            entry = {"base64": img["base64"]}
            if "mimeType" in img:
                entry["mimeType"] = img["mimeType"]
        else:
            raise ValueError("各画像には 'path' または 'base64' が必要です")

        if "role" in img:
            entry["role"] = img["role"]
        img_args.append(entry)

    args = {"images": img_args, "instruction": instruction}
    if model:
        args["model"] = model

    result = _call_mcp("compose_images", args, timeout=timeout)
    return _save_image_from_result(result, save_to)


def list_models() -> str:
    """利用可能なモデル一覧をテキストで返す"""
    result = _call_mcp("list_models", {}, timeout=30)
    content = result.get("content", [])
    for c in content:
        if c.get("type") == "text":
            return c["text"]
    return ""


# --- バッチ生成ユーティリティ ---

def generate_batch(
    prompts: list[dict],
    output_dir: str = "images",
    model: Optional[str] = None
) -> list[str]:
    """
    複数プロンプトからバッチで画像生成する。

    Args:
        prompts: [{"prompt": "...", "filename": "slide1.jpg"}, ...]
        output_dir: 出力ディレクトリ
        model: モデル名

    Returns:
        生成されたファイルパスのリスト
    """
    os.makedirs(output_dir, exist_ok=True)
    paths = []

    for i, item in enumerate(prompts):
        prompt = item["prompt"]
        filename = item.get("filename", f"image_{i+1:03d}.jpg")
        save_to = os.path.join(output_dir, filename)

        try:
            path = generate_image(prompt, save_to=save_to, model=model)
            print(f"  ✅ [{i+1}/{len(prompts)}] {filename}")
            paths.append(path)
        except Exception as e:
            print(f"  ❌ [{i+1}/{len(prompts)}] {filename}: {e}")
            paths.append(None)

    return paths


if __name__ == "__main__":
    # テスト実行
    print("=== generate_image ===")
    p = generate_image("A beautiful sunset over Mount Fuji, photograph", save_to="/home/claude/test_fuji.jpg")
    print(f"  saved: {p}")

    print("\n=== list_models ===")
    txt = list_models()
    print(f"  {txt[:200]}...")
