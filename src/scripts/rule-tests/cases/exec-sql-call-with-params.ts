import type { Case } from '../types';

const testCase: Case = {
  name: 'exec-sql-call-with-params',
  input: [
    '**free',
    'exec sql call SALES/PROC_A(:a,:b,:c);',
    'exec sql',
    '  call qsys2.ifs_write_binary(',
    '    path_name => :ifsPath,',
    '    line => :fileData,',
    "    overwrite => 'REPLACE'",
    '  );',
    'end-exec;'
  ].join('\n'),
  mustInclude: [
    'call SALES/PROC_A(',
    ':a,',
    ':b,',
    ':c',
    ');',
    'call qsys2.ifs_write_binary(',
    'path_name => :ifsPath,',
    'line => :fileData,',
    "overwrite => 'REPLACE'"
  ],
  mustExclude: [
    '= >'
  ]
};

export default testCase;
