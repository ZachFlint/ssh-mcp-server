import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SSHConnectionManager } from "../services/ssh-connection-manager.js";
import { collectSystemStatus } from "../utils/status-collector.js";

/**
 * Register get status tool
 */
export function registerGetStatusTool(server: McpServer): void {
  const sshManager = SSHConnectionManager.getInstance();

  server.tool(
    "get-status",
    "Get comprehensive system status information from the remote server (OS, CPU, memory, disk, processes, services)",
    {
      connectionName: z
        .string()
        .optional()
        .describe("SSH connection name (optional, default is 'default')"),
      refresh: z
        .boolean()
        .optional()
        .describe("Force refresh status instead of using cached data (optional, default is false)"),
    },
    async ({ connectionName, refresh = false }) => {
      try {
        // Ensure connected
        await sshManager.connect(connectionName);
        const config = sshManager.getConfig(connectionName);

        let status;

        // Use cached status if available and refresh not requested
        if (!refresh) {
          status = sshManager.getCachedStatus(connectionName);
        }

        // Collect fresh status if no cache or refresh requested
        if (!status || refresh) {
          const client = sshManager.getClient(connectionName);
          status = await collectSystemStatus(client, connectionName || "default");
        }

        const result = {
          connection: {
            name: connectionName || "default",
            host: config.host,
            port: config.port,
            username: config.username,
          },
          cached: !refresh && !!sshManager.getCachedStatus(connectionName),
          status,
        };

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Failed to get server status: ${errorMessage}` }],
          isError: true,
        };
      }
    }
  );
}
