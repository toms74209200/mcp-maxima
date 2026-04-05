import { execFile } from "node:child_process";
import { createInterface } from "node:readline";
import { promisify } from "node:util";
import process from "node:process";

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

type McpRequest =
  | { type: "initialize"; id: string | number }
  | { type: "tools/list"; id: string | number }
  | { type: "execute-maxima"; id: string | number; command: string }
  | { type: "unknown-tool"; id: string | number; toolName: string }
  | { type: "invalid-params"; id: string | number; error: string };

function parseMcpRequest(
  msg: Record<string, unknown>,
): McpRequest | null {
  if (!("id" in msg)) return null;
  const id = msg.id as string | number;

  switch (msg.method) {
    case "initialize":
      return { type: "initialize", id };
    case "tools/list":
      return { type: "tools/list", id };
    case "tools/call": {
      const params = msg.params as Record<string, unknown> | undefined;
      const toolName = params?.name as string | undefined;
      if (toolName !== "execute-maxima") {
        return { type: "unknown-tool", id, toolName: toolName ?? "" };
      }
      const command = (params?.arguments as Record<string, unknown> | undefined)
        ?.command;
      if (typeof command !== "string") {
        return {
          type: "invalid-params",
          id,
          error: "command must be a string",
        };
      }
      return { type: "execute-maxima", id, command };
    }
    default:
      return null;
  }
}

function sendResult(id: string | number, result: unknown): void {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result }) + "\n");
}

function sendError(id: string | number, code: number, message: string): void {
  process.stdout.write(
    JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }) + "\n",
  );
}

const readline = createInterface({ input: process.stdin });
readline.on("line", async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let msg: Record<string, unknown>;
  try {
    msg = JSON.parse(trimmed);
  } catch {
    return;
  }

  const request = parseMcpRequest(msg);
  if (!request) return;

  switch (request.type) {
    case "initialize":
      sendResult(request.id, {
        protocolVersion: "2025-03-26",
        capabilities: { tools: {} },
        serverInfo: { name: "Maxima-MCP-Server", version: "1.1.0" },
      });
      break;
    case "tools/list":
      sendResult(request.id, {
        tools: [{
          name: "execute-maxima",
          description: "Execute a Maxima command for symbolic mathematics",
          inputSchema: {
            type: "object",
            properties: {
              command: {
                type: "string",
                description:
                  "The Maxima command to execute (e.g., 'diff(sin(x), x)')",
              },
            },
            required: ["command"],
          },
        }],
      });
      break;
    case "execute-maxima":
      try {
        const result = await runMaximaCommand(request.command);
        sendResult(request.id, {
          content: [{ type: "text", text: result }],
          isError: result.includes("incorrect syntax"),
        });
      } catch (e: unknown) {
        sendResult(request.id, {
          content: [{
            type: "text",
            text: `Error executing Maxima command: ${
              e instanceof Error ? e.message : "An unknown error occurred"
            }`,
          }],
          isError: true,
        });
      }
      break;
    case "unknown-tool":
      sendResult(request.id, {
        content: [{
          type: "text",
          text: `MCP error -32602: Unknown tool: ${request.toolName}`,
        }],
        isError: true,
      });
      break;
    case "invalid-params":
      sendError(request.id, -32602, `Invalid params: ${request.error}`);
      break;
  }
});
