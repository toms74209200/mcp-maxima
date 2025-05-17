import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "Maxima-MCP-Server",
  version: "0.1.0",
});

async function runMaximaCommand(command: string): Promise<string> {
  const displaySetting = "display2d: false";
  const randomStateSetting = `s: make_random_state(${
    Math.ceil(Math.random() * 65535)
  })`;
  const randomSeedSetting = `set_random_state(s)`;

  const cmd = new Deno.Command("maxima", {
    args: [
      "--very-quiet",
      "--batch-string",
      `${displaySetting}$ ${randomStateSetting}$ ${randomSeedSetting}$ ${command};`,
    ],
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stdout, stderr } = await cmd.output();

  if (code !== 0) {
    console.error(`Maxima command failed with code ${code}`);
    console.error(new TextDecoder().decode(stderr));
    throw new Error(`Maxima command failed with code ${code}`);
  }

  return new TextDecoder().decode(stdout).replace(
    displaySetting.replace(" ", ""),
    "",
  ).replace(
    randomStateSetting.replace(" ", ""),
    "",
  ).replace(
    randomSeedSetting.replace(" ", ""),
    "",
  ).replace(
    command.replace(" ", ""),
    "",
  ).trim();
}

server.tool(
  "execute-maxima",
  {
    command: z.string().describe(
      "The Maxima command to execute (e.g., 'diff(sin(x), x)')",
    ),
  },
  async ({ command }) => {
    try {
      const result = await runMaximaCommand(command);
      return {
        content: [{ type: "text", text: result }],
      };
    } catch (e: unknown) {
      let errorMessage = "An unknown error occurred";
      if (e instanceof Error) {
        errorMessage = e.message;
      }
      return {
        content: [{
          type: "text",
          text: `Error executing Maxima command: ${errorMessage}`,
        }],
        isError: true,
      };
    }
  },
);

console.log("Starting Maxima MCP server via stdio...");
const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  console.log("Maxima MCP server connected to stdio transport.");
}).catch((err) => {
  console.error("Failed to connect Maxima MCP server:", err);
});
