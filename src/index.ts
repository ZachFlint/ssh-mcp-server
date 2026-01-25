#!/usr/bin/env node

import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Determine .env file path: SSH_ENV_FILE takes priority, otherwise default to project root
const customEnvPath = process.env.SSH_ENV_FILE;
const defaultEnvPath = path.resolve(__dirname, "..", ".env");
const envPath = customEnvPath || defaultEnvPath;

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.error(`[SSH MCP] Loaded environment from: ${envPath}`);
} else if (customEnvPath) {
  console.error(`[SSH MCP] Warning: SSH_ENV_FILE specified but not found: ${envPath}`);
}

import { SshMcpServer } from "./core/mcp-server.js";
import { Logger } from "./utils/logger.js";

/**
 * Main program entry
 */
async function main(): Promise<void> {
  const sshMcpServer = new SshMcpServer();
  await sshMcpServer.run();
}

main().catch((error) => Logger.handleError(error, "【SSH MCP Server Error】", true));
