import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SSHConnectionManager } from "../services/ssh-connection-manager.js";

/**
 * Register batch command execution tool
 */
export function registerExecuteBatchTool(server: McpServer): void {
  const sshManager = SSHConnectionManager.getInstance();

  server.tool(
    "execute-batch",
    "Execute multiple commands in sequence on connected server",
    {
      commands: z
        .array(z.string())
        .describe("Array of commands to execute in sequence"),
      connectionName: z
        .string()
        .optional()
        .describe("SSH connection name (optional, default is 'default')"),
      timeout: z
        .number()
        .optional()
        .describe("Timeout per command in milliseconds (optional, default is 30000ms)"),
      stopOnError: z
        .boolean()
        .optional()
        .describe("Stop execution if a command fails (optional, default is false)"),
    },
    async ({ commands, connectionName, timeout, stopOnError = false }) => {
      const results: Array<{
        command: string;
        success: boolean;
        output?: string;
        error?: string;
        executionTime: string;
      }> = [];

      for (const command of commands) {
        const startTime = Date.now();
        try {
          const output = await sshManager.executeCommand(
            command,
            connectionName,
            { timeout }
          );
          const executionTime = Date.now() - startTime;

          results.push({
            command,
            success: true,
            output: output.trim(),
            executionTime: `${executionTime}ms`,
          });
        } catch (error: unknown) {
          const executionTime = Date.now() - startTime;
          const errorMessage = error instanceof Error ? error.message : String(error);

          results.push({
            command,
            success: false,
            error: errorMessage,
            executionTime: `${executionTime}ms`,
          });

          if (stopOnError) {
            break;
          }
        }
      }

      const summary = {
        total: commands.length,
        executed: results.length,
        succeeded: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      };

      const response = {
        summary,
        results,
      };

      const hasErrors = summary.failed > 0;

      return {
        content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        isError: hasErrors,
      };
    }
  );
}
