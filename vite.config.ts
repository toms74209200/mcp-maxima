import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.{test,spec}.?(c|m)[jt]s?(x)"],
    reporters: Deno.env.get("CI") ? ["verbose", "github-actions"] : ["verbose"],
  },
});
