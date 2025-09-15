import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentCodingTest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTest";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentCodingTest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentCodingTest";

/**
 * E2E test for verifying applicant search/filter for accessible coding
 * tests filtered by job posting context in ATS system.
 *
 * Steps validated:
 *
 * 1. Register a new applicant account
 * 2. Register a new HR recruiter account
 * 3. HR recruiter logs in and creates a job posting (required UUID fields are
 *    stubbed with randoms)
 * 4. Applicant logs in
 * 5. Applicant calls PATCH /atsRecruitment/applicant/codingTests with
 *    job_posting_id filter (actual coding test assignment/linking is not
 *    possible without additional endpoints, so test only validates response
 *    shape, business filter coverage, and proper endpoint operation)
 * 6. Error path: unauthenticated applicant hitting endpoint should fail
 * 7. Error path: search with bogus job_posting_id should return zero coding
 *    tests
 */
export async function test_api_applicant_coding_tests_search_access_with_job_posting_context(
  connection: api.IConnection,
) {
  // 1. Register applicant
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(12);
  const applicantJoin = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
      name: RandomGenerator.name(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicantJoin);

  // 2. Register HR recruiter
  const recruiterEmail = typia.random<string & tags.Format<"email">>();
  const recruiterPassword = RandomGenerator.alphaNumeric(12);
  const recruiterJoin = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
      name: RandomGenerator.name(),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(recruiterJoin);

  // Login as HR recruiter
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // 3. HR recruiter creates job posting (required ids are stubbed with random UUIDs)
  const jobPostingBody = {
    hr_recruiter_id: recruiterJoin.id,
    job_employment_type_id: typia.random<string & tags.Format<"uuid">>(),
    job_posting_state_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    is_visible: true,
  } satisfies IAtsRecruitmentJobPosting.ICreate;
  const jobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      { body: jobPostingBody },
    );
  typia.assert(jobPosting);
  const jobPostingId = jobPosting.id;

  // 4. Login as applicant
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });

  // 5. Applicant calls PATCH endpoint with job_posting_id filter
  const patchResp =
    await api.functional.atsRecruitment.applicant.codingTests.index(
      connection,
      {
        body: {
          job_posting_id: jobPostingId,
        } satisfies IAtsRecruitmentCodingTest.IRequest,
      },
    );
  typia.assert(patchResp);
  TestValidator.predicate(
    "coding test search by job_posting returns array",
    Array.isArray(patchResp.data),
  );
  TestValidator.predicate(
    "coding test search by job_posting returns page object",
    !!patchResp.pagination,
  );

  // 6. Error: Unauthenticated applicant attempts endpoint
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized coding test access fails",
    async () => {
      await api.functional.atsRecruitment.applicant.codingTests.index(
        unauthConn,
        {
          body: {
            job_posting_id: jobPostingId,
          } satisfies IAtsRecruitmentCodingTest.IRequest,
        },
      );
    },
  );

  // 7. Error: Filtering with bogus/nonexistent job_posting_id returns empty result
  const bogusJobPostingId = typia.random<string & tags.Format<"uuid">>();
  const nothing =
    await api.functional.atsRecruitment.applicant.codingTests.index(
      connection,
      {
        body: {
          job_posting_id: bogusJobPostingId,
        } satisfies IAtsRecruitmentCodingTest.IRequest,
      },
    );
  typia.assert(nothing);
  TestValidator.equals(
    "coding test search with bogus job_posting_id returns none",
    nothing.data.length,
    0,
  );
}
