import type { Case } from '../types';

const testCase: Case = {
  name: 'exec-sql-values-into',
  input: [
    '**free',
    'exec sql values (1,\'A\') into :id,:status;',
    'exec sql',
    '  values (',
    '    chr(int(rand()*26) + 65) || chr(int(rand()*26) + 65) ||',
    '    chr(int(rand()*26) + 65)',
    '  )',
    '  into :ao_Hash;',
    'end-exec;'
  ].join('\n'),
  mustInclude: [
    'values (',
    '1,',
    '\'A\'',
    ')',
    'into',
    ':id,',
    ':status;',
    'chr(int(rand() * 26) + 65) ||\n          chr(int(rand() * 26) + 65) ||',
    ':ao_Hash;'
  ],
  mustExclude: [
    'chr(int(rand() * 26) + 65) || chr(int(rand() * 26) + 65) || chr'
  ]
};

export default testCase;
