import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SSHConnectionManager } from "../services/ssh-connection-manager.js";
import { Logger } from "../utils/logger.js";

/**
 * Register execute command tool
 */
export function registerExecuteCommandTool(server: McpServer): void {
  const sshManager = SSHConnectionManager.getInstance();

  server.tool(
    "execute-command",
    "Execute command on connected server and get output result",
    {
      cmdString: z.string().describe("Command to execute"),
      connectionName: z
        .string()
        .optional()
        .describe("SSH connection name (optional, default is 'default')"),
      timeout: z
        .number()
        .optional()
        .describe(
          "Command execution timeout in milliseconds (optional, default is 30000ms)"
        ),
      cwd: z
        .string()
        .optional()
        .describe("Working directory to execute the command in (optional)"),
      sudo: z
        .boolean()
        .optional()
        .describe("Execute command with sudo privileges (optional, default is false)"),
    },
    async ({ cmdString, connectionName, timeout, cwd, sudo }) => {
      try {
        // Build the final command with cwd and sudo support
        let finalCommand = cmdString;

        // Prepend sudo if requested
        if (sudo) {
          finalCommand = `sudo ${finalCommand}`;
        }

        // Prepend cd if cwd is specified
        if (cwd) {
          finalCommand = `cd ${cwd} && ${finalCommand}`;
        }

        const result = await sshManager.executeCommand(
          finalCommand,
          connectionName,
          {
            timeout,
          }
        );
        return {
          content: [{ type: "text", text: result }],
        };
      } catch (error: unknown) {
        const errorMessage = Logger.handleError(
          error,
          "Failed to execute command"
        );
        return {
          content: [{ type: "text", text: errorMessage }],
          isError: true,
        };
      }
    }
  );
}
