import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentExportFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExportFailure";
import type { IAtsRecruitmentExportJob } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExportJob";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentExportFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentExportFailure";

/**
 * Validate export job failure retrieval for HR recruiter with full dependency
 * chain:
 *
 * 1. HR recruiter joins (registers+logs in), receiving an authorization token
 * 2. HR recruiter creates an export job (becoming the job's initiator)
 * 3. List failures for that export job: expect empty data array by default,
 *    correct pagination
 * 4. Filtering (by random stage/reason/period) also returns an empty array (since
 *    no failures exist at job creation)
 * 5. Pagination with page/limit params: confirm pagination object and empty data
 * 6. Access control: Non-initiator/recruiter cannot fetch failures (not tested
 *    since only one recruiter is created here)
 * 7. Error: PATCH failures for random non-existent jobId returns error
 * 8. Error: PATCH failures unauthenticated (fresh connection) returns error
 */
export async function test_api_export_job_failures_listing_by_hr_recruiter_with_dependency_chain(
  connection: api.IConnection,
) {
  // 1. Register & authenticate HR recruiter
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "pw-" + RandomGenerator.alphaNumeric(7),
    name: RandomGenerator.name(),
    department: RandomGenerator.name(1),
  } satisfies IAtsRecruitmentHrRecruiter.IJoin;
  const recruiter: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, { body: joinInput });
  typia.assert(recruiter);

  // 2. Recruiter creates export job
  const jobInput = {
    initiator_id: recruiter.id,
    job_type: RandomGenerator.alphabets(5),
    delivery_method: RandomGenerator.alphabets(6),
    request_description: RandomGenerator.paragraph({ sentences: 5 }),
    filter_json: null,
  } satisfies IAtsRecruitmentExportJob.ICreate;
  const exportJob: IAtsRecruitmentExportJob =
    await api.functional.atsRecruitment.hrRecruiter.exportJobs.create(
      connection,
      { body: jobInput },
    );
  typia.assert(exportJob);
  TestValidator.equals(
    "job initiator matches",
    exportJob.initiator_id,
    recruiter.id,
  );

  // 3. PATCH failures (should be empty since job just created)
  const resp1: IPageIAtsRecruitmentExportFailure =
    await api.functional.atsRecruitment.hrRecruiter.exportJobs.failures.index(
      connection,
      {
        exportJobId: exportJob.id,
        body: {},
      },
    );
  typia.assert(resp1);
  TestValidator.equals("no failures initially", resp1.data.length, 0);

  // 4. PATCH with filter by random failure_stage (should still be empty)
  const resp2 =
    await api.functional.atsRecruitment.hrRecruiter.exportJobs.failures.index(
      connection,
      {
        exportJobId: exportJob.id,
        body: {
          failure_stage: RandomGenerator.alphabets(3),
        },
      },
    );
  typia.assert(resp2);
  TestValidator.equals(
    "filtered failures should be empty",
    resp2.data.length,
    0,
  );

  // 5. PATCH with pagination params (page/limit)
  const resp3 =
    await api.functional.atsRecruitment.hrRecruiter.exportJobs.failures.index(
      connection,
      {
        exportJobId: exportJob.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(resp3);
  TestValidator.equals(
    "pagination pages is 1 when empty",
    resp3.pagination.pages,
    1,
  );
  TestValidator.equals("no failures on paged query", resp3.data.length, 0);

  // 6. PATCH for non-existent exportJobId
  await TestValidator.error(
    "query with random, non-existent jobId errors",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.exportJobs.failures.index(
        connection,
        {
          exportJobId: typia.random<string & tags.Format<"uuid">>(),
          body: {},
        },
      );
    },
  );

  // 7. PATCH unauthenticated (new connection)
  const unauth: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated request fails", async () => {
    await api.functional.atsRecruitment.hrRecruiter.exportJobs.failures.index(
      unauth,
      {
        exportJobId: exportJob.id,
        body: {},
      },
    );
  });
}
