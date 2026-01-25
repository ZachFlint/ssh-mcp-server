import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SSHConnectionManager } from "../services/ssh-connection-manager.js";

/**
 * Register read file tool
 */
export function registerReadFileTool(server: McpServer): void {
  const sshManager = SSHConnectionManager.getInstance();

  server.tool(
    "read-file",
    "Read contents of a file from the remote server",
    {
      path: z.string().describe("Path to the file to read"),
      connectionName: z
        .string()
        .optional()
        .describe("SSH connection name (optional, default is 'default')"),
      maxLines: z
        .number()
        .optional()
        .describe("Maximum number of lines to read (optional, reads entire file if not specified)"),
      startLine: z
        .number()
        .optional()
        .describe("Line number to start reading from (optional, 1-indexed, default is 1)"),
      sudo: z
        .boolean()
        .optional()
        .describe("Read file with sudo privileges (optional, default is false)"),
    },
    async ({ path, connectionName, maxLines, startLine, sudo }) => {
      try {
        let command: string;

        if (maxLines && startLine) {
          // Read specific range: tail from startLine, then head maxLines
          command = `tail -n +${startLine} ${path} | head -n ${maxLines}`;
        } else if (maxLines) {
          // Read first N lines
          command = `head -n ${maxLines} ${path}`;
        } else if (startLine) {
          // Read from startLine to end
          command = `tail -n +${startLine} ${path}`;
        } else {
          // Read entire file
          command = `cat ${path}`;
        }

        if (sudo) {
          command = `sudo ${command}`;
        }

        const content = await sshManager.executeCommand(command, connectionName, {
          timeout: 30000,
        });

        // Get file info
        const statCommand = sudo
          ? `sudo stat -c '%s bytes, modified %y' ${path} 2>/dev/null || echo 'unknown'`
          : `stat -c '%s bytes, modified %y' ${path} 2>/dev/null || echo 'unknown'`;

        let fileInfo = "unknown";
        try {
          fileInfo = (await sshManager.executeCommand(statCommand, connectionName, { timeout: 5000 })).trim();
        } catch {
          // Ignore stat errors
        }

        const result = {
          path,
          fileInfo,
          content: content,
        };

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Failed to read file: ${errorMessage}` }],
          isError: true,
        };
      }
    }
  );
}
