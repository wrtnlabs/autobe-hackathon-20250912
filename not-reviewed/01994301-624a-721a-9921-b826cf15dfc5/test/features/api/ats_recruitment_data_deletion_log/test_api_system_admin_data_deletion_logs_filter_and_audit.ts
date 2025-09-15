import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentDataDeletionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentDataDeletionLog";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentDataDeletionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentDataDeletionLog";

/**
 * E2E test for system admin searching and filtering data deletion logs for
 * compliance/GDPR audit.
 *
 * 1. Authenticate as a system admin (create account using valid, random
 *    IAtsRecruitmentSystemAdmin.ICreate fields).
 * 2. Query /atsRecruitment/systemAdmin/dataDeletionLogs (PATCH) with various
 *    filters (requestor_id, target_id, date range, pagination, limit).
 * 3. If any log is returned, extract actual requestor_id/target_id. Otherwise,
 *    create random UUIDs for negative filtering.
 * 4. Validate the returned event fields: deletion_reason, outcome_note, type info,
 *    actor, timestamps, IDs, and field types/formats.
 * 5. Confirm proper masking/absence of sensitive fields per schema (by field
 *    presence/absence, as logs contain no raw sensitive data).
 * 6. Test filter for non-existent requestor/target IDs (expect empty response).
 * 7. Attempt unauthorized access (connection without admin context), expect error.
 */
export async function test_api_system_admin_data_deletion_logs_filter_and_audit(
  connection: api.IConnection,
) {
  // 1. Register a system admin and authenticate
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  const adminName: string = RandomGenerator.name();

  const admin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
        super_admin: true,
      },
    });
  typia.assert(admin);

  // 2. Query logs without any filter (just to check if any preexisting logs)
  const anyLogs: IPageIAtsRecruitmentDataDeletionLog =
    await api.functional.atsRecruitment.systemAdmin.dataDeletionLogs.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(anyLogs);

  // If at least one log exists, use actual IDs from a real log; otherwise, make up random UUIDs for non-existent
  const sampleLog: IAtsRecruitmentDataDeletionLog | undefined = anyLogs.data[0];
  const filterRequestorId: string & tags.Format<"uuid"> =
    sampleLog?.requestor_id ?? typia.random<string & tags.Format<"uuid">>();
  const filterTargetId: string & tags.Format<"uuid"> =
    sampleLog?.target_id ?? typia.random<string & tags.Format<"uuid">>();
  const filterDate: string & tags.Format<"date-time"> =
    sampleLog?.deleted_at ?? new Date().toISOString();

  // 3. Test filter: by requestor_id
  const filterByRequestor: IPageIAtsRecruitmentDataDeletionLog =
    await api.functional.atsRecruitment.systemAdmin.dataDeletionLogs.index(
      connection,
      {
        body: {
          requestor_id: filterRequestorId,
        },
      },
    );
  typia.assert(filterByRequestor);
  TestValidator.predicate(
    "all logs should match requestor_id (if any)",
    filterByRequestor.data.every(
      (log) => log.requestor_id === filterRequestorId,
    ),
  );

  // 4. Test filter: by target_id
  const filterByTarget: IPageIAtsRecruitmentDataDeletionLog =
    await api.functional.atsRecruitment.systemAdmin.dataDeletionLogs.index(
      connection,
      {
        body: {
          target_id: filterTargetId,
        },
      },
    );
  typia.assert(filterByTarget);
  TestValidator.predicate(
    "all logs should match target_id (if any)",
    filterByTarget.data.every((log) => log.target_id === filterTargetId),
  );

  // 5. Test filter: by deletion date range
  const filterByDate: IPageIAtsRecruitmentDataDeletionLog =
    await api.functional.atsRecruitment.systemAdmin.dataDeletionLogs.index(
      connection,
      {
        body: {
          deleted_at_from: filterDate,
          deleted_at_to: filterDate,
        },
      },
    );
  typia.assert(filterByDate);
  TestValidator.predicate(
    "all logs should have deleted_at within provided range",
    filterByDate.data.every((log) => log.deleted_at === filterDate),
  );

  // 6. Test pagination + sorting: get page 1, limit 2 (if enough data)
  const paged: IPageIAtsRecruitmentDataDeletionLog =
    await api.functional.atsRecruitment.systemAdmin.dataDeletionLogs.index(
      connection,
      {
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
        },
      },
    );
  typia.assert(paged);
  TestValidator.predicate(
    "pagination returns at most limit number of data",
    paged.data.length <= 2,
  );

  // 7. Check all returned logs for expected fields and masking
  paged.data.forEach((log) => {
    typia.assert<IAtsRecruitmentDataDeletionLog>(log);
    TestValidator.predicate(
      "deletion_reason field must exist",
      typeof log.deletion_reason === "string",
    );
    if (log.outcome_note !== null && log.outcome_note !== undefined)
      TestValidator.predicate(
        "outcome_note is string when present",
        typeof log.outcome_note === "string",
      );
    TestValidator.predicate(
      "requestor_type is string",
      typeof log.requestor_type === "string",
    );
    TestValidator.predicate(
      "target_type is string",
      typeof log.target_type === "string",
    );
    TestValidator.predicate(
      "deleted_at is ISO string",
      typeof log.deleted_at === "string",
    );
    TestValidator.predicate("id is string", typeof log.id === "string");
  });

  // 8. Test edge: filter for non-existent UUIDs (expect empty)
  const nonexistentRequestor: IPageIAtsRecruitmentDataDeletionLog =
    await api.functional.atsRecruitment.systemAdmin.dataDeletionLogs.index(
      connection,
      {
        body: {
          requestor_id: typia.random<string & tags.Format<"uuid">>(),
          target_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(nonexistentRequestor);
  TestValidator.equals(
    "querying with random IDs yields empty data",
    nonexistentRequestor.data.length,
    0,
  );

  // 9. Unauthorized access (no admin context)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized access to data deletion logs is forbidden",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.dataDeletionLogs.index(
        unauthConn,
        {
          body: {},
        },
      );
    },
  );
}
