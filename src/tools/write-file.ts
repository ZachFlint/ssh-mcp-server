import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SSHConnectionManager } from "../services/ssh-connection-manager.js";

/**
 * Register write file tool
 */
export function registerWriteFileTool(server: McpServer): void {
  const sshManager = SSHConnectionManager.getInstance();

  server.tool(
    "write-file",
    "Write content to a file on the remote server",
    {
      path: z.string().describe("Path to the file to write"),
      content: z.string().describe("Content to write to the file"),
      connectionName: z
        .string()
        .optional()
        .describe("SSH connection name (optional, default is 'default')"),
      append: z
        .boolean()
        .optional()
        .describe("Append to file instead of overwriting (optional, default is false)"),
      sudo: z
        .boolean()
        .optional()
        .describe("Write file with sudo privileges (optional, default is false)"),
      createDirs: z
        .boolean()
        .optional()
        .describe("Create parent directories if they don't exist (optional, default is false)"),
    },
    async ({ path, content, connectionName, append = false, sudo = false, createDirs = false }) => {
      try {
        // Create parent directories if requested
        if (createDirs) {
          const dirPath = path.substring(0, path.lastIndexOf("/"));
          if (dirPath) {
            const mkdirCmd = sudo ? `sudo mkdir -p ${dirPath}` : `mkdir -p ${dirPath}`;
            await sshManager.executeCommand(mkdirCmd, connectionName, { timeout: 10000 });
          }
        }

        // Escape content for shell - use base64 to handle any content safely
        const base64Content = Buffer.from(content).toString("base64");
        const operator = append ? ">>" : ">";

        let command: string;
        if (sudo) {
          command = `echo '${base64Content}' | base64 -d | sudo tee ${append ? "-a" : ""} ${path} > /dev/null`;
        } else {
          command = `echo '${base64Content}' | base64 -d ${operator} ${path}`;
        }

        await sshManager.executeCommand(command, connectionName, { timeout: 30000 });

        // Verify the write
        const verifyCmd = sudo
          ? `sudo stat -c '%s' ${path}`
          : `stat -c '%s' ${path}`;

        const sizeStr = await sshManager.executeCommand(verifyCmd, connectionName, { timeout: 5000 });
        const size = parseInt(sizeStr.trim(), 10);

        const result = {
          success: true,
          path,
          bytesWritten: content.length,
          fileSize: size,
          mode: append ? "append" : "overwrite",
        };

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Failed to write file: ${errorMessage}` }],
          isError: true,
        };
      }
    }
  );
}
