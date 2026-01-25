import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SSHConnectionManager } from "../services/ssh-connection-manager.js";

/**
 * Register check port tool
 */
export function registerCheckPortTool(server: McpServer): void {
  const sshManager = SSHConnectionManager.getInstance();

  server.tool(
    "check-port",
    "Check if a port is open/listening on the remote server or test connectivity to external hosts",
    {
      port: z.number().describe("Port number to check"),
      host: z
        .string()
        .optional()
        .describe("Host to check (optional, default is 'localhost' for local port check)"),
      connectionName: z
        .string()
        .optional()
        .describe("SSH connection name (optional, default is 'default')"),
      timeout: z
        .number()
        .optional()
        .describe("Connection timeout in seconds (optional, default is 5)"),
    },
    async ({ port, host = "localhost", connectionName, timeout = 5 }) => {
      try {
        const isLocalCheck = host === "localhost" || host === "127.0.0.1";

        let result: {
          port: number;
          host: string;
          open: boolean;
          service?: string;
          pid?: string;
          error?: string;
        };

        if (isLocalCheck) {
          // Check if port is listening locally using multiple methods for compatibility
          // Try ss first, fall back to netstat
          const checkCmd = `(ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null) | grep ':${port} ' || true`;
          const output = await sshManager.executeCommand(checkCmd, connectionName, {
            timeout: timeout * 1000,
          });

          const isListening = output.trim().length > 0;

          result = {
            port,
            host,
            open: isListening,
          };

          if (isListening) {
            // Try to extract process info
            const lines = output.trim().split("\n");
            if (lines.length > 0) {
              const line = lines[0];
              // Extract process name/pid from ss or netstat output
              const pidMatch = line.match(/users:\(\("([^"]+)".*pid=(\d+)/);
              if (pidMatch) {
                result.service = pidMatch[1];
                result.pid = pidMatch[2];
              } else {
                // Try netstat format
                const netstatMatch = line.match(/(\d+)\/(\S+)\s*$/);
                if (netstatMatch) {
                  result.pid = netstatMatch[1];
                  result.service = netstatMatch[2];
                }
              }
            }
          }
        } else {
          // Check connectivity to external host:port using nc or timeout+bash
          const checkCmd = `(nc -z -w ${timeout} ${host} ${port} 2>&1 && echo "OPEN") || (timeout ${timeout} bash -c "echo >/dev/tcp/${host}/${port}" 2>&1 && echo "OPEN") || echo "CLOSED"`;
          const output = await sshManager.executeCommand(checkCmd, connectionName, {
            timeout: (timeout + 2) * 1000,
          });

          const isOpen = output.includes("OPEN");

          result = {
            port,
            host,
            open: isOpen,
          };
        }

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  port,
                  host,
                  open: false,
                  error: errorMessage,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }
  );
}
