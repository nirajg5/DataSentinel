
# CSV Ingestion Failure Runbook

## Symptoms
A CSV ingestion pipeline reports FAILED status.

## Investigation
1. Check the pipeline run error message.
2. Confirm that the source CSV file exists.
3. Verify that the file contains the expected columns.
4. Check for missing values in required fields.
5. Review database connectivity and permissions.

## Remediation
Correct the source file or configuration, then retry the pipeline.
Do not delete existing production data during investigation.

## Verification
Confirm that the pipeline finishes successfully and that the
ingested row count matches the expected source row count.
