import { expect, test } from "vitest";

test(
  "when passing correct command then returns correct calculation result",
  async () => {
    const command = new Deno.Command("deno", {
      args: ["run", "-A", "--no-check", `${Deno.cwd()}/main.ts`],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    });
    const child = command.spawn();

    const writer = child.stdin.getWriter();
    const reader = child.stdout.pipeThrough(new TextDecoderStream())
      .getReader();

    await writer.write(new TextEncoder().encode(
      JSON.stringify({
        jsonrpc: "2.0",
        id: "init-1",
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "test-client-stdio", version: "0.0.1" },
        },
      }) + "\n",
    ));

    const readLines = async () => {
      const line = await reader.read();
      if (line.done) {
        return;
      }
      try {
        return JSON.parse(line.value);
      } catch {
        return await readLines();
      }
    };

    await readLines();

    await writer.write(new TextEncoder().encode(
      JSON.stringify({
        jsonrpc: "2.0",
        method: "initialized",
        params: {},
      }) + "\n",
    ));

    await writer.write(new TextEncoder().encode(
      JSON.stringify({
        jsonrpc: "2.0",
        id: "call-1",
        method: "tools/call",
        params: {
          name: "execute-maxima",
          arguments: { command: "diff(sin(x), x)" },
        },
      }) + "\n",
    ));

    const actual = await readLines();

    expect(actual.result.content).toStrictEqual([{
      type: "text",
      text: "cos(x)",
    }]);

    await writer.close();
    child.kill("SIGTERM");
    await child.status;
  },
  1000,
);

test(
  "when calling random command twice then returns different numbers",
  async () => {
    const command = new Deno.Command("deno", {
      args: ["run", "-A", "--no-check", `${Deno.cwd()}/main.ts`],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    });
    const child = command.spawn();

    const writer = child.stdin.getWriter();
    const reader = child.stdout.pipeThrough(new TextDecoderStream())
      .getReader();

    await writer.write(new TextEncoder().encode(
      JSON.stringify({
        jsonrpc: "2.0",
        id: "init-1",
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "test-client-stdio", version: "0.0.1" },
        },
      }) + "\n",
    ));

    const readLines = async () => {
      const line = await reader.read();
      if (line.done) {
        return;
      }
      try {
        return JSON.parse(line.value);
      } catch {
        return await readLines();
      }
    };

    await readLines(); // initialize response

    await writer.write(new TextEncoder().encode(
      JSON.stringify({
        jsonrpc: "2.0",
        method: "initialized",
        params: {},
      }) + "\n",
    ));

    await writer.write(new TextEncoder().encode(
      JSON.stringify({
        jsonrpc: "2.0",
        id: "call-1",
        method: "tools/call",
        params: {
          name: "execute-maxima",
          arguments: { command: "random(1.0)" },
        },
      }) + "\n",
    ));
    const actual1 = await readLines();

    await writer.write(new TextEncoder().encode(
      JSON.stringify({
        jsonrpc: "2.0",
        id: "call-2",
        method: "tools/call",
        params: {
          name: "execute-maxima",
          arguments: { command: "random(1.0)" },
        },
      }) + "\n",
    ));
    const actual2 = await readLines();

    expect(actual1.result.content).not.toStrictEqual(actual2.result.content);

    await writer.close();
    child.kill("SIGTERM");
    await child.status;
  },
  1000,
);

