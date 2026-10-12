import { createHash } from "crypto";

/**
 * Suffixes a name with a short hash of the config dir, the scheme Claude Code uses for its
 * Keychain entries, so per-account data stays apart. The default config dir keeps the bare name.
 */
export function withConfigDirSuffix(name: string, configDir: string | undefined): string {
  if (!configDir) {
    return name;
  }

  const suffix = createHash("sha256").update(configDir.normalize("NFC")).digest("hex").slice(0, 8);
  return `${name}-${suffix}`;
}

/**
 * Resolves which directory Claude Code's own credential store follows.
 * CLAUDE_SECURESTORAGE_CONFIG_DIR overrides CLAUDE_CONFIG_DIR for this purpose when set —
 * including when set to an empty string, which pins the default store even if
 * CLAUDE_CONFIG_DIR points elsewhere. See https://github.com/anthropics/claude-code/issues/79223.
 * An empty CLAUDE_CONFIG_DIR means the default dir, not a path relative to the working directory.
 */
export function resolveCredentialsConfigDir(env: {
  CLAUDE_SECURESTORAGE_CONFIG_DIR?: string;
  CLAUDE_CONFIG_DIR?: string;
}): string | undefined {
  if (env.CLAUDE_SECURESTORAGE_CONFIG_DIR !== undefined) {
    return env.CLAUDE_SECURESTORAGE_CONFIG_DIR || undefined;
  }

  return env.CLAUDE_CONFIG_DIR || undefined;
}

/**
 * An entry of the Claude Code extension's `claudeCode.environmentVariables` setting.
 */
export interface ClaudeCodeEnvironmentVariable {
  name: string;
  value: string;
}

/**
 * Layers the Claude Code extension's `claudeCode.environmentVariables` setting over the process
 * environment, as that extension does when it launches Claude. VS Code has no per-profile process
 * environment, so this setting is how a profile points Claude at its own config dir.
 * Malformed entries are skipped, since the setting belongs to another extension. Windows variable
 * names are case-insensitive, so there they are uppercased, letting the setting win over any casing.
 */
export function applyClaudeCodeEnvironment(
  env: Record<string, string | undefined>,
  variables: readonly ClaudeCodeEnvironmentVariable[] | undefined,
  platform: NodeJS.Platform = process.platform,
): Record<string, string | undefined> {
  const overrides = (variables ?? []).filter((variable) => typeof variable?.name === "string" && typeof variable.value === "string");
  const entries = [...Object.entries(env), ...overrides.map(({ name, value }) => [name, value] as const)];
  return Object.fromEntries(platform === "win32" ? entries.map(([name, value]) => [name.toUpperCase(), value]) : entries);
}
