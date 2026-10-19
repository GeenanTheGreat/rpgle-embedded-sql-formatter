import {
  normalizeSqlWhitespace,
  normalizeSqlIdentifierPath,
  normalizeSqlExpression,
  stripTrailingSemicolon,
  splitTopLevel,
  findMatchingParenIndex,
  findKeywordIndex
} from '../utils/index';
import { formatSelect } from './select';
import { formatValuesRows } from './values';
import { formatInsert } from './insert';
import { formatBooleanClause } from './conditions';

const formatMergeUsing = (
  usingPart: string,
  baseIndent: string,
  nestedIndent: string
): string[] => {
  const trimmed = usingPart.trim();
  const upper = trimmed.toUpperCase();
  if (!upper.startsWith('(')) {
    return [baseIndent + `using ${trimmed}`];
  }

  const closeIndex = findMatchingParenIndex(trimmed, 0);
  if (closeIndex === null) {
    return [baseIndent + `using ${trimmed}`];
  }

  const inner = trimmed.slice(1, closeIndex).trim();
  const suffix = trimmed.slice(closeIndex + 1).trim();
  if (!inner.toUpperCase().startsWith('VALUES')) {
    return [baseIndent + `using ${normalizeSqlExpression(trimmed)}`];
  }

  const lines = [baseIndent + 'using ('];
  const valueLines = formatValuesRows(inner.slice(6).trimStart(), nestedIndent, baseIndent + nestedIndent);
  const lastValueIndex = valueLines.length - 1;
  for (let i = 0; i < valueLines.length; i++) {
    const line = i === lastValueIndex ? valueLines[i].replace(/;\s*$/, '') : valueLines[i];
    lines.push(line);
  }
  lines.push(baseIndent + `)${suffix ? ` ${normalizeSqlExpression(suffix)}` : ''}`);
  return lines;
};

const formatMergeOn = (onPart: string, baseIndent: string, nestedIndent: string): string[] => {
  const formatted = formatBooleanClause('where', onPart, baseIndent, nestedIndent);
  if (formatted.length === 0) return [baseIndent + 'on'];
  return formatted.map((line, index) => {
    if (index === 0) {
      return line.replace(/^(\s*)where\b/i, '$1on');
    }
    return line;
  });
};

