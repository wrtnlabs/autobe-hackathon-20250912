import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentExportFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExportFailure";
import type { IAtsRecruitmentExportJob } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExportJob";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentExportFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentExportFailure";

/**
 * Validate export job failure retrieval by system administrator, covering
 * positive and negative scenarios.
 *
 * 1. Register first system admin (adminA) and obtain authenticated context.
 * 2. Create an export job as adminA.
 * 3. List failures for export job (should be empty initially) as adminA using
 *    PATCH /atsRecruitment/systemAdmin/exportJobs/{exportJobId}/failures,
 *    checking pagination, zero-result, and proper response typing.
 * 4. Register a second system admin (adminB). Switch context to adminB and
 *    check that adminB (not the initiator) can see the same failures
 *    (should still be empty).
 * 5. Attempt to list failures with a fake/non-existent exportJobId, expect
 *    error.
 * 6. Attempt to list failures as an unauthenticated connection (no auth
 *    headers), expect error. (Note: Only authentication APIs and admin join
 *    are available, so ensure context is constructed via provided
 *    mechanisms.)
 * 7. If possible, test filtering/pagination by passing stage, reason, dates,
 *    limit/page in body.
 * 8. Assert all outputs with typia and TestValidator. Do not test type errors
 *    or missing fields.
 */
export async function test_api_export_job_failures_listing_by_system_admin_with_dependency_chain(
  connection: api.IConnection,
) {
  // 1. Register adminA
  const adminAEmail = typia.random<string & tags.Format<"email">>();
  const adminA: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminAEmail,
        password: "Password!2345",
        name: RandomGenerator.name(),
        super_admin: false,
      } satisfies IAtsRecruitmentSystemAdmin.ICreate,
    });
  typia.assert(adminA);

  // 2. Create export job as adminA
  const exportJob: IAtsRecruitmentExportJob =
    await api.functional.atsRecruitment.systemAdmin.exportJobs.create(
      connection,
      {
        body: {
          initiator_id: adminA.id,
          job_type: RandomGenerator.pick([
            "applicants",
            "applications",
            "resumes",
            "auditLogs",
          ] as const),
          delivery_method: RandomGenerator.pick([
            "download",
            "email",
            "uri",
          ] as const),
        } satisfies IAtsRecruitmentExportJob.ICreate,
      },
    );
  typia.assert(exportJob);

  // 3. List failures as adminA (should be empty, valid paginated 0 data)
  const failuresA: IPageIAtsRecruitmentExportFailure =
    await api.functional.atsRecruitment.systemAdmin.exportJobs.failures.index(
      connection,
      {
        exportJobId: exportJob.id,
        body: {},
      },
    );
  typia.assert(failuresA);
  TestValidator.equals(
    "failures empty for new export job",
    failuresA.data.length,
    0,
  );
  TestValidator.equals("records is 0", failuresA.pagination.records, 0);
  TestValidator.equals("pages is 0", failuresA.pagination.pages, 0);

  // 4. Register second admin (adminB) and switch context
  const adminBEmail = typia.random<string & tags.Format<"email">>();
  const adminB: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminBEmail,
        password: "AnotherPw#123",
        name: RandomGenerator.name(),
        super_admin: false,
      } satisfies IAtsRecruitmentSystemAdmin.ICreate,
    });
  typia.assert(adminB);

  // adminB can also retrieve the failures (should be empty)
  const failuresB: IPageIAtsRecruitmentExportFailure =
    await api.functional.atsRecruitment.systemAdmin.exportJobs.failures.index(
      connection,
      {
        exportJobId: exportJob.id,
        body: {},
      },
    );
  typia.assert(failuresB);
  TestValidator.equals(
    "second admin gets empty failures list",
    failuresB.data.length,
    0,
  );

  // 5. Pass a non-existent exportJobId (should error)
  await TestValidator.error(
    "listing failures for non-existent exportJobId",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.exportJobs.failures.index(
        connection,
        {
          exportJobId: typia.random<string & tags.Format<"uuid">>(),
          body: {},
        },
      );
    },
  );

  // 6. Try with unauthenticated connection (no headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated access to failures listing",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.exportJobs.failures.index(
        unauthConn,
        {
          exportJobId: exportJob.id,
          body: {},
        },
      );
    },
  );

  // 7. Check pagination and filter parameters: limit, page, failure_stage, failure_reason, date range
  const filtered: IPageIAtsRecruitmentExportFailure =
    await api.functional.atsRecruitment.systemAdmin.exportJobs.failures.index(
      connection,
      {
        exportJobId: exportJob.id,
        body: {
          page: 1,
          limit: 10,
          failure_stage: undefined,
          failure_reason: undefined,
          failed_at_from: undefined,
          failed_at_to: undefined,
        },
      },
    );
  typia.assert(filtered);
  TestValidator.equals("filtered empty failures", filtered.data.length, 0);
}
