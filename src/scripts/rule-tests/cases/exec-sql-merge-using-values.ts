import type { Case } from '../types';

const testCase: Case = {
  name: 'exec-sql-merge-using-values',
  input: [
    '**free',
    'exec sql',
    '  merge into pcsea.fdnovwrcmp as T',
    '  using (',
    '    values (:ai_RunId, :ai_CompanyId, :ai_MetricId, :ai_MetricValue, current timestamp)',
    '  ) as S(run_id, company_id, metric_id, metric_value, as_of_ts)',
    '    on T.run_id = S.run_id',
    '   and T.company_id = S.company_id',
    '   and T.metric_id = S.metric_id',
    '  when matched then',
    '    update set metric_value = S.metric_value, as_of_ts = S.as_of_ts',
    '  when not matched then',
    '    insert (run_id, company_id, metric_id, metric_value, as_of_ts)',
    '    values (S.run_id, S.company_id, S.metric_id, S.metric_value, S.as_of_ts);'
  ].join('\n'),
  mustInclude: [
    'USING (',
    'VALUES (',
    ':ai_RunId,',
    ':ai_CompanyId,',
    ':ai_MetricId,',
    ':ai_MetricValue,',
    'CURRENT TIMESTAMP',
    ') AS S(run_id, company_id, metric_id, metric_value, as_of_ts)',
    'ON',
    'T.run_id = S.run_id',
    'AND T.company_id = S.company_id',
    'AND T.metric_id = S.metric_id'
  ],
  mustExclude: [
    'USING ( VALUES (:ai_RunId',
    'ON T.run_id = S.run_id AND T.company_id'
  ],
  config: {
    execSqlKeywordCase: 'upper'
  }
};

export default testCase;