test(
  "when passing incorrect arguments then returns error message",
  async () => {
    const command = new Deno.Command("deno", {
      args: ["run", "-A", "--no-check", `${Deno.cwd()}/main.ts`],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    });
    const child = command.spawn();

    const writer = child.stdin.getWriter();
    const reader = child.stdout.pipeThrough(new TextDecoderStream())
      .getReader();

    await writer.write(new TextEncoder().encode(
      JSON.stringify({
        jsonrpc: "2.0",
        id: "init-1",
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "test-client-stdio", version: "0.0.1" },
        },
      }) + "\n",
    ));

    const readLines = async () => {
      const line = await reader.read();
      if (line.done) {
        return;
      }
      try {
        return JSON.parse(line.value);
      } catch {
        return await readLines();
      }
    };

    await readLines(); // initialize response

    await writer.write(new TextEncoder().encode(
      JSON.stringify({
        jsonrpc: "2.0",
        method: "initialized",
        params: {},
      }) + "\n",
    ));

    await writer.write(new TextEncoder().encode(
      JSON.stringify({
        jsonrpc: "2.0",
        id: "call-1",
        method: "tools/call",
        params: {
          name: "execute-maxima",
          arguments: { command: "invalid(" },
        },
      }) + "\n",
    ));

    const actual = await readLines();

    expect(actual.result).toBeDefined();
    expect(actual.result.isError).toBe(true);
    if (!Array.isArray(actual.result.content)) {
      throw new Error("Expected content to be an array");
    }
    expect(actual.result.content[0].text).toContain("incorrect syntax");

    await writer.close();
    child.kill("SIGTERM");
    await child.status;
  },
  1000,
);

test("when passing empty command then returns error message", async () => {
  const command = new Deno.Command("deno", {
    args: ["run", "-A", "--no-check", `${Deno.cwd()}/main.ts`],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  });
  const child = command.spawn();

  const writer = child.stdin.getWriter();
  const reader = child.stdout.pipeThrough(new TextDecoderStream())
    .getReader();

  await writer.write(new TextEncoder().encode(
    JSON.stringify({
      jsonrpc: "2.0",
      id: "init-1",
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "test-client-stdio", version: "0.0.1" },
      },
    }) + "\n",
  ));

  const readLines = async () => {
    const line = await reader.read();
    if (line.done) {
      return;
    }
    try {
      return JSON.parse(line.value);
    } catch {
      return await readLines();
    }
  };

  await readLines(); // initialize response

  await writer.write(new TextEncoder().encode(
    JSON.stringify({
      jsonrpc: "2.0",
      method: "initialized",
      params: {},
    }) + "\n",
  ));

  await writer.write(new TextEncoder().encode(
    JSON.stringify({
      jsonrpc: "2.0",
      id: "call-1",
      method: "tools/call",
      params: {
        name: "execute-maxima",
        arguments: { command: "" },
      },
    }) + "\n",
  ));

  const actual = await readLines();

  expect(actual.result).toBeDefined();
  expect(actual.result.isError).toBe(true);
  if (!Array.isArray(actual.result.content)) {
    throw new Error("Expected content to be an array");
  }
  expect(actual.result.content[0].text).toContain("incorrect syntax");

  await writer.close();
  child.kill("SIGTERM");
  await child.status;
}, 1000);

test("when passing invalid name then returns error message", async () => {
  const command = new Deno.Command("deno", {
    args: ["run", "-A", "--no-check", `${Deno.cwd()}/main.ts`],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  });
  const child = command.spawn();

  const writer = child.stdin.getWriter();
  const reader = child.stdout.pipeThrough(new TextDecoderStream())
    .getReader();

  await writer.write(new TextEncoder().encode(
    JSON.stringify({
      jsonrpc: "2.0",
      id: "init-1",
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "test-client-stdio", version: "0.0.1" },
      },
    }) + "\n",
  ));

  const readLines = async () => {
    const line = await reader.read();
    if (line.done) {
      return;
    }
    try {
      return JSON.parse(line.value);
    } catch {
      return await readLines();
    }
  };

  await readLines(); // initialize response

  await writer.write(new TextEncoder().encode(
    JSON.stringify({
      jsonrpc: "2.0",
      method: "initialized",
      params: {},
    }) + "\n",
  ));

  await writer.write(new TextEncoder().encode(
    JSON.stringify({
      jsonrpc: "2.0",
      id: "call-1",
      method: "tools/call",
      params: {
        name: "invalid-name",
        arguments: { command: "diff(sin(x), x)" },
      },
    }) + "\n",
  ));

  const actual = await readLines();

  expect(actual.result).toBeDefined();
  expect(actual.result.isError).toBe(true);
  if (!Array.isArray(actual.result.content)) {
    throw new Error("Expected content to be an array");
  }
  expect(actual.result.content[0].text).toContain("MCP error -32602");
  expect(actual.result.content[0].text).toContain("invalid-name");

  await writer.close();
  child.kill("SIGTERM");
  await child.status;
}, 1000);
