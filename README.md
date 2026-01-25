# ssh-mcp-server

SSH-based MCP (Model Context Protocol) server that allows remote execution of SSH commands via the MCP protocol.

## Project Overview

ssh-mcp-server is a bridging tool that enables AI assistants and other applications supporting the MCP protocol to execute remote SSH commands through a standardized interface. This allows AI assistants to safely operate remote servers, execute commands, and retrieve results without directly exposing SSH credentials to AI models.

## Key Features

- **Secure Connections**: Supports multiple secure SSH connection methods, including password authentication and private key authentication (with passphrase support)
- **Command Security Control**: Precisely control the range of allowed commands through flexible blacklist and whitelist mechanisms to prevent dangerous operations
- **Standardized Interface**: Complies with MCP protocol specifications for seamless integration with AI assistants supporting the protocol
- **File Transfer**: Supports bidirectional file transfers, uploading local files to servers or downloading files from servers
- **Credential Isolation**: SSH credentials are managed entirely locally and never exposed to AI models, enhancing security
- **Ready to Use**: Can be run directly using NPX without global installation, making it convenient and quick to deploy
- **Environment Variables**: Support for credentials via environment variables for secure CI/CD integration
- **Batch Execution**: Execute multiple commands in sequence with a single tool call

## Tools List

| Tool | Description |
|---------|----------|
| execute-command | Execute SSH commands with optional cwd and sudo support |
| execute-batch | Execute multiple commands in sequence with a single call |
| read-file | Read file contents from remote server with line range support |
| write-file | Write content to files on remote server with append mode |
| upload | Upload local files to remote server via SFTP |
| download | Download files from remote server via SFTP |
| test-connection | Test SSH connectivity and return server info |
| get-status | Get comprehensive system status (CPU, memory, disk, OS, processes) |
| check-port | Check if ports are open/listening on remote server |
| list-servers | List all configured SSH connections |

## Usage

### MCP Configuration Examples

> **Important**: In MCP configuration files, each command line argument and its value must be separate elements in the `args` array. Do NOT combine them with spaces. For example, use `"--host", "192.168.1.1"` instead of `"--host 192.168.1.1"`.

#### Command Line Options

```text
Options:
  -h, --host          SSH server host address
  -p, --port          SSH server port
  -u, --username      SSH username
  -w, --password      SSH password
  -k, --privateKey    SSH private key file path
  -P, --passphrase    Private key passphrase (if any)
  -W, --whitelist     Command whitelist, comma-separated regular expressions
  -B, --blacklist     Command blacklist, comma-separated regular expressions
  -s, --socksProxy    SOCKS proxy server address (e.g., socks://user:password@host:port)
  -t, --timeout       Default command timeout in milliseconds (default: 30000)

Environment Variables (alternative to CLI options):
  SSH_HOST            SSH server host address
  SSH_PORT            SSH server port (default: 22)
  SSH_USERNAME        SSH username
  SSH_PASSWORD        SSH password
  SSH_PRIVATE_KEY     SSH private key file path
  SSH_PASSPHRASE      Private key passphrase
  SSH_WHITELIST       Command whitelist
  SSH_BLACKLIST       Command blacklist
  SSH_SOCKS_PROXY     SOCKS proxy server address
  SSH_TIMEOUT         Default command timeout in milliseconds
```

#### Using Password

```json
{
  "mcpServers": {
    "ssh-mcp-server": {
      "command": "npx",
      "args": [
        "-y",
        "ssh-mcp-server",
        "--host", "192.168.1.1",
        "--port", "22",
        "--username", "root",
        "--password", "pwd123456"
      ]
    }
  }
}
```

#### Using Private Key

```json
{
  "mcpServers": {
    "ssh-mcp-server": {
      "command": "npx",
      "args": [
        "-y",
        "ssh-mcp-server",
        "--host", "192.168.1.1",
        "--port", "22",
        "--username", "root",
        "--privateKey", "~/.ssh/id_rsa"
      ]
    }
  }
}
```

#### Using Private Key with Passphrase

```json
{
  "mcpServers": {
    "ssh-mcp-server": {
      "command": "npx",
      "args": [
        "-y",
        "ssh-mcp-server",
        "--host", "192.168.1.1",
        "--port", "22",
        "--username", "root",
        "--privateKey", "~/.ssh/id_rsa",
        "--passphrase", "pwd123456"
      ]
    }
  }
}
```

#### Using SOCKS Proxy

```json
{
  "mcpServers": {
    "ssh-mcp-server": {
      "command": "npx",
      "args": [
        "-y",
        "ssh-mcp-server",
        "--host", "192.168.1.1",
        "--port", "22",
        "--username", "root",
        "--password", "pwd123456",
        "--socksProxy", "socks://username:password@proxy-host:proxy-port"
      ]
    }
  }
}

```

#### Using Command Whitelist and Blacklist

Use the `--whitelist` and `--blacklist` parameters to restrict the range of executable commands. Multiple patterns are separated by commas. Each pattern is a regular expression used to match commands.

Example: Using Command Whitelist

```json
{
  "mcpServers": {
    "ssh-mcp-server": {
      "command": "npx",
      "args": [
        "-y",
        "ssh-mcp-server",
        "--host", "192.168.1.1",
        "--port", "22",
        "--username", "root",
        "--password", "pwd123456",
        "--whitelist", "^ls( .*)?,^cat .*,^df.*"
      ]
    }
  }
}
```

Example: Using Command Blacklist