// Format MERGE statements with WHEN MATCHED/NOT MATCHED actions.
export const formatMerge = (text: string, baseIndent: string, nestedIndent: string): string[] => {
  const cleaned = stripTrailingSemicolon(text);
  const upper = cleaned.toUpperCase();
  const mergeMatch = upper.match(/^MERGE\s+INTO\s+/);
  if (!mergeMatch) {
    return [baseIndent + cleaned + ';'];
  }

  const rest = cleaned.slice(mergeMatch[0].length).trimStart();
  let remaining = rest;
  const usingIndex = findKeywordIndex(remaining, 'USING');
  if (usingIndex < 0) {
    return [baseIndent + cleaned + ';'];
  }
  const targetPart = normalizeSqlIdentifierPath(remaining.slice(0, usingIndex).trim());
  remaining = remaining.slice(usingIndex + 5).trimStart();

  const onIndex = findKeywordIndex(remaining, 'ON');
  if (onIndex < 0) {
    return [baseIndent + cleaned + ';'];
  }
  const usingPart = normalizeSqlIdentifierPath(remaining.slice(0, onIndex).trim());
  remaining = remaining.slice(onIndex + 2).trimStart();

  const lines: string[] = [];
  lines.push(baseIndent + `merge into ${targetPart}`);
  lines.push(...formatMergeUsing(usingPart, baseIndent, nestedIndent));

  const whenIndex = findKeywordIndex(remaining, 'WHEN');
  if (whenIndex < 0) {
    lines.push(...formatMergeOn(remaining, baseIndent, nestedIndent));
    lines[lines.length - 1] = lines[lines.length - 1] + ';';
    return lines;
  }

  const onPart = remaining.slice(0, whenIndex).trim();
  lines.push(...formatMergeOn(onPart, baseIndent, nestedIndent));
  remaining = remaining.slice(whenIndex).trimStart();

  const whenBlocks = remaining
    .split(/\b(?=WHEN\s+(MATCHED|NOT)\b)/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  for (let i = 0; i < whenBlocks.length; i++) {
    const block = whenBlocks[i];
    const upperBlock = block.toUpperCase();
    if (upperBlock.startsWith('WHEN MATCHED')) {
      const thenIndex = findKeywordIndex(block, 'THEN');
      const header = thenIndex >= 0 ? block.slice(0, thenIndex).trim() : block.trim();
      const action = thenIndex >= 0 ? block.slice(thenIndex + 4).trimStart() : '';
      const conditionRaw = header.slice('WHEN MATCHED'.length).trimStart();
      const condition = conditionRaw.toUpperCase().startsWith('AND ')
        ? normalizeSqlExpression(conditionRaw.slice(4))
        : conditionRaw.length > 0
          ? normalizeSqlExpression(conditionRaw)
          : '';
      lines.push(
        baseIndent + `when matched${condition ? ` and ${condition}` : ''} then`
      );
      if (action.toUpperCase().startsWith('UPDATE')) {
        const updateText = action.slice(6).trimStart();
        const setIndex = findKeywordIndex(updateText, 'SET');
        if (setIndex >= 0) {
          const setText = updateText.slice(setIndex + 3).trimStart();
          const assignments = splitTopLevel(setText, ',').map(normalizeSqlExpression);
          const assignmentIndent = nestedIndent + baseIndent;
          lines.push(nestedIndent + 'update');
          lines.push(nestedIndent + 'set');
          for (let j = 0; j < assignments.length; j++) {
            const suffix = j < assignments.length - 1 ? ',' : '';
            lines.push(assignmentIndent + assignments[j] + suffix);
          }
          continue;
        }
      } else if (action.toUpperCase().startsWith('DELETE')) {
        lines.push(nestedIndent + 'delete');
        continue;
      }
      lines.push(nestedIndent + normalizeSqlWhitespace(action));
      continue;
    }

    if (upperBlock.startsWith('WHEN NOT MATCHED')) {
      const thenIndex = findKeywordIndex(block, 'THEN');
      const header = thenIndex >= 0 ? block.slice(0, thenIndex).trim() : block.trim();
      const action = thenIndex >= 0 ? block.slice(thenIndex + 4).trimStart() : '';
      const restHeader = header.slice('WHEN NOT MATCHED'.length).trimStart();
      const byMatch = restHeader.match(/^BY\s+(TARGET|SOURCE)\b/i);
      const byPart = byMatch ? ` by ${byMatch[1].toLowerCase()}` : '';
      const conditionSource = byMatch ? restHeader.slice(byMatch[0].length).trimStart() : restHeader;
      const condition = conditionSource.toUpperCase().startsWith('AND ')
        ? normalizeSqlExpression(conditionSource.slice(4))
        : conditionSource.length > 0
          ? normalizeSqlExpression(conditionSource)
          : '';
      lines.push(
        baseIndent + `when not matched${byPart}${condition ? ` and ${condition}` : ''} then`
      );
      if (action.toUpperCase().startsWith('INSERT')) {
        const insertText = action.slice(6).trimStart();
        const mergeNestedIndent = nestedIndent + baseIndent;
        if (insertText.startsWith('(')) {
          const closingIndex = findMatchingParenIndex(insertText, 0);
          if (closingIndex !== null) {
            const inner = insertText.slice(1, closingIndex);
            const columns = splitTopLevel(inner, ',').map(normalizeSqlWhitespace);
            const remainder = insertText.slice(closingIndex + 1).trimStart();
            lines.push(nestedIndent + 'insert (');
            for (let j = 0; j < columns.length; j++) {
              const suffix = j < columns.length - 1 ? ',' : '';
              lines.push(mergeNestedIndent + columns[j] + suffix);
            }
            lines.push(nestedIndent + ')');
            if (remainder.length === 0) {
              lines[lines.length - 1] = lines[lines.length - 1] + ';';
              continue;
            }
            const upperRemainder = remainder.toUpperCase();
            if (upperRemainder.startsWith('VALUES')) {
              const valuesText = remainder.slice(6).trimStart();
              lines.push(...formatValuesRows(valuesText, nestedIndent, mergeNestedIndent));
              continue;
            }
            if (upperRemainder.startsWith('SELECT')) {
              lines.push(...formatSelect(remainder, nestedIndent, mergeNestedIndent));
              continue;
            }
            lines[lines.length - 1] = lines[lines.length - 1] + ';';
            continue;
          }
        }
        const formatted = formatInsert(`insert ${insertText}`, nestedIndent, mergeNestedIndent);
        for (const line of formatted) {
          lines.push(line);
        }
        continue;
      }
      if (action.toUpperCase().startsWith('DELETE')) {
        lines.push(nestedIndent + 'delete');
        continue;
      }
      lines.push(nestedIndent + normalizeSqlWhitespace(action));
    }
  }

  if (lines.length > 0) {
    lines[lines.length - 1] = lines[lines.length - 1].replace(/;?$/, ';');
  }

  return lines;
};
