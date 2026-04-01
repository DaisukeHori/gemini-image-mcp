/**
 * MCP サーバー初期化
 * 全ツールを一括登録する（4 tools）
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerGenerateImage } from "./tools/generate-image";
import { registerEditImage } from "./tools/edit-image";
import { registerComposeImages } from "./tools/compose-images";
import { registerListModels } from "./tools/list-models";

/**
 * MCP サーバーに全ツールを登録する
 */
export function registerAllTools(server: McpServer) {
  registerGenerateImage(server);
  registerEditImage(server);
  registerComposeImages(server);
  registerListModels(server);
}
