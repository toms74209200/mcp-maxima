import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const server = new McpServer({
  name: "Maxima-MCP-Server",
  version: "0.1.0",
});

const createDenoExecutor = async (
  command: string,
  args: string[],
): Promise<{ stdout: string; stderr: string; code: number }> => {
  if (typeof Deno === "undefined") {
    throw new Error("Deno runtime not available");
  }

  const cmd = new Deno.Command(command, {
    args,
    stdout: "piped",
    stderr: "piped",
  });
  const { code, stdout, stderr } = await cmd.output();
  return {
    code,
    stdout: new TextDecoder().decode(stdout),
    stderr: new TextDecoder().decode(stderr),
  };
};

const createNodeExecutor = async (
  command: string,
  args: string[],
): Promise<{ stdout: string; stderr: string; code: number }> => {
  const execFileAsync = (() => {
    try {
      return promisify(execFile);
    } catch {
      throw new Error("Node.js runtime not available");
    }
  })();

  try {
    const { stdout, stderr } = await execFileAsync(command, args);
    return { code: 0, stdout, stderr: stderr || "" };
  } catch (error: unknown) {
    if (
      error && typeof error === "object" && "code" in error &&
      typeof error.code === "number"
    ) {
      return {
        code: error.code,
        stdout: "",
        stderr: String(error),
      };
    }
    return { code: -1, stdout: "", stderr: String(error) };
  }
};

const executors = [createDenoExecutor, createNodeExecutor];

async function runMaximaCommand(command: string): Promise<string> {
  const displaySetting = "display2d: false";
  const randomStateSetting = `s: make_random_state(${
    Math.ceil(Math.random() * 65535)
  })`;
  const randomSeedSetting = `set_random_state(s)`;
  const batchString =
    `${displaySetting}$ ${randomStateSetting}$ ${randomSeedSetting}$ ${command};`;

  const { code, stdout, stderr } = await Promise.any(
    executors.map((exec) =>
      exec("maxima", [
        "--very-quiet",
        "--batch-string",
        batchString,
      ])
    ),
  ).catch(() => ({
    code: -1,
    stdout: "",
    stderr: "No executor available",
  }));

  if (code !== 0) {
    console.error(`Maxima command failed with code ${code}`);
    console.error(stderr);
    throw new Error(`Maxima command failed with code ${code}`);
  }

  return stdout
    .replace(displaySetting.replace(" ", ""), "")
    .replace(randomStateSetting.replace(" ", ""), "")
    .replace(randomSeedSetting.replace(" ", ""), "")
    .replace(command.replace(" ", ""), "")
    .trim();
}

server.registerTool(
  "execute-maxima",
  {
    description: "Execute a Maxima command for symbolic mathematics",
    inputSchema: {
      command: z.string().describe(
        "The Maxima command to execute (e.g., 'diff(sin(x), x)')",
      ),
    },
  },
  async ({ command }) => {
    try {
      const result = await runMaximaCommand(command);
      if (result.includes("incorrect syntax")) {
        return {
          content: [{
            type: "text",
            text: result,
          }],
          isError: true,
        };
      }
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

const transport = new StdioServerTransport();
server.connect(transport).catch((err) => {
  console.error("Failed to connect Maxima MCP server:", err);
});
