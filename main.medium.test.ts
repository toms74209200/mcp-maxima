import { expect, test } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio";

test(
  "when passing correct command then returns correct calculation result",
  async () => {
    const transport = new StdioClientTransport({
      command: "deno",
      args: ["run", "-A", `${Deno.cwd()}/main.ts`],
    });
    const client = new Client({ name: "example-client", version: "1.0.0" });
    await client.connect(transport);

    const actual = await client.callTool({
      name: "execute-maxima",
      arguments: { command: "diff(sin(x), x)" },
    });
    expect(actual.content).toStrictEqual([{ type: "text", text: "cos(x)" }]);
  },
  1000,
);

test(
  "when passing incorrect arguments then returns error message",
  async () => {
    const transport = new StdioClientTransport({
      command: "deno",
      args: ["run", "-A", `${Deno.cwd()}/main.ts`],
    });
    const client = new Client({ name: "example-client", version: "1.0.0" });
    await client.connect(transport);

    const actual = await client.callTool({
      name: "execute-maxima",
      arguments: { command: "invalid(" },
    });
    if (!Array.isArray(actual.content)) {
      throw new Error("Expected content to be an array");
    }
    expect(actual.content[0].text).toContain("incorrect syntax");
  },
  1000,
);

test("when passing empty command then returns error message", async () => {
  const transport = new StdioClientTransport({
    command: "deno",
    args: ["run", "-A", `${Deno.cwd()}/main.ts`],
  });
  const client = new Client({ name: "example-client", version: "1.0.0" });
  await client.connect(transport);

  const actual = await client.callTool({
    name: "execute-maxima",
    arguments: { command: "" },
  });
  if (!Array.isArray(actual.content)) {
    throw new Error("Expected content to be an array");
  }
  expect(actual.content[0].text).toContain("incorrect syntax");
}, 1000);

test("when passing invalid name then returns error message", async () => {
  const transport = new StdioClientTransport({
    command: "deno",
    args: ["run", "-A", `${Deno.cwd()}/main.ts`],
  });
  const client = new Client({ name: "example-client", version: "1.0.0" });
  await client.connect(transport);

  expect(client.callTool({
    name: "invalid-name",
    arguments: { command: "diff(sin(x), x)" },
  })).rejects.toThrowError();
}, 1000);