```json
{
  "mcpServers": {
    "ssh-mcp-server": {
      "command": "npx",
      "args": [
        "-y",
        "ssh-mcp-server",
        "--host", "192.168.1.1",
        "--port", "22",
        "--username", "root",
        "--password", "pwd123456",
        "--blacklist", "^rm .*,^shutdown.*,^reboot.*"
      ]
    }
  }
}
```

> Note: If both whitelist and blacklist are specified, the system will first check whether the command is in the whitelist, and then check whether it is in the blacklist. The command must pass both checks to be executed.

### Multi-SSH Connection Example

You can specify multiple SSH connections by passing multiple --ssh parameters, each with a unique name:

```bash
npx ssh-mcp-server \
  --ssh "name=dev,host=1.2.3.4,port=22,user=alice,password=xxx" \
  --ssh "name=prod,host=5.6.7.8,port=22,user=bob,password=yyy"
```

In MCP tool calls, specify the connection name via the `connectionName` parameter. If omitted, the default connection is used.

Example (execute command on 'prod' connection):

```json
{
  "tool": "execute-command",
  "params": {
    "cmdString": "ls -al",
    "connectionName": "prod"
  }
}
```

Example (execute command with timeout options):

```json
{
  "tool": "execute-command",
  "params": {
    "cmdString": "ping -c 10 127.0.0.1",
    "connectionName": "prod",
    "timeout": 5000
  }
}
```

### Command Execution Timeout

The `execute-command` tool supports timeout options to prevent commands from hanging indefinitely:

- **timeout**: Command execution timeout in milliseconds (optional, default is 30000ms)

This is particularly useful for commands like `ping`, `tail -f`, or other long-running processes that might block execution.

### List All SSH Servers

You can use the MCP tool `list-servers` to get all available SSH server configurations:

Example call:

```json
{
  "tool": "list-servers",
  "params": {}
}
```

Example response:

```json
[
  { "name": "dev", "host": "1.2.3.4", "port": 22, "username": "alice" },
  { "name": "prod", "host": "5.6.7.8", "port": 22, "username": "bob" }
]
```

### Test Connection

Use the `test-connection` tool to verify SSH connectivity before running commands:

```json
{
  "tool": "test-connection",
  "params": {
    "connectionName": "prod"
  }
}
```

Example response:

```json
{
  "success": true,
  "connectionTime": "245ms",
  "server": {
    "host": "192.168.1.1",
    "port": 22,
    "username": "root",
    "hostname": "my-server"
  }
}
```

### Batch Command Execution

Use the `execute-batch` tool to run multiple commands in sequence:

```json
{
  "tool": "execute-batch",
  "params": {
    "commands": ["cd /var/log", "ls -la", "df -h"],
    "connectionName": "prod",
    "stopOnError": true
  }
}
```

Example response:

```json
{
  "summary": {
    "total": 3,
    "executed": 3,
    "succeeded": 3,
    "failed": 0
  },
  "results": [
    { "command": "cd /var/log", "success": true, "output": "", "executionTime": "12ms" },
    { "command": "ls -la", "success": true, "output": "...", "executionTime": "15ms" },
    { "command": "df -h", "success": true, "output": "...", "executionTime": "18ms" }
  ]
}
```

### Using Environment Variables

For CI/CD pipelines or secure deployments, you can use environment variables instead of CLI arguments:

```json
{
  "mcpServers": {
    "ssh-mcp-server": {
      "command": "npx",
      "args": ["-y", "ssh-mcp-server"],
      "env": {
        "SSH_HOST": "192.168.1.1",
        "SSH_PORT": "22",
        "SSH_USERNAME": "root",
        "SSH_PASSWORD": "pwd123456"
      }
    }
  }
}
```

### Working Directory and Sudo

The `execute-command` tool supports `cwd` and `sudo` parameters:

```json
{
  "tool": "execute-command",
  "params": {
    "cmdString": "ls -la",
    "cwd": "/var/log",
    "sudo": true
  }
}
```

### Read Remote File

Read file contents with optional line range:

```json
{
  "tool": "read-file",
  "params": {
    "path": "/etc/nginx/nginx.conf",
    "maxLines": 50,
    "startLine": 10
  }
}
```

### Write Remote File

Write content to remote files:

```json
{
  "tool": "write-file",
  "params": {
    "path": "/tmp/config.txt",
    "content": "key=value\nother=setting",
    "append": false,
    "createDirs": true
  }
}
```

### Get Server Status

Get comprehensive system information:

```json
{
  "tool": "get-status",
  "params": {}
}
```

Returns: hostname, OS, CPU, memory, disk, processes, services, uptime, and more.

### Check Port

Check if a port is open:

```json
{
  "tool": "check-port",
  "params": {
    "port": 80,
    "host": "localhost"
  }
}
```

Example response:

```json
{
  "port": 80,
  "host": "localhost",
  "open": true,
  "service": "nginx",
  "pid": "1234"
}
```

## Security Considerations

This server provides powerful capabilities to execute commands and transfer files on remote servers. To ensure it is used securely, please consider the following:

- **Command Whitelisting**: It is *strongly recommended* to use the `--whitelist` option to restrict the set of commands that can be executed. Without a whitelist, any command can be executed on the remote server, which can be a significant security risk.
- **Private Key Security**: The server reads the SSH private key into memory. Ensure that the machine running the `ssh-mcp-server` is secure. Do not expose the server to untrusted networks.
- **Denial of Service (DoS)**: The server does not have built-in rate limiting. An attacker could potentially launch a DoS attack by flooding the server with connection requests or large file transfers. It is recommended to run the server behind a firewall or reverse proxy with rate-limiting capabilities.
- **Path Traversal**: The server has built-in protection against path traversal attacks on the local filesystem. However, it is still important to be mindful of the paths used in `upload` and `download` commands.
