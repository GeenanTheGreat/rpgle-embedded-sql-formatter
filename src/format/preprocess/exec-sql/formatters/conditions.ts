import { normalizeSqlExpression, splitBooleanConditions, findMatchingParenIndex } from '../utils/index';

const hasWrappingParens = (text: string): boolean => {
  const trimmed = text.trim();
  if (!trimmed.startsWith('(')) return false;
  const closeIndex = findMatchingParenIndex(trimmed, 0);
  return closeIndex === trimmed.length - 1;
};

const formatBooleanConditionLines = (
  text: string,
  prefix: string,
  indent: string,
  nestedIndent: string
): string[] => {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return [indent + prefix.trimEnd()];
  }

  if (hasWrappingParens(trimmed)) {
    const inner = trimmed.slice(1, -1).trim();
    const innerConditions = splitBooleanConditions(inner);
    if (innerConditions.length > 1) {
      const lines = [indent + prefix + '('];
      for (let i = 0; i < innerConditions.length; i++) {
        const condition = innerConditions[i];
        const conditionPrefix = condition.op ? `${condition.op} ` : '';
        lines.push(...formatBooleanConditionLines(condition.text, conditionPrefix, nestedIndent, nestedIndent + '  '));
      }
      lines.push(indent + ')');
      return lines;
    }
  }

  const conditions = splitBooleanConditions(trimmed);
  if (conditions.length > 1) {
    const lines: string[] = [];
    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];
      const conditionPrefix = i === 0 ? prefix : condition.op ? `${condition.op} ` : '';
      lines.push(...formatBooleanConditionLines(condition.text, conditionPrefix, indent, nestedIndent));
    }
    return lines;
  }

  return [indent + prefix + normalizeSqlExpression(trimmed)];
};

// Format WHERE/HAVING clauses with one condition per line when using AND/OR.
export const formatBooleanClause = (
  keyword: 'where' | 'having',
  text: string,
  baseIndent: string,
  nestedIndent: string
): string[] => {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return [baseIndent + keyword];
  }

  const conditions = splitBooleanConditions(trimmed);
  if (conditions.length <= 1) {
    return [baseIndent + `${keyword} ${normalizeSqlExpression(trimmed)}`.trim()];
  }

  const lines: string[] = [baseIndent + keyword];
  for (const condition of conditions) {
    const prefix = condition.op ? `${condition.op} ` : '';
    lines.push(...formatBooleanConditionLines(condition.text, prefix, nestedIndent, nestedIndent + '  '));
  }
  return lines;
};
