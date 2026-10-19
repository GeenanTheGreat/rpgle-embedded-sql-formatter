import type { Case } from '../types';

const testCase: Case = {
  name: 'exec-sql-values-nested-functions',
  input: [
    '**free',
    'exec sql',
    '  values replace(',
    '           replace(',
    '             replace(',
    "               replace(char(current timestamp), '-', ''),",
    "              '.', ''),",
    "            ':', ''),",
    "          ' ', '')",
    '    into :RunToken;'
  ].join('\n'),
  mustInclude: [
    'values (',
    'replace(',
    'replace(char(current timestamp),',
    "'-', ''",
    "'.'",
    "':'",
    "' '",
    ')',
    'into',
    ':RunToken;'
  ],
  mustExclude: [
    "REPLACE( REPLACE( REPLACE( REPLACE(CHAR(CURRENT TIMESTAMP), '-', ''), '.', ''), ':', ''), ' ', '')"
  ]
};

export default testCase;
