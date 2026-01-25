import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SSHConnectionManager } from "../services/ssh-connection-manager.js";

/**
 * Register test connection tool
 */
export function registerTestConnectionTool(server: McpServer): void {
  const sshManager = SSHConnectionManager.getInstance();

  server.tool(
    "test-connection",
    "Test SSH connection and return server information",
    {
      connectionName: z
        .string()
        .optional()
        .describe("SSH connection name (optional, default is 'default')"),
    },
    async ({ connectionName }) => {
      const startTime = Date.now();
      try {
        // Attempt to connect
        await sshManager.connect(connectionName);
        const connectionTime = Date.now() - startTime;

        // Get basic server info
        const config = sshManager.getConfig(connectionName);

        // Try to get hostname
        let hostname = "unknown";
        try {
          hostname = await sshManager.executeCommand("hostname", connectionName, { timeout: 5000 });
          hostname = hostname.trim();
        } catch {
          // Ignore errors getting hostname
        }

        const result = {
          success: true,
          connectionTime: `${connectionTime}ms`,
          server: {
            host: config.host,
            port: config.port,
            username: config.username,
            hostname: hostname,
          },
        };

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: unknown) {
        const connectionTime = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);

        const result = {
          success: false,
          connectionTime: `${connectionTime}ms`,
          error: errorMessage,
        };

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          isError: true,
        };
      }
    }
  );
}
