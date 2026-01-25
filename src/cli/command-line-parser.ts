import { parseArgs } from "node:util";
import { SSHConfig, SshConnectionConfigMap, ParsedArgs } from "../models/types.js";

/**
 * Get environment variable with optional fallback
 */
function getEnv(name: string, fallback?: string): string | undefined {
  return process.env[name] || fallback;
}

/**
 * Command line argument parser class
 */
export class CommandLineParser {
  /**
   * Parse command line arguments
   */
  public static parseArgs(): ParsedArgs {
    const { values, positionals } = parseArgs({
      args: process.argv.slice(2),
      options: {
        ssh: { type: "string", multiple: true },
        // Compatible with single connection legacy parameters
        host: { type: "string", short: "h" },
        port: { type: "string", short: "p" },
        username: { type: "string", short: "u" },
        password: { type: "string", short: "w" },
        privateKey: { type: "string", short: "k" },
        passphrase: { type: "string", short: "P" },
        whitelist: { type: "string", short: "W" },
        blacklist: { type: "string", short: "B" },
        socksProxy: { type: "string", short: "s" },
        timeout: { type: "string", short: "t" },
        "pre-connect": { type: "boolean" },
      },
      allowPositionals: true,
    });

    const sshParams: string[] = Array.isArray(values.ssh)
      ? values.ssh
      : values.ssh
      ? [values.ssh]
      : [];

    const configMap: SshConnectionConfigMap = {};

    // Parse multiple --ssh parameters
    for (const sshStr of sshParams) {
      // Parse format: name=dev,host=1.2.3.4,port=22,user=alice,password=xxx
      const parts = sshStr.split(",");
      const conf: any = {};
      for (const part of parts) {
        const [k, v] = part.split("=");
        if (k && v) {
          conf[k.trim()] = v.trim();
        }
      }
      // Must have name, host, port, user
      if (!conf.name || !conf.host || !conf.port || !conf.user) {
        throw new Error("Each --ssh must include name, host, port, user");
      }
      const port = parseInt(conf.port, 10);
      if (isNaN(port)) {
        throw new Error(
          `Port for connection ${conf.name} must be a valid number`
        );
      }
      configMap[conf.name] = {
        name: conf.name,
        host: conf.host,
        port,
        username: conf.user,
        password: conf.password,
        privateKey: conf.privateKey,
        passphrase: conf.passphrase,
        socksProxy: conf.socksProxy,
        commandWhitelist: conf.whitelist
          ? conf.whitelist
              .split("|")
              .map((s: string) => s.trim())
              .filter(Boolean)
          : undefined,
        commandBlacklist: conf.blacklist
          ? conf.blacklist
              .split("|")
              .map((s: string) => s.trim())
              .filter(Boolean)
          : undefined,
      };
    }

    // Compatible with single connection legacy parameters
    // Also supports environment variables: SSH_HOST, SSH_PORT, SSH_USERNAME, SSH_PASSWORD, SSH_PRIVATE_KEY, SSH_PASSPHRASE, SSH_TIMEOUT
    if (Object.keys(configMap).length === 0) {
      const host = values.host || positionals[0] || getEnv("SSH_HOST");
      const portStr = values.port || positionals[1] || getEnv("SSH_PORT", "22");
      const username = values.username || positionals[2] || getEnv("SSH_USERNAME");
      const password = values.password || positionals[3] || getEnv("SSH_PASSWORD");
      const privateKey = values.privateKey || getEnv("SSH_PRIVATE_KEY");
      const passphrase = values.passphrase || getEnv("SSH_PASSPHRASE");
      const whitelist = values.whitelist || getEnv("SSH_WHITELIST");
      const blacklist = values.blacklist || getEnv("SSH_BLACKLIST");
      const defaultTimeout = values.timeout || getEnv("SSH_TIMEOUT");

      if (!host || !portStr || !username || (!password && !privateKey)) {
        throw new Error(
          "Missing required parameters, need to provide host, port, username and password or private key. " +
          "You can also use environment variables: SSH_HOST, SSH_PORT, SSH_USERNAME, SSH_PASSWORD, SSH_PRIVATE_KEY"
        );
      }

      const port = parseInt(portStr, 10);
      if (isNaN(port)) {
        throw new Error("Port must be a valid number");
      }

      configMap["default"] = {
        name: "default",
        host,
        port,
        username,
        password,
        privateKey,
        passphrase,
        socksProxy: values.socksProxy || getEnv("SSH_SOCKS_PROXY"),
        defaultTimeout: defaultTimeout ? parseInt(defaultTimeout, 10) : undefined,
        commandWhitelist: whitelist
          ? whitelist
              .split(",")
              .map((pattern) => pattern.trim())
              .filter(Boolean)
          : undefined,
        commandBlacklist: blacklist
          ? blacklist
              .split(",")
              .map((pattern) => pattern.trim())
              .filter(Boolean)
          : undefined,
      };
    }

    return {
      configs: configMap,
      preConnect: values["pre-connect"] === true,
    };
  }
}
