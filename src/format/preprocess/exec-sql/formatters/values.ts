import {
  normalizeSqlExpression,
  stripTrailingSemicolon,
  splitTopLevel,
  findKeywordIndex,
  findMatchingParenIndex
} from '../utils/index';
import { scanStringAware } from '../../../utils/string-scan';

const splitTopLevelConcat = (text: string): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;

  scanStringAware(text, (ch, index) => {
    if (ch === '(') {
      depth++;
      return;
    }
    if (ch === ')') {
      depth = Math.max(0, depth - 1);
      return;
    }
    if (ch === '|' && text[index + 1] === '|' && depth === 0) {
      const part = text.slice(start, index).trim();
      if (part.length > 0) {
        parts.push(part);
      }
      start = index + 2;
    }
  });

  const tail = text.slice(start).trim();
  if (tail.length > 0) {
    parts.push(tail);
  }
  return parts.length > 1 ? parts : [];
};

const getNestedFunctionDepth = (text: string): number => {
  let maxDepth = 0;
  let depth = 0;
  scanStringAware(text, (ch) => {
    if (ch === '(') {
      depth++;
      if (depth > maxDepth) maxDepth = depth;
      return;
    }
    if (ch === ')') {
      depth = Math.max(0, depth - 1);
    }
  });
  return maxDepth;
};

const tryParseFunctionCall = (text: string): { name: string; argsText: string } | null => {
  const trimmed = text.trim();
  const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
  if (!match) return null;
  const openIndex = trimmed.indexOf('(', match[1].length);
  const closeIndex = findMatchingParenIndex(trimmed, openIndex);
  if (closeIndex !== trimmed.length - 1) return null;
  return {
    name: match[1],
    argsText: trimmed.slice(openIndex + 1, closeIndex)
  };
};

const formatNestedFunctionCallLines = (
  text: string,
  indent: string,
  suffix: string
): string[] | null => {
  if (getNestedFunctionDepth(text) < 3) return null;
  const parsed = tryParseFunctionCall(text);
  if (!parsed) return null;

  const args = splitTopLevel(parsed.argsText, ',');
  if (args.length <= 1) return null;

  const childIndent = indent + '  ';
  const lines = [indent + `${parsed.name}(`];
  for (let i = 0; i < args.length; i++) {
    const argSuffix = i < args.length - 1 ? ',' : '';
    const nested = formatNestedFunctionCallLines(args[i], childIndent, argSuffix);
    if (nested) {
      lines.push(...nested);
    } else {
      lines.push(childIndent + normalizeSqlExpression(args[i]) + argSuffix);
    }
  }
  lines.push(indent + `)${suffix}`);
  return lines;
};

const formatValueItemLines = (item: string, indent: string, suffix: string): string[] => {
  const concatParts = splitTopLevelConcat(item);
  if (concatParts.length <= 1) {
    const functionLines = formatNestedFunctionCallLines(item, indent, suffix);
    if (functionLines) return functionLines;
    return [indent + normalizeSqlExpression(item) + suffix];
  }

  return concatParts.map((part, index) => {
    const concatSuffix = index < concatParts.length - 1 ? ' ||' : suffix;
    return indent + normalizeSqlExpression(part) + concatSuffix;
  });
};

// Format VALUES row lists into multi-line layout.
export const formatValuesRows = (
  valuesText: string,
  baseIndent: string,
  nestedIndent: string
): string[] => {
  const cleaned = stripTrailingSemicolon(valuesText);
  const rows = splitTopLevel(cleaned, ',');
  const normalizeRowItems = (row: string): string[] => {
    const inner = row.startsWith('(') && row.endsWith(')')
      ? row.slice(1, -1)
      : row;
    return splitTopLevel(inner, ',').map(normalizeSqlExpression);
  };
  if (rows.length <= 1) {
    const row = rows.length === 1 ? rows[0] : cleaned;
    const items = normalizeRowItems(row);
    const lines = [baseIndent + 'values ('];
    for (let i = 0; i < items.length; i++) {
      const suffix = i < items.length - 1 ? ',' : '';
      lines.push(...formatValueItemLines(items[i], nestedIndent, suffix));
    }
    lines.push(baseIndent + ');');
    return lines;
  }

  const formattedRows = rows.map((row) => '(' + normalizeRowItems(row).join(', ') + ')');

  const lines = [baseIndent + 'values'];
  for (let i = 0; i < formattedRows.length; i++) {
    const suffix = i < formattedRows.length - 1 ? ',' : ';';
    lines.push(nestedIndent + formattedRows[i] + suffix);
  }
  return lines;
};

// Format VALUES statements (optionally with INTO).
export const formatValuesStatement = (
  text: string,
  baseIndent: string,
  nestedIndent: string
): string[] => {
  const cleaned = stripTrailingSemicolon(text);
  const upper = cleaned.toUpperCase();
  if (!upper.startsWith('VALUES')) {
    return [baseIndent + cleaned + ';'];
  }
  const normalizeRowItems = (row: string): string[] => {
    const inner = row.startsWith('(') && row.endsWith(')')
      ? row.slice(1, -1)
      : row;
    return splitTopLevel(inner, ',').map(normalizeSqlExpression);
  };
  const valuesText = cleaned.slice(6).trimStart();
  const intoIndex = findKeywordIndex(valuesText, 'INTO');
  const valuesPart = intoIndex >= 0 ? valuesText.slice(0, intoIndex).trim() : valuesText;
  const intoPart = intoIndex >= 0 ? valuesText.slice(intoIndex + 4).trimStart() : '';
  const rows = splitTopLevel(valuesPart, ',');
  if (rows.length <= 1) {
    const row = rows.length === 1 ? rows[0] : valuesPart;
    const items = normalizeRowItems(row);
    const lines = [baseIndent + 'values ('];
    for (let i = 0; i < items.length; i++) {
      const suffix = i < items.length - 1 ? ',' : '';
      lines.push(...formatValueItemLines(items[i], nestedIndent, suffix));
    }
    lines.push(baseIndent + ')');
    if (intoPart) {
      const targets = splitTopLevel(intoPart, ',').map(normalizeSqlExpression);
      lines.push(baseIndent + 'into');
      for (let i = 0; i < targets.length; i++) {
        const suffix = i < targets.length - 1 ? ',' : '';
        lines.push(nestedIndent + targets[i] + suffix);
      }
      lines[lines.length - 1] = lines[lines.length - 1] + ';';
      return lines;
    }
    lines[lines.length - 1] = lines[lines.length - 1] + ';';
    return lines;
  }

  const formattedRows = rows.map((row) => '(' + normalizeRowItems(row).join(', ') + ')');

  const lines = [baseIndent + 'values'];
  for (let i = 0; i < formattedRows.length; i++) {
    const suffix = i < formattedRows.length - 1 ? ',' : '';
    lines.push(nestedIndent + formattedRows[i] + suffix);
  }
  if (intoPart) {
    const targets = splitTopLevel(intoPart, ',').map(normalizeSqlExpression);
    lines.push(baseIndent + 'into');
    for (let i = 0; i < targets.length; i++) {
      const suffix = i < targets.length - 1 ? ',' : '';
      lines.push(nestedIndent + targets[i] + suffix);
    }
  }
  lines[lines.length - 1] = lines[lines.length - 1] + ';';
  return lines;
};
