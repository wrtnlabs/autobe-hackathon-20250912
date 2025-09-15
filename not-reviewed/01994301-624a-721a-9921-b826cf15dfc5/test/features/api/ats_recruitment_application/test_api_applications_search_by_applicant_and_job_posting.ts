import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentApplication";

/**
 * Validate the search and filtering of job applications by applicant_id and
 * job_posting_id as an authenticated HR recruiter, including full setup,
 * correct positive and edge case coverage, and permission enforcement.
 *
 * - 1. Register as HR recruiter and log in (store credentials for context
 *        switching)
 * - 2. Register an applicant and log in (store credentials)
 * - 3. As HR recruiter, create a job posting
 * - 4. As applicant, submit an application to the job posting
 * - 5. As HR recruiter, search applications filtered by both applicant_id and
 *        job_posting_id (should yield exactly the single application
 *        created)
 * - 6. Verify search results only include the precise created application by
 *        applicant/posting ID match
 * - 7. Edge case: search with non-existent applicant_id (valid format, unused
 *        UUID) and job_posting_id (unused UUID) - expect empty result
 * - 8. Edge case: valid applicant_id but no application for posting, valid
 *        posting but no application from applicant
 * - 9. Permission: search as unauthenticated (using new connection with empty
 *        headers) - expect error
 * - 10. Permission: search as applicant (not HR recruiter) - expect error
 */
export async function test_api_applications_search_by_applicant_and_job_posting(
  connection: api.IConnection,
) {
  // 1. Register as HR recruiter and log in
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

  // 2. Register applicant and log in
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

  // 3. HR recruiter creates job posting
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  const jobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: recruiterJoin.id,
          job_employment_type_id: typia.random<string & tags.Format<"uuid">>(),
          job_posting_state_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 3,
            sentenceMax: 8,
          }),
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(jobPosting);

  // 4. Applicant submits application to the job posting
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  const application =
    await api.functional.atsRecruitment.applicant.applications.create(
      connection,
      {
        body: {
          job_posting_id: jobPosting.id,
        } satisfies IAtsRecruitmentApplication.ICreate,
      },
    );
  typia.assert(application);

  // 5. HR recruiter searches by applicant_id and job_posting_id: should return exactly our application
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  const searchRes =
    await api.functional.atsRecruitment.hrRecruiter.applications.index(
      connection,
      {
        body: {
          applicant_id: applicantJoin.id,
          job_posting_id: jobPosting.id,
        } satisfies IAtsRecruitmentApplication.IRequest,
      },
    );
  typia.assert(searchRes);
  TestValidator.equals(
    "exactly one application found with matching applicant and posting",
    searchRes.data.length,
    1,
  );
  const found = searchRes.data[0];
  TestValidator.equals(
    "found application matches applicant_id",
    found.applicant_id,
    applicantJoin.id,
  );
  TestValidator.equals(
    "found application matches job_posting_id",
    found.job_posting_id,
    jobPosting.id,
  );
  TestValidator.equals(
    "found application id matches created",
    found.id,
    application.id,
  );

  // 6. Edge: search by unused applicant_id - should yield empty
  const unusedApplicantId = typia.random<string & tags.Format<"uuid">>();
  const searchNone =
    await api.functional.atsRecruitment.hrRecruiter.applications.index(
      connection,
      {
        body: {
          applicant_id: unusedApplicantId,
          job_posting_id: jobPosting.id,
        } satisfies IAtsRecruitmentApplication.IRequest,
      },
    );
  typia.assert(searchNone);
  TestValidator.equals(
    "no application with unused applicant_id",
    searchNone.data.length,
    0,
  );

  // 7. Edge: search by unused job_posting_id - should yield empty
  const unusedJobPostingId = typia.random<string & tags.Format<"uuid">>();
  const searchNone2 =
    await api.functional.atsRecruitment.hrRecruiter.applications.index(
      connection,
      {
        body: {
          applicant_id: applicantJoin.id,
          job_posting_id: unusedJobPostingId,
        } satisfies IAtsRecruitmentApplication.IRequest,
      },
    );
  typia.assert(searchNone2);
  TestValidator.equals(
    "no application with unused job_posting_id",
    searchNone2.data.length,
    0,
  );

  // 8. Edge: only applicant_id (should return our application)
  const searchByApplicant =
    await api.functional.atsRecruitment.hrRecruiter.applications.index(
      connection,
      {
        body: {
          applicant_id: applicantJoin.id,
        } satisfies IAtsRecruitmentApplication.IRequest,
      },
    );
  typia.assert(searchByApplicant);
  TestValidator.predicate(
    "application is present in applicant_id-only search",
    searchByApplicant.data.some((app) => app.id === application.id),
  );

  // 9. Edge: only job_posting_id (should return our application)
  const searchByPosting =
    await api.functional.atsRecruitment.hrRecruiter.applications.index(
      connection,
      {
        body: {
          job_posting_id: jobPosting.id,
        } satisfies IAtsRecruitmentApplication.IRequest,
      },
    );
  typia.assert(searchByPosting);
  TestValidator.predicate(
    "application is present in job_posting_id-only search",
    searchByPosting.data.some((app) => app.id === application.id),
  );

  // 10. Permissions: search as unauthenticated (clear auth headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user should not be able to search applications",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.applications.index(
        unauthConn,
        {
          body: {
            applicant_id: applicantJoin.id,
            job_posting_id: jobPosting.id,
          } satisfies IAtsRecruitmentApplication.IRequest,
        },
      );
    },
  );

  // 11. Permissions: search as applicant (should be rejected)
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  await TestValidator.error(
    "applicant user should not be able to search as HR recruiter",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.applications.index(
        connection,
        {
          body: {
            applicant_id: applicantJoin.id,
            job_posting_id: jobPosting.id,
          } satisfies IAtsRecruitmentApplication.IRequest,
        },
      );
    },
  );
}
