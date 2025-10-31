const lineSeparatorRegex = /\r?\n/;

function parse(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const rawLine of content.split(lineSeparatorRegex)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (!key) {
      continue;
    }

    result[key] = value;
  }

  return result;
}

function stringify(value: unknown): string {
  if (!value || typeof value !== "object") {
    return "";
  }

  return Object.entries(value as Record<string, unknown>)
    .map(([key, val]) => `${key}: ${String(val ?? "")}`)
    .join("\n");
}

export default {
  parse,
  stringify,
};
