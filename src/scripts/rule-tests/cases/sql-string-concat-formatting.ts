import type { Case } from '../types';

const testCase: Case = {
  name: 'sql-string-concat-formatting',
  input: [
    '**free',
    "      PurgeScope = 'select run_id from ' + %trim(LocalLib) + '.fdnovwrun ' +",
    "                 'where status in (''FINISHED'', ''PARTIAL'', ''ERROR'') ' +",
    "                 'and coalesce(finished_ts, requested_ts) < current '",
    "      + 'timestamp - 7 days';",
    "      SqlStmt = 'delete from ' + %trim(LocalLib) + '.fdnovwrun ' +",
    "              'where status in (''FINISHED'', ''PARTIAL'', ''ERROR'') ' +",
    "              'and coalesce(finished_ts, requested_ts) < current '",
    "      + 'timestamp - 7 days';"
  ].join('\n'),
  mustInclude: [
    "+ 'where status in (''FINISHED'', ''PARTIAL'', ''ERROR'') '",
    "+ 'and coalesce(finished_ts, requested_ts) < current ' +",
    "'timestamp - 7 days';"
  ],
  mustExclude: [
    "\n      + 'timestamp - 7 days';",
    "current timestamp - 7 days",
    "ERROR'') and coalesce"
  ]
};

export default testCase;
