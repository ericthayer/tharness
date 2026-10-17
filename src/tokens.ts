import rawTokens from "../data/tokens.json" with { type: "json" };

export interface Token {
  name: string;
  type: string | null;
  value: unknown;
  resolvedValue: unknown;
  description: string | null;
}

type TokenTree = { [key: string]: unknown };

const ALIAS = /^\{([^{}]+)\}$/;

function isRecord(value: unknown): value is TokenTree {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Flattens a W3C DTCG token tree into dot-path names, inheriting `$type` from groups. */
export function flattenTokens(tree: TokenTree): Map<string, Token> {
  const out = new Map<string, Token>();

  const walk = (node: TokenTree, path: string[], inheritedType: string | null): void => {
    const groupType = typeof node.$type === "string" ? node.$type : inheritedType;
    if ("$value" in node) {
      const name = path.join(".");
      out.set(name, {
        name,
        type: groupType,
        value: node.$value,
        resolvedValue: node.$value,
        description: typeof node.$description === "string" ? node.$description : null,
      });
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith("$") || !isRecord(child)) continue;
      walk(child, [...path, key], groupType);
    }
  };

  walk(tree, [], null);
  for (const token of out.values()) token.resolvedValue = resolve(token.value, out, new Set([token.name]));
  return out;
}

function resolve(value: unknown, tokens: Map<string, Token>, seen: Set<string>): unknown {
  if (typeof value !== "string") return value;
  const match = ALIAS.exec(value);
  if (!match?.[1]) return value;
  const target = match[1];
  const next = tokens.get(target);
  if (!next || seen.has(target)) return null;
  return resolve(next.value, tokens, new Set([...seen, target]));
}

export const TOKENS: ReadonlyMap<string, Token> = flattenTokens(rawTokens as TokenTree);
