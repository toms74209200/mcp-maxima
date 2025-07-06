# mcp-maxima

[![GitHub](https://img.shields.io/badge/GitHub-repository---)](https://github.com/toms74209200/mcp-maxima)
[![JSR](https://img.shields.io/badge/JSR---?color=f7df1e)](https://jsr.io/@toms/mcp-maxima)
[![Docker Hub](https://img.shields.io/badge/Docker%20Hub---?color=1D63ED)](https://hub.docker.com/r/motomotomato/mcp-maxima)
![GitHub tag (with filter)](https://img.shields.io/github/v/tag/toms74209200/mcp-maxima)

Model Context Protocol(MCP) server of Maxima.

## Requirements

This software requires follows.

- [Maxima](https://maxima.sourceforge.io/)
- [Deno](https://deno.land/) 2.0.0 or later

## Usage

### JSR package

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

### Docker image

To use it from Docker, you can pull the image from Docker Hub.

https://hub.docker.com/r/motomotomato/mcp-maxima

```bash
docker pull motomotomato/mcp-maxima
```

```bash
docker run -i --rm motomotomato/mcp-maxima
```

**`mcp.json`**

```json
{
  "servers": {
    "maxima-mcp": {
      "type": "stdio",
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "motomotomato/mcp-maxima"
      ]
    }
  }
}
```

## Development

- Deno
- [modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk)
- [colinhacks/zod](https://github.com/colinhacks/zod)

## License

[MIT License](LICENSE)

## Author

[toms74209200](<https://github.com/toms74209200>)
