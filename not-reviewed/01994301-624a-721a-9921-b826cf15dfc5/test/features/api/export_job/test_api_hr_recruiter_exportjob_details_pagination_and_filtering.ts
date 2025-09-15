import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentExportJob } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExportJob";
import type { IAtsRecruitmentExportJobDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExportJobDetail";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentExportJobDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentExportJobDetail";

/**
 * End-to-end test of export job details retrieval, pagination, and filtering
 * for HR recruiter.
 *
 * 1. Register HR recruiter A and login; get credentials.
 * 2. Register HR recruiter B.
 * 3. HR recruiter A creates an export job; obtain exportJobId.
 * 4. HR recruiter A PATCH to /details with default params; check base response.
 * 5. HR recruiter A PATCH with custom page/pageSize; verify paging and limits.
 * 6. HR recruiter A PATCH with high page number; expect empty result.
 * 7. HR recruiter A PATCH using row_summary_json substring filter; verify keyword.
 * 8. HR recruiter A PATCH with included_at_from/to using known dates from details;
 *    verify date filtering.
 * 9. Switch to HR recruiter B: attempt PATCH to A's export job; verify
 *    forbidden/empty/denied result.
 */
export async function test_api_hr_recruiter_exportjob_details_pagination_and_filtering(
  connection: api.IConnection,
) {
  // Recruiter A registration
  const recruiterAEmail = typia.random<string & tags.Format<"email">>();
  const recruiterA = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: recruiterAEmail,
      password: "StrongPassword123!",
      name: RandomGenerator.name(),
      department: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(recruiterA);
  const initiatorId = recruiterA.id;

  // Recruiter B registration
  const recruiterBEmail = typia.random<string & tags.Format<"email">>();
  const recruiterB = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: recruiterBEmail,
      password: "Another!Password456",
      name: RandomGenerator.name(),
      department: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(recruiterB);

  // Switch connection back to recruiter A (join sets token)
  await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: recruiterAEmail,
      password: "StrongPassword123!",
      name: recruiterA.name,
      department: recruiterA.department || undefined,
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });

  // Create export job as recruiter A
  const exportJob =
    await api.functional.atsRecruitment.hrRecruiter.exportJobs.create(
      connection,
      {
        body: {
          initiator_id: initiatorId,
          job_type: "applicants",
          delivery_method: "download",
          request_description: RandomGenerator.paragraph(),
          filter_json: RandomGenerator.content({ paragraphs: 1 }),
          target_job_posting_id: undefined,
          target_application_id: undefined,
        } satisfies IAtsRecruitmentExportJob.ICreate,
      },
    );
  typia.assert(exportJob);
  const exportJobId = exportJob.id;

  // 1. PATCH: default params (no filters/paging)
  const respDefault =
    await api.functional.atsRecruitment.hrRecruiter.exportJobs.details.index(
      connection,
      {
        exportJobId,
        body: {},
      },
    );
  typia.assert(respDefault);
  TestValidator.predicate(
    "response contains data array",
    Array.isArray(respDefault.data),
  );

  // 2. PATCH: set custom page/pageSize (use page 1, size 2)
  const respPage =
    await api.functional.atsRecruitment.hrRecruiter.exportJobs.details.index(
      connection,
      {
        exportJobId,
        body: { page: 1 as number, pageSize: 2 as number },
      },
    );
  typia.assert(respPage);
  TestValidator.equals(
    "custom pageSize matches data length or pageSize",
    respPage.data.length <= 2,
    true,
  );

  // 3. PATCH: set high page number (out-of-bounds)
  const respOob =
    await api.functional.atsRecruitment.hrRecruiter.exportJobs.details.index(
      connection,
      {
        exportJobId,
        body: { page: 1000 as number, pageSize: 10 as number },
      },
    );
  typia.assert(respOob);
  TestValidator.equals("out-of-bounds page data empty", respOob.data.length, 0);

  // 4. PATCH: Filtering by row_summary_json substring (if any detail rows exist)
  if (respDefault.data.length > 0) {
    const filterKeyword = RandomGenerator.substring(
      respDefault.data[0].row_summary_json,
    );
    const respFilter =
      await api.functional.atsRecruitment.hrRecruiter.exportJobs.details.index(
        connection,
        {
          exportJobId,
          body: { row_summary_json: filterKeyword },
        },
      );
    typia.assert(respFilter);
    TestValidator.predicate(
      "row_summary_json filter should return rows containing keyword",
      respFilter.data.every((row) =>
        row.row_summary_json.includes(filterKeyword),
      ),
    );
  }

  // 5. PATCH: Filtering by included_at_from/included_at_to
  if (respDefault.data.length >= 2) {
    const included_from = respDefault.data[0].included_at;
    const included_to =
      respDefault.data[respDefault.data.length - 1].included_at;
    const respDate =
      await api.functional.atsRecruitment.hrRecruiter.exportJobs.details.index(
        connection,
        {
          exportJobId,
          body: {
            included_at_from: included_from,
            included_at_to: included_to,
          },
        },
      );
    typia.assert(respDate);
    TestValidator.predicate(
      "all details included_at within range",
      respDate.data.every(
        (row) =>
          row.included_at >= included_from && row.included_at <= included_to,
      ),
    );
  }

  // 6. Switch to HR recruiter B (simulate login by join)
  await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: recruiterBEmail,
      password: "Another!Password456",
      name: recruiterB.name,
      department: recruiterB.department || undefined,
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });

  // 7. Recruiter B attempts to access recruiter A's export job details
  await TestValidator.error(
    "forbidden: other recruiter cannot access export job details",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.exportJobs.details.index(
        connection,
        {
          exportJobId,
          body: {},
        },
      );
    },
  );
}
