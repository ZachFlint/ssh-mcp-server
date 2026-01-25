import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerExecuteCommandTool } from "./execute-command.js";
import { registerExecuteBatchTool } from "./execute-batch.js";
import { registerUploadTool } from "./upload.js";
import { registerDownloadTool } from "./download.js";
import { registerListServersTool } from "./list-servers.js";
import { registerTestConnectionTool } from "./test-connection.js";
import { registerReadFileTool } from "./read-file.js";
import { registerWriteFileTool } from "./write-file.js";
import { registerGetStatusTool } from "./get-status.js";
import { registerCheckPortTool } from "./check-port.js";

/**
 * Register all tools
 * @param server MCP server instance
 */
export function registerAllTools(server: McpServer): void {
  // Command execution
  registerExecuteCommandTool(server);
  registerExecuteBatchTool(server);

  // File operations
  registerUploadTool(server);
  registerDownloadTool(server);
  registerReadFileTool(server);
  registerWriteFileTool(server);

  // Server management
  registerListServersTool(server);
  registerTestConnectionTool(server);
  registerGetStatusTool(server);
  registerCheckPortTool(server);
} 