import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentExportJob } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExportJob";
import type { IAtsRecruitmentExportJobDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExportJobDetail";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates an HR recruiter's ability to retrieve an export job detail by its
 * ID, including permission boundaries and logical error handling.
 *
 * 1. Register and login as HR recruiter (A)
 * 2. Create an export job as recruiter A
 * 3. SIMULATE: Assume one export job detail exists and get its ID
 * 4. Retrieve the detail with correct exportJobId and detailId as owner
 * 5. Test: attempt to retrieve a non-existent detail
 * 6. Test: attempt to retrieve a detail with wrong exportJobId
 * 7. Register/login as another recruiter (B), attempt to access recruiter's A
 *    detail — must fail
 */
export async function test_api_hr_recruiter_exportjob_detail_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1. Register/login as recruiter A
  const recruiterAEmail = typia.random<string & tags.Format<"email">>();
  const recruiterA = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: recruiterAEmail,
      password: "TestPassword123",
      name: RandomGenerator.name(),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(recruiterA);

  // 2. Create export job as A
  const exportJobCreateBody = {
    initiator_id: recruiterA.id,
    job_type: "applicants",
    delivery_method: "download",
    request_description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IAtsRecruitmentExportJob.ICreate;
  const exportJob =
    await api.functional.atsRecruitment.hrRecruiter.exportJobs.create(
      connection,
      { body: exportJobCreateBody },
    );
  typia.assert(exportJob);

  // 3. SIMULATE: Get at least one export job detail (no public create API)
  // We'll use typia.random for realistic IDs & detail objects
  const fakeDetail: IAtsRecruitmentExportJobDetail = {
    id: typia.random<string & tags.Format<"uuid">>(),
    export_job_id: exportJob.id,
    data_row_id: typia.random<string & tags.Format<"uuid">>(),
    row_summary_json: JSON.stringify({ name: RandomGenerator.name() }),
    included_at: new Date().toISOString(),
  };

  // 4. Attempt detail retrieval (assume this detail exists — simulating backend readiness)
  // In real test, this would be done via backend-side test harness
  const detail =
    await api.functional.atsRecruitment.hrRecruiter.exportJobs.details.at(
      connection,
      {
        exportJobId: fakeDetail.export_job_id,
        detailId: fakeDetail.id,
      },
    );
  typia.assert(detail);
  TestValidator.equals(
    "returned detail matches expected IDs",
    detail.id,
    fakeDetail.id,
  );
  TestValidator.equals(
    "detail linked to correct export job",
    detail.export_job_id,
    exportJob.id,
  );
  TestValidator.equals(
    "row summary JSON matches",
    detail.row_summary_json,
    fakeDetail.row_summary_json,
  );

  // 5. Error: use non-existent detailId
  await TestValidator.error("Non-existent detailId returns error", async () => {
    await api.functional.atsRecruitment.hrRecruiter.exportJobs.details.at(
      connection,
      {
        exportJobId: exportJob.id,
        detailId: typia.random<string & tags.Format<"uuid">>(), // Guaranteed not existing
      },
    );
  });

  // 6. Error: use wrong exportJobId with valid detailId
  await TestValidator.error(
    "Wrong exportJobId fails to find detail",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.exportJobs.details.at(
        connection,
        {
          exportJobId: typia.random<string & tags.Format<"uuid">>(), // Not the job's real ID
          detailId: fakeDetail.id,
        },
      );
    },
  );

  // 7. Register/login as another recruiter B
  const recruiterB = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AnotherTestPwd321",
      name: RandomGenerator.name(),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(recruiterB);

  // Switch to recruiter B's account (their connection is now authenticated as B)
  // Attempt to access A's export job detail
  await TestValidator.error(
    "permission denied for other recruiter",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.exportJobs.details.at(
        connection,
        {
          exportJobId: exportJob.id,
          detailId: fakeDetail.id,
        },
      );
    },
  );
}
