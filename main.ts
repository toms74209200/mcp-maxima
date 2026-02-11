import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import process from "node:process";

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
  if (typeof process === "undefined") {
    throw new Error("Node.js runtime not available");
  }

  const execFileAsync = promisify(execFile);

  const result: { stdout: string; stderr: string } | any = await execFileAsync(
    command,
    args,
  ).catch((error: any) => error);

  if (!("code" in result)) {
    return { code: 0, stdout: result.stdout, stderr: result.stderr || "" };
  }

  const stdout = result.stdout || "";
  const stderr = result.stderr || "";

  switch (typeof result.code) {
    case "number":
      return { code: result.code, stdout, stderr };
    case "string":
      return { code: -1, stdout, stderr: stderr || result.code };
    default:
      return { code: -1, stdout, stderr: stderr || String(result) };
  }
};

const executors = [createDenoExecutor, createNodeExecutor];

async function runMaximaCommand(command: string): Promise<string> {
  const displaySetting = "display2d: false";
  const randomStateSetting = `s: make_random_state(${
    Math.ceil(Math.random() * 65535)
  })`;
  const randomSeedSetting = `set_random_state(s)`;
  const sanitizedCommand = command.replace(/[;$\s]+$/, "");
  const batchString =
    `${displaySetting}$ ${randomStateSetting}$ ${randomSeedSetting}$ ${sanitizedCommand};`;

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
    .replace(sanitizedCommand.replace(" ", ""), "")
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
