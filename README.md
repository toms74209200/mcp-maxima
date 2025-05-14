# mcp-maxima

Model Context Protocol(MCP) server of Maxima.

## Requirements

This software requires follows.

- [Maxima](https://maxima.sourceforge.io/)
- [Deno](https://deno.land/) 2.0.0 or later

## Usage

To use it from Deno, you need the subprocess permission.

```bash
deno run --allow-run jsr:@toms/mcp-maxima
```

To use it from MCP client, you need to set up the server configuration bellow.

For Visual Studio Code:

**`mcp.json`**

```json
{
  "servers": {
    "maxima-mcp": {
      "type": "stdio",
      "command": "deno",
      "args": [
        "run",
        "--allow-run",
        "jsr:@toms/mcp-maxima"
      ]
    }
  }
}
```

## Development

- Deno
- [modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk)
- [colinhacks/zod:](https://github.com/colinhacks/zod)

## License

[MIT License](LICENSE)

## Author

[toms74209200](<https://github.com/toms74209200>)
