import type { Case } from '../types';

const testCase: Case = {
  name: 'exec-sql-cursor-where-groups',
  input: [
    '**free',
    'exec sql declare CChunks cursor for select chunk_no from pcsea.fdnovwchnk where run_id = :io_Context.WorkRunId and (status in (\'QUEUED\', \'RETRY\') or (status = \'FAILED\' and retry_count < :MAX_CHUNK_RETRIES)) order by chunk_no for update of status, started_ts, finished_ts, error_text;',
    'end-exec;'
  ].join('\n'),
  mustInclude: [
    'declare CChunks cursor for',
    'select',
    'chunk_no',
    'from pcsea.fdnovwchnk',
    'where',
    'run_id = :io_Context.WorkRunId',
    'and (',
    "status in ('QUEUED', 'RETRY')",
    'or (',
    "status = 'FAILED'",
    'and retry_count < :MAX_CHUNK_RETRIES',
    'order by',
    'chunk_no',
    'for update of',
    'error_text;'
  ],
  mustExclude: [
    "AND (status IN ('QUEUED', 'RETRY') OR (status = 'FAILED' AND retry_count < :MAX_CHUNK_RETRIES))"
  ]
};

export default testCase;
