import test from "node:test";
import assert from "node:assert/strict";

import { applyClaudeCodeEnvironment, type ClaudeCodeEnvironmentVariable, resolveCredentialsConfigDir, withConfigDirSuffix } from "../configDir";

test("resolveCredentialsConfigDir falls back to CLAUDE_CONFIG_DIR when CLAUDE_SECURESTORAGE_CONFIG_DIR is unset", () => {
  assert.equal(resolveCredentialsConfigDir({ CLAUDE_CONFIG_DIR: "/custom/claude" }), "/custom/claude");
});

test("resolveCredentialsConfigDir prefers CLAUDE_SECURESTORAGE_CONFIG_DIR when both are set", () => {
  assert.equal(
    resolveCredentialsConfigDir({
      CLAUDE_CONFIG_DIR: "/custom/claude",
      CLAUDE_SECURESTORAGE_CONFIG_DIR: "/other/profile",
    }),
    "/other/profile",
  );
});

test("resolveCredentialsConfigDir treats an empty CLAUDE_SECURESTORAGE_CONFIG_DIR as pinning the default store", () => {
  assert.equal(
    resolveCredentialsConfigDir({
      CLAUDE_CONFIG_DIR: "/custom/claude",
      CLAUDE_SECURESTORAGE_CONFIG_DIR: "",
    }),
    undefined,
  );
});

test("resolveCredentialsConfigDir returns undefined when neither variable is set", () => {
  assert.equal(resolveCredentialsConfigDir({}), undefined);
});

test("resolveCredentialsConfigDir treats an empty CLAUDE_CONFIG_DIR as the default dir", () => {
  assert.equal(resolveCredentialsConfigDir({ CLAUDE_CONFIG_DIR: "" }), undefined);
});

test("withConfigDirSuffix keeps the bare name for the default config dir", () => {
  assert.equal(withConfigDirSuffix("usage-history", undefined), "usage-history");
});

test("withConfigDirSuffix uses the same hash as the config-dir-suffixed keychain entry", () => {
  assert.equal(withConfigDirSuffix("Claude Code-credentials", "/custom/claude"), "Claude Code-credentials-7427f042");
});

test("applyClaudeCodeEnvironment returns the process environment unchanged when the setting is unset", () => {
  assert.deepEqual(applyClaudeCodeEnvironment({ CLAUDE_CONFIG_DIR: "/custom/claude" }, undefined, "linux"), { CLAUDE_CONFIG_DIR: "/custom/claude" });
});

test("applyClaudeCodeEnvironment lets setting entries override the process environment", () => {
  const env = applyClaudeCodeEnvironment(
    { CLAUDE_CONFIG_DIR: "/home/test/.claude", PATH: "/usr/bin" },
    [{ name: "CLAUDE_CONFIG_DIR", value: "/home/test/.claude-work" }],
    "linux",
  );

  assert.deepEqual(env, { CLAUDE_CONFIG_DIR: "/home/test/.claude-work", PATH: "/usr/bin" });
});

test("applyClaudeCodeEnvironment skips malformed setting entries", () => {
  const malformed = [{ name: "CLAUDE_CONFIG_DIR" }, { value: "/orphan" }, null, { name: "CLAUDE_SECURESTORAGE_CONFIG_DIR", value: 42 }];

  assert.deepEqual(applyClaudeCodeEnvironment({}, malformed as unknown as ClaudeCodeEnvironmentVariable[], "linux"), {});
});

test("applyClaudeCodeEnvironment matches variable names case-insensitively on Windows", () => {
  const fromEnv = applyClaudeCodeEnvironment({ claude_config_dir: "C:\\Users\\test\\.claude-env" }, undefined, "win32");
  const fromSetting = applyClaudeCodeEnvironment(
    { CLAUDE_CONFIG_DIR: "C:\\Users\\test\\.claude" },
    [{ name: "Claude_Config_Dir", value: "C:\\Users\\test\\.claude-work" }],
    "win32",
  );

  assert.equal(resolveCredentialsConfigDir(fromEnv), "C:\\Users\\test\\.claude-env");
  assert.equal(resolveCredentialsConfigDir(fromSetting), "C:\\Users\\test\\.claude-work");
});

test("applyClaudeCodeEnvironment keeps variable names case-sensitive elsewhere", () => {
  const env = applyClaudeCodeEnvironment({ CLAUDE_CONFIG_DIR: "/home/test/.claude" }, [{ name: "claude_config_dir", value: "/other" }], "linux");

  assert.equal(resolveCredentialsConfigDir(env), "/home/test/.claude");
});

test("a profile's claudeCode.environmentVariables setting selects that profile's config dir", () => {
  const configDirFor = (variables: ClaudeCodeEnvironmentVariable[] | undefined) =>
    resolveCredentialsConfigDir(applyClaudeCodeEnvironment({}, variables, "linux"));

  assert.equal(configDirFor(undefined), undefined);
  assert.equal(configDirFor([{ name: "CLAUDE_CONFIG_DIR", value: "/home/test/.claude-work" }]), "/home/test/.claude-work");
  assert.equal(
    configDirFor([
      { name: "CLAUDE_CONFIG_DIR", value: "/home/test/.claude-work" },
      { name: "CLAUDE_SECURESTORAGE_CONFIG_DIR", value: "/home/test/.claude-secure" },
    ]),
    "/home/test/.claude-secure",
  );
});
