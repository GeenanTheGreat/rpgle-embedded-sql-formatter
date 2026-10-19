import type { Case } from '../types';

const testCase: Case = {
  name: 'exec-sql-set-option-multiline',
  input: [
    '**free',
    'exec sql',
    '  set option commit=*none,',
    '  datfmt=*iso,',
    '  naming=*sql;'
  ].join('\n'),
  mustInclude: [
    'EXEC SQL',
    'SET OPTION',
    'COMMIT = *none,',
    'datfmt = *iso,',
    'naming = *SQL;'
  ],
  mustExclude: [
    'EXEC SQL SET OPTION COMMIT = *none'
  ],
  config: {
    execSqlKeywordCase: 'upper'
  }
};

export default testCase;
