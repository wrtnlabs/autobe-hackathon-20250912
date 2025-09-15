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
 * Validate system admin's ability to retrieve export job failure details
 * with full dependency chain.
 *
 * - 1. Register and authenticate as system admin (sets auth header context).
 * - 2. Create a new export job as admin.
 * - 3. Ensure the job has at least one failure record by using the
 *        failures.index API and extracting a failureId.
 * - 4. Call GET
 *        /atsRecruitment/systemAdmin/exportJobs/{exportJobId}/failures/{failureId}
 *        for the extracted failureId.
 * - 5. Validate the returned structure: correct id, export_job_id,
 *        failure_stage, failure_reason, failed_at, etc.
 * - 6. Validate error case: request with random (nonexistent) failureId for the
 *        same job (expect error).
 * - 7. Validate edge: query with completely unrelated job/failureId pair (expect
 *        error).
 */
export async function test_api_export_job_failure_detail_access_by_system_admin_with_dependency_chain(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      password: "adminPass123!",
      name: RandomGenerator.name(),
      super_admin: true,
    } satisfies IAtsRecruitmentSystemAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create new export job as admin
  const job = await api.functional.atsRecruitment.systemAdmin.exportJobs.create(
    connection,
    {
      body: {
        initiator_id: admin.id,
        job_type: "applicants", // sample job type
        delivery_method: "download", // sample delivery method
      } satisfies IAtsRecruitmentExportJob.ICreate,
    },
  );
  typia.assert(job);
  TestValidator.equals("initiator linkage", job.initiator_id, admin.id);

  // 3. Ensure at least one failure exists using failures.index (simulate creation)
  const failurePage =
    await api.functional.atsRecruitment.systemAdmin.exportJobs.failures.index(
      connection,
      {
        exportJobId: job.id,
        body: {},
      },
    );
  typia.assert(failurePage);
  TestValidator.predicate(
    "at least one export failure exists",
    failurePage.data.length > 0,
  );
  const failure = failurePage.data[0];

  // 4. Retrieve failure details via 'at' endpoint
  const detail =
    await api.functional.atsRecruitment.systemAdmin.exportJobs.failures.at(
      connection,
      {
        exportJobId: job.id,
        failureId: failure.id,
      },
    );
  typia.assert(detail);
  TestValidator.equals("failure id matches", detail.id, failure.id);
  TestValidator.equals("export job id matches", detail.export_job_id, job.id);
  TestValidator.equals(
    "failure_stage matches",
    detail.failure_stage,
    failure.failure_stage,
  );
  TestValidator.equals(
    "failure_reason matches",
    detail.failure_reason,
    failure.failure_reason,
  );
  TestValidator.equals(
    "failed_at matches",
    detail.failed_at,
    failure.failed_at,
  );

  // 5. Error case: with a random UUID for failureId
  await TestValidator.error(
    "requesting non-existent failureId throws error",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.exportJobs.failures.at(
        connection,
        {
          exportJobId: job.id,
          failureId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 6. Edge: completely unrelated job/failureId (use different random ids)
  await TestValidator.error(
    "unrelated job/failureId pair throws error",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.exportJobs.failures.at(
        connection,
        {
          exportJobId: typia.random<string & tags.Format<"uuid">>(),
          failureId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
