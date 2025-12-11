import { spawn } from "node:child_process";
import { expect, test } from "vitest";

test(
  "when executing Maxima command with Bun runtime then returns correct calculation result",
  async () => {
    const child = spawn("bun", [
      "--experimental-strip-types",
      `${process.cwd()}/main.ts`,
    ]);

    const outputs: string[] = [];
    child.stdout.on("data", (data) => {
      outputs.push(data.toString());
    });

    const sendMessage = (message: unknown) => {
      child.stdin.write(JSON.stringify(message) + "\n");
    };

    sendMessage({
      jsonrpc: "2.0",
      id: "init-1",
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test-client", version: "1.0" },
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    sendMessage({
      jsonrpc: "2.0",
      method: "initialized",
      params: {},
    });

    sendMessage({
      jsonrpc: "2.0",
      id: "call-1",
      method: "tools/call",
      params: {
        name: "execute-maxima",
        arguments: { command: "diff(sin(x), x)" },
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    child.stdin.end();
    await new Promise((resolve) => child.on("close", resolve));

    const output = outputs.join("");
    const lines = output
      .split("\n")
      .filter((line) => line.trim() && !line.includes("Warning"));

    const result = lines
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter((obj) => obj && obj.id === "call-1")[0];

    expect(result.result.content).toStrictEqual([
      { type: "text", text: "cos(x)" },
    ]);
  },
  10000,
);
