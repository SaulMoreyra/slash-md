import { describe, expect, it, vi } from "vitest";
import os from "node:os";

vi.mock("electron", () => ({
  app: { getPath: () => os.tmpdir() },
  safeStorage: { isEncryptionAvailable: () => false },
}));

const { parseSlashmd } = await import("../config");

describe("parseSlashmd — mcp", () => {
  it("keeps a valid agent block and sanitizes its args/env", () => {
    const result = parseSlashmd({
      mcp: {
        agent: {
          name: " opencode ",
          args: ["--x", 3, "--y"],
          env: { A: "1", B: 2 },
        },
      },
    });
    expect(result.mcp?.agent).toEqual({ name: "opencode", args: ["--x", "--y"], env: { A: "1" } });
  });

  it("drops an agent without a name and omits the key entirely", () => {
    expect(parseSlashmd({ mcp: { agent: { name: 42 } } }).mcp).toBeUndefined();
    expect(parseSlashmd({ mcp: {} }).mcp).toBeUndefined();
  });

  it("defaults the reserved server port", () => {
    expect(parseSlashmd({ mcp: { server: { enabled: true } } }).mcp?.server).toEqual({
      enabled: true,
      port: 3969,
    });
    expect(parseSlashmd({ mcp: { server: { enabled: true, port: 5000 } } }).mcp?.server).toEqual({
      enabled: true,
      port: 5000,
    });
  });

  it("ignores a malformed server block", () => {
    expect(parseSlashmd({ mcp: { server: { enabled: "yes" } } }).mcp).toBeUndefined();
  });
});
